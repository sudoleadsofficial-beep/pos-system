<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A payment made to a supplier after the purchase was recorded.
 *
 * The payment made on the spot belongs to the purchase header. This table
 * holds the later payments, which are separate transaction records and never
 * overwrite the on-the-spot payment.
 */
class SupplierPayment extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'date',
        'supplier_id',
        'amount',
        'payment_method',
        'reference',
        'note',
        'ledger_entry_id',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(JkcSupplier::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The Banam row this payment owns.
     */
    public function ledgerEntry(): BelongsTo
    {
        return $this->belongsTo(PartyLedgerEntry::class, 'ledger_entry_id');
    }
}
