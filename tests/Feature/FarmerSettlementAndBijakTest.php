<?php

namespace Tests\Feature;

use App\Models\CommissionAgent;
use App\Models\Farmer;
use App\Models\FarmerPurchase;
use App\Models\FarmerSettlement;
use App\Models\Item;
use App\Models\PartyLedgerEntry;
use App\Models\User;
use App\Services\FarmerPurchaseService;
use App\Services\FarmerSettlementService;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FarmerSettlementAndBijakTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected FarmerPurchaseService $purchases;
    protected FarmerSettlementService $settlements;
    protected PartyLedgerService $ledger;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);

        $this->purchases = app(FarmerPurchaseService::class);
        $this->settlements = app(FarmerSettlementService::class);
        $this->ledger = app(PartyLedgerService::class);
    }

    public function test_settlement_calculation_formula(): void
    {
        // Gross sale: 10,000
        // Commission: 6% = 600
        // Mazdoori: 200
        // Carriage: 300
        // Chungi: 100
        // Bardana: 150
        // Other: 50
        // Total Deductions = 600 + 200 + 300 + 100 + 150 + 50 = 1,400
        // Charges: 100
        // Net Payable = 10,000 - 1,400 + 100 = 8,700
        // Paid Amount: 2,000
        // Remaining Payable = 8,700 - 2,000 = 6,700

        $calcs = $this->settlements->calculate(
            grossSale: 10000.0,
            commissionRate: 6.0,
            mazdoori: 200.0,
            carriage: 300.0,
            chungi: 100.0,
            bardana: 150.0,
            otherDeductions: 50.0,
            charges: 100.0,
            paidAmount: 2000.0
        );

        $this->assertEquals(600.0, $calcs['commission_amount']);
        $this->assertEquals(1400.0, $calcs['total_deductions']);
        $this->assertEquals(8700.0, $calcs['net_payable']);
        $this->assertEquals(6700.0, $calcs['remaining_payable']);
    }

    public function test_create_settlement_marks_arrival_settled_and_reconciles_farmer_khata(): void
    {
        $farmer = Farmer::create([
            'name' => 'Chaudhry Bashir',
            'code' => 555,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $item = Item::create([
            'name' => 'Tomato',
            'code' => 444,
        ]);

        // 1. Arrival: 10 bags @ 500 = 5,000. Paid 1,000. Remaining 4,000.
        $purchase = $this->purchases->create([
            'date' => '2026-07-01',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 500,
            'charges' => 0,
            'paid_amount' => 1000,
        ]);

        // Initial balance: 5,000 (Jama) - 1,000 (Banam) = 4,000
        $this->assertEquals(4000.0, $farmer->fresh()->current_balance);
        $this->assertFalse((bool) $purchase->fresh()->is_settled);

        // 2. Settle the arrival via Bijak:
        // Actual Gross Sale Proceeds = 6,000
        // Commission 6% = 360, Mazdoori = 140 -> Total deductions = 500
        // Net Payable = 6,000 - 500 = 5,500
        // Paid Amount = 1,000
        // Remaining Payable = 4,500
        $settlement = $this->settlements->create([
            'farmer_purchase_id' => $purchase->id,
            'date' => '2026-07-02',
            'gross_sale_amount' => 6000,
            'commission_rate' => 6.0,
            'mazdoori' => 140,
            'paid_amount' => 1000,
        ]);

        // Assert arrival is marked settled
        $updatedPurchase = $purchase->fresh();
        $this->assertTrue((bool) $updatedPurchase->is_settled);
        $this->assertEquals($settlement->id, $updatedPurchase->settlement_id);

        // Assert settlement numbers
        $this->assertEquals(6000.0, $settlement->gross_sale_amount);
        $this->assertEquals(360.0, $settlement->commission_amount);
        $this->assertEquals(500.0, $settlement->total_deductions);
        $this->assertEquals(5500.0, $settlement->net_payable);
        $this->assertEquals(4500.0, $settlement->remaining_payable);

        // Assert Farmer's Khata is reconciled to net payable 5,500 - paid 1,000 = 4,500
        $this->assertEquals(4500.0, $farmer->fresh()->current_balance);
    }

    public function test_prevents_duplicate_settlement_on_same_arrival(): void
    {
        $farmer = Farmer::create([
            'name' => 'Farmer Akram',
            'code' => 556,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $item = Item::create([
            'name' => 'Potato',
            'code' => 445,
        ]);

        $purchase = $this->purchases->create([
            'date' => '2026-07-01',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 5,
            'rate' => 200,
            'paid_amount' => 0,
        ]);

        // First settlement succeeds
        $this->settlements->create([
            'farmer_purchase_id' => $purchase->id,
            'gross_sale_amount' => 1000,
        ]);

        // Second settlement on same arrival must fail
        $this->expectException(\InvalidArgumentException::class);
        $this->settlements->create([
            'farmer_purchase_id' => $purchase->id,
            'gross_sale_amount' => 1200,
        ]);
    }

    public function test_outside_commission_agent_ledger_is_preserved_and_isolated(): void
    {
        $farmer = Farmer::create([
            'name' => 'Farmer Nawaz',
            'code' => 557,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $agent = CommissionAgent::create([
            'name' => 'Agent Tariq',
            'code' => 991,
            'commission_percent' => 3.0,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $item = Item::create([
            'name' => 'Garlic',
            'code' => 446,
        ]);

        // Arrival with outside agent: purchase amount 10,000, 3% agent commission = 300
        $purchase = $this->purchases->create([
            'date' => '2026-07-05',
            'farmer_id' => $farmer->id,
            'commission_agent_id' => $agent->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'paid_amount' => 0,
        ]);

        // Agent khata has 300 Jama
        $this->assertEquals(300.0, $agent->fresh()->current_balance);

        // Settle farmer arrival with JKC Aarhat commission 6% = 600
        $settlement = $this->settlements->create([
            'farmer_purchase_id' => $purchase->id,
            'gross_sale_amount' => 10000,
            'commission_rate' => 6.0,
        ]);

        // Agent's khata must remain strictly 300 (unchanged and isolated)
        $this->assertEquals(300.0, $agent->fresh()->current_balance);
        $this->assertEquals(9400.0, $farmer->fresh()->current_balance);
    }

    public function test_deleting_settlement_restores_arrival_and_reconciles_balance(): void
    {
        $farmer = Farmer::create([
            'name' => 'Farmer Rasheed',
            'code' => 558,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $item = Item::create([
            'name' => 'Ginger',
            'code' => 447,
        ]);

        $purchase = $this->purchases->create([
            'date' => '2026-07-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 500, // 5000
            'paid_amount' => 1000, // remaining 4000
        ]);

        $this->assertEquals(4000.0, $farmer->fresh()->current_balance);

        $settlement = $this->settlements->create([
            'farmer_purchase_id' => $purchase->id,
            'gross_sale_amount' => 7000,
            'commission_rate' => 6.0, // 420
            'paid_amount' => 1000,
        ]);

        $this->assertTrue((bool) $purchase->fresh()->is_settled);

        // Delete settlement
        $this->settlements->delete($settlement);

        // Arrival must be unsettled again
        $this->assertFalse((bool) $purchase->fresh()->is_settled);
        $this->assertNull($purchase->fresh()->settlement_id);

        // Farmer's balance must be restored to original arrival remaining balance 4,000
        $this->assertEquals(4000.0, $farmer->fresh()->current_balance);
    }

    public function test_settlement_web_routes_and_bijak_render(): void
    {
        $farmer = Farmer::create([
            'name' => 'Farmer Sultan',
            'code' => 559,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $item = Item::create([
            'name' => 'Apple',
            'code' => 448,
        ]);

        $purchase = $this->purchases->create([
            'date' => '2026-07-10',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 20,
            'rate' => 300,
            'paid_amount' => 500,
        ]);

        // Post store settlement
        $resStore = $this->post(route('farmers.settlements.store'), [
            'farmer_purchase_id' => $purchase->id,
            'date' => '2026-07-10',
            'gross_sale_amount' => 8000,
            'commission_rate' => 6.0,
            'mazdoori' => 200,
            'carriage' => 400,
            'paid_amount' => 500,
        ]);

        $settlement = FarmerSettlement::where('farmer_purchase_id', $purchase->id)->first();
        $this->assertNotNull($settlement);
        $resStore->assertRedirect(route('farmers.settlements.show', $settlement->id));

        // Index page status 200
        $resIndex = $this->get(route('farmers.settlements.index'));
        $resIndex->assertOk();

        // Show page status 200
        $resShow = $this->get(route('farmers.settlements.show', $settlement->id));
        $resShow->assertOk();
    }
}
