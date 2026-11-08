<?php

namespace App\Http\Controllers\Farmers;

use App\Http\Controllers\Controller;
use App\Models\Farmer;
use App\Models\FarmerSettlement;
use App\Services\FarmerSettlementService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FarmerSettlementController extends Controller
{
    public function __construct(
        protected FarmerSettlementService $settlements
    ) {}

    /**
     * Consignment Settlement / Bijak Index.
     */
    public function index(Request $request): Response
    {
        $farmerId = $request->input('farmer_id') ? (int) $request->input('farmer_id') : null;
        $date = $request->input('date');

        // Unsettled consignments
        $unsettled = $this->settlements->getUnsettledArrivals($farmerId);

        // Settled history query
        $query = FarmerSettlement::with([
            'farmer',
            'farmerPurchase.item',
            'farmerPurchase.mark',
        ])->orderBy('date', 'desc')->orderBy('id', 'desc');

        if ($farmerId) {
            $query->where('farmer_id', $farmerId);
        }

        if ($date) {
            $query->whereDate('date', $date);
        }

        $settled = $query->paginate(20)->withQueryString();

        // Farmers list for selector
        $farmers = Farmer::where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'name_ur', 'code']);

        return Inertia::render('farmers/settlements/index', [
            'unsettled' => $unsettled,
            'settled' => $settled,
            'farmers' => $farmers,
            'filters' => [
                'farmer_id' => $farmerId,
                'date' => $date,
            ],
        ]);
    }

    /**
     * Store a new consignment settlement (Bijak).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'farmer_purchase_id' => 'required|exists:farmer_purchases,id',
            'date' => 'required|date',
            'gross_sale_amount' => 'required|numeric|min:0',
            'commission_rate' => 'nullable|numeric|min:0|max:100',
            'mazdoori' => 'nullable|numeric|min:0',
            'carriage' => 'nullable|numeric|min:0',
            'chungi' => 'nullable|numeric|min:0',
            'bardana' => 'nullable|numeric|min:0',
            'other_deductions' => 'nullable|numeric|min:0',
            'charges' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'nag' => 'nullable|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $settlement = $this->settlements->create(array_merge($validated, [
                'created_by' => $request->user()?->id,
            ]));

            return redirect()->route('farmers.settlements.show', $settlement->id)
                ->with('success', "Bijak {$settlement->settlement_no} created successfully.");
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * View and print a Farmer Bijak statement.
     */
    public function show(int $id): Response
    {
        $bijakData = $this->settlements->getSettlementForBijak($id);

        return Inertia::render('farmers/settlements/show', [
            'bijak' => $bijakData,
        ]);
    }

    /**
     * Delete / Cancel a settlement.
     */
    public function destroy(int $id): RedirectResponse
    {
        $settlement = FarmerSettlement::findOrFail($id);

        try {
            $this->settlements->delete($settlement);

            return redirect()->route('farmers.settlements.index')
                ->with('success', 'Settlement cancelled and consignment restored to unsettled.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
