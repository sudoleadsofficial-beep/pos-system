<?php

namespace Tests\Feature;

use App\Models\AmrozaSale;
use App\Models\Farmer;
use App\Models\FarmerMark;
use App\Models\FarmerPurchase;
use App\Models\Item;
use App\Models\Merchant;
use App\Models\PartyLedgerEntry;
use App\Models\User;
use App\Services\ExportService;
use App\Services\FarmerPurchaseService;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Farmer purchase / arrival, farmer ledger and inventory.
 *
 * Calculation rule (POS V1 unit pricing, the same shape as the Amroza sale):
 *
 *     amount = (nag x rate) + charges
 *
 * - The purchase rate is the price per selling unit (bag / piece), exactly
 *   like the sale rate.
 * - Weight is the TOTAL physical weight of the line. It is recorded and
 *   reported separately and never multiplies the amount.
 * - The farmer's balance is owned by PartyLedgerService: a purchase raises
 *   what the farmer is owed (Jama), a payment lowers it (Banam).
 */
class FarmerPurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected int $farmerCode = 0;

    protected int $merchantCode = 0;

    protected int $itemNumber = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    protected function makeFarmer(array $attributes = []): Farmer
    {
        $this->farmerCode++;

        return Farmer::create(array_merge([
            'code' => $this->farmerCode,
            'name_en' => 'Test Farmer '.$this->farmerCode,
            'name_ur' => 'ٹیسٹ کسان',
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ], $attributes));
    }

    protected function makeMark(Farmer $farmer, array $attributes = []): FarmerMark
    {
        return FarmerMark::create(array_merge([
            'code' => 0,
            'farmer_id' => $farmer->id,
            'name_en' => 'Khud (Self)',
            'name_ur' => 'خود',
        ], $attributes));
    }

    protected function makeItem(array $attributes = []): Item
    {
        $this->itemNumber++;

        return Item::create(array_merge([
            'name_en' => 'Onion '.$this->itemNumber,
            'name_ur' => 'پیاز',
            'unit' => 'Mun',
            'default_rate' => 1800,
        ], $attributes));
    }

    protected function makeMerchant(array $attributes = []): Merchant
    {
        $this->merchantCode++;

        return Merchant::create(array_merge([
            'code' => $this->merchantCode + 1,
            'name_en' => 'Test Buyer '.$this->merchantCode,
            'name_ur' => 'ٹیسٹ خریدار',
            'opening_balance' => 0,
        ], $attributes));
    }

    /**
     * Post a purchase the way the purchase form does.
     */
    protected function postPurchase(array $overrides = [])
    {
        $farmer = $overrides['farmer'] ?? $this->makeFarmer();
        $item = $overrides['item'] ?? $this->makeItem();

        $payload = array_merge([
            'date' => '2026-11-07',
            'farmer_id' => $farmer->id,
            'farmer_mark_id' => null,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1600,
            'charges' => 0,
            'paid_amount' => 0,
            'notes' => null,
        ], $overrides['payload'] ?? []);

        $response = $this->post(route('farmers.purchases.store'), $payload);

        return [$response, $farmer, $item];
    }

    // -----------------------------------------------------------------
    // 1. Purchase calculations
    // -----------------------------------------------------------------

    public function test_purchase_amount_is_bags_times_rate_plus_charges(): void
    {
        $service = app(FarmerPurchaseService::class);

        $this->assertEquals(3200.0, $service->calculateAmount(2, 1600, 0));
        $this->assertEquals(3500.0, $service->calculateAmount(2, 1600, 300));
        $this->assertEquals(1600.0, $service->calculateAmount(1, 1600, 0));
    }

    public function test_purchase_weight_never_multiplies_the_amount(): void
    {
        [$response, $farmer, $item] = $this->postPurchase([
            'payload' => ['nag' => 2, 'weight' => 40, 'rate' => 1600],
        ]);

        $response->assertRedirect();

        $purchase = FarmerPurchase::first();

        $this->assertEquals(3200.0, (float) $purchase->amount);
        $this->assertEquals(40.0, (float) $purchase->weight, 'the weight is still recorded');
    }

    public function test_purchase_amount_is_identical_across_weights(): void
    {
        $this->postPurchase(['payload' => ['nag' => 2, 'weight' => 40, 'rate' => 1600]]);
        $first = (float) FarmerPurchase::first()->amount;

        $this->postPurchase(['payload' => ['nag' => 2, 'weight' => 100, 'rate' => 1600]]);
        $second = (float) FarmerPurchase::orderBy('id', 'desc')->first()->amount;

        $this->assertEquals($first, $second);
    }

    public function test_purchase_stores_the_remaining_payable(): void
    {
        $this->postPurchase([
            'payload' => ['nag' => 2, 'rate' => 1600, 'charges' => 200, 'paid_amount' => 1000],
        ]);

        $purchase = FarmerPurchase::first();

        $this->assertEquals(3400.0, (float) $purchase->amount);
        $this->assertEquals(1000.0, (float) $purchase->paid_amount);
        $this->assertEquals(2400.0, (float) $purchase->remaining_amount);
    }

    public function test_purchase_rejects_a_payment_larger_than_the_amount(): void
    {
        [$response] = $this->postPurchase([
            'payload' => ['nag' => 2, 'rate' => 1600, 'paid_amount' => 5000],
        ]);

        $response->assertSessionHasErrors('paid_amount');

        $this->assertSame(0, FarmerPurchase::count());
    }

    // -----------------------------------------------------------------
    // 2. Purchase saving
    // -----------------------------------------------------------------

    public function test_a_purchase_is_saved_with_a_unique_reference(): void
    {
        $this->postPurchase();
        $this->postPurchase();

        $this->assertSame(2, FarmerPurchase::count());

        $references = FarmerPurchase::pluck('reference')->all();

        $this->assertCount(2, array_unique($references));
        $this->assertSame('PUR-2026-0001', $references[0]);
        $this->assertSame('PUR-2026-0002', $references[1]);
    }

    public function test_a_purchase_is_saved_with_the_mark_and_the_notes(): void
    {
        $farmer = $this->makeFarmer();

        // Every farmer gets a default "Khud (Self)" mark when it is created.
        $mark = $farmer->marks()->first();

        $this->postPurchase([
            'farmer' => $farmer,
            'payload' => ['farmer_mark_id' => $mark->id, 'notes' => 'Second quality'],
        ]);

        $purchase = FarmerPurchase::first();

        $this->assertSame($mark->id, $purchase->farmer_mark_id);
        $this->assertSame('Second quality', $purchase->notes);
    }

    public function test_a_purchase_needs_a_farmer_an_item_bags_and_a_rate(): void
    {
        $this->post(route('farmers.purchases.store'), [
            'date' => '2026-11-07',
            'farmer_id' => '',
            'item_id' => '',
            'nag' => 0,
            'rate' => '',
        ])->assertSessionHasErrors(['farmer_id', 'item_id', 'nag', 'rate']);

        $this->assertSame(0, FarmerPurchase::count());
    }

    // -----------------------------------------------------------------
    // 3. Immediate and later farmer payments
    // -----------------------------------------------------------------

    public function test_an_immediate_payment_lowers_what_the_farmer_is_owed(): void
    {
        [$response, $farmer] = $this->postPurchase([
            'payload' => ['nag' => 2, 'rate' => 1600, 'paid_amount' => 1000],
        ]);

        $response->assertRedirect();

        $farmer->refresh();

        $this->assertEquals(2200.0, (float) $farmer->current_balance);
    }

    public function test_a_later_payment_lowers_what_the_farmer_is_owed(): void
    {
        [$response, $farmer] = $this->postPurchase([
            'payload' => ['nag' => 2, 'rate' => 1600],
        ]);

        $farmer->refresh();
        $this->assertEquals(3200.0, (float) $farmer->current_balance);

        $this->post(route('farmers.payments.store'), [
            'farmer_id' => $farmer->id,
            'date' => '2026-11-08',
            'amount' => 1200,
        ])->assertRedirect();

        $farmer->refresh();

        $this->assertEquals(2000.0, (float) $farmer->current_balance);
    }

    public function test_a_partial_payment_leaves_the_rest_payable(): void
    {
        [$response, $farmer] = $this->postPurchase([
            'payload' => ['nag' => 4, 'rate' => 1000, 'paid_amount' => 1500],
        ]);

        $farmer->refresh();

        $this->assertEquals(2500.0, (float) $farmer->current_balance);
        $this->assertEquals(2500.0, (float) FarmerPurchase::first()->remaining_amount);
    }

    // -----------------------------------------------------------------
    // 4. Farmer ledger balance updates
    // -----------------------------------------------------------------

    public function test_a_purchase_creates_one_payable_ledger_entry(): void
    {
        $this->postPurchase(['payload' => ['nag' => 2, 'rate' => 1600]]);

        $entries = PartyLedgerEntry::forParty('farmer', Farmer::first()->id)->get();

        $this->assertCount(1, $entries);

        $entry = $entries->first();

        $this->assertSame(PartyLedgerEntry::DIRECTION_JAMA, $entry->direction);
        $this->assertEquals(3200.0, (float) $entry->amount);
        $this->assertSame('consignment', $entry->category);
        $this->assertSame(FarmerPurchase::first()->reference, $entry->reference);
    }

    public function test_an_immediate_payment_creates_one_payment_ledger_entry(): void
    {
        $this->postPurchase(['payload' => ['nag' => 2, 'rate' => 1600, 'paid_amount' => 1000]]);

        $entries = PartyLedgerEntry::forParty('farmer', Farmer::first()->id)->get();

        $this->assertCount(2, $entries);

        $payment = $entries->firstWhere('direction', PartyLedgerEntry::DIRECTION_BANAM);

        $this->assertNotNull($payment);
        $this->assertEquals(1000.0, (float) $payment->amount);
        $this->assertSame('payment', $payment->category);
    }

    public function test_the_farmer_balance_is_the_opening_balance_plus_jama_minus_banam(): void
    {
        $farmer = $this->makeFarmer(['opening_balance' => 5000]);

        $this->postPurchase([
            'farmer' => $farmer,
            'payload' => ['nag' => 2, 'rate' => 1600, 'paid_amount' => 1000],
        ]);

        $farmer->refresh();

        // 5000 opening + 3200 payable - 1000 paid
        $this->assertEquals(7200.0, (float) $farmer->current_balance);
    }

    public function test_the_farmer_ledger_screen_shows_the_purchase(): void
    {
        [$response, $farmer] = $this->postPurchase(['payload' => ['nag' => 2, 'rate' => 1600]]);

        $response->assertRedirect();

        $this->get(route('parties.show', ['type' => 'farmer', 'id' => $farmer->id]))
            ->assertOk();
    }

    // -----------------------------------------------------------------
    // 5. Preventing duplicate ledger entries
    // -----------------------------------------------------------------

    public function test_editing_a_purchase_does_not_create_a_second_ledger_entry(): void
    {
        [$response, $farmer] = $this->postPurchase(['payload' => ['nag' => 2, 'rate' => 1600]]);

        $purchase = FarmerPurchase::first();

        $this->assertSame(1, PartyLedgerEntry::forParty('farmer', $farmer->id)->count());

        $this->put(route('farmers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'farmer_id' => $farmer->id,
            'farmer_mark_id' => null,
            'item_id' => $purchase->item_id,
            'nag' => 3,
            'weight' => 60,
            'rate' => 1600,
            'charges' => 0,
            'paid_amount' => 0,
            'notes' => null,
        ])->assertRedirect();

        $this->assertSame(1, PartyLedgerEntry::forParty('farmer', $farmer->id)->count());

        $entry = PartyLedgerEntry::forParty('farmer', $farmer->id)->first();

        $this->assertEquals(4800.0, (float) $entry->amount);
    }

    public function test_editing_a_purchase_does_not_create_a_second_payment_entry(): void
    {
        [$response, $farmer] = $this->postPurchase([
            'payload' => ['nag' => 2, 'rate' => 1600, 'paid_amount' => 1000],
        ]);

        $purchase = FarmerPurchase::first();

        $this->assertSame(2, PartyLedgerEntry::forParty('farmer', $farmer->id)->count());

        $this->put(route('farmers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'farmer_id' => $farmer->id,
            'item_id' => $purchase->item_id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1600,
            'charges' => 0,
            'paid_amount' => 500,
            'notes' => null,
        ])->assertRedirect();

        $this->assertSame(2, PartyLedgerEntry::forParty('farmer', $farmer->id)->count());

        $payment = PartyLedgerEntry::forParty('farmer', $farmer->id)
            ->firstWhere('direction', PartyLedgerEntry::DIRECTION_BANAM);

        $this->assertEquals(500.0, (float) $payment->amount);
    }

    public function test_removing_the_immediate_payment_removes_its_ledger_entry(): void
    {
        [$response, $farmer] = $this->postPurchase([
            'payload' => ['nag' => 2, 'rate' => 1600, 'paid_amount' => 1000],
        ]);

        $purchase = FarmerPurchase::first();

        $this->put(route('farmers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'farmer_id' => $farmer->id,
            'item_id' => $purchase->item_id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1600,
            'charges' => 0,
            'paid_amount' => 0,
            'notes' => null,
        ])->assertRedirect();

        $this->assertSame(1, PartyLedgerEntry::forParty('farmer', $farmer->id)->count());

        $farmer->refresh();

        $this->assertEquals(3200.0, (float) $farmer->current_balance);
    }

    // -----------------------------------------------------------------
    // 6. Purchase edit / delete reconciliation
    // -----------------------------------------------------------------

    public function test_editing_a_purchase_updates_the_farmer_balance(): void
    {
        [$response, $farmer] = $this->postPurchase(['payload' => ['nag' => 2, 'rate' => 1600]]);

        $purchase = FarmerPurchase::first();

        $this->put(route('farmers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'farmer_id' => $farmer->id,
            'item_id' => $purchase->item_id,
            'nag' => 5,
            'weight' => 100,
            'rate' => 1600,
            'charges' => 0,
            'paid_amount' => 0,
            'notes' => null,
        ])->assertRedirect();

        $farmer->refresh();

        $this->assertEquals(8000.0, (float) $farmer->current_balance);
    }

    public function test_moving_a_purchase_to_another_farmer_fixes_both_balances(): void
    {
        $first = $this->makeFarmer(['code' => 1]);
        $second = $this->makeFarmer(['code' => 2]);

        [$response] = $this->postPurchase([
            'farmer' => $first,
            'payload' => ['nag' => 2, 'rate' => 1600],
        ]);

        $purchase = FarmerPurchase::first();

        $this->put(route('farmers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'farmer_id' => $second->id,
            'item_id' => $purchase->item_id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1600,
            'charges' => 0,
            'paid_amount' => 0,
            'notes' => null,
        ])->assertRedirect();

        $first->refresh();
        $second->refresh();

        $this->assertEquals(0.0, (float) $first->current_balance);
        $this->assertEquals(3200.0, (float) $second->current_balance);
    }

    public function test_deleting_a_purchase_removes_its_ledger_entries_and_fixes_the_balance(): void
    {
        [$response, $farmer] = $this->postPurchase([
            'payload' => ['nag' => 2, 'rate' => 1600, 'paid_amount' => 1000],
        ]);

        $purchase = FarmerPurchase::first();

        $this->delete(route('farmers.purchases.destroy', $purchase->id))->assertRedirect();

        $this->assertSame(0, PartyLedgerEntry::forParty('farmer', $farmer->id)->count());

        $farmer->refresh();

        $this->assertEquals(0.0, (float) $farmer->current_balance);
    }

    public function test_deleting_a_purchase_takes_the_stock_back(): void
    {
        [$response] = $this->postPurchase(['payload' => ['nag' => 4, 'weight' => 80, 'rate' => 1600]]);

        $inventory = app(InventoryService::class);
        $item = Item::first();

        $this->assertEquals(4.0, $inventory->availableBags($item->id));

        $this->delete(route('farmers.purchases.destroy', FarmerPurchase::first()->id));

        $this->assertEquals(0.0, $inventory->availableBags($item->id));
    }

    // -----------------------------------------------------------------
    // 7. Inventory
    // -----------------------------------------------------------------

    public function test_inventory_increases_when_an_arrival_is_recorded(): void
    {
        $this->postPurchase(['payload' => ['nag' => 4, 'weight' => 80, 'rate' => 1600]]);

        $inventory = app(InventoryService::class);
        $summary = $inventory->summary();

        $this->assertCount(1, $summary);
        $this->assertEquals(4.0, $summary[0]['received_bags']);
        $this->assertEquals(80.0, $summary[0]['received_weight']);
        $this->assertEquals(0.0, $summary[0]['sold_bags']);
        $this->assertEquals(4.0, $summary[0]['remaining_bags']);
    }

    public function test_inventory_decreases_when_a_sale_is_recorded(): void
    {
        [$response, $farmer, $item] = $this->postPurchase([
            'payload' => ['nag' => 5, 'weight' => 100, 'rate' => 1600],
        ]);

        $merchant = $this->makeMerchant();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $inventory = app(InventoryService::class);
        $summary = $inventory->summary();

        $this->assertEquals(5.0, $summary[0]['received_bags']);
        $this->assertEquals(2.0, $summary[0]['sold_bags']);
        $this->assertEquals(40.0, $summary[0]['sold_weight']);
        $this->assertEquals(3.0, $summary[0]['remaining_bags']);
        $this->assertEquals(60.0, $summary[0]['remaining_weight']);
    }

    public function test_editing_a_sale_correctly_recalculates_the_stock(): void
    {
        [$response, $farmer, $item] = $this->postPurchase([
            'payload' => ['nag' => 5, 'weight' => 100, 'rate' => 1600],
        ]);

        $merchant = $this->makeMerchant();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ]);

        $sale = AmrozaSale::first();

        $this->put(route('merchants.amroza.update', $sale->id), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 4,
            'weight' => 80,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $inventory = app(InventoryService::class);
        $summary = $inventory->summary();

        // The sale is counted once, at its new quantity - never twice.
        $this->assertEquals(4.0, $summary[0]['sold_bags']);
        $this->assertEquals(1.0, $summary[0]['remaining_bags']);
    }

    public function test_deleting_a_sale_gives_the_stock_back(): void
    {
        [$response, $farmer, $item] = $this->postPurchase([
            'payload' => ['nag' => 5, 'weight' => 100, 'rate' => 1600],
        ]);

        $merchant = $this->makeMerchant();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ]);

        $this->delete(route('merchants.amroza.destroy', AmrozaSale::first()->id))->assertRedirect();

        $inventory = app(InventoryService::class);
        $summary = $inventory->summary();

        $this->assertEquals(0.0, $summary[0]['sold_bags']);
        $this->assertEquals(5.0, $summary[0]['remaining_bags']);
    }

    public function test_a_sale_is_not_blocked_when_there_is_not_enough_stock(): void
    {
        [$response, $farmer, $item] = $this->postPurchase([
            'payload' => ['nag' => 1, 'weight' => 20, 'rate' => 1600],
        ]);

        $merchant = $this->makeMerchant();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 5,
            'weight' => 100,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $this->assertSame(1, AmrozaSale::count());

        $inventory = app(InventoryService::class);
        $summary = $inventory->summary();

        $this->assertEquals(-4.0, $summary[0]['remaining_bags']);
        $this->assertTrue($summary[0]['is_negative']);
    }

    public function test_a_sale_can_be_linked_to_the_arrival_it_came_from(): void
    {
        [$response, $farmer, $item] = $this->postPurchase([
            'payload' => ['nag' => 5, 'weight' => 100, 'rate' => 1600],
        ]);

        $purchase = FarmerPurchase::first();
        $merchant = $this->makeMerchant();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'farmer_purchase_id' => $purchase->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $sale = AmrozaSale::first();

        $this->assertSame($purchase->id, $sale->farmer_purchase_id);
        $this->assertSame($farmer->id, $sale->farmerPurchase->farmer_id);

        $byPurchase = app(InventoryService::class)->byPurchase();

        $this->assertEquals(2.0, $byPurchase[0]['sold_bags']);
        $this->assertEquals(3.0, $byPurchase[0]['remaining_bags']);
    }

    // -----------------------------------------------------------------
    // 8. Existing Amroza merchant balances are not touched
    // -----------------------------------------------------------------

    public function test_a_purchase_does_not_change_a_merchant_balance(): void
    {
        $merchant = $this->makeMerchant(['opening_balance' => 1000]);
        $item = $this->makeItem();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $balanceAfterSale = (float) $merchant->fresh()->current_balance;

        $this->assertEquals(4600.0, $balanceAfterSale);

        // A farmer purchase must not move the buyer side at all.
        [$response] = $this->postPurchase([
            'payload' => ['nag' => 3, 'weight' => 60, 'rate' => 1600, 'paid_amount' => 500],
        ]);

        $response->assertRedirect();

        $this->assertEquals($balanceAfterSale, (float) $merchant->fresh()->current_balance);
    }

    public function test_the_merchant_balance_is_untouched_by_an_edited_purchase(): void
    {
        $merchant = $this->makeMerchant(['opening_balance' => 1000]);
        $item = $this->makeItem();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $balanceAfterSale = (float) $merchant->fresh()->current_balance;

        [$response, $farmer] = $this->postPurchase(['payload' => ['nag' => 3, 'rate' => 1600]]);
        $purchase = FarmerPurchase::first();

        $this->put(route('farmers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'farmer_id' => $farmer->id,
            'item_id' => $purchase->item_id,
            'nag' => 9,
            'weight' => 180,
            'rate' => 1600,
            'charges' => 0,
            'paid_amount' => 0,
            'notes' => null,
        ])->assertRedirect();

        $this->delete(route('farmers.purchases.destroy', $purchase->id));

        $this->assertEquals($balanceAfterSale, (float) $merchant->fresh()->current_balance);
    }

    public function test_existing_amroza_sales_are_not_rewritten_by_a_purchase(): void
    {
        $merchant = $this->makeMerchant();
        $item = $this->makeItem();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-07',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $before = DB::table('amroza_sales')->orderBy('id')->get()->map(fn ($r) => (array) $r)->all();

        [$response] = $this->postPurchase(['payload' => ['nag' => 3, 'rate' => 1600]]);

        $response->assertRedirect();

        $after = DB::table('amroza_sales')->orderBy('id')->get()->map(fn ($r) => (array) $r)->all();

        $this->assertEquals($before, $after);
    }

    // -----------------------------------------------------------------
    // 9. The screens
    // -----------------------------------------------------------------

    public function test_the_purchase_screen_loads(): void
    {
        $this->get(route('farmers.purchases.index'))->assertOk();
    }

    public function test_the_inventory_screen_loads(): void
    {
        $this->get(route('farmers.inventory'))->assertOk();
    }

    public function test_the_reports_screen_loads(): void
    {
        $this->get(route('farmers.reports'))->assertOk();
    }

    public function test_the_amroza_screen_loads_with_the_stock(): void
    {
        $this->get(route('merchants.amroza.index'))->assertOk();
    }

    public function test_the_farmer_purchases_are_exportable(): void
    {
        [$response] = $this->postPurchase(['payload' => ['nag' => 2, 'rate' => 1600]]);

        $export = app(ExportService::class);

        $this->assertArrayHasKey('farmer_purchases', $export->categories());

        $dataset = $export->dataset('farmer_purchases');

        $this->assertCount(1, $dataset['rows']);
        $this->assertSame('PUR-2026-0001', $dataset['rows'][0][1]);
        $this->assertEquals(3200.0, (float) $dataset['rows'][0][10], 'the amount');
        $this->assertEquals(3200.0, (float) $dataset['rows'][0][12], 'the remaining');

        $this->get('/system/export/farmer_purchases/excel')->assertOk();
        $this->get('/system/export/farmer_purchases/pdf')->assertOk();
    }
}
