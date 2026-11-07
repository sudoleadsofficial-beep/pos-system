<?php

namespace App\Http\Controllers\Suppliers;

use App\Http\Controllers\Controller;
use App\Models\JkcSupplier;
use App\Models\SupplierPayment;
use App\Models\SupplierPurchase;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierReportController extends Controller
{
    public function __construct(
        protected PartyLedgerService $ledger,
    ) {}

    /**
     * The supplier reports screen.
     */
    public function index(Request $request): Response
    {
        $from = $request->query('from', now()->subMonth()->format('Y-m-d'));
        $to = $request->query('to', date('Y-m-d'));

        return Inertia::render('suppliers/reports/index', [
            'from' => $from,
            'to' => $to,
            'dailySummary' => $this->dailySummary($from, $to),
            'purchaseHistory' => $this->purchaseHistory($from, $to),
            'outstanding' => $this->outstanding(),
            'paymentHistory' => $this->paymentHistory($from, $to),
            'totals' => $this->totals($from, $to),
        ]);
    }

    /**
     * Purchases per day in the period.
     */
    protected function dailySummary(string $from, string $to): array
    {
        $rows = SupplierPurchase::query()
            ->whereBetween('date', [$from, $to])
            ->selectRaw('date, COUNT(*) as entries, SUM(subtotal) as subtotal, SUM(charges) as charges, SUM(total_amount) as amount, SUM(paid_amount) as paid')
            ->groupBy('date')
            ->orderByDesc('date')
            ->get();

        return $rows->map(fn ($row) => [
            'date' => (string) $row->date,
            'entries' => (int) $row->entries,
            'subtotal' => (float) $row->subtotal,
            'charges' => (float) $row->charges,
            'amount' => (float) $row->amount,
            'paid' => (float) $row->paid,
            'remaining' => round((float) $row->amount - (float) $row->paid, 2),
        ])->all();
    }

    /**
     * Every purchase in the period, supplier by supplier.
     */
    protected function purchaseHistory(string $from, string $to): array
    {
        return SupplierPurchase::with(['supplier', 'items'])
            ->whereBetween('date', [$from, $to])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($purchase) => [
                'id' => $purchase->id,
                'date' => $purchase->date->format('Y-m-d'),
                'reference' => $purchase->reference,
                'supplier_id' => $purchase->supplier_id,
                'supplier_code' => $purchase->supplier?->code,
                'supplier_name' => $purchase->supplier?->name_en,
                'supplier_name_ur' => $purchase->supplier?->name_ur,
                'items' => $purchase->items->map(fn ($line) => $line->description)->implode(', '),
                'charges' => (float) $purchase->charges,
                'total_amount' => (float) $purchase->total_amount,
                'paid_amount' => (float) $purchase->paid_amount,
                'remaining_amount' => (float) $purchase->remaining_amount,
            ])->all();
    }

    /**
     * What every supplier is owed.
     */
    protected function outstanding(): array
    {
        $rows = [];

        foreach (JkcSupplier::orderBy('code')->get() as $supplier) {
            $rows[] = [
                'id' => $supplier->id,
                'code' => $supplier->code,
                'name_en' => $supplier->name_en,
                'name_ur' => $supplier->name_ur,
                'opening_balance' => (float) $supplier->opening_balance,
                'current_balance' => $this->ledger->currentBalance(PartyService::SUPPLIER, $supplier->id),
            ];
        }

        return $rows;
    }

    /**
     * Every payment in the period: the ones made on the spot and the later ones.
     */
    protected function paymentHistory(string $from, string $to): array
    {
        $rows = [];

        // The payment made on the spot belongs to the purchase.
        $purchases = SupplierPurchase::with('supplier')
            ->whereBetween('date', [$from, $to])
            ->where('paid_amount', '>', 0)
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        foreach ($purchases as $purchase) {
            $rows[] = [
                'date' => $purchase->date->format('Y-m-d'),
                'supplier_id' => $purchase->supplier_id,
                'supplier_code' => $purchase->supplier?->code,
                'supplier_name' => $purchase->supplier?->name_en,
                'supplier_name_ur' => $purchase->supplier?->name_ur,
                'amount' => (float) $purchase->paid_amount,
                'payment_method' => $purchase->payment_method ?: 'cash',
                'reference' => $purchase->reference,
                'note' => null,
                'source' => 'purchase',
            ];
        }

        // The payments made later are their own records.
        $payments = SupplierPayment::with('supplier')
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        foreach ($payments as $payment) {
            $rows[] = [
                'date' => $payment->date->format('Y-m-d'),
                'supplier_id' => $payment->supplier_id,
                'supplier_code' => $payment->supplier?->code,
                'supplier_name' => $payment->supplier?->name_en,
                'supplier_name_ur' => $payment->supplier?->name_ur,
                'amount' => (float) $payment->amount,
                'payment_method' => $payment->payment_method ?: 'cash',
                'reference' => $payment->reference,
                'note' => $payment->note,
                'source' => 'payment',
            ];
        }

        usort($rows, fn ($a, $b) => strcmp((string) $b['date'], (string) $a['date']));

        return $rows;
    }

    /**
     * The totals of the period.
     */
    protected function totals(string $from, string $to): array
    {
        $purchases = SupplierPurchase::whereBetween('date', [$from, $to]);

        $purchaseTotal = (float) (clone $purchases)->sum('total_amount');
        $purchasePaid = (float) (clone $purchases)->sum('paid_amount');
        $chargesTotal = (float) (clone $purchases)->sum('charges');

        $laterPaid = (float) SupplierPayment::whereBetween('date', [$from, $to])->sum('amount');

        return [
            'purchases' => (int) (clone $purchases)->count(),
            'purchase_total' => $purchaseTotal,
            'charges_total' => $chargesTotal,
            'paid_on_purchase' => $purchasePaid,
            'paid_later' => $laterPaid,
            'paid_total' => round($purchasePaid + $laterPaid, 2),
            'remaining_total' => round($purchaseTotal - $purchasePaid - $laterPaid, 2),
        ];
    }
}
