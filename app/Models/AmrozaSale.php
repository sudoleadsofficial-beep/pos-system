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
                $sale->payment_type = ($sale->merchant && (int)$sale->merchant->code === 1) ? 'naqdi' : 'udhaar';
            }
            $weight = floatval($sale->weight);
            $nag = intval($sale->nag);
            $rate = floatval($sale->rate);
            $bardana = floatval($sale->bardana);

            // Calculation rule from Section 11:
            // Line amount = Nag x Rate, or Weight x Rate when Weight > 0
            if ($weight > 0) {
                $lineAmount = $weight * $rate;
            } else {
                $lineAmount = $nag * $rate;
            }

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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
