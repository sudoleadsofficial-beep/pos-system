<?php

namespace App\Http\Controllers\Merchants;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Merchant;
use App\Services\AmrozaService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AmrozaController extends Controller
{
    public function __construct(
        protected AmrozaService $amrozaService
    ) {}

    public function index(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));
        $search = $request->query('search');

        $sales = $this->amrozaService->getDailySales($date, $search);
        $summary = $this->amrozaService->getDailySummary($date);

        $merchants = Merchant::where('status', 'active')
            ->select('id', 'code', 'name_en', 'name_ur', 'current_balance')
            ->orderBy('code', 'asc')
            ->get();

        $items = Item::where('status', 'active')
            ->select('id', 'code', 'name_en', 'name_ur', 'unit', 'default_rate', 'default_bardana')
            ->orderBy('code', 'asc')
            ->get();

        return Inertia::render('merchants/amroza/index', [
            'sales' => $sales,
            'summary' => $summary,
            'merchants' => $merchants,
            'items' => $items,
            'filters' => [
                'date' => $date,
                'search' => $search,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'merchant_id' => 'required|exists:merchants,id',
            'item_id' => 'required|exists:items,id',
            'nag' => 'required|numeric|min:0',
            'weight' => 'nullable|numeric|min:0',
            'rate' => 'required|numeric|min:0',
            'bardana' => 'nullable|numeric|min:0',
        ]);

        $validated['created_by'] = auth()->id();

        $this->amrozaService->createSale($validated);

        return redirect()->back()->with('success', 'Sale recorded successfully.');
    }

    public function update(Request $request, int $id)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'merchant_id' => 'required|exists:merchants,id',
            'item_id' => 'required|exists:items,id',
            'nag' => 'required|numeric|min:0',
            'weight' => 'nullable|numeric|min:0',
            'rate' => 'required|numeric|min:0',
            'bardana' => 'nullable|numeric|min:0',
        ]);

        $this->amrozaService->updateSale($id, $validated);

        return redirect()->back()->with('success', 'Sale updated successfully.');
    }

    public function destroy(int $id)
    {
        $this->amrozaService->deleteSale($id);

        return redirect()->back()->with('success', 'Sale deleted successfully.');
    }

    public function amTotal(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));
        $data = $this->amrozaService->getAmTotal($date);

        return response()->json($data);
    }
}
