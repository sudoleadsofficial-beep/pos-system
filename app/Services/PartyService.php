<?php

namespace App\Services;

use App\Models\CommissionAgent;
use App\Models\Farmer;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Party registry.
 *
 * Every party type keeps its own table (its own "home"). This service knows
 * which table belongs to which type and can read all of them together for the
 * unified Party Management screen.
 */
class PartyService
{
    public const FARMER = 'farmer';

    public const SUPPLIER = 'supplier';

    public const BUYER = 'buyer';

    public const COMMISSION_AGENT = 'commission_agent';

    /**
     * type => [model class, table, has area, sort order]
     *
     * All four tables share the same column names for the fields Party
     * Management shows: code, name_en, name_ur, phone, opening_balance,
     * current_balance, status.
     */
    protected const TYPES = [
        self::FARMER => [
            'model' => Farmer::class,
            'table' => 'farmers',
            'has_area' => true,
            'sort' => 1,
        ],
        self::SUPPLIER => [
            'model' => JkcSupplier::class,
            'table' => 'jkc_suppliers',
            'has_area' => true,
            'sort' => 2,
        ],
        self::BUYER => [
            'model' => Merchant::class,
            'table' => 'merchants',
            'has_area' => false,
            'sort' => 3,
        ],
        self::COMMISSION_AGENT => [
            'model' => CommissionAgent::class,
            'table' => 'commission_agents',
            'has_area' => true,
            'sort' => 4,
        ],
    ];

    public static function types(): array
    {
        return array_keys(self::TYPES);
    }

    public static function isValidType(?string $type): bool
    {
        return $type !== null && array_key_exists($type, self::TYPES);
    }

    public static function modelFor(string $type): string
    {
        if (! self::isValidType($type)) {
            throw new \InvalidArgumentException("Unknown party type [{$type}].");
        }

        return self::TYPES[$type]['model'];
    }

    public static function tableFor(string $type): string
    {
        if (! self::isValidType($type)) {
            throw new \InvalidArgumentException("Unknown party type [{$type}].");
        }

        return self::TYPES[$type]['table'];
    }

    /**
     * Find one party of the given type.
     */
    public static function find(string $type, int $id): ?Model
    {
        $model = self::modelFor($type);
        $query = $model::query();

        // Only the tables that carry an area_id have an area relation.
        if (self::TYPES[$type]['has_area']) {
            $query->with('area');
        }

        return $query->find($id);
    }

    /**
     * Normalise a party model into the shape the screens expect.
     */
    public static function normalize(string $type, Model $party): array
    {
        $area = null;
        if (isset(self::TYPES[$type]['has_area']) && self::TYPES[$type]['has_area']) {
            $areaModel = $party->area;
            if ($areaModel) {
                $area = [
                    'id' => $areaModel->id,
                    'name_en' => $areaModel->name_en,
                    'name_ur' => $areaModel->name_ur,
                    'name' => $areaModel->name,
                ];
            }
        }

        return [
            'type' => $type,
            'id' => $party->id,
            'code' => (int) $party->code,
            'name_en' => $party->name_en,
            'name_ur' => $party->name_ur,
            'name' => $party->name,
            'phone' => $party->phone,
            'area_id' => $party->area_id ?? null,
            'area' => $area,
            'opening_balance' => (float) $party->opening_balance,
            'current_balance' => (float) $party->current_balance,
            'status' => $party->status,
        ];
    }

    /**
     * Unified party list across every party table.
     *
     * Supports: search (code / English name / Urdu name / phone), type,
     * area, status and balance filters, plus pagination.
     *
     * @return array{rows: array, total: int, page: int, per_page: int, last_page: int}
     */
    public static function list(array $filters = []): array
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $type = $filters['type'] ?? null;
        $areaId = $filters['area_id'] ?? null;
        $status = $filters['status'] ?? null;
        $balance = $filters['balance'] ?? null;
        $perPage = max(1, (int) ($filters['per_page'] ?? 15));
        $page = max(1, (int) ($filters['page'] ?? 1));

        $union = self::unionSql();

        if ($union === '') {
            return ['rows' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage, 'last_page' => 1];
        }

        $where = [];
        $bindings = [];

        if ($search !== '') {
            $where[] = '(p.code LIKE ? OR p.name_en LIKE ? OR p.name_ur LIKE ? OR p.phone LIKE ?)';
            $like = "%{$search}%";
            array_push($bindings, $like, $like, $like, $like);
        }

        if (self::isValidType($type)) {
            $where[] = 'p.party_type = ?';
            $bindings[] = $type;
        }

        if ($areaId !== null && $areaId !== '') {
            $where[] = 'p.area_id = ?';
            $bindings[] = (int) $areaId;
        }

        if ($status !== null && $status !== '') {
            $where[] = 'p.status = ?';
            $bindings[] = $status;
        }

        if ($balance === 'with_balance') {
            $where[] = 'p.current_balance <> 0';
        } elseif ($balance === 'without_balance') {
            $where[] = 'p.current_balance = 0';
        }

        $whereSql = $where ? ' WHERE '.implode(' AND ', $where) : '';

        $total = (int) DB::selectOne(
            "SELECT COUNT(*) AS total FROM ({$union}) AS p{$whereSql}",
            $bindings
        )->total;

        $offset = ($page - 1) * $perPage;

        $rows = DB::select(
            "SELECT * FROM ({$union}) AS p{$whereSql} ORDER BY p.sort_order, p.code LIMIT ? OFFSET ?",
            array_merge($bindings, [$perPage, $offset])
        );

        return [
            'rows' => array_map(fn ($row) => self::normalizeRow($row), $rows),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => max(1, (int) ceil($total / $perPage)),
        ];
    }

    /**
     * Build the UNION ALL that reads every party table at once.
     *
     * Tables that have not been migrated yet are skipped, so the screen keeps
     * working while the new migrations are still being rolled out.
     */
    protected static function unionSql(): string
    {
        $branches = [];

        foreach (self::TYPES as $typeKey => $config) {
            $table = $config['table'];

            if (! Schema::hasTable($table)) {
                continue;
            }

            $areaColumns = $config['has_area']
                ? 't.area_id AS area_id, a.name_en AS area_name_en, a.name_ur AS area_name_ur'
                : 'NULL AS area_id, NULL AS area_name_en, NULL AS area_name_ur';

            $areaJoin = $config['has_area']
                ? 'LEFT JOIN areas a ON a.id = t.area_id'
                : '';

            $branches[] = "SELECT {$config['sort']} AS sort_order, '{$typeKey}' AS party_type,"
                .' t.id AS id, t.code AS code, t.name_en AS name_en, t.name_ur AS name_ur, t.phone AS phone,'
                .' t.opening_balance AS opening_balance, t.current_balance AS current_balance,'
                ." t.status AS status, {$areaColumns}"
                ." FROM {$table} t {$areaJoin}"
                .' WHERE t.deleted_at IS NULL';
        }

        return implode(' UNION ALL ', $branches);
    }

    /**
     * Turn a raw union row into the shape the screens expect.
     */
    protected static function normalizeRow(object $row): array
    {
        return [
            'type' => $row->party_type,
            'id' => (int) $row->id,
            'code' => (int) $row->code,
            'name_en' => $row->name_en,
            'name_ur' => $row->name_ur,
            'name' => self::displayName($row->name_en, $row->name_ur),
            'phone' => $row->phone,
            'area_id' => $row->area_id !== null ? (int) $row->area_id : null,
            'area' => $row->area_name_en || $row->area_name_ur
                ? [
                    'name_en' => $row->area_name_en,
                    'name_ur' => $row->area_name_ur,
                    'name' => self::displayName($row->area_name_en, $row->area_name_ur),
                ]
                : null,
            'opening_balance' => (float) $row->opening_balance,
            'current_balance' => (float) $row->current_balance,
            'status' => $row->status,
        ];
    }

    /**
     * Locale aware display name, same rule the models use.
     */
    protected static function displayName(?string $nameEn, ?string $nameUr): string
    {
        $locale = session('locale', 'en');

        if ($locale === 'ur') {
            return $nameUr ?: ($nameEn ?: '');
        }

        return $nameEn ?: ($nameUr ?: '');
    }
}
