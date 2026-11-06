<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\BusinessSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BusinessSettingsController extends Controller
{
    public function __construct(
        protected BusinessSettingsService $settings,
    ) {}

    /**
     * The settings page.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('settings/index', [
            'settings' => $this->settings->all(),
            'business' => $this->settings->business(),
            'locale' => $request->user()?->locale ?? session('locale', 'en'),
            'paperSizes' => [
                'a4' => 'A4 (210 x 297 mm)',
                'thermal' => 'Thermal (80 mm roll)',
            ],
            'dateFormats' => [
                'd-m-Y' => '31-10-2026',
                'Y-m-d' => '2026-10-31',
                'm-d-Y' => '10-31-2026',
            ],
        ]);
    }

    /**
     * Save the settings.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'business_name' => 'required|string|max:255',
            'business_name_ur' => 'nullable|string|max:255',
            'business_tagline' => 'nullable|string|max:255',
            'business_tagline_ur' => 'nullable|string|max:255',
            'business_address' => 'nullable|string|max:255',
            'business_phone' => 'nullable|string|max:255',
            'business_phone2' => 'nullable|string|max:255',
            'default_paper_size' => 'required|in:a4,thermal',
            'show_business_info' => 'required|boolean',
            'date_format' => 'required|in:d-m-Y,Y-m-d,m-d-Y',
            'locale' => 'required|in:en,ur',
        ]);

        $this->settings->setMany([
            'business_name' => $validated['business_name'],
            'business_name_ur' => $validated['business_name_ur'] ?? '',
            'business_tagline' => $validated['business_tagline'] ?? '',
            'business_tagline_ur' => $validated['business_tagline_ur'] ?? '',
            'business_address' => $validated['business_address'] ?? '',
            'business_phone' => $validated['business_phone'] ?? '',
            'business_phone2' => $validated['business_phone2'] ?? '',
            'default_paper_size' => $validated['default_paper_size'],
            'show_business_info' => $validated['show_business_info'] ? '1' : '0',
            'date_format' => $validated['date_format'],
        ]);

        // The language lives on the user, exactly like the existing language
        // switcher does it.
        $locale = $validated['locale'];
        session(['locale' => $locale]);

        if ($request->user()) {
            $request->user()->update(['locale' => $locale]);
        }

        return back()->with('success', 'Settings saved.');
    }

    /**
     * Upload or replace the business logo.
     */
    public function logo(Request $request): RedirectResponse
    {
        $request->validate([
            'logo' => 'required|image|mimes:png,jpg,jpeg,svg|max:2048',
        ]);

        $path = $this->settings->storeLogo($request->file('logo'));
        $this->settings->set('business_logo', $path);

        return back()->with('success', 'Logo updated.');
    }

    /**
     * Remove the business logo.
     */
    public function removeLogo(): RedirectResponse
    {
        $this->settings->removeLogoFile();
        $this->settings->set('business_logo', '');

        return back()->with('success', 'Logo removed.');
    }
}
