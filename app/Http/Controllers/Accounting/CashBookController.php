<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\BusinessSettingsService;
use App\Services\CashBookService;
use App\Services\GeneralLedgerService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CashBookController extends Controller
{
    public function __construct(
        protected CashBookService $cashBook,
        protected GeneralLedgerService $generalLedger,
        protected BusinessSettingsService $settings
    ) {}

    /**
     * Daily Cash Book / Rokad screen (روکڑ).
     */
    public function index(Request $request): Response
    {
        $today = Carbon::today()->toDateString();
        $date = $request->input('date', $today);
        $from = $request->input('from', $date);
        $to = $request->input('to', $date);

        $bookData = $this->cashBook->getCashBook($from, $to);

        return Inertia::render('accounting/cash-book/index', [
            'bookData' => $bookData,
            'filters' => [
                'date' => $date,
                'from' => $from,
                'to' => $to,
            ],
            'categories' => Expense::categories(),
            'baselineSettings' => [
                'opening_cash_balance' => (float) $this->settings->get('opening_cash_balance', 0),
                'cash_book_start_date' => (string) $this->settings->get('cash_book_start_date', '2026-01-01'),
            ],
        ]);
    }

    /**
     * General Ledger / Trial Balance screen (کھاتہ جات).
     */
    public function generalLedger(Request $request): Response
    {
        $today = Carbon::today()->toDateString();
        $date = $request->input('date', $today);

        $trialBalance = $this->generalLedger->getTrialBalance($date);
        $accountHeads = $this->generalLedger->getAccountHeads();

        return Inertia::render('accounting/general-ledger/index', [
            'trialBalance' => $trialBalance,
            'accountHeads' => $accountHeads,
            'filters' => [
                'date' => $date,
            ],
            'baselineSettings' => [
                'opening_cash_balance' => (float) $this->settings->get('opening_cash_balance', 0),
                'cash_book_start_date' => (string) $this->settings->get('cash_book_start_date', '2026-01-01'),
            ],
        ]);
    }

    /**
     * Store a shop expense directly from the cash book.
     */
    public function storeExpense(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|in:cash',
            'category' => 'required|string|max:50',
            'reference' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:1000',
        ]);

        $validated['payment_method'] = 'cash';

        Expense::create(array_merge($validated, [
            'created_by' => $request->user()?->id,
        ]));

        return back()->with('success', 'Expense recorded successfully in Cash Book.');
    }

    /**
     * Delete an expense.
     */
    public function destroyExpense(int $id): RedirectResponse
    {
        $expense = Expense::findOrFail($id);
        $expense->delete();

        return back()->with('success', 'Expense deleted successfully.');
    }

    /**
     * Update baseline opening cash balance.
     */
    public function updateOpeningBalances(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'opening_cash_balance' => 'required|numeric',
            'cash_book_start_date' => 'required|date',
        ]);

        $this->settings->setMany([
            'opening_cash_balance' => (string) $validated['opening_cash_balance'],
            'cash_book_start_date' => (string) $validated['cash_book_start_date'],
        ]);

        return back()->with('success', 'Opening cash balance updated successfully.');
    }
}
