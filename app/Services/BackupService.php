<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Full-database backup and restore.
 *
 * The backup is taken with SQLite's VACUUM INTO, which produces a consistent,
 * complete copy of the database even while other connections are reading it
 * and even when the database is in WAL mode. Copying the .sqlite file itself
 * is never safe: with WAL enabled the live file may not contain the most
 * recent committed pages.
 */
class BackupService
{
    /**
     * Tables a valid POS backup must contain.
     */
    public const REQUIRED_TABLES = [
        'users',
        'merchants',
        'farmers',
        'items',
        'amroza_sales',
        'merchant_receipts',
        'migrations',
    ];

    public function __construct(
        protected BusinessSettingsService $settings,
    ) {}

    /**
     * Where backups are written.
     */
    public function backupDirectory(): string
    {
        return storage_path('app/backups');
    }

    /**
     * Take a full database backup and return the file name.
     */
    public function create(): string
    {
        $directory = $this->backupDirectory();

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0775, true);
        }

        $name = 'jkc-pos-backup-'.now()->format('Y-m-d-His').'.sqlite';
        $target = $directory.'/'.$name;

        if (File::exists($target)) {
            File::delete($target);
        }

        $connection = DB::connection();
        $pdo = $connection->getPdo();

        // A WAL database keeps recent commits in the -wal file. Checkpointing
        // first means the -wal content is folded into the main database file,
        // and VACUUM INTO then copies a fully self-contained database.
        if (strtolower((string) $pdo->query('PRAGMA journal_mode')->fetchColumn()) === 'wal') {
            $pdo->exec('PRAGMA wal_checkpoint(TRUNCATE)');
        }

        $pdo->exec("VACUUM INTO '".str_replace("'", "''", $target)."'");

        $this->settings->markBackupTaken(now()->toDateTimeString());

        return $name;
    }

    /**
     * The absolute path of a stored backup.
     */
    public function path(string $name): string
    {
        return $this->backupDirectory().'/'.basename($name);
    }

    /**
     * Backups currently on disk, newest first.
     */
    public function available(): array
    {
        if (! File::isDirectory($this->backupDirectory())) {
            return [];
        }

        $files = [];

        foreach (File::files($this->backupDirectory()) as $file) {
            if (str_ends_with(strtolower($file->getFilename()), '.sqlite')) {
                $files[] = [
                    'name' => $file->getFilename(),
                    'size' => $file->getSize(),
                    'created_at' => date('Y-m-d H:i:s', $file->getMTime()),
                ];
            }
        }

        usort($files, fn ($a, $b) => strcmp($b['name'], $a['name']));

        return $files;
    }

    /**
     * Validate that a file really is a restorable POS backup.
     *
     * @return array{valid: bool, reason: ?string, tables: int, migrations: int}
     */
    public function validate(string $path): array
    {
        $result = ['valid' => false, 'reason' => null, 'tables' => 0, 'migrations' => 0];

        if (! File::isFile($path)) {
            $result['reason'] = 'The file could not be found.';

            return $result;
        }

        if (filesize($path) < 1024) {
            $result['reason'] = 'The file is too small to be a database.';

            return $result;
        }

        try {
            $pdo = new \PDO('sqlite:'.$path, null, null, [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION]);
            $pdo->exec('PRAGMA query_only = ON');

            $integrity = (string) $pdo->query('PRAGMA integrity_check')->fetchColumn();

            if ($integrity !== 'ok') {
                $result['reason'] = 'The database file is damaged (integrity check failed).';

                return $result;
            }

            $tables = $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")->fetchColumn();
            $result['tables'] = (int) $tables;

            foreach (self::REQUIRED_TABLES as $required) {
                $exists = $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='".$required."'")->fetchColumn();

                if (! $exists) {
                    $result['reason'] = 'This is not a POS backup - the "'.$required.'" table is missing.';

                    return $result;
                }
            }

            $result['migrations'] = (int) $pdo->query('SELECT COUNT(*) FROM migrations')->fetchColumn();
            $result['valid'] = true;
        } catch (\Throwable $e) {
            $result['reason'] = 'The file is not a readable SQLite database.';
        }

        return $result;
    }

    /**
     * Restore a validated backup over the live database.
     *
     * A safety copy of the current database is taken first, so the previous
     * state is always recoverable if the restore goes wrong.
     *
     * @param  string|null  $target  The database file to write over. Defaults
     *                               to the live database.
     */
    public function restore(string $path, ?string $target = null): array
    {
        $validation = $this->validate($path);

        if (! $validation['valid']) {
            throw new \RuntimeException($validation['reason'] ?? 'The backup is not valid.');
        }

        $livePath = $this->liveDatabasePath();
        $targetPath = $target ?? $livePath;
        $isLive = $target === null;

        $safetyName = 'jkc-pos-safety-before-restore-'.now()->format('Y-m-d-His').'.sqlite';
        $safetyPath = $this->path($safetyName);

        if (! File::isDirectory($this->backupDirectory())) {
            File::makeDirectory($this->backupDirectory(), 0775, true);
        }

        // 1. Safety copy of the current database.
        File::copy($targetPath, $safetyPath);

        // 2. Close every connection so the file is not held open, and drop any
        //    stale WAL/SHM side files that would otherwise be replayed on top
        //    of the restored database.
        if ($isLive) {
            DB::disconnect();
            DB::purge();
        }

        foreach (['-wal', '-shm', '-journal'] as $suffix) {
            if (File::exists($targetPath.$suffix)) {
                File::delete($targetPath.$suffix);
            }
        }

        // 3. Replace the database.
        File::copy($path, $targetPath);

        // 4. Prove the restored database is readable and complete.
        $check = $this->validate($targetPath);

        if (! $check['valid']) {
            // Put the previous database back - the client must never be left
            // with a broken system.
            File::copy($safetyPath, $targetPath);

            throw new \RuntimeException('The restore did not produce a usable database, so the previous one was put back.');
        }

        return [
            'safety_backup' => $safetyName,
            'tables' => $check['tables'],
            'migrations' => $check['migrations'],
        ];
    }

    /**
     * The path of the live database file.
     */
    public function liveDatabasePath(): string
    {
        return DB::connection()->getDatabaseName();
    }
}
