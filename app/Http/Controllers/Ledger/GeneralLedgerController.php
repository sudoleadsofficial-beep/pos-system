<?php

namespace App\Http\Controllers\Ledger;

use App\Http\Controllers\Controller;
use App\Models\AmrozaSale;
use App\Models\Expense;
use App\Models\MerchantReceipt;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GeneralLedgerController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));

        // Prior cash calculations for Sabqa Cash
        $priorCashSales = (float) AmrozaSale::where('date', '<', $date)
            ->where(function ($q) {
                $q->where('payment_type', 'naqdi')
                  ->orWhereHas('merchant', fn($m) => $m->where('code', 1));
            })->sum('gross_amount');

        $priorWasooli = (float) MerchantReceipt::where('date', '<', $date)
            ->where('type', 'recovery')->sum('amount');

        $priorExpenses = (float) Expense::where('date', '<', $date)->sum('amount');

        $sabqaCash = max(0, $priorCashSales + $priorWasooli - $priorExpenses);

        // Day cash sale (Aaj ki Naqdi)
        $aajKiNaqdi = (float) AmrozaSale::where('date', $date)
            ->where(function ($q) {
                $q->where('payment_type', 'naqdi')
                  ->orWhereHas('merchant', fn($m) => $m->where('code', 1));
            })->sum('gross_amount');

        // Day wasooli (Aaj ki Wasooli)
        $aajKiWasooli = (float) MerchantReceipt::where('date', $date)
            ->where('type', 'recovery')->sum('amount');

        // Manual payouts / expense entries (Banam)
        $expenses = Expense::where('date', $date)
            ->orderBy('id', 'asc')
            ->get();

        $rows = [];
        $dayMonth = date('d/m', strtotime($date));

        // 1. Sabqa Cash (if exists or > 0)
        $rows[] = [
            'id'     => 'sabqa',
            'date'   => $dayMonth,
            'name'   => 'Sabqa Cash',
            'detail' => '',
            'jama'   => $sabqaCash,
            'banam'  => 0,
        ];

        // 2. Aaj ki Naqdi
        $rows[] = [
            'id'     => 'naqdi',
            'date'   => $dayMonth,
            'name'   => 'Aaj ki Naqdi',
            'detail' => '',
            'jama'   => $aajKiNaqdi,
            'banam'  => 0,
        ];

        // 3. Aaj ki Wasooli
        $rows[] = [
            'id'     => 'wasooli',
            'date'   => $dayMonth,
            'name'   => 'Aaj ki Wasooli',
            'detail' => '',
            'jama'   => $aajKiWasooli,
            'banam'  => 0,
        ];

        // 4. Expenses / Banam
        foreach ($expenses as $exp) {
            $rows[] = [
                'id'     => 'exp_' . $exp->id,
                'date'   => $dayMonth,
                'name'   => $exp->title,
                'detail' => $exp->description ?: '',
                'jama'   => 0,
                'banam'  => (float) $exp->amount,
            ];
        }

        $totalJama = array_sum(array_column($rows, 'jama'));
        $totalBanam = array_sum(array_column($rows, 'banam'));
        $balance = $totalJama - $totalBanam;

        return Inertia::render('ledger/general/index', [
            'date'       => $date,
            'dayMonth'   => $dayMonth,
            'rows'       => $rows,
            'summary'    => [
                'balance'     => round($balance, 2),
                'total_jama'  => round($totalJama, 2),
                'total_banam' => round($totalBanam, 2),
                'entries'     => count($rows),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date'        => 'required|date',
            'title'       => 'required|string|max:255',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:500',
        ]);

        Expense::create($validated);

        return redirect()->back()->with('success', 'Entry recorded successfully.');
    }
}
