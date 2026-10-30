<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FarmerMark extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'farmer_id',
        'name_en',
        'name_ur',
    ];

    protected $appends = ['name'];

    protected $casts = [
        'code' => 'integer',
        'farmer_id' => 'integer',
    ];

    public function getNameAttribute(): string
    {
        $locale = session('locale', 'en');
        if ($locale === 'ur') {
            return $this->name_ur ?: ($this->name_en ?: '');
        }
        return $this->name_en ?: ($this->name_ur ?: '');
    }

    public function farmer()
    {
        return $this->belongsTo(Farmer::class);
    }
}
