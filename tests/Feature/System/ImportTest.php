<?php

namespace Tests\Feature\System;

use App\Models\Area;
use App\Models\Farmer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Master data import from Excel and CSV.
 */
class ImportTest extends TestCase
{
    use RefreshDatabase;

    protected function csv(string $contents): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('farmers.csv', $contents);
    }

    public function test_the_import_page_renders()
    {
        $response = $this->actingAs(User::factory()->create())->get('/system/import');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('system/import/index')
            ->has('entities')
        );
    }

    public function test_a_sample_template_can_be_downloaded()
    {
        $response = $this->actingAs(User::factory()->create())
            ->get('/system/import/template/farmers');

        $response->assertOk();
        $response->assertHeader('content-disposition');

        $content = $response->getContent();
        $this->assertStringContainsString('code,name_en,name_ur,phone,area', $content);
        $this->assertStringContainsString('Haji Gul Merchant', $content);
    }

    public function test_the_preview_shows_what_will_happen()
    {
        Area::create(['name_en' => 'Malir', 'name_ur' => 'مالیر']);

        $file = $this->csv("code,name_en,name_ur,phone,area\n"
            .",Haji Gul,حاجی گل,0300-1111111,Malir\n"
            .",Aslam,اسلم,0300-2222222,Malir\n");

        $response = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('system/import/preview')
            ->where('entity', 'farmers')
            ->where('summary.add', 2)
            ->where('summary.skip', 0)
            ->where('summary.reject', 0)
            ->has('rows', 2)
        );
    }

    public function test_a_row_without_a_name_is_rejected()
    {
        $file = $this->csv("code,name_en,name_ur,phone,area\n,,,0300-1111111,\n");

        $response = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('summary.add', 0)
            ->where('summary.reject', 1)
            ->where('rows.0.reason', 'Name (English) or Name (Urdu) is required.')
        );
    }

    public function test_a_row_with_an_unknown_area_is_rejected()
    {
        $file = $this->csv("code,name_en,name_ur,phone,area\n,Haji Gul,حاجی گل,0300-1111111,Nowhere\n");

        $response = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('summary.reject', 1)
            ->where('rows.0.reason', 'Area "Nowhere" does not exist.')
        );
    }

    public function test_an_existing_record_is_skipped_and_never_overwritten()
    {
        $existing = Farmer::create([
            'code' => 5, 'name_en' => 'Haji Gul', 'name_ur' => 'حاجی گل',
            'phone' => '0300-OLD', 'opening_balance' => 999,
        ]);

        $file = $this->csv("code,name_en,name_ur,phone,area\n5,Haji Gul,حاجی گل,0300-NEW,\n");

        $response = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('summary.add', 0)
            ->where('summary.skip', 1)
        );

        // Nothing was written.
        $this->assertSame(1, Farmer::count());
        $this->assertSame('0300-OLD', $existing->fresh()->phone);
        $this->assertSame(999.0, (float) $existing->fresh()->opening_balance);
    }

    public function test_balance_columns_are_reported_and_never_imported()
    {
        $file = $this->csv("code,name_en,name_ur,phone,area,opening_balance,current_balance\n"
            .",Haji Gul,حاجی گل,0300-1111111,,5000,5000\n");

        $response = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('summary.add', 1)
        );

        $blocked = $response->viewData('page')['props']['blockedColumns'];
        $this->assertContains('opening_balance', $blocked);
        $this->assertContains('current_balance', $blocked);
    }

    public function test_confirming_the_import_adds_only_the_new_records()
    {
        Farmer::create([
            'code' => 5, 'name_en' => 'Existing One', 'name_ur' => 'موجودہ', 'phone' => '0300-ORIGINAL',
        ]);

        $file = $this->csv("code,name_en,name_ur,phone,area\n"
            .",Existing One,موجودہ,0300-OLD,\n"
            .",New One,نیا,0300-NEW,\n"
            .",,,\n");

        $preview = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $stagedFile = $preview->viewData('page')['props']['stagedFile'];
        $this->assertNotEmpty($stagedFile);

        $response = $this->actingAs(User::factory()->create())->post('/system/import', [
            'entity' => 'farmers',
            'stagedFile' => $stagedFile,
            'confirmation' => true,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // One new farmer, the existing one untouched, the bad row not saved.
        $this->assertSame(2, Farmer::count());
        $this->assertSame('0300-ORIGINAL', Farmer::where('name_en', 'Existing One')->first()->phone);
        $this->assertSame('0300-NEW', Farmer::where('name_en', 'New One')->first()->phone);
    }

    public function test_importing_the_same_file_twice_does_not_create_duplicates()
    {
        $file = $this->csv("code,name_en,name_ur,phone,area\n,Haji Gul,حاجی گل,0300-1111111,\n");

        $preview = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $this->actingAs(User::factory()->create())->post('/system/import', [
            'entity' => 'farmers',
            'stagedFile' => $preview->viewData('page')['props']['stagedFile'],
            'confirmation' => true,
        ])->assertRedirect();

        $this->assertSame(1, Farmer::count());

        // The same rows again are skipped, not added.
        $second = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $this->csv("code,name_en,name_ur,phone,area\n,Haji Gul,حاجی گل,0300-1111111,\n"),
        ]);

        $this->actingAs(User::factory()->create())->post('/system/import', [
            'entity' => 'farmers',
            'stagedFile' => $second->viewData('page')['props']['stagedFile'],
            'confirmation' => true,
        ])->assertRedirect();

        $this->assertSame(1, Farmer::count());
    }

    public function test_ledger_balances_are_never_imported()
    {
        $file = $this->csv("code,name_en,name_ur,phone,area,opening_balance\n"
            .",Haji Gul,حاجی گل,0300-1111111,,77000\n");

        $preview = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $file,
        ]);

        $this->actingAs(User::factory()->create())->post('/system/import', [
            'entity' => 'farmers',
            'stagedFile' => $preview->viewData('page')['props']['stagedFile'],
            'confirmation' => true,
        ])->assertRedirect();

        $farmer = Farmer::first();
        $this->assertSame(0.0, (float) $farmer->opening_balance, 'A balance must never be imported.');
    }

    public function test_items_can_be_imported()
    {
        $file = $this->csv("name_en,name_ur,unit,default_rate,default_bardana\n"
            ."Onion,پیاز,Bori (Bag),1500,20\n");

        $preview = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'items',
            'file' => $file,
        ]);

        $this->actingAs(User::factory()->create())->post('/system/import', [
            'entity' => 'items',
            'stagedFile' => $preview->viewData('page')['props']['stagedFile'],
            'confirmation' => true,
        ])->assertRedirect();

        $this->assertDatabaseHas('items', ['name_en' => 'Onion', 'default_rate' => 1500]);
    }

    public function test_a_pdf_cannot_be_used_as_a_data_import()
    {
        $pdf = UploadedFile::fake()->create('data.pdf', 10, 'application/pdf');

        $response = $this->actingAs(User::factory()->create())->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $pdf,
        ]);

        $response->assertSessionHasErrors('file');
        $this->assertSame(0, Farmer::count());
    }

    public function test_the_import_needs_a_signed_in_user()
    {
        $this->post('/system/import/preview', [
            'entity' => 'farmers',
            'file' => $this->csv("code,name_en\n,Ali\n"),
        ])->assertRedirect('/login');
    }
}
