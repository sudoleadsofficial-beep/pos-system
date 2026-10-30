<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Item extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name_en',
        'name_ur',
        'unit',
        'default_rate',
        'default_bardana',
        'status',
    ];

    protected $appends = ['name'];

    protected $casts = [
        'default_rate' => 'float',
        'default_bardana' => 'float',
    ];

    public function getNameAttribute(): string
    {
        $locale = session('locale', 'en');
        if ($locale === 'ur') {
            return $this->name_ur ?: ($this->name_en ?: '');
        }
        return $this->name_en ?: ($this->name_ur ?: '');
    }
}
