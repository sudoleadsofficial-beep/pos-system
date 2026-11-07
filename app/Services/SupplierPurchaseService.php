<?php

namespace App\Services;

use App\Models\PartyLedgerEntry;
use App\Models\SupplierPayment;
use App\Models\SupplierPurchase;
use Illuminate\Support\Facades\DB;

/**
 * Supplier purchases and supplier payments.
 *
 * A supplier purchase is for MATERIALS, PACKAGING AND SERVICES - crates,
 * jute bags, packaging material, transport, labour and other supplies. It is
 * NOT a vegetable purchase, so it never creates stock and never touches the
 * vegetable inventory.
 *
 * Calculations:
 *
 *     line amount   = quantity x rate
 *     subtotal      = SUM(line amounts)
 *     total_amount  = subtotal + charges
 *     remaining     = total_amount - paid_amount
 *
 * Ledger rules:
 *
 *   - a purchase raises what JKC owes the supplier  -> a Jama entry
 *   - a payment lowers what JKC owes               -> a Banam entry
 *   - the supplier balance stays owned by PartyLedgerService
 *
 * Every purchase owns its ledger rows through ledger_entry_id and
 * payment_ledger_entry_id, so editing a purchase updates the same rows
 * instead of creating a second pair. Later payments are separate records
 * that own their own Banam row.
 */
class SupplierPurchaseService
{
    /**
     * Payment methods offered on the screens.
     */
    public const PAYMENT_METHODS = ['cash', 'bank', 'cheque', 'online', 'adjustment'];

    public function __construct(
        protected PartyLedgerService $ledger,
    ) {}

    /**
     * The amount of one purchase line.
     */
    public function calculateLineAmount(int|float $quantity, int|float $rate): float
    {
        return round(((float) $quantity * (float) $rate), 2);
    }

    /**
     * The subtotal of a set of lines.
     */
    public function calculateSubtotal(array $lines): float
    {
        $subtotal = 0.0;

        foreach ($lines as $line) {
            $subtotal += $this->calculateLineAmount($line['quantity'] ?? 0, $line['rate'] ?? 0);
        }

        return round($subtotal, 2);
    }

    /**
     * The total of a purchase: subtotal plus the additional charges.
     */
    public function calculateTotal(int|float $subtotal, int|float $charges = 0): float
    {
        return round(((float) $subtotal + (float) $charges), 2);
    }

    /**
     * Record a new supplier purchase.
     */
    public function create(array $data): SupplierPurchase
    {
        return DB::transaction(function () use ($data) {
            $subtotal = $this->calculateSubtotal($data['items'] ?? []);
            $total = $this->calculateTotal($subtotal, $data['charges'] ?? 0);
            $paid = round((float) ($data['paid_amount'] ?? 0), 2);

            $purchase = SupplierPurchase::create([
                'date' => $data['date'],
                'reference' => $data['reference'] ?? $this->nextReference($data['date']),
                'supplier_id' => $data['supplier_id'],
                'charges' => round((float) ($data['charges'] ?? 0), 2),
                'subtotal' => $subtotal,
                'total_amount' => $total,
                'paid_amount' => $paid,
                'remaining_amount' => round($total - $paid, 2),
                'payment_method' => $data['payment_method'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $data['created_by'] ?? null,
            ]);

            $this->syncLines($purchase, $data['items'] ?? []);
            $this->syncLedger($purchase);

            return $purchase->fresh(['items', 'supplier']);
        });
    }

    /**
     * Change a supplier purchase.
     *
     * The ledger rows are updated in place, so a purchase never ends up with
     * two payable entries.
     */
    public function update(SupplierPurchase $purchase, array $data): SupplierPurchase
    {
        return DB::transaction(function () use ($purchase, $data) {
            $previousSupplierId = (int) $purchase->supplier_id;

            $subtotal = $this->calculateSubtotal($data['items'] ?? []);
            $total = $this->calculateTotal($subtotal, $data['charges'] ?? 0);
            $paid = round((float) ($data['paid_amount'] ?? 0), 2);

            $purchase->update([
                'date' => $data['date'],
                'supplier_id' => $data['supplier_id'],
                'charges' => round((float) ($data['charges'] ?? 0), 2),
                'subtotal' => $subtotal,
                'total_amount' => $total,
                'paid_amount' => $paid,
                'remaining_amount' => round($total - $paid, 2),
                'payment_method' => $data['payment_method'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncLines($purchase, $data['items'] ?? []);
            $this->syncLedger($purchase, $previousSupplierId);

            return $purchase->fresh(['items', 'supplier']);
        });
    }

    /**
     * Remove a purchase and the ledger rows it owns.
     *
     * Only the rows this purchase linked are removed. Manual supplier ledger
     * entries and later payments are never touched.
     */
    public function delete(SupplierPurchase $purchase): void
    {
        DB::transaction(function () use ($purchase) {
            $supplierId = (int) $purchase->supplier_id;

            $this->removeLedgerRow($purchase->ledger_entry_id);
            $this->removeLedgerRow($purchase->payment_ledger_entry_id);

            $purchase->items()->delete();
            $purchase->delete();

            $this->ledger->recalculate(PartyService::SUPPLIER, $supplierId);
        });
    }

    /**
     * Record a payment to a supplier, on top of what was already paid.
     *
     * This is a Banam entry, so the supplier's outstanding falls by the
     * amount. The payment keeps its own row, so it never overwrites an
     * earlier payment.
     */
    public function recordPayment(int $supplierId, array $data): SupplierPayment
    {
        return DB::transaction(function () use ($supplierId, $data) {
            $payment = SupplierPayment::create([
                'date' => $data['date'],
                'supplier_id' => $supplierId,
                'amount' => round((float) $data['amount'], 2),
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference' => $data['reference'] ?? null,
                'note' => $data['note'] ?? null,
                'created_by' => $data['created_by'] ?? null,
            ]);

            $this->syncPaymentLedger($payment);

            return $payment->fresh();
        });
    }

    /**
     * Change a later payment. Its Banam row is updated in place.
     */
    public function updatePayment(SupplierPayment $payment, array $data): SupplierPayment
    {
        return DB::transaction(function () use ($payment, $data) {
            $previousSupplierId = (int) $payment->supplier_id;

            $payment->update([
                'date' => $data['date'],
                'supplier_id' => $data['supplier_id'],
                'amount' => round((float) $data['amount'], 2),
                'payment_method' => $data['payment_method'] ?? $payment->payment_method,
                'reference' => $data['reference'] ?? null,
                'note' => $data['note'] ?? null,
            ]);

            $this->syncPaymentLedger($payment, $previousSupplierId);

            return $payment->fresh();
        });
    }

    /**
     * Remove a later payment and the Banam row it owns.
     */
    public function deletePayment(SupplierPayment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $supplierId = (int) $payment->supplier_id;

            $this->removeLedgerRow($payment->ledger_entry_id);

            $payment->delete();

            $this->ledger->recalculate(PartyService::SUPPLIER, $supplierId);
        });
    }

    /**
     * Add, update and remove the purchase lines.
     *
     * A line is matched by its own id, so the same material may appear more
     * than once on one purchase. Changing the lines never touches the
     * ledger - only the header amounts do.
     */
    protected function syncLines(SupplierPurchase $purchase, array $lines): void
    {
        $existingIds = $purchase->items()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $keptIds = [];

        foreach ($lines as $line) {
            $lineId = isset($line['id']) && $line['id'] !== '' ? (int) $line['id'] : null;

            $attributes = [
                'description' => $line['description'],
                'item_id' => $line['item_id'] ?? null,
                'quantity' => round((float) ($line['quantity'] ?? 0), 2),
                'unit' => $line['unit'] ?? 'piece',
                'rate' => round((float) ($line['rate'] ?? 0), 2),
                'amount' => $this->calculateLineAmount($line['quantity'] ?? 0, $line['rate'] ?? 0),
            ];

            // Only a line that already belongs to this purchase may change.
            if ($lineId !== null && in_array($lineId, $existingIds, true)) {
                $purchase->items()->where('id', $lineId)->first()?->update($attributes);
                $keptIds[] = $lineId;

                continue;
            }

            $created = $purchase->items()->create($attributes);
            $keptIds[] = (int) $created->id;
        }

        // The lines the user removed.
        $purchase->items()->whereNotIn('id', $keptIds)->delete();
    }

    /**
     * Make sure the purchase owns exactly one payable row and one payment row.
     */
    protected function syncLedger(SupplierPurchase $purchase, ?int $previousSupplierId = null): void
    {
        $supplierId = (int) $purchase->supplier_id;

        // The payable row.
        $payable = [
            'date' => $purchase->date->format('Y-m-d'),
            'direction' => PartyLedgerEntry::DIRECTION_JAMA,
            'amount' => (float) $purchase->total_amount,
            'category' => 'purchase',
            'description' => 'Supplier purchase '.$purchase->reference,
            'reference' => $purchase->reference,
            'created_by' => $purchase->created_by,
        ];

        $purchase->ledger_entry_id = $this->syncRow(
            $purchase->ledger_entry_id,
            $supplierId,
            $payable
        );

        // The payment row, only when something was paid on the spot.
        if ((float) $purchase->paid_amount > 0) {
            $payment = [
                'date' => $purchase->date->format('Y-m-d'),
                'direction' => PartyLedgerEntry::DIRECTION_BANAM,
                'amount' => (float) $purchase->paid_amount,
                'category' => 'payment',
                'description' => 'Cash Paid',
                'reference' => $purchase->reference,
                'created_by' => $purchase->created_by,
            ];

            $purchase->payment_ledger_entry_id = $this->syncRow(
                $purchase->payment_ledger_entry_id,
                $supplierId,
                $payment
            );
        } else {
            $this->removeLedgerRow($purchase->payment_ledger_entry_id);
            $purchase->payment_ledger_entry_id = null;
        }

        $purchase->saveQuietly();

        // The supplier may have changed - both balances must end up right.
        $this->ledger->recalculate(PartyService::SUPPLIER, $supplierId);

        if ($previousSupplierId !== null && $previousSupplierId !== $supplierId) {
            $this->ledger->recalculate(PartyService::SUPPLIER, $previousSupplierId);
        }
    }

    /**
     * Make sure the payment owns exactly one Banam row.
     */
    protected function syncPaymentLedger(SupplierPayment $payment, ?int $previousSupplierId = null): void
    {
        $supplierId = (int) $payment->supplier_id;

        $attributes = [
            'date' => $payment->date->format('Y-m-d'),
            'direction' => PartyLedgerEntry::DIRECTION_BANAM,
            'amount' => (float) $payment->amount,
            'category' => 'payment',
            'description' => 'Cash Paid',
            'reference' => $payment->reference,
            'created_by' => $payment->created_by,
        ];

        $payment->ledger_entry_id = $this->syncRow(
            $payment->ledger_entry_id,
            $supplierId,
            $attributes
        );

        $payment->saveQuietly();

        $this->ledger->recalculate(PartyService::SUPPLIER, $supplierId);

        if ($previousSupplierId !== null && $previousSupplierId !== $supplierId) {
            $this->ledger->recalculate(PartyService::SUPPLIER, $previousSupplierId);
        }
    }

    /**
     * Update a ledger row in place, or create it when it is missing.
     */
    protected function syncRow(?int $entryId, int $partyId, array $attributes): int
    {
        $entry = $entryId ? PartyLedgerEntry::find($entryId) : null;

        if ($entry && (int) $entry->party_id === $partyId) {
            $this->ledger->updateEntry(PartyService::SUPPLIER, $entry, $attributes);

            return (int) $entry->id;
        }

        // A row for a different supplier, or a row the user deleted by hand:
        // drop it and write a fresh one.
        if ($entry) {
            $this->ledger->deleteEntry(PartyService::SUPPLIER, $entry);
        }

        return (int) $this->ledger->addEntry(PartyService::SUPPLIER, $partyId, $attributes)->id;
    }

    protected function removeLedgerRow(?int $entryId): void
    {
        if (! $entryId) {
            return;
        }

        $entry = PartyLedgerEntry::find($entryId);

        if ($entry) {
            $this->ledger->deleteEntry(PartyService::SUPPLIER, $entry);
        }
    }

    /**
     * The next free purchase reference for the year, e.g. SUP-2026-0007.
     */
    public function nextReference(string $date): string
    {
        $year = \Illuminate\Support\Carbon::parse($date)->format('Y');
        $prefix = 'SUP-'.$year.'-';

        $sequence = SupplierPurchase::withTrashed()
            ->where('reference', 'like', $prefix.'%')
            ->count() + 1;

        $reference = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);

        while (SupplierPurchase::withTrashed()->where('reference', $reference)->exists()) {
            $sequence++;
            $reference = $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
        }

        return $reference;
    }
}
