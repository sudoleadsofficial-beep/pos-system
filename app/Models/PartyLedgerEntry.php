<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PartyLedgerEntry extends Model
{
    use HasFactory;

    /**
     * Party types. `buyer` is listed for completeness: a buyer's ledger is
     * derived from the existing Amroza / Wasooli tables, so buyer rows are
     * never written here.
     */
    public const TYPE_FARMER = 'farmer';

    public const TYPE_SUPPLIER = 'supplier';

    public const TYPE_BUYER = 'buyer';

    public const TYPE_COMMISSION_AGENT = 'commission_agent';

    /** Jama (credit) increases the party's balance. */
    public const DIRECTION_JAMA = 'jama';

    /** Banam (debit) decreases the party's balance. */
    public const DIRECTION_BANAM = 'banam';

    protected $fillable = [
        'party_type',
        'party_id',
        'date',
        'direction',
        'amount',
        'category',
        'description',
        'reference',
        'created_by',
    ];

    protected $casts = [
        'party_id' => 'integer',
        'date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    public function scopeForParty($query, string $partyType, int $partyId)
    {
        return $query->where('party_type', $partyType)
            ->where('party_id', $partyId);
    }

    public function isJama(): bool
    {
        return $this->direction === self::DIRECTION_JAMA;
    }
}
