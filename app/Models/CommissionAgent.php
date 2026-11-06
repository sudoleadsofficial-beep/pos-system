<?php

namespace App\Models;

use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CommissionAgent extends Model
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
        'commission_percent',
        'status',
        'created_by',
    ];

    protected $appends = ['name'];

    protected $casts = [
        'code' => 'integer',
        'opening_balance' => 'float',
        'current_balance' => 'float',
        'commission_percent' => 'float',
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
            ->where('party_type', PartyLedgerEntry::TYPE_COMMISSION_AGENT);
    }

    public static function boot()
    {
        parent::boot();

        static::creating(function ($agent) {
            if (empty($agent->code)) {
                $agent->code = ((int) CommissionAgent::max('code')) + 1;
            }
            if ($agent->current_balance === null || $agent->current_balance == 0) {
                $agent->current_balance = $agent->opening_balance ?? 0;
            }
        });

        static::updated(function ($agent) {
            // Editing the opening balance used to leave current_balance
            // stale. Recalculate it from the ledger so both agree.
            if (! $agent->wasChanged('opening_balance')) {
                return;
            }

            app(PartyLedgerService::class)->recalculate(PartyService::COMMISSION_AGENT, $agent->id);
        });
    }
}
