<?php

namespace App\Http\Controllers\Suppliers;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\JkcSupplier;
use App\Models\SupplierPayment;
use App\Models\SupplierPurchase;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use App\Services\SupplierPurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPurchaseController extends Controller
{
    public function __construct(
        protected SupplierPurchaseService $purchases,
        protected PartyLedgerService $ledger,
    ) {}

    /**
     * The Supplier Purchase register.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('suppliers/purchases/index', [
            'date' => $request->query('date', date('Y-m-d')),
            'suppliers' => $this->supplierOptions(),
            'items' => $this->itemOptions(),
            'units' => $this->unitOptions(),
            'paymentMethods' => SupplierPurchaseService::PAYMENT_METHODS,
            'purchases' => $this->recentPurchases(),
            'payments' => $this->recentPayments(),
            'outstanding' => $this->outstandingBySupplier(),
        ]);
    }

    /**
     * Record a supplier purchase.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $this->purchases->create(array_merge($data, [
            'created_by' => $request->user()?->id,
        ]));

        return back()->with('success', 'Supplier purchase saved and the supplier khata updated.');
    }

    /**
     * Change a supplier purchase.
     */
    public function update(Request $request, SupplierPurchase $purchase): RedirectResponse
    {
        $data = $this->validated($request);

        $this->purchases->update($purchase, $data);

        return back()->with('success', 'Supplier purchase updated.');
    }

    /**
     * Remove a supplier purchase.
     */
    public function destroy(SupplierPurchase $purchase): RedirectResponse
    {
        $this->purchases->delete($purchase);

        return back()->with('success', 'Purchase removed and the supplier balance adjusted.');
    }

    /**
     * Pay a supplier later - lowers what JKC owes.
     */
    public function payment(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:jkc_suppliers,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|max:30',
            'reference' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:255',
        ]);

        $this->purchases->recordPayment((int) $validated['supplier_id'], [
            'date' => $validated['date'],
            'amount' => (float) $validated['amount'],
            'payment_method' => $validated['payment_method'] ?? 'cash',
            'reference' => $validated['reference'] ?? null,
            'note' => $validated['note'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Payment recorded.');
    }

    /**
     * Change a later payment.
     */
    public function updatePayment(Request $request, SupplierPayment $payment): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:jkc_suppliers,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|max:30',
            'reference' => 'nullable|string|max:100',
            'note' => 'nullable|string|max:255',
        ]);

        $this->purchases->updatePayment($payment, [
            'date' => $validated['date'],
            'supplier_id' => $validated['supplier_id'],
            'amount' => (float) $validated['amount'],
            'payment_method' => $validated['payment_method'] ?? $payment->payment_method,
            'reference' => $validated['reference'] ?? null,
            'note' => $validated['note'] ?? null,
        ]);

        return back()->with('success', 'Payment updated.');
    }

    /**
     * Remove a later payment.
     */
    public function destroyPayment(SupplierPayment $payment): RedirectResponse
    {
        $this->purchases->deletePayment($payment);

        return back()->with('success', 'Payment removed and the supplier balance adjusted.');
    }

    /**
     * Check the request and work out the amounts.
     */
    protected function validated(Request $request): array
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'supplier_id' => 'required|exists:jkc_suppliers,id',
            'charges' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:30',
            'notes' => 'nullable|string|max:1000',
            'items' => 'required|array|min:1',
            'items.*.id' => 'nullable|integer',
            'items.*.description' => 'required|string|max:255',
            'items.*.item_id' => 'nullable|exists:items,id',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit' => 'required|string|max:30',
            'items.*.rate' => 'required|numeric|min:0',
        ]);

        $subtotal = $this->purchases->calculateSubtotal($validated['items']);
        $total = $this->purchases->calculateTotal($subtotal, $validated['charges'] ?? 0);
        $paid = round((float) ($validated['paid_amount'] ?? 0), 2);

        if ($paid > $total) {
            throw ValidationException::withMessages([
                'paid_amount' => 'The amount paid cannot be more than the purchase total.',
            ]);
        }

        $validated['charges'] = $validated['charges'] ?? 0;
        $validated['paid_amount'] = $paid;

        return $validated;
    }

    protected function supplierOptions(): array
    {
        return JkcSupplier::with('area')->orderBy('code')->get()->map(fn ($supplier) => [
            'id' => $supplier->id,
            'code' => $supplier->code,
            'name_en' => $supplier->name_en,
            'name_ur' => $supplier->name_ur,
            'area' => $supplier->area?->name_en,
            'current_balance' => (float) $supplier->current_balance,
        ])->all();
    }

    /**
     * The item master, offered as an optional reference on a line.
     */
    protected function itemOptions(): array
    {
        return Item::where('status', 'active')->orderBy('name_en')->get()->map(fn ($item) => [
            'id' => $item->id,
            'name_en' => $item->name_en,
            'name_ur' => $item->name_ur,
            'unit' => $item->unit,
        ])->all();
    }

    /**
     * The units a material may be bought in.
     */
    protected function unitOptions(): array
    {
        return ['piece', 'kg', 'bag', 'crate', 'dozen', 'trip', 'service', 'bundle', 'box'];
    }

    protected function recentPurchases(): array
    {
        return SupplierPurchase::with(['supplier', 'items'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn ($purchase) => $this->purchaseRow($purchase))->all();
    }

    protected function purchaseRow(SupplierPurchase $purchase): array
    {
        return [
            'id' => $purchase->id,
            'date' => $purchase->date->format('Y-m-d'),
            'reference' => $purchase->reference,
            'supplier_id' => $purchase->supplier_id,
            'supplier_code' => $purchase->supplier?->code,
            'supplier_name' => $purchase->supplier?->name_en,
            'supplier_name_ur' => $purchase->supplier?->name_ur,
            'charges' => (float) $purchase->charges,
            'subtotal' => (float) $purchase->subtotal,
            'total_amount' => (float) $purchase->total_amount,
            'paid_amount' => (float) $purchase->paid_amount,
            'remaining_amount' => (float) $purchase->remaining_amount,
            'payment_method' => $purchase->payment_method,
            'notes' => $purchase->notes,
            'items' => $purchase->items->map(fn ($line) => [
                'id' => $line->id,
                'description' => $line->description,
                'item_id' => $line->item_id,
                'quantity' => (float) $line->quantity,
                'unit' => $line->unit,
                'rate' => (float) $line->rate,
                'amount' => (float) $line->amount,
            ])->all(),
        ];
    }

    protected function recentPayments(): array
    {
        return SupplierPayment::with('supplier')
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn ($payment) => [
                'id' => $payment->id,
                'date' => $payment->date->format('Y-m-d'),
                'supplier_id' => $payment->supplier_id,
                'supplier_code' => $payment->supplier?->code,
                'supplier_name' => $payment->supplier?->name_en,
                'supplier_name_ur' => $payment->supplier?->name_ur,
                'amount' => (float) $payment->amount,
                'payment_method' => $payment->payment_method,
                'reference' => $payment->reference,
                'note' => $payment->note,
            ])->all();
    }

    /**
     * What every supplier is owed right now.
     */
    protected function outstandingBySupplier(): array
    {
        $rows = [];

        foreach (JkcSupplier::orderBy('code')->get() as $supplier) {
            $rows[] = [
                'id' => $supplier->id,
                'code' => $supplier->code,
                'name_en' => $supplier->name_en,
                'name_ur' => $supplier->name_ur,
                'current_balance' => $this->ledger->currentBalance(PartyService::SUPPLIER, $supplier->id),
            ];
        }

        return $rows;
    }
}
