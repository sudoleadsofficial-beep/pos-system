<?php

namespace Tests\Feature;

use App\Models\CommissionAgent;
use App\Models\Expense;
use App\Models\Farmer;
use App\Models\Item;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use App\Models\PartyLedgerEntry;
use App\Models\User;
use App\Services\BusinessSettingsService;
use App\Services\CashBookService;
use App\Services\FarmerPurchaseService;
use App\Services\GeneralLedgerService;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use App\Services\SupplierPurchaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CashBookAndGeneralLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected CashBookService $cashBook;
    protected GeneralLedgerService $generalLedger;
    protected BusinessSettingsService $settings;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);

        $this->cashBook = app(CashBookService::class);
        $this->generalLedger = app(GeneralLedgerService::class);
        $this->settings = app(BusinessSettingsService::class);
    }

    public function test_cash_book_calculates_opening_and_closing_balances_accurately(): void
    {
        // Set baseline opening balance
        $this->settings->set('opening_cash_balance', '10000');
        $this->settings->set('cash_book_start_date', '2026-05-01');

        $merchant = Merchant::create([
            'name' => 'Test Merchant',
            'code' => 501,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        // Day 1: 2026-05-02
        // Inflow: 5,000 receipt
        MerchantReceipt::create([
            'merchant_id' => $merchant->id,
            'date' => '2026-05-02',
            'amount' => 5000,
            'type' => 'recovery',
        ]);

        // Outflow: 1,500 expense
        Expense::create([
            'date' => '2026-05-02',
            'title' => 'Shop Electricity',
            'amount' => 1500,
            'payment_method' => 'cash',
            'category' => 'utilities',
        ]);

        // Check Day 1
        $day1 = $this->cashBook->getCashBook('2026-05-02', '2026-05-02', 'cash');

        $this->assertEquals(10000.0, $day1['opening_balance']);
        $this->assertEquals(5000.0, $day1['total_inflow']);
        $this->assertEquals(1500.0, $day1['total_outflow']);
        // 10000 + 5000 - 1500 = 13500
        $this->assertEquals(13500.0, $day1['closing_balance']);

        // Check Day 2: 2026-05-03
        // Opening balance of Day 2 must exactly equal closing balance of Day 1 (13500)
        $day2 = $this->cashBook->getCashBook('2026-05-03', '2026-05-03', 'cash');
        $this->assertEquals(13500.0, $day2['opening_balance']);
        $this->assertEquals(0.0, $day2['total_inflow']);
        $this->assertEquals(0.0, $day2['total_outflow']);
        $this->assertEquals(13500.0, $day2['closing_balance']);
    }

    public function test_cash_book_aggregates_farmer_payments_without_duplication(): void
    {
        $this->settings->set('opening_cash_balance', '20000');
        $this->settings->set('cash_book_start_date', '2026-05-01');

        $farmer = Farmer::create([
            'name' => 'Haji Muhammad',
            'code' => 601,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $item = Item::create([
            'name' => 'Onion',
            'code' => 701,
        ]);

        $purchaseService = app(FarmerPurchaseService::class);

        // Arrival with 3,000 paid on the spot
        $purchase = $purchaseService->create([
            'date' => '2026-05-05',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 500, // 5000 amount
            'charges' => 0,
            'paid_amount' => 3000,
        ]);

        // Query Cash Book for that day
        $cashBook = $this->cashBook->getCashBook('2026-05-05', '2026-05-05', 'cash');

        $this->assertEquals(3000.0, $cashBook['total_outflow']);
        $this->assertEquals(3000.0, $cashBook['outflow_summary']['farmer_payments']);
        $this->assertCount(1, $cashBook['outflows']);
        $this->assertEquals(17000.0, $cashBook['closing_balance']);

        // Now pay additional 1,000 later on the same day via PartyLedgerService
        app(PartyLedgerService::class)->addEntry(PartyService::FARMER, $farmer->id, [
            'date' => '2026-05-05',
            'direction' => PartyLedgerEntry::DIRECTION_BANAM,
            'amount' => 1000,
            'category' => 'payment',
            'description' => 'Later Cash Paid',
        ]);

        $cashBookUpdated = $this->cashBook->getCashBook('2026-05-05', '2026-05-05', 'cash');
        $this->assertEquals(4000.0, $cashBookUpdated['total_outflow']);
        $this->assertEquals(4000.0, $cashBookUpdated['outflow_summary']['farmer_payments']);
        $this->assertCount(2, $cashBookUpdated['outflows']);
        $this->assertEquals(16000.0, $cashBookUpdated['closing_balance']);
    }

    public function test_cash_book_aggregates_supplier_and_agent_payments(): void
    {
        $this->settings->set('opening_cash_balance', '50000');
        $this->settings->set('cash_book_start_date', '2026-05-01');

        $supplier = JkcSupplier::create([
            'name' => 'Bori Packaging Store',
            'code' => 801,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $agent = CommissionAgent::create([
            'name' => 'Chaudhry Akram Commission Agent',
            'code' => 901,
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ]);

        $supplierService = app(SupplierPurchaseService::class);
        $supplierService->create([
            'date' => '2026-05-10',
            'supplier_id' => $supplier->id,
            'paid_amount' => 5000,
            'payment_method' => 'cash',
            'items' => [
                ['description' => 'Bori', 'quantity' => 100, 'rate' => 100],
            ],
        ]);

        // Agent payment
        app(PartyLedgerService::class)->addEntry(PartyService::COMMISSION_AGENT, $agent->id, [
            'date' => '2026-05-10',
            'direction' => PartyLedgerEntry::DIRECTION_BANAM,
            'amount' => 2500,
            'category' => 'payment',
            'description' => 'Agent commission payout',
        ]);

        $cashBook = $this->cashBook->getCashBook('2026-05-10', '2026-05-10', 'cash');

        $this->assertEquals(5000.0, $cashBook['outflow_summary']['supplier_payments']);
        $this->assertEquals(2500.0, $cashBook['outflow_summary']['agent_payments']);
        $this->assertEquals(7500.0, $cashBook['total_outflow']);
        $this->assertEquals(42500.0, $cashBook['closing_balance']);
    }

    public function test_expense_crud_routes(): void
    {
        // Store an expense
        $response = $this->post(route('accounting.expenses.store'), [
            'date' => '2026-05-12',
            'title' => 'Tea & Refreshment for guests',
            'amount' => 450,
            'payment_method' => 'cash',
            'category' => 'refreshment',
            'description' => 'Evening tea',
            'reference' => 'TEA-01',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('expenses', [
            'title' => 'Tea & Refreshment for guests',
            'amount' => 450,
            'payment_method' => 'cash',
            'category' => 'refreshment',
        ]);

        $expense = Expense::where('title', 'Tea & Refreshment for guests')->first();

        // Delete the expense
        $delResponse = $this->delete(route('accounting.expenses.destroy', $expense->id));
        $delResponse->assertRedirect();
        $this->assertSoftDeleted('expenses', ['id' => $expense->id]);
    }

    public function test_baseline_opening_balances_update(): void
    {
        $response = $this->post(route('accounting.opening-balances.update'), [
            'opening_cash_balance' => 25000,
            'cash_book_start_date' => '2026-01-01',
        ]);

        $response->assertRedirect();
        $this->assertEquals('25000', $this->settings->get('opening_cash_balance'));
        $this->assertEquals('2026-01-01', $this->settings->get('cash_book_start_date'));
    }

    public function test_general_ledger_trial_balance_and_screens_render(): void
    {
        $this->settings->set('opening_cash_balance', '50000');
        $this->settings->set('cash_book_start_date', '2026-01-01');
        $this->settings->set('cash_book_start_date', '2026-01-01');

        Merchant::create([
            'name' => 'Credit Merchant',
            'code' => 999,
            'opening_balance' => 12000,
            'current_balance' => 12000,
            'status' => 'active',
        ]);

        Farmer::create([
            'name' => 'Payable Farmer',
            'code' => 888,
            'opening_balance' => 8000,
            'current_balance' => 8000,
            'status' => 'active',
        ]);

        Expense::create([
            'date' => '2026-05-15',
            'title' => 'Shop Rent',
            'amount' => 10000,
            'payment_method' => 'cash',
            'category' => 'rent',
        ]);

        $trial = $this->generalLedger->getTrialBalance('2026-05-15');

        $this->assertArrayHasKey('assets', $trial);
        $this->assertArrayHasKey('liabilities', $trial);
        $this->assertArrayHasKey('expenses', $trial);
        $this->assertEquals(12000.0, $trial['assets']['accounts_receivable']);
        $this->assertEquals(8000.0, $trial['liabilities']['farmers_payable']);
        $this->assertEquals(10000.0, $trial['expenses']['total']);

        $heads = $this->generalLedger->getAccountHeads();
        $this->assertNotEmpty($heads);

        // Test web routes status 200
        $res1 = $this->get(route('cash-book.index'));
        $res1->assertOk();

        $res2 = $this->get(route('general-ledger.index'));
        $res2->assertOk();
    }

    public function test_cash_book_operating_expense_categories(): void
    {
        $this->settings->set('opening_cash_balance', '50000');
        $this->settings->set('cash_book_start_date', '2026-01-01');

        // Cash expenses under different categories
        Expense::create([
            'date' => '2026-06-01',
            'title' => 'Shop Rent',
            'amount' => 15000,
            'payment_method' => 'cash',
            'category' => 'rent',
        ]);

        Expense::create([
            'date' => '2026-06-01',
            'title' => 'Electricity Bill',
            'amount' => 3500,
            'payment_method' => 'cash',
            'category' => 'electricity',
        ]);

        Expense::create([
            'date' => '2026-06-01',
            'title' => 'Labour Mazdoori',
            'amount' => 1200,
            'payment_method' => 'cash',
            'category' => 'labour',
        ]);

        $cashBook = $this->cashBook->getCashBook('2026-06-01', '2026-06-01');

        $this->assertEquals(50000.0, $cashBook['opening_balance']);
        $this->assertEquals(0.0, $cashBook['total_inflow']);
        $this->assertEquals(19700.0, $cashBook['total_outflow']);
        $this->assertEquals(30300.0, $cashBook['closing_balance']);
        $this->assertCount(3, $cashBook['outflows']);
        $this->assertEquals(19700.0, $cashBook['outflow_summary']['expenses']);
    }

    public function test_cash_book_deduplicates_naqdi_sales_against_same_day_cash_receipts(): void
    {
        $merchant = Merchant::ensureNaqdiRecord();

        $item = Item::create([
            'name' => 'Potato',
            'code' => 777,
        ]);

        // Case 1: Sale Rs. 5,000 in cash, and a receipt Rs. 5,000 was also recorded
        // Inflows should be Rs. 5,000, NOT Rs. 10,000!
        \App\Models\AmrozaSale::create([
            'date' => '2026-06-05',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 10,
            'gross_amount' => 5000,
            'payment_type' => 'naqdi',
        ]);

        MerchantReceipt::create([
            'merchant_id' => $merchant->id,
            'date' => '2026-06-05',
            'amount' => 5000,
            'type' => 'same_day_cash',
        ]);

        $book = $this->cashBook->getCashBook('2026-06-05', '2026-06-05', 'cash');

        $this->assertEquals(5000.0, $book['total_inflow']);
    }
}
