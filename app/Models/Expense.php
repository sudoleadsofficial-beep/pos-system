<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use HasFactory, SoftDeletes;

    public const CATEGORY_RENT = 'rent';
    public const CATEGORY_ELECTRICITY = 'electricity';
    public const CATEGORY_LABOUR = 'labour';
    public const CATEGORY_TRANSPORT = 'transport';
    public const CATEGORY_REFRESHMENT = 'refreshment';
    public const CATEGORY_MAINTENANCE = 'maintenance';
    public const CATEGORY_MISC = 'misc';
    public const CATEGORY_SHOP = 'shop';
    public const CATEGORY_UTILITIES = 'utilities';
    public const CATEGORY_GENERAL = 'general';

    public const PAYMENT_CASH = 'cash';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'date',
        'title',
        'amount',
        'payment_method',
        'category',
        'reference',
        'description',
        'created_by',
    ];

    protected $attributes = [
        'payment_method' => self::PAYMENT_CASH,
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public static function categories(): array
    {
        return [
            self::CATEGORY_RENT => 'Rent / کرایہ دکان',
            self::CATEGORY_ELECTRICITY => 'Electricity & Bills / بجلی بلز',
            self::CATEGORY_LABOUR => 'Labour & Mazdoori / مزدوری',
            self::CATEGORY_TRANSPORT => 'Carriage & Freight / کرایہ گاڑی',
            self::CATEGORY_REFRESHMENT => 'Tea & Refreshment / چائے و کھانا',
            self::CATEGORY_MAINTENANCE => 'Maintenance / مرمت و مینٹیننس',
            self::CATEGORY_MISC => 'Miscellaneous / متفرق اخراجات',
            self::CATEGORY_SHOP => 'Shop / دکان',
            self::CATEGORY_UTILITIES => 'Utilities / بلز',
            self::CATEGORY_GENERAL => 'General / عمومی',
        ];
    }
}
