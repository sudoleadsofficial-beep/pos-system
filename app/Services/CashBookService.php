<?php

namespace App\Services;

use App\Models\AmrozaSale;
use App\Models\CommissionAgent;
use App\Models\Expense;
use App\Models\Farmer;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use App\Models\PartyLedgerEntry;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Cash Book Service (روکڑ / روزنامچہ).
 *
 * Implements the Derived / Virtual Ledger pattern:
 * Computes opening, inflows, outflows and closing balances dynamically from
 * underlying authoritative transaction tables without writing duplicate journal records.
 *
 * Cash-Only Architecture for Sabzi Mandi POS V1:
 *   Opening Cash = Baseline Cash + Sum(Cash Inflows prior to D) - Sum(Cash Outflows prior to D)
 *   Closing Cash = Opening Cash + Day's Cash Inflows - Day's Cash Outflows
 */
class CashBookService
{
    public const METHOD_CASH = 'cash';

    public function __construct(
        protected BusinessSettingsService $settings
    ) {}

    /**
     * Baseline opening cash balance configured in system settings.
     */
    public function getBaselineOpeningBalance(string $method = self::METHOD_CASH): float
    {
        return (float) $this->settings->get('opening_cash_balance', 0.0);
    }

    /**
     * The configured start date for cash book calculations.
     */
    public function getStartDate(): string
    {
        return (string) $this->settings->get('cash_book_start_date', '2026-01-01');
    }

    /**
     * Calculate opening cash balance on a specific date.
     */
    public function getOpeningBalance(string $date, string $method = self::METHOD_CASH): float
    {
        $baseline = $this->getBaselineOpeningBalance($method);
        $startDate = $this->getStartDate();

        // If the query date is on or before the baseline start date, return the baseline
        if ($date <= $startDate) {
            return round($baseline, 2);
        }

        // Sum of all prior cash inflows and outflows strictly before $date (and >= $startDate)
        $priorInflows = $this->calculateTotalInflows($startDate, Carbon::parse($date)->subDay()->toDateString());
        $priorOutflows = $this->calculateTotalOutflows($startDate, Carbon::parse($date)->subDay()->toDateString());

        return round($baseline + $priorInflows - $priorOutflows, 2);
    }

    /**
     * Get complete Cash Book (Rokad) details for a single date or date range.
     */
    public function getCashBook(string $from, ?string $to = null, string $method = self::METHOD_CASH): array
    {
        $to = $to ?? $from;
        $isSingleDay = ($from === $to);

        $openingBalance = $this->getOpeningBalance($from);

        // Fetch inflows and outflows for the date range
        $inflows = $this->getInflowEntries($from, $to);
        $outflows = $this->getOutflowEntries($from, $to);

        $totalInflow = round($inflows->sum('amount'), 2);
        $totalOutflow = round($outflows->sum('amount'), 2);
        $closingBalance = round($openingBalance + $totalInflow - $totalOutflow, 2);

        // Grouped summary for breakdown cards
        $inflowSummary = [
            'same_day_cash' => round($inflows->where('category', 'same_day_cash')->sum('amount'), 2),
            'recovery' => round($inflows->where('category', 'recovery')->sum('amount'), 2),
            'cash_sales' => round($inflows->where('category', 'cash_sale')->sum('amount'), 2),
            'other_inflows' => round($inflows->whereNotIn('category', ['same_day_cash', 'recovery', 'cash_sale'])->sum('amount'), 2),
            'total' => $totalInflow,
        ];

        $outflowSummary = [
            'farmer_payments' => round($outflows->where('category', 'farmer_payment')->sum('amount'), 2),
            'supplier_payments' => round($outflows->where('category', 'supplier_payment')->sum('amount'), 2),
            'agent_payments' => round($outflows->where('category', 'agent_payment')->sum('amount'), 2),
            'expenses' => round($outflows->where('category', 'expense')->sum('amount'), 2),
            'total' => $totalOutflow,
        ];

        return [
            'from' => $from,
            'to' => $to,
            'is_single_day' => $isSingleDay,
            'method' => self::METHOD_CASH,
            'opening_balance' => $openingBalance,
            'inflows' => $inflows->values()->all(),
            'outflows' => $outflows->values()->all(),
            'total_inflow' => $totalInflow,
            'total_outflow' => $totalOutflow,
            'closing_balance' => $closingBalance,
            'inflow_summary' => $inflowSummary,
            'outflow_summary' => $outflowSummary,
        ];
    }

    /**
     * Compute total cash inflows for a date range without loading full line items.
     */
    public function calculateTotalInflows(string $from, string $to, string $method = self::METHOD_CASH): float
    {
        // Cash inflows:
        // 1. Merchant Receipts
        $receiptsTotal = (float) MerchantReceipt::query()
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->sum('amount');

        // 2. Unreceipted cash sales: check daily per merchant
        $unreceiptedTotal = $this->calculateUnreceiptedCashSales($from, $to);

        return round($receiptsTotal + $unreceiptedTotal, 2);
    }

    /**
     * Compute total cash outflows for a date range.
     */
    public function calculateTotalOutflows(string $from, string $to, string $method = self::METHOD_CASH): float
    {
        // 1. Farmer payments (cash)
        $farmerTotal = (float) PartyLedgerEntry::query()
            ->where('party_type', PartyService::FARMER)
            ->where('category', 'payment')
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->sum('amount');

        // 2. Agent payments (cash)
        $agentTotal = (float) PartyLedgerEntry::query()
            ->where('party_type', PartyService::COMMISSION_AGENT)
            ->where('category', 'payment')
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->sum('amount');

        // 3. Supplier payments (cash)
        $supplierTotal = (float) PartyLedgerEntry::query()
            ->where('party_type', PartyService::SUPPLIER)
            ->where('category', 'payment')
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->sum('amount');

        // 4. Shop Expenses (cash)
        $expenseTotal = (float) Expense::query()
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->sum('amount');

        return round($farmerTotal + $supplierTotal + $agentTotal + $expenseTotal, 2);
    }

    /**
     * Retrieve all cash inflow line items for the cash book.
     */
    public function getInflowEntries(string $from, string $to, string $method = self::METHOD_CASH): Collection
    {
        $entries = collect();

        // 1. Merchant Receipts (same-day cash and recovery)
        $receipts = MerchantReceipt::query()
            ->with('merchant')
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        foreach ($receipts as $receipt) {
            $isSameDay = ($receipt->type === 'same_day_cash');
            $partyName = $receipt->merchant
                ? ($receipt->merchant->name . ' (' . ($receipt->merchant->code ?? '') . ')')
                : 'Direct Merchant';

            $entries->push([
                'id' => 'receipt-' . $receipt->id,
                'date' => Carbon::parse($receipt->date)->format('Y-m-d'),
                'time' => $receipt->created_at?->format('H:i') ?? '',
                'category' => $isSameDay ? 'same_day_cash' : 'recovery',
                'title' => $isSameDay ? 'Same Day Cash Receipt' : 'Recovery Receipt',
                'title_ur' => $isSameDay ? 'نقدی وصولی' : 'سابقہ ریکوری وصولی',
                'party_name' => $partyName,
                'reference' => 'REC-' . str_pad((string) $receipt->id, 5, '0', STR_PAD_LEFT),
                'payment_method' => self::METHOD_CASH,
                'description' => $receipt->note ?? ($isSameDay ? 'Cash sale settlement' : 'Khata balance recovery'),
                'amount' => (float) $receipt->amount,
            ]);
        }

        // 2. Unreceipted Cash Sales (from Amroza)
        $unreceipted = $this->getUnreceiptedCashSaleEntries($from, $to);
        foreach ($unreceipted as $item) {
            $entries->push($item);
        }

        return $entries->sortBy(['date', 'time', 'id']);
    }

    /**
     * Retrieve all cash outflow line items for the cash book.
     */
    public function getOutflowEntries(string $from, string $to, string $method = self::METHOD_CASH): Collection
    {
        $entries = collect();

        // 1. Farmer Payments
        $farmerEntries = PartyLedgerEntry::query()
            ->where('party_type', PartyService::FARMER)
            ->where('category', 'payment')
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        $farmers = Farmer::whereIn('id', $farmerEntries->pluck('party_id')->unique())->get()->keyBy('id');

        foreach ($farmerEntries as $entry) {
            $farmer = $farmers->get($entry->party_id);
            $partyName = $farmer ? ($farmer->name . ' (' . ($farmer->code ?? '') . ')') : 'Farmer #' . $entry->party_id;

            $entries->push([
                'id' => 'farmer-pmt-' . $entry->id,
                'date' => Carbon::parse($entry->date)->format('Y-m-d'),
                'time' => $entry->created_at?->format('H:i') ?? '',
                'category' => 'farmer_payment',
                'title' => 'Farmer Payment',
                'title_ur' => 'ادائیگی زمیندار',
                'party_name' => $partyName,
                'reference' => $entry->reference ?? 'PMT-F-' . $entry->id,
                'payment_method' => self::METHOD_CASH,
                'description' => $entry->description ?? 'Farmer payment',
                'amount' => (float) $entry->amount,
            ]);
        }

        // 2. Commission Agent Payments
        $agentEntries = PartyLedgerEntry::query()
            ->where('party_type', PartyService::COMMISSION_AGENT)
            ->where('category', 'payment')
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        $agents = CommissionAgent::whereIn('id', $agentEntries->pluck('party_id')->unique())->get()->keyBy('id');

        foreach ($agentEntries as $entry) {
            $agent = $agents->get($entry->party_id);
            $partyName = $agent ? ($agent->name . ' (' . ($agent->code ?? '') . ')') : 'Agent #' . $entry->party_id;

            $entries->push([
                'id' => 'agent-pmt-' . $entry->id,
                'date' => Carbon::parse($entry->date)->format('Y-m-d'),
                'time' => $entry->created_at?->format('H:i') ?? '',
                'category' => 'agent_payment',
                'title' => 'Commission Agent Payment',
                'title_ur' => 'ادائیگی کمیشن ایجنٹ',
                'party_name' => $partyName,
                'reference' => $entry->reference ?? 'PMT-A-' . $entry->id,
                'payment_method' => self::METHOD_CASH,
                'description' => $entry->description ?? 'Payment to commission agent',
                'amount' => (float) $entry->amount,
            ]);
        }

        // 3. Supplier Payments
        $supplierEntries = PartyLedgerEntry::query()
            ->where('party_type', PartyService::SUPPLIER)
            ->where('category', 'payment')
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        $suppliers = JkcSupplier::whereIn('id', $supplierEntries->pluck('party_id')->unique())->get()->keyBy('id');

        foreach ($supplierEntries as $entry) {
            $supplier = $suppliers->get($entry->party_id);
            $partyName = $supplier ? ($supplier->name . ' (' . ($supplier->code ?? '') . ')') : 'Supplier #' . $entry->party_id;

            $entries->push([
                'id' => 'supplier-pmt-' . $entry->id,
                'date' => Carbon::parse($entry->date)->format('Y-m-d'),
                'time' => $entry->created_at?->format('H:i') ?? '',
                'category' => 'supplier_payment',
                'title' => 'Supplier Payment',
                'title_ur' => 'ادائیگی سپلائر',
                'party_name' => $partyName,
                'reference' => $entry->reference ?? 'PMT-S-' . $entry->id,
                'payment_method' => self::METHOD_CASH,
                'description' => $entry->description ?? 'Supplier payment',
                'amount' => (float) $entry->amount,
            ]);
        }

        // 4. Shop Expenses
        $expenseQuery = Expense::query()
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->orderBy('id');

        $expenses = $expenseQuery->get();

        foreach ($expenses as $expense) {
            $categoryNames = Expense::categories();
            $categoryLabel = $categoryNames[$expense->category] ?? ucfirst($expense->category);

            $entries->push([
                'id' => 'expense-' . $expense->id,
                'date' => $expense->date->format('Y-m-d'),
                'time' => $expense->created_at?->format('H:i') ?? '',
                'category' => 'expense',
                'sub_category' => $expense->category,
                'title' => $expense->title,
                'title_ur' => $categoryLabel,
                'party_name' => 'Expense / اخراجات',
                'reference' => $expense->reference ?? 'EXP-' . $expense->id,
                'payment_method' => self::METHOD_CASH,
                'description' => $expense->description ?? $expense->title,
                'amount' => (float) $expense->amount,
            ]);
        }

        return $entries->sortBy(['date', 'time', 'id']);
    }

    /**
     * Calculate unreceipted cash sales across a date range.
     */
    protected function calculateUnreceiptedCashSales(string $from, string $to): float
    {
        $dates = Carbon::parse($from)->range(Carbon::parse($to));
        $unreceiptedTotal = 0.0;

        foreach ($dates as $dateObj) {
            $date = $dateObj->toDateString();

            // Cash sales by merchant on this date
            $cashSales = AmrozaSale::with('merchant')
                ->where('date', $date)
                ->where(function ($q) {
                    $q->where('payment_type', 'naqdi')
                      ->orWhereHas('merchant', fn ($m) => $m->where('code', 1));
                })
                ->get()
                ->groupBy('merchant_id');

            // Same day cash receipts by merchant on this date
            $receipts = MerchantReceipt::where('date', $date)
                ->where('type', 'same_day_cash')
                ->get()
                ->groupBy('merchant_id');

            $merchantIds = $cashSales->keys()->merge($receipts->keys())->unique();

            foreach ($merchantIds as $merchantId) {
                $saleSum = (float) ($cashSales->get($merchantId)?->sum('gross_amount') ?? 0);
                $receiptSum = (float) ($receipts->get($merchantId)?->sum('amount') ?? 0);

                // If cash sales exceed receipts recorded for this merchant, the unreceipted difference is cash inflow
                if ($saleSum > $receiptSum) {
                    $unreceiptedTotal += ($saleSum - $receiptSum);
                }
            }
        }

        return round($unreceiptedTotal, 2);
    }

    /**
     * Retrieve individual line items for unreceipted cash sales.
     */
    protected function getUnreceiptedCashSaleEntries(string $from, string $to): array
    {
        $entries = [];
        $dates = Carbon::parse($from)->range(Carbon::parse($to));

        foreach ($dates as $dateObj) {
            $date = $dateObj->toDateString();

            $cashSales = AmrozaSale::with(['merchant', 'item'])
                ->where('date', $date)
                ->where(function ($q) {
                    $q->where('payment_type', 'naqdi')
                      ->orWhereHas('merchant', fn ($m) => $m->where('code', 1));
                })
                ->get();

            $receipts = MerchantReceipt::where('date', $date)
                ->where('type', 'same_day_cash')
                ->get()
                ->groupBy('merchant_id');

            $groupedSales = $cashSales->groupBy('merchant_id');

            foreach ($groupedSales as $merchantId => $sales) {
                $totalSale = (float) $sales->sum('gross_amount');
                $receiptTotal = (float) ($receipts->get($merchantId)?->sum('amount') ?? 0);

                if ($totalSale > $receiptTotal) {
                    $diff = round($totalSale - $receiptTotal, 2);
                    $merchant = $sales->first()?->merchant;
                    $partyName = $merchant
                        ? ($merchant->name . ' (' . ($merchant->code ?? '') . ')')
                        : 'Cash Customer';

                    $entries[] = [
                        'id' => 'cash-sale-' . $date . '-' . $merchantId,
                        'date' => $date,
                        'time' => '',
                        'category' => 'cash_sale',
                        'title' => 'Direct Cash Sale (Unreceipted)',
                        'title_ur' => 'براہ راست نقدی سیل',
                        'party_name' => $partyName,
                        'reference' => 'SALE-' . $date,
                        'payment_method' => self::METHOD_CASH,
                        'description' => 'Unreceipted cash sales settlement',
                        'amount' => $diff,
                    ];
                }
            }
        }

        return $entries;
    }
}
