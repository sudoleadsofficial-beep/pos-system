<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AmrozaSale extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'date',
        'merchant_id',
        'item_id',
        'farmer_purchase_id',
        'nag',
        'weight',
        'rate',
        'bardana',
        'gross_amount',
        'payment_type',
        'consignment_id',
        'year',
        'created_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'nag' => 'integer',
        'weight' => 'decimal:2',
        'rate' => 'decimal:2',
        'bardana' => 'decimal:2',
        'gross_amount' => 'decimal:2',
        'year' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($sale) {
            if (empty($sale->payment_type)) {
                $sale->payment_type = ($sale->merchant && (int) $sale->merchant->code === 1) ? 'naqdi' : 'udhaar';
            }

            // Weight and bardana are optional on the form. An empty box is
            // submitted as an empty string, which Laravel turns into null,
            // and both columns are NOT NULL - so an empty value has to be
            // stored as 0. A weight that really was entered is kept as it was.
            if ($sale->weight === null || $sale->weight === '') {
                $sale->weight = 0;
            }

            if ($sale->bardana === null || $sale->bardana === '') {
                $sale->bardana = 0;
            }

            $nag = intval($sale->nag);
            $rate = floatval($sale->rate);
            $bardana = floatval($sale->bardana);

            // POS V1 unit-based pricing:
            //   Line amount = Units (Nag) x Rate
            // Rate is the price per the item's selling unit (Bori/Bag,
            // Peti/Crate, Nag, ...). Weight is the TOTAL physical weight of
            // the whole line and is recorded for reporting only - it never
            // multiplies the amount.
            $lineAmount = $nag * $rate;

            $sale->gross_amount = round($lineAmount + $bardana, 2);

            if (empty($sale->year)) {
                $sale->year = config('jkc.default_year', 2026);
            }
        });
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /**
     * The arrival this sale came from, when it was attributed to one.
     */
    public function farmerPurchase(): BelongsTo
    {
        return $this->belongsTo(FarmerPurchase::class, 'farmer_purchase_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
