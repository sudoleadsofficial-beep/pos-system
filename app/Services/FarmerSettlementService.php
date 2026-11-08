<?php

namespace App\Services;

use App\Models\Farmer;
use App\Models\FarmerPurchase;
use App\Models\FarmerSettlement;
use App\Models\PartyLedgerEntry;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Farmer Consignment Settlement & Bijak Service (تصفیہ مال و بیجک کسان).
 *
 * Implements final settlement of farmer arrivals after vegetables/fruits have been sold:
 *   Gross Sale Proceeds
 *   - JKC Aarhat Commission
 *   - Itemized Deductions (Mazdoori, Carriage, Chungi, Bardana, Other)
 *   + Additional Charges
 *   = Net Farmer Payable
 *
 * Reconciles the farmer's khata balance without duplicate records or modifying
 * historical transactions. Outside commission agent accounting remains completely separate.
 */
class FarmerSettlementService
{
    public function __construct(
        protected PartyLedgerService $ledger,
        protected BusinessSettingsService $settings
    ) {}

    /**
     * Compute the settlement breakdown.
     */
    public function calculate(
        float $grossSale,
        float $commissionRate,
        float $mazdoori = 0.0,
        float $carriage = 0.0,
        float $chungi = 0.0,
        float $bardana = 0.0,
        float $otherDeductions = 0.0,
        float $charges = 0.0,
        float $paidAmount = 0.0
    ): array {
        $grossSale = round($grossSale, 2);
        $commissionRate = round($commissionRate, 2);
        $commissionAmount = round(($grossSale * $commissionRate) / 100, 2);

        $mazdoori = round($mazdoori, 2);
        $carriage = round($carriage, 2);
        $chungi = round($chungi, 2);
        $bardana = round($bardana, 2);
        $otherDeductions = round($otherDeductions, 2);
        $charges = round($charges, 2);
        $paidAmount = round($paidAmount, 2);

        $totalDeductions = round(
            $commissionAmount + $mazdoori + $carriage + $chungi + $bardana + $otherDeductions,
            2
        );

        $netPayable = round($grossSale - $totalDeductions + $charges, 2);
        $remainingPayable = round($netPayable - $paidAmount, 2);

        return [
            'gross_sale_amount' => $grossSale,
            'commission_rate' => $commissionRate,
            'commission_amount' => $commissionAmount,
            'mazdoori' => $mazdoori,
            'carriage' => $carriage,
            'chungi' => $chungi,
            'bardana' => $bardana,
            'other_deductions' => $otherDeductions,
            'charges' => $charges,
            'total_deductions' => $totalDeductions,
            'net_payable' => $netPayable,
            'paid_amount' => $paidAmount,
            'remaining_payable' => $remainingPayable,
        ];
    }

    /**
     * Settle a farmer consignment and generate Bijak.
     */
    public function create(array $data): FarmerSettlement
    {
        return DB::transaction(function () use ($data) {
            $purchase = FarmerPurchase::findOrFail($data['farmer_purchase_id']);

            if ($purchase->is_settled) {
                throw new InvalidArgumentException("Consignment arrival {$purchase->reference} is already settled.");
            }

            $farmerId = (int) $purchase->farmer_id;
            $settlementDate = $data['date'] ?? Carbon::today()->toDateString();
            $settlementNo = $data['settlement_no'] ?? $this->nextSettlementNo($settlementDate);

            $paid = isset($data['paid_amount']) && $data['paid_amount'] !== ''
                ? (float) $data['paid_amount']
                : (float) $purchase->paid_amount;

            $calcs = $this->calculate(
                (float) ($data['gross_sale_amount'] ?? $purchase->amount),
                (float) ($data['commission_rate'] ?? 0),
                (float) ($data['mazdoori'] ?? 0),
                (float) ($data['carriage'] ?? 0),
                (float) ($data['chungi'] ?? 0),
                (float) ($data['bardana'] ?? 0),
                (float) ($data['other_deductions'] ?? 0),
                (float) ($data['charges'] ?? 0),
                $paid
            );

            $settlement = FarmerSettlement::create([
                'settlement_no' => $settlementNo,
                'date' => $settlementDate,
                'farmer_id' => $farmerId,
                'farmer_purchase_id' => $purchase->id,
                'nag' => (int) ($data['nag'] ?? $purchase->nag),
                'weight' => (float) ($data['weight'] ?? $purchase->weight),
                'gross_sale_amount' => $calcs['gross_sale_amount'],
                'commission_rate' => $calcs['commission_rate'],
                'commission_amount' => $calcs['commission_amount'],
                'mazdoori' => $calcs['mazdoori'],
                'carriage' => $calcs['carriage'],
                'chungi' => $calcs['chungi'],
                'bardana' => $calcs['bardana'],
                'other_deductions' => $calcs['other_deductions'],
                'charges' => $calcs['charges'],
                'total_deductions' => $calcs['total_deductions'],
                'net_payable' => $calcs['net_payable'],
                'paid_amount' => $calcs['paid_amount'],
                'remaining_payable' => $calcs['remaining_payable'],
                'notes' => $data['notes'] ?? null,
                'created_by' => $data['created_by'] ?? null,
            ]);

            // Mark purchase as settled
            $purchase->update([
                'is_settled' => true,
                'settlement_id' => $settlement->id,
            ]);

            // Reconcile the arrival's Jama entry in the farmer's khata:
            // Adjust the arrival's payable entry to the finalized net payable amount
            $this->reconcileFarmerLedger($purchase, $settlement);

            return $settlement->fresh(['farmer', 'farmerPurchase']);
        });
    }

    /**
     * Update an existing settlement in-place.
     */
    public function update(FarmerSettlement $settlement, array $data): FarmerSettlement
    {
        return DB::transaction(function () use ($settlement, $data) {
            $purchase = $settlement->farmerPurchase;

            $paid = isset($data['paid_amount']) && $data['paid_amount'] !== ''
                ? (float) $data['paid_amount']
                : (float) $settlement->paid_amount;

            $calcs = $this->calculate(
                (float) ($data['gross_sale_amount'] ?? $settlement->gross_sale_amount),
                (float) ($data['commission_rate'] ?? $settlement->commission_rate),
                (float) ($data['mazdoori'] ?? 0),
                (float) ($data['carriage'] ?? 0),
                (float) ($data['chungi'] ?? 0),
                (float) ($data['bardana'] ?? 0),
                (float) ($data['other_deductions'] ?? 0),
                (float) ($data['charges'] ?? 0),
                $paid
            );

            $settlement->update([
                'date' => $data['date'] ?? $settlement->date,
                'nag' => (int) ($data['nag'] ?? $settlement->nag),
                'weight' => (float) ($data['weight'] ?? $settlement->weight),
                'gross_sale_amount' => $calcs['gross_sale_amount'],
                'commission_rate' => $calcs['commission_rate'],
                'commission_amount' => $calcs['commission_amount'],
                'mazdoori' => $calcs['mazdoori'],
                'carriage' => $calcs['carriage'],
                'chungi' => $calcs['chungi'],
                'bardana' => $calcs['bardana'],
                'other_deductions' => $calcs['other_deductions'],
                'charges' => $calcs['charges'],
                'total_deductions' => $calcs['total_deductions'],
                'net_payable' => $calcs['net_payable'],
                'paid_amount' => $calcs['paid_amount'],
                'remaining_payable' => $calcs['remaining_payable'],
                'notes' => $data['notes'] ?? $settlement->notes,
            ]);

            $this->reconcileFarmerLedger($purchase, $settlement);

            return $settlement->fresh(['farmer', 'farmerPurchase']);
        });
    }

    /**
     * Cancel / Delete a settlement and restore the consignment to unsettled state.
     */
    public function delete(FarmerSettlement $settlement): void
    {
        DB::transaction(function () use ($settlement) {
            $purchase = $settlement->farmerPurchase;
            $farmerId = (int) $settlement->farmer_id;

            if ($purchase) {
                // Restore the original arrival purchase amount in the ledger
                $entry = $purchase->ledger_entry_id ? PartyLedgerEntry::find($purchase->ledger_entry_id) : null;
                if ($entry) {
                    $entry->update([
                        'amount' => (float) $purchase->amount,
                        'description' => "Farmer purchase {$purchase->reference}",
                    ]);
                }

                $purchase->update([
                    'is_settled' => false,
                    'settlement_id' => null,
                ]);
            }

            $settlement->delete();

            // Recalculate farmer balance
            $this->ledger->recalculate(PartyService::FARMER, $farmerId);
        });
    }

    /**
     * Reconcile the farmer's ledger row to reflect the finalized settlement net payable.
     */
    protected function reconcileFarmerLedger(FarmerPurchase $purchase, FarmerSettlement $settlement): void
    {
        $farmerId = (int) $purchase->farmer_id;

        $entry = $purchase->ledger_entry_id ? PartyLedgerEntry::find($purchase->ledger_entry_id) : null;

        if ($entry) {
            $entry->update([
                'amount' => (float) $settlement->net_payable,
                'description' => "Settlement Bijak {$settlement->settlement_no} (Arrival {$purchase->reference})",
                'reference' => $settlement->settlement_no,
            ]);
        } else {
            // If missing, add an entry
            $newEntry = $this->ledger->addEntry(PartyService::FARMER, $farmerId, [
                'date' => $settlement->date->format('Y-m-d'),
                'direction' => PartyLedgerEntry::DIRECTION_JAMA,
                'amount' => (float) $settlement->net_payable,
                'category' => 'consignment',
                'description' => "Settlement Bijak {$settlement->settlement_no} (Arrival {$purchase->reference})",
                'reference' => $settlement->settlement_no,
                'created_by' => $settlement->created_by,
            ]);
            $purchase->update(['ledger_entry_id' => $newEntry->id]);
        }

        $this->ledger->recalculate(PartyService::FARMER, $farmerId);
    }

    /**
     * Generate the next unique sequential settlement number.
     * Format: BJK-YYYY-0001
     */
    public function nextSettlementNo(string $date): string
    {
        $year = Carbon::parse($date)->format('Y');
        $prefix = 'BJK-' . $year . '-';

        $sequence = FarmerSettlement::withTrashed()
            ->where('settlement_no', 'like', $prefix . '%')
            ->count() + 1;

        $candidate = $prefix . str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);

        while (FarmerSettlement::withTrashed()->where('settlement_no', $candidate)->exists()) {
            $sequence++;
            $candidate = $prefix . str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
        }

        return $candidate;
    }

    /**
     * Retrieve unsettled consignments, optionally filtered by farmer.
     */
    public function getUnsettledArrivals(?int $farmerId = null): array
    {
        $query = FarmerPurchase::with(['farmer', 'mark', 'item', 'sales.merchant'])
            ->where('is_settled', false)
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc');

        if ($farmerId) {
            $query->where('farmer_id', $farmerId);
        }

        $arrivals = $query->get();

        return $arrivals->map(function (FarmerPurchase $purchase) {
            $salesCount = $purchase->sales->count();
            $salesTotal = (float) $purchase->sales->sum('gross_amount');
            $soldNag = (int) $purchase->sales->sum('nag');

            return [
                'id' => $purchase->id,
                'reference' => $purchase->reference,
                'date' => $purchase->date->format('Y-m-d'),
                'farmer_id' => $purchase->farmer_id,
                'farmer_name' => $purchase->farmer?->name,
                'farmer_name_ur' => $purchase->farmer?->name_ur,
                'farmer_code' => $purchase->farmer?->code,
                'item_id' => $purchase->item_id,
                'item_name' => $purchase->item?->name,
                'item_name_ur' => $purchase->item?->name_ur,
                'mark_id' => $purchase->farmer_mark_id,
                'mark_name' => $purchase->mark?->name,
                'nag' => (int) $purchase->nag,
                'weight' => (float) $purchase->weight,
                'rate' => (float) $purchase->rate,
                'arrival_amount' => (float) $purchase->amount,
                'paid_amount' => (float) $purchase->paid_amount,
                'remaining_amount' => (float) $purchase->remaining_amount,
                'sales_count' => $salesCount,
                'sold_nag' => $soldNag,
                'sales_total' => $salesTotal,
                // Suggested sale proceeds: if sales exist use actual sales, else arrival amount
                'suggested_sale_amount' => $salesTotal > 0 ? $salesTotal : (float) $purchase->amount,
            ];
        })->values()->all();
    }

    /**
     * Format complete Bijak statement details for viewing and printing.
     */
    public function getSettlementForBijak(int $id): array
    {
        $settlement = FarmerSettlement::with([
            'farmer',
            'farmerPurchase.mark',
            'farmerPurchase.item',
            'farmerPurchase.sales.merchant',
            'creator',
        ])->findOrFail($id);

        $purchase = $settlement->farmerPurchase;
        $business = $this->settings->business();

        return [
            'settlement' => [
                'id' => $settlement->id,
                'settlement_no' => $settlement->settlement_no,
                'date' => $settlement->date->format('Y-m-d'),
                'nag' => (int) $settlement->nag,
                'weight' => (float) $settlement->weight,
                'gross_sale_amount' => (float) $settlement->gross_sale_amount,
                'commission_rate' => (float) $settlement->commission_rate,
                'commission_amount' => (float) $settlement->commission_amount,
                'mazdoori' => (float) $settlement->mazdoori,
                'carriage' => (float) $settlement->carriage,
                'chungi' => (float) $settlement->chungi,
                'bardana' => (float) $settlement->bardana,
                'other_deductions' => (float) $settlement->other_deductions,
                'charges' => (float) $settlement->charges,
                'total_deductions' => (float) $settlement->total_deductions,
                'net_payable' => (float) $settlement->net_payable,
                'paid_amount' => (float) $settlement->paid_amount,
                'remaining_payable' => (float) $settlement->remaining_payable,
                'notes' => $settlement->notes,
                'created_at' => $settlement->created_at->format('Y-m-d H:i'),
            ],
            'farmer' => [
                'id' => $settlement->farmer->id,
                'name' => $settlement->farmer->name,
                'name_ur' => $settlement->farmer->name_ur,
                'code' => $settlement->farmer->code,
                'phone' => $settlement->farmer->phone,
                'current_balance' => (float) $settlement->farmer->current_balance,
            ],
            'consignment' => [
                'id' => $purchase->id,
                'reference' => $purchase->reference,
                'date' => $purchase->date->format('Y-m-d'),
                'item_name' => $purchase->item?->name,
                'item_name_ur' => $purchase->item?->name_ur,
                'mark_name' => $purchase->mark?->name,
                'mark_name_ur' => $purchase->mark?->name_ur,
            ],
            'sales' => $purchase->sales->map(fn ($sale) => [
                'id' => $sale->id,
                'date' => $sale->date->format('Y-m-d'),
                'merchant_name' => $sale->merchant?->name,
                'merchant_name_ur' => $sale->merchant?->name_ur,
                'nag' => (int) $sale->nag,
                'weight' => (float) $sale->weight,
                'rate' => (float) $sale->rate,
                'bardana' => (float) $sale->bardana,
                'gross_amount' => (float) $sale->gross_amount,
            ])->values()->all(),
            'business' => $business,
        ];
    }
}
