<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of a supplier purchase.
 *
 * A line is identified by its own id, never by item_id, so the same material
 * may appear more than once on one purchase.
 */
class SupplierPurchaseItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'supplier_purchase_id',
        'description',
        'item_id',
        'quantity',
        'unit',
        'rate',
        'amount',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'rate' => 'decimal:2',
        'amount' => 'decimal:2',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(SupplierPurchase::class, 'supplier_purchase_id');
    }

    /**
     * Optional reference to the item master. Never used for stock.
     */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
