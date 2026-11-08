<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A farmer purchase / arrival.
 *
 * One row is one arrival line: a farmer, a mark (bari), an item, how many
 * bags came in, their total weight, the purchase rate per selling unit and
 * the packing charges.
 *
 * The amount follows the POS V1 unit rule, the same shape as the Amroza
 * sale: Units (Nag) x Rate, plus packing charges.
 *
 * The farmer's outstanding balance is NOT kept here. It belongs to the party
 * ledger - PartyLedgerService owns it.
 */
class FarmerPurchase extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'date',
        'reference',
        'farmer_id',
        'farmer_mark_id',
        'item_id',
        'nag',
        'weight',
        'rate',
        'charges',
        'amount',
        'paid_amount',
        'remaining_amount',
        'notes',
        'commission_agent_id',
        'commission_percent',
        'commission_amount',
        'agent_ledger_entry_id',
        'is_settled',
        'settlement_id',
        'ledger_entry_id',
        'payment_ledger_entry_id',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'nag' => 'integer',
        'weight' => 'decimal:2',
        'rate' => 'decimal:2',
        'charges' => 'decimal:2',
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
        'commission_agent_id' => 'integer',
        'commission_percent' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'agent_ledger_entry_id' => 'integer',
        'is_settled' => 'boolean',
        'settlement_id' => 'integer',
    ];

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(Farmer::class);
    }

    public function mark(): BelongsTo
    {
        return $this->belongsTo(FarmerMark::class, 'farmer_mark_id');
    }

    public function commissionAgent(): BelongsTo
    {
        return $this->belongsTo(CommissionAgent::class, 'commission_agent_id');
    }

    public function agentLedgerEntry(): BelongsTo
    {
        return $this->belongsTo(PartyLedgerEntry::class, 'agent_ledger_entry_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(FarmerSettlement::class, 'settlement_id');
    }

    /**
     * Sales that were attributed to this arrival.
     */
    public function sales(): HasMany
    {
        return $this->hasMany(AmrozaSale::class, 'farmer_purchase_id');
    }
}
