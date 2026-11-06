<?php

namespace Tests\Unit;

use App\Models\CommissionAgent;
use App\Models\Farmer;
use App\Models\Item;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use App\Models\PartyLedgerEntry;
use App\Services\AmrozaService;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use App\Services\WasooliService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PartyLedgerBalanceTest extends TestCase
{
    use RefreshDatabase;

    protected function makeFarmer(array $attributes = []): Farmer
    {
        return Farmer::create(array_merge([
            'code' => 101,
            'name_en' => 'Wadera Ali',
            'name_ur' => 'وڈیرہ علی',
            'phone' => '0300-1111111',
            'opening_balance' => 5000,
        ], $attributes));
    }

    protected function makeMerchant(array $attributes = []): Merchant
    {
        return Merchant::create(array_merge([
            'code' => 2,
            'name_en' => 'Baloch Trading',
            'name_ur' => 'بلوچ ٹریڈنگ',
            'phone' => '0321-2222222',
            'opening_balance' => 1000,
        ], $attributes));
    }

    protected function makeItem(): Item
    {
        return Item::create(['name_en' => 'Potato', 'name_ur' => 'آلو', 'unit' => 'Nag']);
    }

    protected function addEntry(string $type, int $partyId, string $date, string $direction, float $amount, string $category = 'payment'): PartyLedgerEntry
    {
        return app(PartyLedgerService::class)->addEntry($type, $partyId, [
            'date' => $date,
            'direction' => $direction,
            'amount' => $amount,
            'category' => $category,
            'description' => ucfirst($direction).' '.$amount,
        ]);
    }

    public function test_farmer_balance_is_opening_plus_jama_minus_banam()
    {
        $farmer = $this->makeFarmer(['opening_balance' => 5000]);
        $service = app(PartyLedgerService::class);

        $this->addEntry(PartyService::FARMER, $farmer->id, '2026-01-01', PartyLedgerEntry::DIRECTION_JAMA, 3000, 'consignment');
        $this->addEntry(PartyService::FARMER, $farmer->id, '2026-01-02', PartyLedgerEntry::DIRECTION_BANAM, 1000);

        $this->assertSame(7000.0, $service->currentBalance(PartyService::FARMER, $farmer->id));
        $this->assertSame(7000.0, (float) $farmer->fresh()->current_balance);
    }

    public function test_farmer_ledger_has_a_running_balance_and_balance_on_a_past_date()
    {
        $farmer = $this->makeFarmer(['opening_balance' => 5000]);
        $service = app(PartyLedgerService::class);

        $this->addEntry(PartyService::FARMER, $farmer->id, '2026-01-01', PartyLedgerEntry::DIRECTION_JAMA, 1000);
        $this->addEntry(PartyService::FARMER, $farmer->id, '2026-01-02', PartyLedgerEntry::DIRECTION_BANAM, 400);
        $this->addEntry(PartyService::FARMER, $farmer->id, '2026-01-03', PartyLedgerEntry::DIRECTION_JAMA, 200);

        $ledger = $service->entries(PartyService::FARMER, $farmer->id);

        $this->assertCount(3, $ledger['entries']);
        $this->assertSame(6000.0, $ledger['entries'][0]['balance']);
        $this->assertSame(5600.0, $ledger['entries'][1]['balance']);
        $this->assertSame(5800.0, $ledger['entries'][2]['balance']);

        $this->assertSame(6000.0, $service->balanceOn(PartyService::FARMER, $farmer->id, '2026-01-01'));
        $this->assertSame(5600.0, $service->balanceOn(PartyService::FARMER, $farmer->id, '2026-01-02'));
        $this->assertSame(5800.0, $service->balanceOn(PartyService::FARMER, $farmer->id, '2026-01-03'));
    }

    public function test_buyer_ledger_uses_the_existing_merchant_formula()
    {
        $merchant = $this->makeMerchant(['opening_balance' => 1000]);
        $item = $this->makeItem();
        $service = app(PartyLedgerService::class);

        // Created through the real services, exactly like the Amroza and
        // Wasooli screens do, so the merchant's own balance is recalculated.
        app(AmrozaService::class)->createSale([
            'date' => '2026-01-01',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 500,
        ]);
        app(WasooliService::class)->saveWasooliReceipt($merchant->id, '2026-01-02', 2000);

        // The ledger service must agree exactly with Merchant::getBalanceOn().
        foreach (['2026-01-01', '2026-01-02', '2026-01-03'] as $date) {
            $this->assertSame(
                $merchant->getBalanceOn($date),
                $service->balanceOn(PartyService::BUYER, $merchant->id, $date),
                "Buyer balance on {$date} must match Merchant::getBalanceOn()."
            );
        }

        $ledger = $service->entries(PartyService::BUYER, $merchant->id);

        $this->assertCount(2, $ledger['entries']);
        $this->assertSame('2026-01-01', $ledger['entries'][0]['date']);
        $this->assertSame(5000.0, $ledger['entries'][0]['jama']);
        $this->assertSame(0.0, $ledger['entries'][0]['banam']);
        $this->assertSame('2026-01-02', $ledger['entries'][1]['date']);
        $this->assertSame(2000.0, $ledger['entries'][1]['banam']);

        // Closing balance ties out with the merchant's own current_balance.
        $this->assertSame(4000.0, (float) $merchant->fresh()->current_balance);
        $this->assertSame((float) $merchant->fresh()->current_balance, $ledger['entries'][1]['balance']);
    }

    public function test_ledger_service_never_writes_a_buyer_current_balance()
    {
        $merchant = $this->makeMerchant(['opening_balance' => 1000]);
        $service = app(PartyLedgerService::class);

        $merchant->current_balance = 999999;
        $merchant->saveQuietly();

        $service->recalculate(PartyService::BUYER, $merchant->id);

        // Buyer balances belong to AmrozaService, not to the ledger service.
        $this->assertSame(999999.0, (float) $merchant->fresh()->current_balance);
    }

    public function test_farmer_opening_balance_edit_recalculates_current_balance()
    {
        $farmer = $this->makeFarmer(['opening_balance' => 5000]);
        $this->addEntry(PartyService::FARMER, $farmer->id, '2026-01-01', PartyLedgerEntry::DIRECTION_JAMA, 1000);

        $this->assertSame(6000.0, (float) $farmer->fresh()->current_balance);

        $farmer->update(['opening_balance' => 7000]);

        $this->assertSame(8000.0, (float) $farmer->fresh()->current_balance);

        // An unrelated change must not touch the balance.
        $farmer->update(['phone' => '0300-9999999']);

        $this->assertSame(8000.0, (float) $farmer->fresh()->current_balance);
    }

    public function test_merchant_opening_balance_edit_recalculates_current_balance()
    {
        $merchant = $this->makeMerchant(['opening_balance' => 1000]);
        $item = $this->makeItem();

        app(AmrozaService::class)->createSale([
            'date' => '2026-01-01',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 10,
            'rate' => 500,
        ]);

        $this->assertSame(6000.0, (float) $merchant->fresh()->current_balance);

        $merchant->update(['opening_balance' => 2000]);

        // 2000 opening + 5000 sale, using the existing Amroza calculation.
        $this->assertSame(7000.0, (float) $merchant->fresh()->current_balance);
    }

    public function test_farmer_balance_still_works_before_the_ledger_table_is_migrated()
    {
        // The app must not break while the new migration is still pending.
        Schema::drop('party_ledger_entries');

        $farmer = $this->makeFarmer(['opening_balance' => 5000]);

        $farmer->update(['opening_balance' => 7000]);

        $this->assertSame(7000.0, (float) $farmer->fresh()->current_balance);
        $this->assertSame(7000.0, app(PartyLedgerService::class)->currentBalance(PartyService::FARMER, $farmer->id));
    }

    public function test_party_list_merges_every_party_type()
    {
        $this->makeFarmer();
        $this->makeMerchant();
        JkcSupplier::create([
            'code' => 1,
            'name_en' => 'Fresh Farm',
            'name_ur' => 'تازہ فارم',
            'opening_balance' => 250,
        ]);
        CommissionAgent::create([
            'code' => 1,
            'name_en' => 'Haji Gul',
            'name_ur' => 'حاجی گل',
            'opening_balance' => 750,
        ]);

        $result = PartyService::list();

        $this->assertSame(4, $result['total']);

        $types = array_column($result['rows'], 'type');
        sort($types);

        $this->assertSame(
            ['buyer', 'commission_agent', 'farmer', 'supplier'],
            $types
        );
    }

    public function test_party_list_search_matches_code_and_both_names_and_phone()
    {
        $farmer = $this->makeFarmer(['code' => 101, 'name_en' => 'Wadera Ali', 'name_ur' => 'وڈیرہ علی', 'phone' => '0300-1111111']);
        $this->makeMerchant(['code' => 2, 'name_en' => 'Baloch Trading', 'name_ur' => 'بلوچ ٹریڈنگ', 'phone' => '0321-2222222']);

        $this->assertSame(1, PartyService::list(['search' => '101'])['total']);
        $this->assertSame(1, PartyService::list(['search' => 'Wadera'])['total']);
        $this->assertSame(1, PartyService::list(['search' => 'وڈیرہ'])['total']);
        $this->assertSame(1, PartyService::list(['search' => '0300-1111111'])['total']);
        $this->assertSame(1, PartyService::list(['search' => 'Baloch'])['total']);
        $this->assertSame(0, PartyService::list(['search' => 'nobody-here'])['total']);

        $this->assertSame($farmer->id, PartyService::list(['search' => '101'])['rows'][0]['id']);
    }

    public function test_party_list_filters_by_type_and_status()
    {
        $this->makeFarmer();
        $this->makeMerchant();

        $farmersOnly = PartyService::list(['type' => PartyService::FARMER]);

        $this->assertSame(1, $farmersOnly['total']);
        $this->assertSame(PartyService::FARMER, $farmersOnly['rows'][0]['type']);

        $active = PartyService::list(['status' => 'active']);
        $this->assertSame(2, $active['total']);
    }

    public function test_party_list_paginates()
    {
        $this->makeFarmer(['code' => 101]);
        $this->makeFarmer(['code' => 102]);
        $this->makeFarmer(['code' => 103]);

        $page = PartyService::list(['per_page' => 2, 'page' => 2]);

        $this->assertSame(3, $page['total']);
        $this->assertCount(1, $page['rows']);
        $this->assertSame(2, $page['last_page']);
    }
}
