<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FarmerSettlement extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'settlement_no',
        'date',
        'farmer_id',
        'farmer_purchase_id',
        'nag',
        'weight',
        'gross_sale_amount',
        'commission_rate',
        'commission_amount',
        'mazdoori',
        'carriage',
        'chungi',
        'bardana',
        'other_deductions',
        'charges',
        'total_deductions',
        'net_payable',
        'paid_amount',
        'remaining_payable',
        'ledger_entry_id',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'nag' => 'integer',
        'weight' => 'decimal:2',
        'gross_sale_amount' => 'decimal:2',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'mazdoori' => 'decimal:2',
        'carriage' => 'decimal:2',
        'chungi' => 'decimal:2',
        'bardana' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'charges' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_payable' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_payable' => 'decimal:2',
        'ledger_entry_id' => 'integer',
    ];

    public function farmer(): BelongsTo
    {
        return $this->belongsTo(Farmer::class);
    }

    public function farmerPurchase(): BelongsTo
    {
        return $this->belongsTo(FarmerPurchase::class, 'farmer_purchase_id');
    }

    public function ledgerEntry(): BelongsTo
    {
        return $this->belongsTo(PartyLedgerEntry::class, 'ledger_entry_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
