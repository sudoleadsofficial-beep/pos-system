<?php

namespace App\Models;

use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class JkcSupplier extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'name_en',
        'name_ur',
        'phone',
        'area_id',
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

    public function getNameAttribute(): string
    {
        $locale = session('locale', 'en');
        if ($locale === 'ur') {
            return $this->name_ur ?: ($this->name_en ?: '');
        }

        return $this->name_en ?: ($this->name_ur ?: '');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(PartyLedgerEntry::class, 'party_id')
            ->where('party_type', PartyLedgerEntry::TYPE_SUPPLIER);
    }

    public static function boot()
    {
        parent::boot();

        static::creating(function ($supplier) {
            if (empty($supplier->code)) {
                $supplier->code = ((int) JkcSupplier::max('code')) + 1;
            }
            if ($supplier->current_balance === null || $supplier->current_balance == 0) {
                $supplier->current_balance = $supplier->opening_balance ?? 0;
            }
        });

        static::updated(function ($supplier) {
            // Editing the opening balance used to leave current_balance
            // stale. Recalculate it from the ledger so both agree.
            if (! $supplier->wasChanged('opening_balance')) {
                return;
            }

            app(PartyLedgerService::class)->recalculate(PartyService::SUPPLIER, $supplier->id);
        });
    }
}
