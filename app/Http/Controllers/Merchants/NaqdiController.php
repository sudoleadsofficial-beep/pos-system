<?php

namespace App\Http\Controllers\Merchants;

use App\Http\Controllers\Controller;
use App\Services\NaqdiService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NaqdiController extends Controller
{
    public function __construct(
        protected NaqdiService $naqdiService
    ) {}

    public function index(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));
        $sheet = $this->naqdiService->getNaqdiSheet($date);

        return Inertia::render('merchants/naqdi/index', [
            'rows' => $sheet['rows'],
            'totals' => $sheet['totals'],
            'filters' => [
                'date' => $date,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'merchant_id' => 'required|exists:merchants,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0',
        ]);

        $this->naqdiService->saveNaqdiReceipt(
            $validated['merchant_id'],
            $validated['date'],
            floatval($validated['amount'])
        );

        return redirect()->back()->with('success', 'Cash receipt saved.');
    }
}
