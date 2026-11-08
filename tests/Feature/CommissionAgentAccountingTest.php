<?php

namespace Tests\Feature;

use App\Models\CommissionAgent;
use App\Models\Farmer;
use App\Models\FarmerMark;
use App\Models\FarmerPurchase;
use App\Models\Item;
use App\Models\PartyLedgerEntry;
use App\Models\User;
use App\Services\FarmerPurchaseService;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommissionAgentAccountingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected int $agentCode = 0;

    protected int $farmerCode = 0;

    protected int $itemCode = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    protected function makeAgent(array $attributes = []): CommissionAgent
    {
        $this->agentCode++;

        return CommissionAgent::create(array_merge([
            'code' => $this->agentCode,
            'name_en' => 'Test Agent '.$this->agentCode,
            'name_ur' => 'ٹیسٹ ایجنٹ',
            'opening_balance' => 0,
            'current_balance' => 0,
            'commission_percent' => 5.0,
            'status' => 'active',
        ], $attributes));
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

    protected function makeItem(array $attributes = []): Item
    {
        $this->itemCode++;

        return Item::create(array_merge([
            'name_en' => 'Potato '.$this->itemCode,
            'name_ur' => 'آلو',
            'unit' => 'Nag',
            'default_rate' => 1000,
            'status' => 'active',
        ], $attributes));
    }

    public function test_purchase_without_commission_agent_calculates_zero_commission_and_no_agent_ledger_entry(): void
    {
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $purchase = $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'charges' => 200,
            'commission_agent_id' => null,
        ]);

        $this->assertNull($purchase->commission_agent_id);
        $this->assertNull($purchase->commission_percent);
        $this->assertSame(0.0, (float) $purchase->commission_amount);
        $this->assertNull($purchase->agent_ledger_entry_id);

        $this->assertDatabaseMissing('party_ledger_entries', [
            'party_type' => PartyService::COMMISSION_AGENT,
        ]);
    }

    public function test_purchase_with_commission_agent_uses_agent_default_percent_and_creates_jama_entry(): void
    {
        $agent = $this->makeAgent(['commission_percent' => 5.0]);
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $purchase = $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'charges' => 200, // Amount = 10,200
            'commission_agent_id' => $agent->id,
        ]);

        // 10,200 x 5% = 510.00
        $this->assertSame($agent->id, (int) $purchase->commission_agent_id);
        $this->assertSame(5.0, (float) $purchase->commission_percent);
        $this->assertSame(510.0, (float) $purchase->commission_amount);
        $this->assertNotNull($purchase->agent_ledger_entry_id);

        // Exactly one Jama entry in the agent's ledger
        $entry = PartyLedgerEntry::findOrFail($purchase->agent_ledger_entry_id);
        $this->assertSame(PartyService::COMMISSION_AGENT, $entry->party_type);
        $this->assertSame($agent->id, (int) $entry->party_id);
        $this->assertSame(PartyLedgerEntry::DIRECTION_JAMA, $entry->direction);
        $this->assertSame('commission', $entry->category);
        $this->assertSame(510.0, (float) $entry->amount);

        // Agent balance updated
        $this->assertSame(510.0, (float) $agent->fresh()->current_balance);
    }

    public function test_purchase_allows_overriding_commission_percent_and_snapshots_values(): void
    {
        $agent = $this->makeAgent(['commission_percent' => 5.0]);
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $purchase = $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'charges' => 0, // Amount = 10,000
            'commission_agent_id' => $agent->id,
            'commission_percent' => 3.5, // Override from 5.0 to 3.5
        ]);

        $this->assertSame(3.5, (float) $purchase->commission_percent);
        $this->assertSame(350.0, (float) $purchase->commission_amount);
        $this->assertSame(350.0, (float) $agent->fresh()->current_balance);

        // Change agent master rate to 10%
        $agent->update(['commission_percent' => 10.0]);

        // Historical purchase remains unchanged
        $purchase = $purchase->fresh();
        $this->assertSame(3.5, (float) $purchase->commission_percent);
        $this->assertSame(350.0, (float) $purchase->commission_amount);
        $this->assertSame(350.0, (float) $agent->fresh()->current_balance);
    }

    public function test_editing_purchase_updates_existing_commission_ledger_entry_without_duplicates(): void
    {
        $agent = $this->makeAgent(['commission_percent' => 5.0]);
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $purchase = $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'commission_agent_id' => $agent->id,
        ]);

        $originalEntryId = $purchase->agent_ledger_entry_id;
        $this->assertSame(500.0, (float) $agent->fresh()->current_balance);

        // Update nag to 20 -> Amount = 20,000 -> Comm = 1,000
        $updated = $service->update($purchase, [
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 20,
            'rate' => 1000,
            'charges' => 0,
            'commission_agent_id' => $agent->id,
            'commission_percent' => 5.0,
        ]);

        // Same ledger row ID updated
        $this->assertSame($originalEntryId, $updated->agent_ledger_entry_id);
        $this->assertSame(1, PartyLedgerEntry::where('party_type', PartyService::COMMISSION_AGENT)->count());

        $entry = PartyLedgerEntry::find($originalEntryId);
        $this->assertSame(1000.0, (float) $entry->amount);
        $this->assertSame(1000.0, (float) $agent->fresh()->current_balance);
    }

    public function test_editing_purchase_to_change_agent_reconciles_both_agent_balances(): void
    {
        $agentA = $this->makeAgent(['commission_percent' => 5.0]);
        $agentB = $this->makeAgent(['commission_percent' => 4.0]);
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $purchase = $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000, // 10,000
            'commission_agent_id' => $agentA->id,
        ]);

        $this->assertSame(500.0, (float) $agentA->fresh()->current_balance);
        $this->assertSame(0.0, (float) $agentB->fresh()->current_balance);

        // Transfer purchase to Agent B
        $service->update($purchase, [
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'charges' => 0,
            'commission_agent_id' => $agentB->id,
            'commission_percent' => 4.0,
        ]);

        // Agent A balance should be restored to 0
        $this->assertSame(0.0, (float) $agentA->fresh()->current_balance);
        // Agent B balance should be 400
        $this->assertSame(400.0, (float) $agentB->fresh()->current_balance);

        $this->assertSame(0, PartyLedgerEntry::where('party_type', PartyService::COMMISSION_AGENT)->where('party_id', $agentA->id)->count());
        $this->assertSame(1, PartyLedgerEntry::where('party_type', PartyService::COMMISSION_AGENT)->where('party_id', $agentB->id)->count());
    }

    public function test_editing_purchase_to_remove_agent_deletes_ledger_row_and_restores_balance(): void
    {
        $agent = $this->makeAgent(['commission_percent' => 5.0]);
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $purchase = $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'commission_agent_id' => $agent->id,
        ]);

        $this->assertSame(500.0, (float) $agent->fresh()->current_balance);

        // Edit purchase and clear commission agent
        $service->update($purchase, [
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'commission_agent_id' => null,
        ]);

        $this->assertNull($purchase->fresh()->agent_ledger_entry_id);
        $this->assertSame(0, PartyLedgerEntry::where('party_type', PartyService::COMMISSION_AGENT)->count());
        $this->assertSame(0.0, (float) $agent->fresh()->current_balance);
    }

    public function test_deleting_purchase_removes_linked_commission_entry_and_restores_agent_balance(): void
    {
        $agent = $this->makeAgent(['opening_balance' => 1000, 'commission_percent' => 5.0]);
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $purchase = $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000, // 10,000 -> Comm 500
            'commission_agent_id' => $agent->id,
        ]);

        $this->assertSame(1500.0, (float) $agent->fresh()->current_balance);

        // Delete purchase
        $service->delete($purchase);

        $this->assertSame(0, PartyLedgerEntry::where('party_type', PartyService::COMMISSION_AGENT)->count());
        $this->assertSame(1000.0, (float) $agent->fresh()->current_balance);
    }

    public function test_recording_agent_payment_creates_separate_banam_entry_and_lowers_balance(): void
    {
        $agent = $this->makeAgent(['opening_balance' => 2000]);

        $response = $this->post('/commission-agents/payments', [
            'commission_agent_id' => $agent->id,
            'date' => '2026-11-08',
            'amount' => 800,
            'reference' => 'PAY-001',
            'description' => 'Cash handed to agent',
        ]);

        $response->assertSessionHasNoErrors();

        $entry = PartyLedgerEntry::where('party_type', PartyService::COMMISSION_AGENT)->first();
        $this->assertNotNull($entry);
        $this->assertSame(PartyLedgerEntry::DIRECTION_BANAM, $entry->direction);
        $this->assertSame(800.0, (float) $entry->amount);
        $this->assertSame('Cash handed to agent', $entry->description);
        $this->assertSame('PAY-001', $entry->reference);

        // 2000 - 800 = 1200
        $this->assertSame(1200.0, (float) $agent->fresh()->current_balance);
    }

    public function test_commission_reports_screen_renders_successfully(): void
    {
        $agent = $this->makeAgent(['commission_percent' => 5.0]);
        $farmer = $this->makeFarmer();
        $item = $this->makeItem();

        $service = app(FarmerPurchaseService::class);
        $service->create([
            'date' => '2026-11-08',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 1000,
            'commission_agent_id' => $agent->id,
        ]);

        $response = $this->get('/commission-reports');
        $response->assertOk();
    }
}
