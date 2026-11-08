<?php

namespace App\Services;

use App\Models\AmrozaSale;
use App\Models\CommissionAgent;
use App\Models\Expense;
use App\Models\Farmer;
use App\Models\FarmerPurchase;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use Carbon\Carbon;

/**
 * General Ledger Service (کھاتہ جات و میزان حسابات).
 *
 * Consolidates all financial account heads across the business (Cash-Only V1):
 * - Cash in Hand (روکڑ)
 * - Accounts Receivable (قرضدار تجار)
 * - Farmer Payables (زمیندار کھاتہ جات)
 * - Supplier Payables (سپلائر کھاتہ جات)
 * - Commission Agent Payables (کمیشن ایجنٹس کھاتہ جات)
 * - Business Expenses (دکان کے اخراجات)
 * - Business Sales & Commission (سیلز و کمیشن آمدنی)
 */
class GeneralLedgerService
{
    public function __construct(
        protected CashBookService $cashBook,
        protected BusinessSettingsService $settings
    ) {}

    /**
     * Get trial balance / overview of all ledger heads as of a specific date (or today).
     */
    public function getTrialBalance(?string $date = null): array
    {
        $date = $date ?? Carbon::today()->toDateString();

        // 1. Assets (اثاثہ جات)
        $cashBookToday = $this->cashBook->getCashBook($date, $date);

        $cashInHand = $cashBookToday['closing_balance'];
        $receivables = (float) Merchant::where('status', 'active')->sum('current_balance');

        $totalAssets = round($cashInHand + $receivables, 2);

        // 2. Liabilities (واجبات)
        $farmerPayables = (float) Farmer::where('status', 'active')->sum('current_balance');
        $supplierPayables = (float) JkcSupplier::where('status', 'active')->sum('current_balance');
        $agentPayables = (float) CommissionAgent::where('status', 'active')->sum('current_balance');

        $totalLiabilities = round($farmerPayables + $supplierPayables + $agentPayables, 2);

        // 3. Expenses (اخراجات)
        $totalExpenses = (float) Expense::sum('amount');
        $expenseCategories = Expense::query()
            ->selectRaw('category, sum(amount) as total, count(*) as count')
            ->groupBy('category')
            ->get()
            ->map(function ($item) {
                $categories = Expense::categories();
                return [
                    'category' => $item->category,
                    'title' => $categories[$item->category] ?? ucfirst($item->category),
                    'total' => round((float) $item->total, 2),
                    'count' => (int) $item->count,
                ];
            })
            ->values()
            ->all();

        // 4. Revenue / Sales & Commission (آمدنی)
        $totalSales = (float) AmrozaSale::sum('gross_amount');
        $totalAgentCommission = (float) FarmerPurchase::sum('commission_amount');

        return [
            'as_of_date' => $date,
            'assets' => [
                'cash_in_hand' => round($cashInHand, 2),
                'accounts_receivable' => round($receivables, 2),
                'total' => $totalAssets,
            ],
            'liabilities' => [
                'farmers_payable' => round($farmerPayables, 2),
                'suppliers_payable' => round($supplierPayables, 2),
                'agents_payable' => round($agentPayables, 2),
                'total' => $totalLiabilities,
            ],
            'expenses' => [
                'total' => round($totalExpenses, 2),
                'by_category' => $expenseCategories,
            ],
            'revenue' => [
                'total_sales' => round($totalSales, 2),
                'agent_commission_earned' => round($totalAgentCommission, 2),
            ],
            'net_position' => round($totalAssets - $totalLiabilities, 2),
        ];
    }

    /**
     * Complete list of ledger account heads with direct links and details.
     */
    public function getAccountHeads(): array
    {
        $today = Carbon::today()->toDateString();
        $trial = $this->getTrialBalance($today);

        return [
            [
                'code' => '1001',
                'name' => 'Cash in Hand',
                'name_ur' => 'نقدی روکڑ (کیش ان ہینڈ)',
                'type' => 'asset',
                'balance' => $trial['assets']['cash_in_hand'],
                'url' => '/cash-book',
                'description' => 'Daily physical cash in shop drawer / روکڑ کھاتہ',
            ],
            [
                'code' => '1002',
                'name' => 'Accounts Receivable (Merchants / Buyers)',
                'name_ur' => 'قرضدار تجار (گاہک / بیوپاری)',
                'type' => 'asset',
                'balance' => $trial['assets']['accounts_receivable'],
                'url' => '/merchant-wasooli',
                'description' => 'Outstanding balance due from merchants / واجب الوصول رقم',
            ],
            [
                'code' => '2001',
                'name' => 'Accounts Payable (Farmers)',
                'name_ur' => 'واجب الادا زمیندار کھاتہ جات',
                'type' => 'liability',
                'balance' => $trial['liabilities']['farmers_payable'],
                'url' => '/farmers/reports',
                'description' => 'Outstanding balance owed to farmers / زمینداروں کے بقایا جات',
            ],
            [
                'code' => '2002',
                'name' => 'Accounts Payable (Suppliers)',
                'name_ur' => 'واجب الادا سپلائرز کھاتہ جات',
                'type' => 'liability',
                'balance' => $trial['liabilities']['suppliers_payable'],
                'url' => '/supplier-reports',
                'description' => 'Materials, packaging and transport suppliers / سپلائر بقایا جات',
            ],
            [
                'code' => '2003',
                'name' => 'Accounts Payable (Commission Agents)',
                'name_ur' => 'واجب الادا کمیشن ایجنٹس',
                'type' => 'liability',
                'balance' => $trial['liabilities']['agents_payable'],
                'url' => '/commission-agents/reports',
                'description' => 'Outside commission agents payable / کمیشن ایجنٹ بقایا جات',
            ],
            [
                'code' => '5001',
                'name' => 'Shop Operating Expenses',
                'name_ur' => 'دکان کے روزمرہ اخراجات',
                'type' => 'expense',
                'balance' => $trial['expenses']['total'],
                'url' => '/cash-book',
                'description' => 'Rent, electricity, labour, carriage, tea, maintenance / دکان کے اخراجات',
            ],
        ];
    }
}
