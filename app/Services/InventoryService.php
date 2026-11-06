<?php

namespace App\Services;

use App\Models\AmrozaSale;
use App\Models\FarmerPurchase;
use App\Models\Item;
use Illuminate\Database\Eloquent\Builder;

/**
 * Inventory.
 *
 * The stock figures are DERIVED from the two transaction tables:
 *
 *     received = SUM(farmer_purchases)      what came in
 *     sold     = SUM(amroza_sales)          what went out
 *     remaining = received - sold
 *
 * There is no stock table on purpose. Deriving the numbers means an edited
 * or deleted arrival or sale is reflected at once, a sale can never be
 * deducted twice, and no historical row is ever rewritten.
 */
class InventoryService
{
    /**
     * Stock per item.
     *
     * Only items with activity are listed.
     *
     * @return array<int, array<string, mixed>>
     */
    public function summary(): array
    {
        $received = $this->totals(FarmerPurchase::query(), 'nag', 'weight');
        $sold = $this->totals(AmrozaSale::query(), 'nag', 'weight');

        $itemIds = array_values(array_unique(array_merge(
            array_keys($received),
            array_keys($sold)
        )));

        $items = Item::whereIn('id', $itemIds)->get()->keyBy('id');

        $rows = [];

        foreach ($itemIds as $itemId) {
            $item = $items[$itemId] ?? null;

            if (! $item) {
                continue;
            }

            $receivedBags = (float) ($received[$itemId]['bags'] ?? 0);
            $receivedWeight = (float) ($received[$itemId]['weight'] ?? 0);
            $soldBags = (float) ($sold[$itemId]['bags'] ?? 0);
            $soldWeight = (float) ($sold[$itemId]['weight'] ?? 0);

            $rows[] = [
                'item_id' => $item->id,
                'name_en' => $item->name_en,
                'name_ur' => $item->name_ur,
                'unit' => $item->unit,
                'received_bags' => $receivedBags,
                'received_weight' => $receivedWeight,
                'sold_bags' => $soldBags,
                'sold_weight' => $soldWeight,
                'remaining_bags' => round($receivedBags - $soldBags, 2),
                'remaining_weight' => round($receivedWeight - $soldWeight, 2),
                'is_negative' => ($receivedBags - $soldBags) < -0.001,
            ];
        }

        usort($rows, fn ($a, $b) => strcmp((string) $a['name_en'], (string) $b['name_en']));

        return $rows;
    }

    /**
     * Stock per arrival, so the source of the stock stays visible.
     *
     * The sold column only counts the sales that were attributed to that
     * arrival; sales without an arrival are counted in the item totals only.
     *
     * @return array<int, array<string, mixed>>
     */
    public function byPurchase(): array
    {
        $rows = [];

        $purchases = FarmerPurchase::with(['farmer', 'mark', 'item'])->orderBy('date')->orderBy('id')->get();

        foreach ($purchases as $purchase) {
            $linked = AmrozaSale::where('farmer_purchase_id', $purchase->id)->get();

            $soldBags = (float) $linked->sum('nag');
            $soldWeight = (float) $linked->sum('weight');

            $rows[] = [
                'id' => $purchase->id,
                'date' => $purchase->date->format('Y-m-d'),
                'reference' => $purchase->reference,
                'farmer_code' => $purchase->farmer?->code,
                'farmer_name' => $purchase->farmer?->name_en,
                'mark_name' => $purchase->mark?->name_en,
                'item_name' => $purchase->item?->name_en,
                'received_bags' => (float) $purchase->nag,
                'received_weight' => (float) $purchase->weight,
                'sold_bags' => $soldBags,
                'sold_weight' => $soldWeight,
                'remaining_bags' => round((float) $purchase->nag - $soldBags, 2),
                'remaining_weight' => round((float) $purchase->weight - $soldWeight, 2),
                'is_negative' => ((float) $purchase->nag - $soldBags) < -0.001,
            ];
        }

        return $rows;
    }

    /**
     * Bags still available for one item.
     */
    public function availableBags(int $itemId): float
    {
        // toBase() applies the soft-delete scope, so a removed arrival or
        // sale does not count as stock.
        $received = (float) FarmerPurchase::where('item_id', $itemId)->toBase()->sum('nag');
        $sold = (float) AmrozaSale::where('item_id', $itemId)->toBase()->sum('nag');

        return round($received - $sold, 2);
    }

    /**
     * A map of item id to the bags still available, for the sale screen.
     *
     * @return array<int, float>
     */
    public function availableByItem(): array
    {
        $map = [];

        foreach ($this->summary() as $row) {
            $map[(int) $row['item_id']] = (float) $row['remaining_bags'];
        }

        return $map;
    }

    /**
     * Sum a quantity and a weight per item.
     *
     * The Eloquent builder is kept so the soft-delete scope still applies -
     * a removed arrival or sale must not count as stock.
     *
     * @return array<int, array{bags: float, weight: float}>
     */
    protected function totals(Builder $query, string $quantityColumn, string $weightColumn): array
    {
        $rows = $query
            ->selectRaw("item_id, SUM({$quantityColumn}) as bags, SUM({$weightColumn}) as weight")
            ->groupBy('item_id')
            ->get();

        $totals = [];

        foreach ($rows as $row) {
            $totals[(int) $row->item_id] = [
                'bags' => (float) $row->bags,
                'weight' => (float) $row->weight,
            ];
        }

        return $totals;
    }
}
