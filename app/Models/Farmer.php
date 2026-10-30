<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Farmer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'name_en',
        'name_ur',
        'phone',
        'area_id',
        'opening_balance',
        'current_balance',
        'status',
        'created_by',
    ];

    protected $appends = ['name'];

    protected $casts = [
        'code' => 'integer',
        'opening_balance' => 'float',
        'current_balance' => 'float',
    ];

    public function getNameAttribute(): string
    {
        $locale = session('locale', 'en');
        if ($locale === 'ur') {
            return $this->name_ur ?: ($this->name_en ?: '');
        }
        return $this->name_en ?: ($this->name_ur ?: '');
    }

    public function area()
    {
        return $this->belongsTo(Area::class);
    }

    public function marks()
    {
        return $this->hasMany(FarmerMark::class);
    }

    public static function boot()
    {
        parent::boot();

        static::creating(function ($farmer) {
            if (empty($farmer->code)) {
                $farmer->code = ((int) Farmer::max('code')) + 1;
            }
            if ($farmer->current_balance === null || $farmer->current_balance == 0) {
                $farmer->current_balance = $farmer->opening_balance ?? 0;
            }
        });

        static::created(function ($farmer) {
            // Every farmer gets a default mark code 0 = Khud (Self)
            $farmer->marks()->firstOrCreate(
                ['code' => 0],
                [
                    'name_en' => 'Khud (Self)',
                    'name_ur' => 'خود',
                ]
            );
        });
    }
}
