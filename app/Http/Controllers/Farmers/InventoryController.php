<?php

namespace App\Http\Controllers\Farmers;

use App\Http\Controllers\Controller;
use App\Models\Farmer;
use App\Models\FarmerPurchase;
use App\Services\InventoryService;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function __construct(
        protected InventoryService $inventory,
        protected PartyLedgerService $ledger,
    ) {}

    /**
     * The inventory screen.
     */
    public function index(): Response
    {
        return Inertia::render('farmers/inventory/index', [
            'summary' => $this->inventory->summary(),
            'purchases' => $this->inventory->byPurchase(),
        ]);
    }

    /**
     * The farmer side reports.
     */
    public function reports(Request $request): Response
    {
        $from = $request->query('from', now()->subMonth()->format('Y-m-d'));
        $to = $request->query('to', date('Y-m-d'));

        return Inertia::render('farmers/reports/index', [
            'from' => $from,
            'to' => $to,
            'purchaseHistory' => $this->purchaseHistory($from, $to),
            'outstanding' => $this->outstanding(),
            'inventory' => $this->inventory->summary(),
            'dailySummary' => $this->dailySummary($from, $to),
        ]);
    }

    /**
     * Every purchase in the period.
     */
    protected function purchaseHistory(string $from, string $to): array
    {
        return FarmerPurchase::with(['farmer', 'mark', 'item'])
            ->whereBetween('date', [$from, $to])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($purchase) => [
                'id' => $purchase->id,
                'date' => $purchase->date->format('Y-m-d'),
                'reference' => $purchase->reference,
                'farmer_name' => $purchase->farmer?->name_en,
                'farmer_name_ur' => $purchase->farmer?->name_ur,
                'mark_name' => $purchase->mark?->name_en,
                'item_name' => $purchase->item?->name_en,
                'nag' => (int) $purchase->nag,
                'weight' => (float) $purchase->weight,
                'rate' => (float) $purchase->rate,
                'charges' => (float) $purchase->charges,
                'amount' => (float) $purchase->amount,
                'paid_amount' => (float) $purchase->paid_amount,
                'remaining_amount' => (float) $purchase->remaining_amount,
            ])->all();
    }

    /**
     * What every farmer is owed.
     */
    protected function outstanding(): array
    {
        $rows = [];

        foreach (Farmer::orderBy('code')->get() as $farmer) {
            $rows[] = [
                'id' => $farmer->id,
                'code' => $farmer->code,
                'name_en' => $farmer->name_en,
                'name_ur' => $farmer->name_ur,
                'opening_balance' => (float) $farmer->opening_balance,
                'current_balance' => $this->ledger->currentBalance(PartyService::FARMER, $farmer->id),
            ];
        }

        return $rows;
    }

    /**
     * Purchases per day in the period.
     */
    protected function dailySummary(string $from, string $to): array
    {
        $rows = FarmerPurchase::query()
            ->whereBetween('date', [$from, $to])
            ->selectRaw('date, COUNT(*) as entries, SUM(nag) as bags, SUM(weight) as weight, SUM(amount) as amount, SUM(paid_amount) as paid')
            ->groupBy('date')
            ->orderByDesc('date')
            ->get();

        return $rows->map(fn ($row) => [
            'date' => (string) $row->date,
            'entries' => (int) $row->entries,
            'bags' => (int) $row->bags,
            'weight' => (float) $row->weight,
            'amount' => (float) $row->amount,
            'paid' => (float) $row->paid,
            'remaining' => round((float) $row->amount - (float) $row->paid, 2),
        ])->all();
    }
}
