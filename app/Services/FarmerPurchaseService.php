<?php

namespace App\Services;

use App\Models\FarmerPurchase;
use App\Models\PartyLedgerEntry;
use Illuminate\Support\Facades\DB;

/**
 * Farmer purchases / arrivals.
 *
 * Calculation rule (POS V1 unit pricing, the same shape as the Amroza sale):
 *
 *     amount = (nag x rate) + charges
 *
 * The purchase rate is the price per selling unit (bag / piece), exactly like
 * the sale rate. The weight is the total physical weight of the line and is
 * recorded for reporting only - it never multiplies the amount.
 *
 * Ledger rules:
 *
 *   - a purchase raises what the farmer is owed  -> a Jama entry
 *   - money handed over lowers what is owed      -> a Banam entry
 *   - the farmer's balance stays owned by PartyLedgerService
 *
 * Every purchase owns its ledger rows through ledger_entry_id and
 * payment_ledger_entry_id, so editing a purchase updates the same rows
 * instead of creating a second pair.
 */
class FarmerPurchaseService
{
    public function __construct(
        protected PartyLedgerService $ledger,
    ) {}

    /**
     * The amount of a purchase line.
     */
    public function calculateAmount(int|float $nag, int|float $rate, int|float $charges = 0): float
    {
        return round(((float) $nag * (float) $rate) + (float) $charges, 2);
    }

    /**
     * The commission amount for an agent on a purchase line.
     */
    public function calculateCommission(int|float $amount, int|float|null $commissionPercent): float
    {
        if ($commissionPercent === null || (float) $commissionPercent <= 0) {
            return 0.0;
        }

        return round(((float) $amount * (float) $commissionPercent) / 100, 2);
    }

    /**
     * Record a new arrival.
     */
    public function create(array $data): FarmerPurchase
    {
        return DB::transaction(function () use ($data) {
            $amount = $this->calculateAmount($data['nag'], $data['rate'], $data['charges'] ?? 0);
            $paid = round((float) ($data['paid_amount'] ?? 0), 2);

            $agentId = ! empty($data['commission_agent_id']) ? (int) $data['commission_agent_id'] : null;
            $commPercent = null;
            $commAmount = 0.0;

            if ($agentId) {
                if (isset($data['commission_percent']) && $data['commission_percent'] !== '' && $data['commission_percent'] !== null) {
                    $commPercent = round((float) $data['commission_percent'], 2);
                } else {
                    $agent = \App\Models\CommissionAgent::find($agentId);
                    $commPercent = $agent && $agent->commission_percent !== null ? (float) $agent->commission_percent : 0.0;
                }
                $commAmount = $this->calculateCommission($amount, $commPercent);
            }

            $purchase = FarmerPurchase::create([
                'date' => $data['date'],
                'reference' => $data['reference'] ?? $this->nextReference($data['date']),
                'farmer_id' => $data['farmer_id'],
                'farmer_mark_id' => $data['farmer_mark_id'] ?? null,
                'commission_agent_id' => $agentId,
                'item_id' => $data['item_id'],
                'nag' => (int) $data['nag'],
                'weight' => round((float) ($data['weight'] ?? 0), 2),
                'rate' => round((float) $data['rate'], 2),
                'charges' => round((float) ($data['charges'] ?? 0), 2),
                'amount' => $amount,
                'paid_amount' => $paid,
                'remaining_amount' => round($amount - $paid, 2),
                'commission_percent' => $commPercent,
                'commission_amount' => $commAmount,
                'notes' => $data['notes'] ?? null,
                'created_by' => $data['created_by'] ?? null,
            ]);

            $this->syncLedger($purchase);

            return $purchase->fresh();
        });
    }

    /**
     * Change an arrival.
     *
     * The ledger rows are updated in place, so an arrival never ends up with
     * two payable entries.
     */
    public function update(FarmerPurchase $purchase, array $data): FarmerPurchase
    {
        return DB::transaction(function () use ($purchase, $data) {
            $previousFarmerId = (int) $purchase->farmer_id;
            $previousAgentId = $purchase->commission_agent_id ? (int) $purchase->commission_agent_id : null;

            $amount = $this->calculateAmount($data['nag'], $data['rate'], $data['charges'] ?? 0);
            $paid = round((float) ($data['paid_amount'] ?? 0), 2);

            $agentId = ! empty($data['commission_agent_id']) ? (int) $data['commission_agent_id'] : null;
            $commPercent = null;
            $commAmount = 0.0;

            if ($agentId) {
                if (isset($data['commission_percent']) && $data['commission_percent'] !== '' && $data['commission_percent'] !== null) {
                    $commPercent = round((float) $data['commission_percent'], 2);
                } else {
                    $agent = \App\Models\CommissionAgent::find($agentId);
                    $commPercent = $agent && $agent->commission_percent !== null ? (float) $agent->commission_percent : 0.0;
                }
                $commAmount = $this->calculateCommission($amount, $commPercent);
            }

            $purchase->update([
                'date' => $data['date'],
                'farmer_id' => $data['farmer_id'],
                'farmer_mark_id' => $data['farmer_mark_id'] ?? null,
                'commission_agent_id' => $agentId,
                'item_id' => $data['item_id'],
                'nag' => (int) $data['nag'],
                'weight' => round((float) ($data['weight'] ?? 0), 2),
                'rate' => round((float) $data['rate'], 2),
                'charges' => round((float) ($data['charges'] ?? 0), 2),
                'amount' => $amount,
                'paid_amount' => $paid,
                'remaining_amount' => round($amount - $paid, 2),
                'commission_percent' => $commPercent,
                'commission_amount' => $commAmount,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncLedger($purchase, $previousFarmerId, $previousAgentId);

            return $purchase->fresh();
        });
    }

    /**
     * Remove an arrival and its ledger rows.
     */
    public function delete(FarmerPurchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            $farmerId = (int) $purchase->farmer_id;
            $agentId = $purchase->commission_agent_id ? (int) $purchase->commission_agent_id : null;

            $this->removeLedgerRow($purchase->ledger_entry_id, PartyService::FARMER);
            $this->removeLedgerRow($purchase->payment_ledger_entry_id, PartyService::FARMER);
            $this->removeLedgerRow($purchase->agent_ledger_entry_id, PartyService::COMMISSION_AGENT);

            $purchase->delete();

            $this->ledger->recalculate(PartyService::FARMER, $farmerId);

            if ($agentId) {
                $this->ledger->recalculate(PartyService::COMMISSION_AGENT, $agentId);
            }
        });
    }

    /**
     * Record a payment to a farmer, on top of what was already paid.
     *
     * This is a Banam entry, so the farmer's outstanding falls by the amount.
     */
    public function recordPayment(int $farmerId, array $data): PartyLedgerEntry
    {
        return DB::transaction(function () use ($farmerId, $data) {
            $entry = $this->ledger->addEntry(PartyService::FARMER, $farmerId, [
                'date' => $data['date'],
                'direction' => PartyLedgerEntry::DIRECTION_BANAM,
                'amount' => round((float) $data['amount'], 2),
                'category' => 'payment',
                'description' => $data['description'] ?? 'Cash Paid',
                'reference' => $data['reference'] ?? null,
                'created_by' => $data['created_by'] ?? null,
            ]);

            return $entry;
        });
    }

    /**
     * Make sure the purchase owns exactly one payable row, one payment row (if paid),
     * and one commission agent payable row (if commission agent selected).
     */
    protected function syncLedger(FarmerPurchase $purchase, ?int $previousFarmerId = null, ?int $previousAgentId = null): void
    {
        $farmerId = (int) $purchase->farmer_id;

        // The payable row.
        $payable = [
            'date' => $purchase->date,
            'direction' => PartyLedgerEntry::DIRECTION_JAMA,
            'amount' => (float) $purchase->amount,
            'category' => 'consignment',
            'description' => 'Vegetables received',
            'reference' => $purchase->reference,
            'created_by' => $purchase->created_by,
        ];

        $purchase->ledger_entry_id = $this->syncRow(
            $purchase->ledger_entry_id,
            PartyService::FARMER,
            $farmerId,
            $payable
        );

        // The payment row, only when something was paid on the spot.
        $payment = [
            'date' => $purchase->date,
            'direction' => PartyLedgerEntry::DIRECTION_BANAM,
            'amount' => (float) $purchase->paid_amount,
            'category' => 'payment',
            'description' => 'Cash Paid',
            'reference' => $purchase->reference,
            'created_by' => $purchase->created_by,
        ];

        if ((float) $purchase->paid_amount > 0) {
            $purchase->payment_ledger_entry_id = $this->syncRow(
                $purchase->payment_ledger_entry_id,
                PartyService::FARMER,
                $farmerId,
                $payment
            );
        } else {
            $this->removeLedgerRow($purchase->payment_ledger_entry_id, PartyService::FARMER);
            $purchase->payment_ledger_entry_id = null;
        }

        // Commission Agent row, only when an agent is selected and commission is > 0
        $agentId = $purchase->commission_agent_id ? (int) $purchase->commission_agent_id : null;
        $commissionAmount = (float) $purchase->commission_amount;

        if ($agentId && $commissionAmount > 0) {
            $commission = [
                'date' => $purchase->date,
                'direction' => PartyLedgerEntry::DIRECTION_JAMA,
                'amount' => $commissionAmount,
                'category' => 'commission',
                'description' => "Commission on arrival {$purchase->reference}",
                'reference' => $purchase->reference,
                'created_by' => $purchase->created_by,
            ];

            $purchase->agent_ledger_entry_id = $this->syncRow(
                $purchase->agent_ledger_entry_id,
                PartyService::COMMISSION_AGENT,
                $agentId,
                $commission
            );

            $this->ledger->recalculate(PartyService::COMMISSION_AGENT, $agentId);
        } else {
            if ($purchase->agent_ledger_entry_id) {
                $this->removeLedgerRow($purchase->agent_ledger_entry_id, PartyService::COMMISSION_AGENT);
                $purchase->agent_ledger_entry_id = null;
            }
        }

        $purchase->saveQuietly();

        // The farmer may have changed - both balances must end up right.
        $this->ledger->recalculate(PartyService::FARMER, $farmerId);

        if ($previousFarmerId !== null && $previousFarmerId !== $farmerId) {
            $this->ledger->recalculate(PartyService::FARMER, $previousFarmerId);
        }

        // If the commission agent changed or was cleared, recalculate the previous agent's balance too.
        if ($previousAgentId !== null && $previousAgentId !== $agentId) {
            $this->ledger->recalculate(PartyService::COMMISSION_AGENT, $previousAgentId);
        }
    }

    /**
     * Update a ledger row in place, or create it when it is missing.
     */
    protected function syncRow(?int $entryId, string $partyType, int $partyId, array $attributes): int
    {
        $entry = $entryId ? PartyLedgerEntry::find($entryId) : null;

        if ($entry && (int) $entry->party_id === $partyId && $entry->party_type === $partyType) {
            $this->ledger->updateEntry($partyType, $entry, $attributes);

            return (int) $entry->id;
        }

        // A row for a different party or type, or a row the user deleted by hand:
        // drop it and write a fresh one.
        if ($entry) {
            $this->ledger->deleteEntry($entry->party_type, $entry);
        }

        return (int) $this->ledger->addEntry($partyType, $partyId, $attributes)->id;
    }

    protected function removeLedgerRow(?int $entryId, string $partyType = PartyService::FARMER): void
    {
        if (! $entryId) {
            return;
        }

        $entry = PartyLedgerEntry::find($entryId);

        if ($entry) {
            $this->ledger->deleteEntry($partyType, $entry);
        }
    }

    /**
     * The next free purchase reference for the year, e.g. PUR-2026-0007.
     */
    public function nextReference(string $date): string
    {
        $year = \Illuminate\Support\Carbon::parse($date)->format('Y');
        $prefix = 'PUR-'.$year.'-';

        $sequence = FarmerPurchase::withTrashed()
            ->where('reference', 'like', $prefix.'%')
            ->count() + 1;

        $reference = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);

        while (FarmerPurchase::withTrashed()->where('reference', $reference)->exists()) {
            $sequence++;
            $reference = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
        }

        return $reference;
    }
}
