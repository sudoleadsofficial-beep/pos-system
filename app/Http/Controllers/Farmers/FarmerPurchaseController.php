<?php

namespace App\Http\Controllers\Farmers;

use App\Http\Controllers\Controller;
use App\Models\Farmer;
use App\Models\FarmerMark;
use App\Models\FarmerPurchase;
use App\Models\Item;
use App\Services\FarmerPurchaseService;
use App\Services\InventoryService;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FarmerPurchaseController extends Controller
{
    public function __construct(
        protected FarmerPurchaseService $purchases,
        protected InventoryService $inventory,
        protected PartyLedgerService $ledger,
    ) {}

    /**
     * The Farmer Purchase & Arrival screen.
     */
    public function index(Request $request): Response
    {
        $date = $request->query('date', date('Y-m-d'));

        return Inertia::render('farmers/purchases/index', [
            'date' => $date,
            'farmers' => $this->farmerOptions(),
            'marks' => $this->markOptions(),
            'items' => $this->itemOptions(),
            'purchases' => $this->recentPurchases(),
            'outstanding' => $this->outstandingByFarmer(),
            'availableStock' => $this->inventory->availableByItem(),
        ]);
    }

    /**
     * Record an arrival.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $this->purchases->create(array_merge($data, [
            'created_by' => $request->user()?->id,
        ]));

        return back()->with('success', 'Purchase saved and the farmer ledger updated.');
    }

    /**
     * Change an arrival.
     */
    public function update(Request $request, FarmerPurchase $purchase): RedirectResponse
    {
        $data = $this->validated($request);

        $this->purchases->update($purchase, $data);

        return back()->with('success', 'Purchase updated.');
    }

    /**
     * Remove an arrival.
     */
    public function destroy(FarmerPurchase $purchase): RedirectResponse
    {
        $this->purchases->delete($purchase);

        return back()->with('success', 'Purchase removed and the farmer balance adjusted.');
    }

    /**
     * Pay a farmer - lowers what the farmer is owed.
     */
    public function payment(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'farmer_id' => 'required|exists:farmers,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:255',
        ]);

        $this->purchases->recordPayment((int) $validated['farmer_id'], [
            'date' => $validated['date'],
            'amount' => (float) $validated['amount'],
            'description' => ($validated['notes'] ?? null) ?: 'Cash Paid',
            'created_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Payment recorded.');
    }

    /**
     * Check the request and work out the amounts.
     */
    protected function validated(Request $request): array
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'farmer_id' => 'required|exists:farmers,id',
            'farmer_mark_id' => 'nullable|exists:farmer_marks,id',
            'item_id' => 'required|exists:items,id',
            'nag' => 'required|integer|min:1',
            'weight' => 'nullable|numeric|min:0',
            'rate' => 'required|numeric|min:0',
            'charges' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $amount = $this->purchases->calculateAmount(
            $validated['nag'],
            $validated['rate'],
            $validated['charges'] ?? 0
        );

        $paid = round((float) ($validated['paid_amount'] ?? 0), 2);

        if ($paid > $amount) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'paid_amount' => 'The amount paid cannot be more than the purchase amount.',
            ]);
        }

        $validated['charges'] = $validated['charges'] ?? 0;
        $validated['paid_amount'] = $paid;

        return $validated;
    }

    protected function farmerOptions(): array
    {
        return Farmer::with('area')->orderBy('code')->get()->map(fn ($farmer) => [
            'id' => $farmer->id,
            'code' => $farmer->code,
            'name_en' => $farmer->name_en,
            'name_ur' => $farmer->name_ur,
            'area' => $farmer->area?->name_en,
            'current_balance' => (float) $farmer->current_balance,
        ])->all();
    }

    protected function markOptions(): array
    {
        return FarmerMark::orderBy('farmer_id')->orderBy('code')->get()->map(fn ($mark) => [
            'id' => $mark->id,
            'farmer_id' => $mark->farmer_id,
            'code' => $mark->code,
            'name_en' => $mark->name_en,
            'name_ur' => $mark->name_ur,
        ])->all();
    }

    protected function itemOptions(): array
    {
        return Item::where('status', 'active')->orderBy('name_en')->get()->map(fn ($item) => [
            'id' => $item->id,
            'name_en' => $item->name_en,
            'name_ur' => $item->name_ur,
            'unit' => $item->unit,
            'default_rate' => (float) ($item->default_rate ?? 0),
        ])->all();
    }

    protected function recentPurchases(): array
    {
        return FarmerPurchase::with(['farmer', 'mark', 'item'])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn ($purchase) => [
                'id' => $purchase->id,
                'date' => $purchase->date->format('Y-m-d'),
                'reference' => $purchase->reference,
                'farmer_id' => $purchase->farmer_id,
                'farmer_code' => $purchase->farmer?->code,
                'farmer_name' => $purchase->farmer?->name_en,
                'farmer_name_ur' => $purchase->farmer?->name_ur,
                'mark_name' => $purchase->mark?->name_en,
                'item_id' => $purchase->item_id,
                'item_name' => $purchase->item?->name_en,
                'item_name_ur' => $purchase->item?->name_ur,
                'nag' => (int) $purchase->nag,
                'weight' => (float) $purchase->weight,
                'rate' => (float) $purchase->rate,
                'charges' => (float) $purchase->charges,
                'amount' => (float) $purchase->amount,
                'paid_amount' => (float) $purchase->paid_amount,
                'remaining_amount' => (float) $purchase->remaining_amount,
                'notes' => $purchase->notes,
            ])->all();
    }

    /**
     * What every farmer is owed right now.
     */
    protected function outstandingByFarmer(): array
    {
        $rows = [];

        foreach (Farmer::orderBy('code')->get() as $farmer) {
            $rows[] = [
                'id' => $farmer->id,
                'code' => $farmer->code,
                'name_en' => $farmer->name_en,
                'name_ur' => $farmer->name_ur,
                'current_balance' => $this->ledger->currentBalance(PartyService::FARMER, $farmer->id),
            ];
        }

        return $rows;
    }
}
