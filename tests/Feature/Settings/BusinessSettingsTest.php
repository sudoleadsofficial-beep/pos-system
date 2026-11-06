<?php

namespace Tests\Feature\Settings;

use App\Models\Option;
use App\Models\User;
use App\Services\BusinessSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * The settings page: business information, display, printing and general.
 */
class BusinessSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_settings_page_renders()
    {
        $response = $this->actingAs(User::factory()->create())->get('/settings');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('settings/index')
            ->has('settings')
            ->has('business')
            ->has('paperSizes')
            ->has('dateFormats')
        );
    }

    public function test_business_information_is_saved_and_reloaded()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/settings', [
            'business_name' => 'Sabzi Mandi Traders',
            'business_name_ur' => 'سبزی منڈی ٹریڈرز',
            'business_tagline' => 'Vegetable Commission Agent',
            'business_tagline_ur' => 'سبزی کمیشن ایجنٹ',
            'business_address' => 'Shop 4, New Sabzi Mandi, Karachi',
            'business_phone' => '0300-1234567',
            'business_phone2' => '0321-7654321',
            'default_paper_size' => 'thermal',
            'show_business_info' => true,
            'date_format' => 'Y-m-d',
            'locale' => 'en',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Stored in the options table.
        $stored = Option::where('meta_key', 'business_name')->value('meta_value');
        $this->assertSame('Sabzi Mandi Traders', $stored);

        // And read back on the next visit.
        $this->actingAs($user)->get('/settings')
            ->assertInertia(fn ($page) => $page
                ->where('settings.business_name', 'Sabzi Mandi Traders')
                ->where('settings.business_phone2', '0321-7654321')
                ->where('settings.default_paper_size', 'thermal')
                ->where('settings.date_format', 'Y-m-d')
            );
    }

    public function test_printing_preferences_are_saved()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings', [
            'business_name' => 'Sabzi Mandi Traders',
            'default_paper_size' => 'thermal',
            'show_business_info' => false,
            'date_format' => 'd-m-Y',
            'locale' => 'en',
        ])->assertRedirect();

        $settings = app(BusinessSettingsService::class)->all();

        $this->assertSame('thermal', $settings['default_paper_size']);
        $this->assertSame('0', $settings['show_business_info']);
        $this->assertSame('d-m-Y', $settings['date_format']);
    }

    public function test_the_language_choice_is_remembered_for_the_user()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings', [
            'business_name' => 'Sabzi Mandi Traders',
            'default_paper_size' => 'a4',
            'show_business_info' => true,
            'date_format' => 'd-m-Y',
            'locale' => 'ur',
        ])->assertRedirect();

        $this->assertSame('ur', $user->fresh()->locale);
    }

    public function test_the_business_information_is_shared_with_the_frontend()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings', [
            'business_name' => 'Sabzi Mandi Traders',
            'business_address' => 'Shop 4, New Sabzi Mandi, Karachi',
            'business_phone' => '0300-1234567',
            'default_paper_size' => 'a4',
            'show_business_info' => true,
            'date_format' => 'd-m-Y',
            'locale' => 'en',
        ])->assertRedirect();

        // The shared prop is what the banner, the logo and the print
        // letterhead read.
        $this->actingAs($user)->get('/settings')
            ->assertInertia(fn ($page) => $page
                ->where('business.name', 'Sabzi Mandi Traders')
                ->where('business.address', 'Shop 4, New Sabzi Mandi, Karachi')
                ->where('business.phone', '0300-1234567')
                ->where('business.show_on_print', true)
            );
    }

    public function test_the_print_letterhead_receives_the_business_information()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings', [
            'business_name' => 'Sabzi Mandi Traders',
            'default_paper_size' => 'a4',
            'show_business_info' => true,
            'date_format' => 'd-m-Y',
            'locale' => 'en',
        ])->assertRedirect();

        // A report page that prints a letterhead.
        $this->actingAs($user)->get('/amroza-detail')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('business.name', 'Sabzi Mandi Traders')
            );
    }

    public function test_a_logo_can_be_uploaded_and_removed()
    {
        $user = User::factory()->create();

        $file = UploadedFile::fake()->image('logo.png', 120, 120);

        $this->actingAs($user)->post('/settings/logo', ['logo' => $file])
            ->assertRedirect()
            ->assertSessionHas('success');

        $path = app(BusinessSettingsService::class)->get('business_logo');
        $this->assertNotSame('', $path);
        $this->assertFileExists(public_path($path));

        $this->actingAs($user)->delete('/settings/logo')
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame('', app(BusinessSettingsService::class)->get('business_logo'));
        $this->assertFileDoesNotExist(public_path($path));
    }

    public function test_the_defaults_are_used_when_nothing_has_been_set()
    {
        $settings = app(BusinessSettingsService::class)->all();

        $this->assertSame(config('jkc.company.name_en'), $settings['business_name']);
        $this->assertSame('a4', $settings['default_paper_size']);
        $this->assertSame('d-m-Y', $settings['date_format']);
    }
}
