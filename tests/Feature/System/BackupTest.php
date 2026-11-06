<?php

namespace Tests\Feature\System;

use App\Models\Merchant;
use App\Models\User;
use App\Services\BackupService;
use App\Services\BusinessSettingsService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * Full database backup and restore.
 *
 * These tests run against a real SQLite file rather than the in-memory test
 * database, because the whole point of the feature is that the file can be
 * copied, checked and restored. A file database is also the only place where
 * SQLite's VACUUM INTO - the safe way to take a consistent copy of a live
 * database - can run.
 */
class BackupTest extends TestCase
{
    protected string $databasePath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->databasePath = storage_path('framework/testing/backup-'.uniqid().'.sqlite');
        File::ensureDirectoryExists(dirname($this->databasePath));
        File::put($this->databasePath, '');

        config(['database.connections.sqlite.database' => $this->databasePath]);
        DB::purge('sqlite');

        $this->artisan('migrate', ['--force' => true]);
        $this->app[Kernel::class]->setArtisan(null);

        $this->cleanBackupFolder();
    }

    protected function tearDown(): void
    {
        DB::purge('sqlite');
        File::delete($this->databasePath);

        $this->cleanBackupFolder();

        parent::tearDown();
    }

    protected function cleanBackupFolder(): void
    {
        $directory = app(BackupService::class)->backupDirectory();

        if (! File::isDirectory($directory)) {
            return;
        }

        foreach (File::files($directory) as $file) {
            File::delete($file->getPathname());
        }
    }

    public function test_the_backup_page_renders()
    {
        $response = $this->actingAs(User::factory()->create())->get('/system/backup');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('system/backup/index')
            ->has('backups')
            ->has('lastBackupAt')
            ->has('categories')
        );
    }

    public function test_downloading_a_backup_produces_a_complete_restorable_database()
    {
        $user = User::factory()->create();
        Merchant::create([
            'code' => 2, 'name_en' => 'Bilal Traders', 'name_ur' => 'بلال',
            'opening_balance' => 2500,
        ]);

        $response = $this->actingAs($user)->get('/system/backup/download');

        $response->assertOk();
        $response->assertHeader('content-disposition');

        $name = app(BackupService::class)->available()[0]['name'];
        $this->assertStringContainsString(date('Y-m-d'), $name, 'The backup name must carry the date.');
        $this->assertMatchesRegularExpression(
            '/^jkc-pos-backup-\d{4}-\d{2}-\d{2}-\d{6}\.sqlite$/',
            $name,
            'The backup name must carry the date and the time.'
        );

        $path = app(BackupService::class)->path($name);
        $this->assertFileExists($path);

        // The copy is a working database with the data in it.
        $pdo = new \PDO('sqlite:'.$path, null, null, [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]);
        $this->assertSame('ok', $pdo->query('PRAGMA integrity_check')->fetchColumn());
        $this->assertSame(1, (int) $pdo->query('SELECT COUNT(*) FROM merchants')->fetchColumn());
        $this->assertSame(
            2500.0,
            (float) $pdo->query('SELECT opening_balance FROM merchants WHERE code = 2')->fetchColumn()
        );
        $this->assertGreaterThan(0, (int) $pdo->query('SELECT COUNT(*) FROM migrations')->fetchColumn());
    }

    public function test_the_time_of_the_last_backup_is_remembered()
    {
        $user = User::factory()->create();

        $this->assertNull(app(BusinessSettingsService::class)->lastBackupAt());

        $this->actingAs($user)->get('/system/backup/download')->assertOk();

        $this->assertNotNull(app(BusinessSettingsService::class)->lastBackupAt());
    }

    public function test_a_valid_backup_passes_the_restore_check()
    {
        $user = User::factory()->create();
        Merchant::create(['code' => 2, 'name_en' => 'Bilal Traders', 'name_ur' => 'بلال']);

        $this->actingAs($user)->get('/system/backup/download')->assertOk();

        $name = app(BackupService::class)->available()[0]['name'];
        $backupPath = app(BackupService::class)->path($name);

        $response = $this->actingAs($user)->post('/system/backup/restore/check', [
            'backup' => UploadedFile::fake()->createWithContent('backup.sqlite', file_get_contents($backupPath)),
        ]);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('system/backup/restore')
            ->where('validation.valid', true)
            ->has('uploadedPath')
        );
    }

    public function test_a_file_that_is_not_a_pos_database_is_refused()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/system/backup/restore/check', [
            'backup' => UploadedFile::fake()->createWithContent(
                'not-a-database.sqlite',
                'this is definitely not a sqlite database, it is just some text'
            ),
        ]);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('system/backup/restore')
            ->where('validation.valid', false)
            ->where('uploadedPath', null)
        );
    }

    public function test_restoring_puts_the_data_back_and_keeps_a_safety_copy()
    {
        Merchant::create(['code' => 2, 'name_en' => 'Bilal Traders', 'name_ur' => 'بلال']);

        // A backup that holds only Bilal.
        $this->actingAs(User::factory()->create())->get('/system/backup/download')->assertOk();
        $name = app(BackupService::class)->available()[0]['name'];
        $backupPath = app(BackupService::class)->path($name);

        // The database as it is now: Bilal plus Aslam.
        Merchant::create(['code' => 3, 'name_en' => 'Aslam Sabzi', 'name_ur' => 'اسلم']);
        $this->assertSame(2, Merchant::count());

        // Restore the backup over the live database.
        $result = app(BackupService::class)->restore($backupPath);

        $this->assertSame(1, Merchant::count(), 'The data must be back to the state of the backup.');
        $this->assertSame('Bilal Traders', Merchant::first()->name_en);

        // A safety copy of the previous state was kept.
        $safetyPath = app(BackupService::class)->path($result['safety_backup']);
        $this->assertFileExists($safetyPath);

        $safety = new \PDO('sqlite:'.$safetyPath, null, null, [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]);
        $this->assertSame(2, (int) $safety->query('SELECT COUNT(*) FROM merchants')->fetchColumn());
    }

    public function test_an_invalid_file_is_never_restored()
    {
        $before = Merchant::count();

        $broken = storage_path('framework/testing/broken-'.uniqid().'.sqlite');
        File::put($broken, 'not a database at all');

        $this->expectException(\RuntimeException::class);

        try {
            app(BackupService::class)->restore($broken);
        } finally {
            File::delete($broken);
        }

        $this->assertSame($before, Merchant::count());
    }

    public function test_a_backup_of_a_file_that_is_not_a_database_is_refused()
    {
        $broken = storage_path('framework/testing/broken-'.uniqid().'.sqlite');
        File::put($broken, str_repeat('x', 4096));

        $result = app(BackupService::class)->validate($broken);

        $this->assertFalse($result['valid']);
        $this->assertNotNull($result['reason']);

        File::delete($broken);
    }
}
