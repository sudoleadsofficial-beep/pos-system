<?php

namespace Tests\Feature\System;

use App\Models\AmrozaSale;
use App\Models\Farmer;
use App\Models\Item;
use App\Models\Merchant;
use App\Models\User;
use App\Services\BusinessSettingsService;
use App\Services\ExportService;
use App\Support\Xlsx;
use App\Support\Zip;
use Tests\TestCase;

/**
 * Excel and PDF exports, and the Export All archive.
 */
class ExportTest extends TestCase
{
    use \Illuminate\Foundation\Testing\RefreshDatabase;

    protected function seedData(): void
    {
        $merchant = Merchant::create([
            'code' => 2, 'name_en' => 'Bilal Traders', 'name_ur' => 'بلال ٹریڈرز',
            'phone' => '0300-1234567', 'opening_balance' => 5000,
        ]);

        $farmer = Farmer::create([
            'code' => 2, 'name_en' => 'Haji Gul', 'name_ur' => 'حاجی گل', 'opening_balance' => 1000,
        ]);

        $item = Item::create([
            'name_en' => 'Potato', 'name_ur' => 'آلو', 'unit' => 'Bori (Bag)',
            'default_rate' => 1200, 'default_bardana' => 20,
        ]);

        $sale = AmrozaSale::create([
            'date' => '2026-01-01', 'merchant_id' => $merchant->id, 'item_id' => $item->id,
            'nag' => 10, 'weight' => 40, 'rate' => 1200, 'bardana' => 200,
            'payment_type' => 'udhaar',
        ]);

        $this->assertSame(12200.0, (float) $sale->gross_amount);
    }

    public function test_every_category_can_be_exported_as_excel()
    {
        $this->seedData();

        $response = $this->actingAs(User::factory()->create())
            ->get('/system/export/farmers/excel');

        $response->assertOk();
        $response->assertHeader('content-disposition');

        $content = $response->getContent();
        $this->assertStringStartsWith('PK', $content, 'An xlsx file is a zip archive.');

        $path = tempnam(sys_get_temp_dir(), 'exp').'.xlsx';
        file_put_contents($path, $content);

        $rows = Xlsx::read($path);
        $this->assertSame('Code', $rows[0][0]);
        $this->assertContains('Haji Gul', array_map(fn ($row) => $row[1] ?? '', $rows));

        unlink($path);
    }

    public function test_the_excel_export_keeps_numbers_numeric()
    {
        $this->seedData();

        $content = $this->actingAs(User::factory()->create())
            ->get('/system/export/amroza_sales/excel')
            ->getContent();

        $path = tempnam(sys_get_temp_dir(), 'exp').'.xlsx';
        file_put_contents($path, $content);

        $rows = Xlsx::read($path);
        $header = array_search('Gross Amount', $rows[0], true);
        $this->assertNotFalse($header);

        // The amount is a number, not a picture or a text blob.
        $this->assertEqualsWithDelta(12200.0, (float) $rows[1][$header], 0.01);

        unlink($path);
    }

    public function test_every_category_can_be_exported_as_a_pdf()
    {
        $this->seedData();

        $response = $this->actingAs(User::factory()->create())
            ->get('/system/export/farmers/pdf');

        $response->assertOk();
        $content = $response->getContent();

        $this->assertStringStartsWith('%PDF-', $content, 'The export must be a real PDF.');
        $this->assertGreaterThan(1000, strlen($content));
    }

    public function test_the_pdf_carries_the_business_information()
    {
        $this->seedData();

        app(BusinessSettingsService::class)->setMany([
            'business_name' => 'Sabzi Mandi Traders',
            'business_address' => 'Shop 4, New Sabzi Mandi, Karachi',
            'business_phone' => '0300-1234567',
            'show_business_info' => '1',
        ]);

        $content = $this->actingAs(User::factory()->create())
            ->get('/system/export/farmers/pdf')
            ->getContent();

        // The PDF itself is a real document...
        $this->assertStringStartsWith('%PDF-', $content);

        // ...and the business information is really in the printed layout.
        $html = app(ExportService::class)->pdfHtml('farmers');

        $this->assertStringContainsString('Sabzi Mandi Traders', $html);
        $this->assertStringContainsString('Shop 4, New Sabzi Mandi, Karachi', $html);
        $this->assertStringContainsString('0300-1234567', $html);
        $this->assertStringContainsString('Farmers', $html);
        $this->assertStringContainsString('Opening Balance', $html);
    }

    public function test_the_business_information_can_be_left_out_of_the_pdf()
    {
        $this->seedData();

        app(BusinessSettingsService::class)->setMany([
            'business_name' => 'Sabzi Mandi Traders',
            'show_business_info' => '0',
        ]);

        $html = app(ExportService::class)->pdfHtml('farmers');

        $this->assertStringNotContainsString('Sabzi Mandi Traders', $html);
        // The report itself is still there.
        $this->assertStringContainsString('Farmers', $html);
    }

    public function test_export_all_produces_one_archive_with_folders_and_a_readme()
    {
        $this->seedData();

        $response = $this->actingAs(User::factory()->create())->get('/system/export/all');

        $response->assertOk();

        $content = $response->getContent();
        $this->assertStringStartsWith('PK', $content);

        $path = tempnam(sys_get_temp_dir(), 'all').'.zip';
        file_put_contents($path, $content);

        $entries = Zip::read($path);

        $this->assertArrayHasKey('README.txt', $entries);
        $this->assertStringContainsString('Sabzi Mandi POS', $entries['README.txt']);
        $this->assertStringContainsString('Farmers', $entries['README.txt']);

        // The folders are named by category and hold both formats.
        $this->assertArrayHasKey('Excel/Farmers/Farmers.xlsx', $entries);
        $this->assertArrayHasKey('PDF/Farmers/Farmers.pdf', $entries);
        $this->assertArrayHasKey('Excel/Amroza_Sales/Amroza_Sales.xlsx', $entries);

        // No secrets or application files are included.
        foreach (array_keys($entries) as $name) {
            $this->assertStringNotContainsString('.env', $name);
            $this->assertStringNotContainsString('vendor', $name);
            $this->assertStringNotContainsString('storage', $name);
        }

        unlink($path);
    }

    public function test_an_unknown_category_is_not_exported()
    {
        $this->actingAs(User::factory()->create())
            ->get('/system/export/not_a_category/excel')
            ->assertNotFound();
    }

    public function test_the_export_needs_a_signed_in_user()
    {
        $this->get('/system/export/farmers/excel')->assertRedirect('/login');
    }
}
