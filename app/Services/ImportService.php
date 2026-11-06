<?php

namespace App\Services;

use App\Models\Area;
use App\Models\CommissionAgent;
use App\Models\Farmer;
use App\Models\Item;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * Master data import from Excel (.xlsx) or CSV.
 *
 * The rules that protect the client's books:
 *
 *  - Only master records are importable. Ledger balances, receipts, sales and
 *    every other transaction are rejected outright, so an import can never
 *    rewrite history.
 *  - Nothing is ever overwritten. A row that matches an existing record is
 *    skipped and reported, never merged into.
 *  - Every file is parsed and checked before a single row is written, and the
 *    client sees the whole file first.
 */
class ImportService
{
    public const STATUS_ADD = 'add';

    public const STATUS_SKIP = 'skip';

    public const STATUS_REJECT = 'reject';

    /**
     * Balance columns that are never imported.
     */
    public const BLOCKED_COLUMNS = [
        'opening_balance',
        'current_balance',
        'balance',
        'amount',
        'paid',
        'paid_amount',
        'due',
        'due_amount',
        'total',
        'total_amount',
    ];

    /**
     * The master records that can be imported.
     *
     * @return array<string, array{label: string, headers: array<int, string>, sample: array<int, array<int, mixed>>}>
     */
    public function entities(): array
    {
        return [
            'farmers' => [
                'label' => 'Farmers',
                'headers' => ['code', 'name_en', 'name_ur', 'phone', 'area'],
                'sample' => [
                    ['', 'Haji Gul Merchant', 'حاجی گل ماشاخور', '0301-2345678', 'Malir'],
                    ['', 'Muhammad Raza', 'محمد رضا', '0340-2108382', 'Hyderabad'],
                ],
            ],
            'buyers' => [
                'label' => 'Buyers / Merchants',
                'headers' => ['code', 'name_en', 'name_ur', 'phone'],
                'sample' => [
                    ['', 'Bilal Traders', 'بلال ٹریڈرز', '0300-1112233'],
                    ['', 'Aslam Sabzi Farosh', 'اسلم سبزی فروش', '0302-3344556'],
                ],
            ],
            'suppliers' => [
                'label' => 'Suppliers',
                'headers' => ['code', 'name_en', 'name_ur', 'phone', 'area'],
                'sample' => [
                    ['', 'Khan Packaging', 'خان پیکنگ', '0321-5566778', 'Malir'],
                ],
            ],
            'commission_agents' => [
                'label' => 'Commission Agents',
                'headers' => ['code', 'name_en', 'name_ur', 'phone', 'area', 'commission_percent'],
                'sample' => [
                    ['', 'Haq Commission', 'حق کمیشن', '0333-7788990', 'Malir', '2.5'],
                ],
            ],
            'items' => [
                'label' => 'Items',
                'headers' => ['name_en', 'name_ur', 'unit', 'default_rate', 'default_bardana'],
                'sample' => [
                    ['Potato', 'آلو', 'Bori (Bag)', '1200', '20'],
                    ['Tomato', 'ٹماٹر', 'Peti (Crate)', '850', '15'],
                ],
            ],
        ];
    }

    /**
     * A downloadable sample template as CSV.
     */
    public function template(string $entity): string
    {
        $definition = $this->entities()[$entity] ?? null;

        if (! $definition) {
            throw new \InvalidArgumentException('Unknown import type "'.$entity.'".');
        }

        $lines = [implode(',', $definition['headers'])];

        foreach ($definition['sample'] as $row) {
            $lines[] = implode(',', array_map(fn ($value) => $this->csvValue((string) $value), $row));
        }

        return implode("\r\n", $lines)."\r\n";
    }

    /**
     * Parse and check an uploaded file without writing anything.
     *
     * @return array{rows: array<int, array{status: string, reason: ?string, data: array<string, mixed>}>, summary: array<string, int>, blocked_columns: array<int, string>, file: string}
     */
    public function preview(string $entity, UploadedFile $file): array
    {
        $definition = $this->entities()[$entity] ?? null;

        if (! $definition) {
            throw new \InvalidArgumentException('Unknown import type "'.$entity.'".');
        }

        $grid = $this->readGrid($file);

        if ($grid === []) {
            throw new \RuntimeException('The file is empty.');
        }

        $headings = array_map(
            fn ($heading) => strtolower(trim((string) $heading)),
            array_shift($grid)
        );

        $blocked = array_values(array_intersect($headings, self::BLOCKED_COLUMNS));

        $rows = [];
        $summary = [self::STATUS_ADD => 0, self::STATUS_SKIP => 0, self::STATUS_REJECT => 0];

        foreach ($grid as $line) {
            $record = [];

            foreach ($headings as $index => $heading) {
                $record[$heading] = trim((string) ($line[$index] ?? ''));
            }

            $checked = $this->check($entity, $record, $definition['headers']);

            $rows[] = $checked;
            $summary[$checked['status']]++;
        }

        return [
            'rows' => $rows,
            'summary' => $summary,
            'blocked_columns' => $blocked,
            'file' => $this->stage($entity, $file),
        ];
    }

    /**
     * Write the rows that the preview marked as "add".
     *
     * The file is parsed again here, so nothing the client sends can be
     * trusted, and duplicates are re-checked at this moment.
     */
    public function import(string $entity, string $stagedFile): array
    {
        $definition = $this->entities()[$entity] ?? null;

        if (! $definition) {
            throw new \InvalidArgumentException('Unknown import type "'.$entity.'".');
        }

        $path = $this->stagedPath($stagedFile);

        if (! File::isFile($path)) {
            throw new \RuntimeException('The uploaded file is no longer available. Please upload it again.');
        }

        $grid = $this->readGridFromPath($path);

        if ($grid === []) {
            throw new \RuntimeException('The file is empty.');
        }

        $headings = array_map(
            fn ($heading) => strtolower(trim((string) $heading)),
            array_shift($grid)
        );

        $summary = [self::STATUS_ADD => 0, self::STATUS_SKIP => 0, self::STATUS_REJECT => 0];
        $messages = [];

        DB::transaction(function () use ($grid, $headings, $entity, $definition, &$summary, &$messages) {
            foreach ($grid as $line) {
                $record = [];

                foreach ($headings as $index => $heading) {
                    $record[$heading] = trim((string) ($line[$index] ?? ''));
                }

                $checked = $this->check($entity, $record, $definition['headers']);

                if ($checked['status'] !== self::STATUS_ADD) {
                    $summary[$checked['status']]++;

                    continue;
                }

                $this->create($entity, $checked['data']);
                $summary[self::STATUS_ADD]++;
            }
        });

        File::delete($path);

        return ['summary' => $summary, 'messages' => $messages];
    }

    // ---------------------------------------------------------------------
    // Checking and creating
    // ---------------------------------------------------------------------

    /**
     * Decide what should happen to one row.
     *
     * @return array{status: string, reason: ?string, data: array<string, mixed>}
     */
    protected function check(string $entity, array $record, array $expected): array
    {
        $data = [];

        foreach ($expected as $column) {
            $data[$column] = $record[$column] ?? '';
        }

        // A row needs at least one name.
        if ($entity !== 'items') {
            if (($data['name_en'] ?? '') === '' && ($data['name_ur'] ?? '') === '') {
                return ['status' => self::STATUS_REJECT, 'reason' => 'Name (English) or Name (Urdu) is required.', 'data' => $data];
            }
        } else {
            if (($data['name_en'] ?? '') === '') {
                return ['status' => self::STATUS_REJECT, 'reason' => 'Item Name (English) is required.', 'data' => $data];
            }
        }

        // A code, when given, must be a positive whole number.
        if (isset($data['code']) && $data['code'] !== '') {
            if (! ctype_digit((string) $data['code']) || (int) $data['code'] < 1) {
                return ['status' => self::STATUS_REJECT, 'reason' => 'Code must be a whole number greater than zero.', 'data' => $data];
            }
        }

        // An area, when given, must already exist.
        if (isset($data['area']) && $data['area'] !== '') {
            $area = $this->findArea((string) $data['area']);

            if (! $area) {
                return ['status' => self::STATUS_REJECT, 'reason' => 'Area "'.$data['area'].'" does not exist.', 'data' => $data];
            }

            $data['area_id'] = $area->id;
        }

        // Numbers must be numbers.
        foreach (['commission_percent', 'default_rate', 'default_bardana'] as $numeric) {
            if (isset($data[$numeric]) && $data[$numeric] !== '' && ! is_numeric($data[$numeric])) {
                return ['status' => self::STATUS_REJECT, 'reason' => ucfirst(str_replace('_', ' ', $numeric)).' must be a number.', 'data' => $data];
            }
        }

        // Duplicates are skipped, never overwritten.
        if ($this->isDuplicate($entity, $data)) {
            return ['status' => self::STATUS_SKIP, 'reason' => 'A matching record already exists.', 'data' => $data];
        }

        return ['status' => self::STATUS_ADD, 'reason' => null, 'data' => $data];
    }

    protected function isDuplicate(string $entity, array $data): bool
    {
        $code = $data['code'] ?? '';
        $name = trim((string) ($data['name_en'] ?? ''));

        return match ($entity) {
            'farmers' => $this->exists(Farmer::class, $code, $name),
            'buyers' => $this->exists(Merchant::class, $code, $name),
            'suppliers' => $this->exists(JkcSupplier::class, $code, $name),
            'commission_agents' => $this->exists(CommissionAgent::class, $code, $name),
            'items' => Item::withTrashed()->whereRaw('LOWER(name_en) = ?', [mb_strtolower($name)])->exists(),
            default => false,
        };
    }

    protected function exists(string $model, string $code, string $name): bool
    {
        if ($code !== '') {
            return $model::withTrashed()->where('code', (int) $code)->exists();
        }

        if ($name === '') {
            return false;
        }

        return $model::withTrashed()->whereRaw('LOWER(name_en) = ?', [mb_strtolower($name)])->exists();
    }

    /**
     * Create one record.
     */
    protected function create(string $entity, array $data): void
    {
        $code = ($data['code'] ?? '') === '' ? null : (int) $data['code'];

        match ($entity) {
            'farmers' => Farmer::create([
                'code' => $code,
                'name_en' => $data['name_en'] ?: null,
                'name_ur' => $data['name_ur'] ?: null,
                'phone' => $data['phone'] ?: null,
                'area_id' => $data['area_id'] ?? null,
                'status' => 'active',
            ]),
            'buyers' => Merchant::create([
                'code' => $code,
                'name_en' => $data['name_en'] ?: null,
                'name_ur' => $data['name_ur'] ?: null,
                'phone' => $data['phone'] ?: null,
                'status' => 'active',
            ]),
            'suppliers' => JkcSupplier::create([
                'code' => $code,
                'name_en' => $data['name_en'] ?: null,
                'name_ur' => $data['name_ur'] ?: null,
                'phone' => $data['phone'] ?: null,
                'area_id' => $data['area_id'] ?? null,
                'status' => 'active',
            ]),
            'commission_agents' => CommissionAgent::create([
                'code' => $code,
                'name_en' => $data['name_en'] ?: null,
                'name_ur' => $data['name_ur'] ?: null,
                'phone' => $data['phone'] ?: null,
                'area_id' => $data['area_id'] ?? null,
                'commission_percent' => ($data['commission_percent'] ?? '') === '' ? null : (float) $data['commission_percent'],
                'status' => 'active',
            ]),
            'items' => Item::create([
                'name_en' => $data['name_en'],
                'name_ur' => $data['name_ur'] ?: null,
                'unit' => $data['unit'] ?: 'Nag',
                'default_rate' => ($data['default_rate'] ?? '') === '' ? null : (float) $data['default_rate'],
                'default_bardana' => ($data['default_bardana'] ?? '') === '' ? null : (float) $data['default_bardana'],
                'status' => 'active',
            ]),
            default => throw new \InvalidArgumentException('Unknown import type "'.$entity.'".'),
        };
    }

    protected function findArea(string $name): ?Area
    {
        return Area::query()
            ->whereRaw('LOWER(name_en) = ?', [mb_strtolower($name)])
            ->orWhereRaw('LOWER(name_ur) = ?', [mb_strtolower($name)])
            ->first();
    }

    // ---------------------------------------------------------------------
    // File handling
    // ---------------------------------------------------------------------

    /**
     * Read an uploaded file into a grid of rows.
     */
    protected function readGrid(UploadedFile $file): array
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension === 'csv') {
            return $this->readCsv($file->getRealPath());
        }

        if ($extension === 'xlsx') {
            return Xlsx::read($file->getRealPath());
        }

        throw new \RuntimeException('Only .csv and .xlsx files can be imported.');
    }

    protected function readGridFromPath(string $path): array
    {
        return strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'csv'
            ? $this->readCsv($path)
            : Xlsx::read($path);
    }

    protected function readCsv(string $path): array
    {
        $rows = [];

        $handle = fopen($path, 'r');

        if ($handle === false) {
            throw new \RuntimeException('The file could not be opened.');
        }

        while (($row = fgetcsv($handle, 0, ',', '"', '')) !== false) {
            if ($row === [null] || $row === []) {
                continue;
            }

            $rows[] = array_map(fn ($value) => (string) $value, $row);
        }

        fclose($handle);

        return $rows;
    }

    /**
     * Keep the uploaded file so the confirmation step can read it again.
     */
    protected function stage(string $entity, UploadedFile $file): string
    {
        $directory = storage_path('app/private/imports');

        if (! File::isDirectory($directory)) {
            File::makeDirectory($directory, 0775, true);
        }

        $name = Str::uuid()->toString().'.'.strtolower($file->getClientOriginalExtension() ?: 'csv');
        $file->move($directory, $name);

        return $name;
    }

    protected function stagedPath(string $name): string
    {
        return storage_path('app/private/imports/'.basename($name));
    }

    protected function csvValue(string $value): string
    {
        if (preg_match('/[",\r\n]/', $value)) {
            return '"'.str_replace('"', '""', $value).'"';
        }

        return $value;
    }
}
