<?php

namespace App\Http\Controllers\Merchants;

use App\Http\Controllers\Controller;
use App\Services\WasooliService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WasooliController extends Controller
{
    public function __construct(
        protected WasooliService $wasooliService
    ) {}

    public function index(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));
        $search = $request->query('search');

        $sheet = $this->wasooliService->getWasooliSheet($date, $search);

        return Inertia::render('merchants/wasooli/index', [
            'rows' => $sheet['rows'],
            'totals' => $sheet['totals'],
            'filters' => [
                'date' => $date,
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'merchant_id' => 'required|exists:merchants,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'note' => 'nullable|string|max:255',
        ]);

        $this->wasooliService->saveWasooliReceipt(
            $validated['merchant_id'],
            $validated['date'],
            floatval($validated['amount']),
            $validated['note'] ?? null
        );

        return redirect()->back()->with('success', 'Recovery receipt saved.');
    }
}
