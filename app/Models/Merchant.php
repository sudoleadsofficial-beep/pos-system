<?php

namespace App\Models;

use App\Services\AmrozaService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Merchant extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Code 1 is permanently reserved for the protected Naqdi (Cash Customer)
     * record - the standing account used for spot-cash buyers. It is never
     * handed out by the code allocation and cannot be claimed by any other
     * merchant.
     */
    public const NAQDI_CODE = 1;

    public const NAQDI_NAME_EN = 'Naqdi (Cash Customer)';

    public const NAQDI_NAME_UR = 'نقدی (عام خریدار)';

    protected $fillable = [
        'code',
        'name_en',
        'name_ur',
        'phone',
        'opening_balance',
        'current_balance',
        'status',
        'created_by',
    ];

    protected $appends = ['name'];

    protected $casts = [
        'code' => 'integer',
        'opening_balance' => 'float',
        'current_balance' => 'float',
    ];

    public function sales(): HasMany
    {
        return $this->hasMany(AmrozaSale::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(MerchantReceipt::class);
    }

    /**
     * Sabiqa (previous balance before a given date)
     * Calculation: Opening + Sales before date - Receipts before date
     */
    public function getSabiqaBalance(string $date): float
    {
        $priorSales = $this->sales()->where('date', '<', $date)->sum('gross_amount');
        $priorReceipts = $this->receipts()->where('date', '<', $date)->sum('amount');

        return round(($this->opening_balance ?? 0) + $priorSales - $priorReceipts, 2);
    }

    /**
     * Compute current balance up to and including a given date
     */
    public function getBalanceOn(string $date): float
    {
        $sabiqa = $this->getSabiqaBalance($date);
        $daySales = $this->sales()->where('date', $date)->sum('gross_amount');
        $dayReceipts = $this->receipts()->where('date', $date)->sum('amount');

        return round($sabiqa + $daySales - $dayReceipts, 2);
    }

    public function getNameAttribute(): string
    {
        $locale = session('locale', 'en');
        if ($locale === 'ur') {
            return $this->name_ur ?: ($this->name_en ?: '');
        }

        return $this->name_en ?: ($this->name_ur ?: '');
    }

    public static function boot()
    {
        parent::boot();

        static::creating(function ($merchant) {
            if (empty($merchant->code)) {
                $merchant->code = static::nextCode();
            }

            // Code 1 belongs to the Naqdi (Cash Customer) record alone.
            if ((int) $merchant->code === self::NAQDI_CODE) {
                throw new \LogicException(
                    'Merchant code '.self::NAQDI_CODE.' is reserved for the Naqdi (Cash Customer) record. '
                    .'Use '.static::class.'::ensureNaqdiRecord() to create it.'
                );
            }

            if ($merchant->current_balance === null || $merchant->current_balance == 0) {
                $merchant->current_balance = $merchant->opening_balance ?? 0;
            }
        });

        static::deleting(function ($merchant) {
            if ((int) $merchant->code === self::NAQDI_CODE) {
                throw new \Exception('Merchant code '.self::NAQDI_CODE.' (Naqdi) is a protected system record and cannot be deleted.');
            }
        });

        static::updated(function ($merchant) {
            // Editing the opening balance used to leave current_balance stale.
            // Re-use the existing Amroza calculation instead of adding a
            // second buyer formula, so there is only ever one of them.
            if (! $merchant->wasChanged('opening_balance')) {
                return;
            }

            app(AmrozaService::class)->recalculateMerchantBalance($merchant->id);
        });
    }

    public function isNaqdi(): bool
    {
        return (int) $this->code === self::NAQDI_CODE;
    }

    /**
     * The next free merchant code.
     *
     * Starts at 2, because code 1 is reserved for the Naqdi (Cash Customer)
     * record. Soft-deleted merchants are included on purpose: their rows
     * still occupy the unique index on `merchants.code`, so their codes must
     * not be handed out a second time.
     */
    public static function nextCode(): int
    {
        $highest = (int) static::withTrashed()->max('code');

        return max(self::NAQDI_CODE + 1, $highest + 1);
    }

    /**
     * Fetch, or create, the protected Naqdi (Cash Customer) record.
     *
     * This is the only way to hold code 1 - the creating hook refuses code 1
     * for anybody else, so model events are skipped here on purpose.
     */
    public static function ensureNaqdiRecord(array $attributes = []): self
    {
        $existing = static::withTrashed()->where('code', self::NAQDI_CODE)->first();

        if ($existing) {
            return $existing;
        }

        return static::withoutEvents(fn () => static::create(array_merge([
            'code' => self::NAQDI_CODE,
            'name_en' => self::NAQDI_NAME_EN,
            'name_ur' => self::NAQDI_NAME_UR,
            'phone' => '0300-0000000',
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ], $attributes)));
    }
}
