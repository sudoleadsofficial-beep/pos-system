<?php

namespace App\Services;

use App\Models\Merchant;
use App\Models\PartyLedgerEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Party ledger (khata).
 *
 * Balance rule for every party type:
 *
 *     current_balance = opening_balance + SUM(Jama) - SUM(Banam)
 *
 * Jama (credit) grows the party's balance, Banam (debit) shrinks it.
 *
 * Buyers are special: their ledger is *derived* from the Amroza / Wasooli
 * tables that already exist, and their balance is owned by
 * AmrozaService::recalculateMerchantBalance(). This service therefore never
 * writes a buyer's current_balance and never re-derives the buyer formula -
 * it calls Merchant::getSabiqaBalance() and Merchant::getBalanceOn().
 */
class PartyLedgerService
{
    /**
     * Party types whose ledger comes from existing transaction tables.
     */
    public const DERIVED_TYPES = [PartyService::BUYER];

    /**
     * Full ledger for one party.
     *
     * @return array{opening_balance: float, entries: array, totals: array, current_balance: float}
     */
    public function entries(string $type, int $partyId, ?string $from = null, ?string $to = null): array
    {
        return $type === PartyService::BUYER
            ? $this->buyerEntries($partyId, $from, $to)
            : $this->storedEntries($type, $partyId, $from, $to);
    }

    /**
     * Balance as at the end of the given date.
     */
    public function balanceOn(string $type, int $partyId, string $date): float
    {
        if ($type === PartyService::BUYER) {
            $merchant = Merchant::find($partyId);

            return $merchant ? $merchant->getBalanceOn($date) : 0.0;
        }

        $totals = $this->storedTotals($type, $partyId, $date) ?? ['jama' => 0.0, 'banam' => 0.0];

        return round($this->openingBalance($type, $partyId) + $totals['jama'] - $totals['banam'], 2);
    }

    /**
     * Balance right now.
     */
    public function currentBalance(string $type, int $partyId): float
    {
        if ($type === PartyService::BUYER) {
            $merchant = Merchant::find($partyId);

            return $merchant ? (float) $merchant->current_balance : 0.0;
        }

        $totals = $this->storedTotals($type, $partyId) ?? ['jama' => 0.0, 'banam' => 0.0];

        return round($this->openingBalance($type, $partyId) + $totals['jama'] - $totals['banam'], 2);
    }

    /**
     * Write the computed balance back to the party.
     *
     * Buyers are skipped on purpose: their balance is owned by
     * AmrozaService::recalculateMerchantBalance(), which is driven by the
     * Amroza / Naqdi / Wasooli screens.
     */
    public function recalculate(string $type, int $partyId): void
    {
        if (in_array($type, self::DERIVED_TYPES, true)) {
            return;
        }

        $party = PartyService::modelFor($type)::query()->find($partyId);

        if (! $party) {
            return;
        }

        // No ledger table yet means no entries yet, so the balance is simply
        // the opening balance.
        $totals = $this->storedTotals($type, $partyId) ?? ['jama' => 0.0, 'banam' => 0.0];

        $party->current_balance = round(
            (float) $party->opening_balance + $totals['jama'] - $totals['banam'],
            2
        );

        // saveQuietly() so recalculating never re-triggers model events.
        $party->saveQuietly();
    }

    /**
     * Record a new ledger entry and refresh the party's balance.
     */
    public function addEntry(string $type, int $partyId, array $data): PartyLedgerEntry
    {
        return DB::transaction(function () use ($type, $partyId, $data) {
            $entry = PartyLedgerEntry::create(array_merge($data, [
                'party_type' => $type,
                'party_id' => $partyId,
            ]));

            $this->recalculate($type, $partyId);

            return $entry;
        });
    }

    /**
     * Update a ledger entry and refresh the party's balance.
     */
    public function updateEntry(string $type, PartyLedgerEntry $entry, array $data): PartyLedgerEntry
    {
        return DB::transaction(function () use ($type, $entry, $data) {
            $entry->update($data);

            $this->recalculate($type, $entry->party_id);

            return $entry;
        });
    }

    /**
     * Delete a ledger entry and refresh the party's balance.
     */
    public function deleteEntry(string $type, PartyLedgerEntry $entry): void
    {
        DB::transaction(function () use ($type, $entry) {
            $partyId = $entry->party_id;

            $entry->delete();

            $this->recalculate($type, $partyId);
        });
    }

    /**
     * Ledger for a buyer, derived from the existing Amroza / Wasooli tables.
     *
     * One row per day, exactly like the Wasooli sheet. The sabiqa and balance
     * columns come from Merchant::getSabiqaBalance() and
     * Merchant::getBalanceOn() so there is only ever one buyer formula.
     */
    protected function buyerEntries(int $merchantId, ?string $from, ?string $to): array
    {
        $merchant = Merchant::find($merchantId);

        if (! $merchant) {
            return $this->emptyLedger(0.0);
        }

        $sales = $merchant->sales()
            ->selectRaw('date, SUM(gross_amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $receipts = $merchant->receipts()
            ->selectRaw('date, SUM(amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $dates = array_values(array_unique(array_merge(
            array_keys($sales->all()),
            array_keys($receipts->all())
        )));
        sort($dates);

        $rows = [];
        $totalJama = 0.0;
        $totalBanam = 0.0;

        foreach ($dates as $date) {
            if ($from !== null && $date < $from) {
                continue;
            }
            if ($to !== null && $date > $to) {
                continue;
            }

            $jama = round((float) ($sales[$date] ?? 0), 2);
            $banam = round((float) ($receipts[$date] ?? 0), 2);

            $hasSale = $jama > 0;
            $hasReceipt = $banam > 0;

            $rows[] = [
                'id' => null,
                'date' => $date,
                'kind' => $hasSale && $hasReceipt
                    ? 'amroza_wasooli'
                    : ($hasSale ? 'amroza' : 'wasooli'),
                'description' => null,
                'reference' => null,
                'jama' => $jama,
                'banam' => $banam,
                'sabiqa' => $merchant->getSabiqaBalance($date),
                'balance' => $merchant->getBalanceOn($date),
            ];

            $totalJama += $jama;
            $totalBanam += $banam;
        }

        return [
            'opening_balance' => (float) $merchant->opening_balance,
            'entries' => $rows,
            'totals' => ['jama' => round($totalJama, 2), 'banam' => round($totalBanam, 2)],
            'current_balance' => (float) $merchant->current_balance,
        ];
    }

    /**
     * Ledger for a farmer / JKC supplier / commission agent.
     */
    protected function storedEntries(string $type, int $partyId, ?string $from, ?string $to): array
    {
        $party = PartyService::find($type, $partyId);

        if (! $party) {
            return $this->emptyLedger(0.0);
        }

        if (! $this->ledgerTableExists()) {
            return $this->emptyLedger((float) $party->opening_balance, (float) $party->current_balance);
        }

        $entries = PartyLedgerEntry::query()
            ->forParty($type, $partyId)
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        $balance = (float) $party->opening_balance;
        $rows = [];

        foreach ($entries as $entry) {
            $amount = (float) $entry->amount;
            $jama = $entry->isJama() ? $amount : 0.0;
            $banam = $entry->isJama() ? 0.0 : $amount;

            $balance = round($balance + $jama - $banam, 2);

            $rows[] = [
                'id' => $entry->id,
                'date' => $entry->date->format('Y-m-d'),
                'kind' => $entry->category,
                'description' => $entry->description,
                'reference' => $entry->reference,
                'jama' => $jama,
                'banam' => $banam,
                'sabiqa' => null,
                'balance' => $balance,
            ];
        }

        if ($from !== null) {
            $rows = array_values(array_filter($rows, fn ($row) => $row['date'] >= $from));
        }
        if ($to !== null) {
            $rows = array_values(array_filter($rows, fn ($row) => $row['date'] <= $to));
        }

        $totalJama = 0.0;
        $totalBanam = 0.0;
        foreach ($rows as $row) {
            $totalJama += $row['jama'];
            $totalBanam += $row['banam'];
        }

        return [
            'opening_balance' => (float) $party->opening_balance,
            'entries' => $rows,
            'totals' => ['jama' => round($totalJama, 2), 'banam' => round($totalBanam, 2)],
            'current_balance' => (float) $party->current_balance,
        ];
    }

    /**
     * Sum of Jama and Banam for a party, optionally up to a date.
     *
     * Returns null when the ledger table is not migrated yet.
     */
    protected function storedTotals(string $type, int $partyId, ?string $upTo = null): ?array
    {
        if (! $this->ledgerTableExists()) {
            return null;
        }

        $query = PartyLedgerEntry::query()->forParty($type, $partyId);

        if ($upTo !== null) {
            $query->where('date', '<=', $upTo);
        }

        $jama = 0.0;
        $banam = 0.0;

        foreach ($query->get(['direction', 'amount']) as $entry) {
            if ($entry->direction === PartyLedgerEntry::DIRECTION_JAMA) {
                $jama += (float) $entry->amount;
            } else {
                $banam += (float) $entry->amount;
            }
        }

        return ['jama' => round($jama, 2), 'banam' => round($banam, 2)];
    }

    protected function openingBalance(string $type, int $partyId): float
    {
        $party = PartyService::find($type, $partyId);

        return $party ? (float) $party->opening_balance : 0.0;
    }

    /**
     * The ledger table only exists once its migration has been run.
     */
    protected function ledgerTableExists(): bool
    {
        return Schema::hasTable('party_ledger_entries');
    }

    protected function emptyLedger(float $openingBalance, ?float $currentBalance = null): array
    {
        return [
            'opening_balance' => $openingBalance,
            'entries' => [],
            'totals' => ['jama' => 0.0, 'banam' => 0.0],
            'current_balance' => $currentBalance ?? $openingBalance,
        ];
    }
}
