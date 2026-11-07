<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A purchase from a JKC supplier.
 *
 * These are materials, packaging and services - crates, jute bags, transport,
 * labour and other supplies. They are NOT vegetables, so a supplier purchase
 * never creates stock and never affects the vegetable inventory.
 *
 * The supplier's outstanding balance is NOT kept here. It belongs to the
 * party ledger - PartyLedgerService owns it.
 */
class SupplierPurchase extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'date',
        'reference',
        'supplier_id',
        'charges',
        'subtotal',
        'total_amount',
        'paid_amount',
        'remaining_amount',
        'payment_method',
        'notes',
        'ledger_entry_id',
        'payment_ledger_entry_id',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'charges' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(JkcSupplier::class);
    }

    /**
     * The purchase lines. Each line has its own id.
     */
    public function items(): HasMany
    {
        return $this->hasMany(SupplierPurchaseItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The ledger rows this purchase owns.
     */
    public function ledgerEntry(): BelongsTo
    {
        return $this->belongsTo(PartyLedgerEntry::class, 'ledger_entry_id');
    }

    public function paymentLedgerEntry(): BelongsTo
    {
        return $this->belongsTo(PartyLedgerEntry::class, 'payment_ledger_entry_id');
    }
}
