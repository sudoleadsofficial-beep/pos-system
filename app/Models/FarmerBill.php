<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class FarmerBill extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'date',
        'farmer_id',
        'farmer_mark_id',
        'truck_no',
        'item_id',
        'nag',
        'weight',
        'rate',
        'commission_pct',
        'bardana_per_nag',
        'gross_amount',
        'commission_amount',
        'bardana_amount',
        'kiraya',
        'mazdoori',
        'market_fee',
        'net_amount',
        'note',
        'created_by',
    ];

    protected $casts = [
        'date'            => 'date',
        'nag'             => 'integer',
        'weight'          => 'float',
        'rate'            => 'float',
        'commission_pct'  => 'float',
        'bardana_per_nag' => 'float',
        'gross_amount'    => 'float',
        'commission_amount'=> 'float',
        'bardana_amount'  => 'float',
        'kiraya'          => 'float',
        'mazdoori'        => 'float',
        'market_fee'      => 'float',
        'net_amount'      => 'float',
    ];

    public function farmer()
    {
        return $this->belongsTo(Farmer::class);
    }

    public function farmerMark()
    {
        return $this->belongsTo(FarmerMark::class, 'farmer_mark_id');
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
