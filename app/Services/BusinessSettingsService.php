<?php

namespace App\Services;

use App\Models\Option;
use Illuminate\Support\Facades\File;

/**
 * Business, display and printing settings.
 *
 * The project already ships an `options` key/value table, so the runtime
 * settings live there instead of a new table. config('jkc.company') stays the
 * fallback for anything the user has not set, so a fresh install still shows
 * the mandi's details.
 */
class BusinessSettingsService
{
    public const CATEGORY = 'business';

    public const CATEGORY_BACKUP = 'backup';

    /**
     * Every setting this service owns, with its fallback value.
     */
    public static function defaults(): array
    {
        $company = config('jkc.company', []);

        return [
            'business_name' => $company['name_en'] ?? 'Sabzi Mandi',
            'business_name_ur' => $company['name_ur'] ?? 'سبزی منڈی',
            'business_tagline' => $company['tagline_en'] ?? '',
            'business_tagline_ur' => $company['tagline_ur'] ?? '',
            'business_address' => $company['address'] ?? '',
            'business_phone' => '0303-8598049',
            'business_phone2' => '0318-8598049',
            'business_logo' => '',
            'default_paper_size' => 'a4',
            'show_business_info' => '1',
            'date_format' => 'd-m-Y',
        ];
    }

    /**
     * All settings, stored values overriding the defaults.
     */
    public function all(): array
    {
        $stored = Option::query()
            ->where('meta_category', self::CATEGORY)
            ->pluck('meta_value', 'meta_key')
            ->all();

        return array_merge(self::defaults(), array_map('strval', $stored));
    }

    /**
     * One setting.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        $all = $this->all();

        return $all[$key] ?? $default;
    }

    /**
     * Store one setting.
     */
    public function set(string $key, ?string $value): void
    {
        Option::updateOrCreate(
            ['meta_key' => $key],
            [
                'meta_value' => (string) $value,
                'meta_category' => self::CATEGORY,
            ]
        );
    }

    /**
     * Store several settings at once.
     */
    public function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            $this->set((string) $key, $value === null ? null : (string) $value);
        }
    }

    /**
     * The branding block used by the banner, the logo and every printout.
     */
    public function business(): array
    {
        $settings = $this->all();

        return [
            'name' => $settings['business_name'],
            'name_ur' => $settings['business_name_ur'],
            'tagline' => $settings['business_tagline'],
            'tagline_ur' => $settings['business_tagline_ur'],
            'address' => $settings['business_address'],
            'phone' => $settings['business_phone'],
            'phone2' => $settings['business_phone2'],
            'logo' => $settings['business_logo'],
            'show_on_print' => $settings['show_business_info'] === '1',
        ];
    }

    /**
     * The paper size used for PDF exports: thermal or A4.
     */
    public function paperSize(): string
    {
        return $this->get('default_paper_size', 'a4') === 'thermal' ? 'thermal' : 'a4';
    }

    /**
     * The date format the client prefers.
     */
    public function dateFormat(): string
    {
        $format = $this->get('date_format', 'd-m-Y');

        return in_array($format, ['d-m-Y', 'Y-m-d', 'm-d-Y'], true) ? $format : 'd-m-Y';
    }

    /**
     * Format a date with the configured preference.
     */
    public function formatDate(mixed $date, ?string $fallback = null): string
    {
        if (empty($date)) {
            return $fallback ?? '';
        }

        try {
            return \Illuminate\Support\Carbon::parse($date)->format($this->dateFormat());
        } catch (\Throwable) {
            return $fallback ?? (string) $date;
        }
    }

    /**
     * Save an uploaded business logo and return its public path.
     */
    public function storeLogo(\Illuminate\Http\UploadedFile $file): string
    {
        $directory = public_path('images/business');

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0775, true);
        }

        $this->removeLogoFile();

        $name = 'logo.'.strtolower($file->getClientOriginalExtension() ?: 'png');
        $file->move($directory, $name);

        return 'images/business/'.$name;
    }

    /**
     * Delete the stored logo file, if there is one.
     */
    public function removeLogoFile(): void
    {
        $current = $this->get('business_logo', '');

        if ($current === '' || ! str_starts_with($current, 'images/business/')) {
            return;
        }

        $path = public_path($current);

        if (File::isFile($path)) {
            File::delete($path);
        }
    }

    /**
     * When the last successful backup was taken.
     */
    public function lastBackupAt(): ?string
    {
        $value = Option::query()
            ->where('meta_key', 'backup_last_at')
            ->value('meta_value');

        return $value ?: null;
    }

    /**
     * Record that a backup was taken.
     */
    public function markBackupTaken(string $timestamp): void
    {
        Option::updateOrCreate(
            ['meta_key' => 'backup_last_at'],
            [
                'meta_value' => $timestamp,
                'meta_category' => self::CATEGORY_BACKUP,
            ]
        );
    }
}
