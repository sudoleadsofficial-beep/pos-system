<?php

namespace Tests\Feature;

use App\Models\AmrozaSale;
use App\Models\Item;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use App\Models\User;
use App\Services\AmrozaService;
use App\Services\DashboardService;
use App\Services\NaqdiService;
use App\Services\WasooliService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Stage 1 - balance reconciliation.
 *
 * A merchant's balance comes in two flavours and they are NOT interchangeable:
 *
 *   date-scoped : Merchant::getBalanceOn($date)  -> opening + sales(<=date) - receipts(<=date)
 *   lifetime    : merchants.current_balance       -> opening + ALL sales    - ALL receipts
 *
 * They are only equal when no transaction falls after that date. Every test
 * below states which of the two it is comparing against.
 */
class MerchantBalanceReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected function makeItem(): Item
    {
        return Item::create(['name_en' => 'Potato', 'name_ur' => 'آلو', 'unit' => 'Nag']);
    }

    protected function makeMerchant(array $attributes = []): Merchant
    {
        return Merchant::create(array_merge([
            'code' => 2,
            'name_en' => 'Test Buyer',
            'name_ur' => 'ٹیسٹ خریدار',
            'opening_balance' => 0,
        ], $attributes));
    }

    /**
     * A sale whose gross amount is exactly $gross (nag = 1, bardana = 0).
     *
     * The balance is refreshed through AmrozaService, exactly as the Amroza
     * screen does after every entry.
     */
    protected function makeSale(Merchant $merchant, Item $item, string $date, float $gross, string $paymentType = 'udhaar'): AmrozaSale
    {
        $sale = AmrozaSale::create([
            'date' => $date,
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 1,
            'weight' => 0,
            'rate' => $gross,
            'bardana' => 0,
            'payment_type' => $paymentType,
        ]);

        app(AmrozaService::class)->recalculateMerchantBalance($merchant->id);

        return $sale;
    }

    protected function makeReceipt(Merchant $merchant, string $date, float $amount, string $type): MerchantReceipt
    {
        $receipt = MerchantReceipt::create([
            'date' => $date,
            'merchant_id' => $merchant->id,
            'amount' => $amount,
            'type' => $type,
        ]);

        app(AmrozaService::class)->recalculateMerchantBalance($merchant->id);

        return $receipt;
    }

    /**
     * @return array<string, mixed>
     */
    protected function wasooliRow(Merchant $merchant, string $date): array
    {
        $sheet = app(WasooliService::class)->getWasooliSheet($date);

        foreach ($sheet['rows'] as $row) {
            if ((int) $row['merchant_id'] === (int) $merchant->id) {
                return $row;
            }
        }

        $this->fail('Merchant '.$merchant->id.' is not on the Wasooli sheet for '.$date);
    }

    /**
     * @return array<string, mixed>
     */
    protected function naqdiRow(Merchant $merchant, string $date): array
    {
        $sheet = app(NaqdiService::class)->getNaqdiSheet($date);

        foreach ($sheet['rows'] as $row) {
            if ((int) $row['merchant_id'] === (int) $merchant->id) {
                return $row;
            }
        }

        $this->fail('Merchant '.$merchant->id.' is not on the Naqdi sheet for '.$date);
    }

    /**
     * Fixture merchant A:
     *   opening 16,100
     *   2026-01-01  sale 8,500 (credit)  + recovery 8,000 + same-day cash 2,000
     *   2026-01-02  sale 5,000 (credit)
     */
    protected function makeFixtureMerchant(): Merchant
    {
        $item = $this->makeItem();
        $merchant = $this->makeMerchant(['code' => 2, 'opening_balance' => 16100]);

        $this->makeSale($merchant, $item, '2026-01-01', 8500);
        $this->makeReceipt($merchant, '2026-01-01', 8000, 'recovery');
        $this->makeReceipt($merchant, '2026-01-01', 2000, 'same_day_cash');
        $this->makeSale($merchant, $item, '2026-01-02', 5000);

        return $merchant;
    }

    // ---------------------------------------------------------------------
    // 1 + 2: the Wasooli sheet is DATE-SCOPED and reconciles with
    //         Merchant::getBalanceOn($date) - and is NOT the lifetime balance.
    // ---------------------------------------------------------------------
    public function test_wasooli_sheet_baqaya_reconciles_with_the_date_scoped_balance()
    {
        $merchant = $this->makeFixtureMerchant();

        $row = $this->wasooliRow($merchant, '2026-01-01');

        // sabiqa 16,100 + amroza 8,500 - receipts of that date (8,000 + 2,000)
        $this->assertSame(14600.0, (float) $row['total_baqaya']);
        $this->assertSame(
            (float) $merchant->getBalanceOn('2026-01-01'),
            (float) $row['total_baqaya'],
            'The Wasooli sheet must reconcile with the date-scoped balance.'
        );

        // The date-scoped balance is NOT the lifetime balance - 2026-01-02
        // activity is still outstanding.
        $this->assertNotSame(
            (float) $merchant->fresh()->current_balance,
            (float) $merchant->getBalanceOn('2026-01-01'),
            'A date-scoped balance must differ from the lifetime balance when later activity exists.'
        );
    }

    // ---------------------------------------------------------------------
    // 3: the lifetime balance follows its own rule.
    // ---------------------------------------------------------------------
    public function test_current_balance_follows_the_lifetime_rule()
    {
        $merchant = $this->makeFixtureMerchant();

        $sales = (float) $merchant->sales()->sum('gross_amount');
        $receipts = (float) $merchant->receipts()->sum('amount');
        $expected = round(16100 + $sales - $receipts, 2);

        $this->assertSame(13500.0, $sales);
        $this->assertSame(10000.0, $receipts);
        $this->assertSame($expected, (float) $merchant->fresh()->current_balance);
        $this->assertSame(19600.0, (float) $merchant->fresh()->current_balance);
    }

    // ---------------------------------------------------------------------
    // 4: on the last active date the two balances converge.
    // ---------------------------------------------------------------------
    public function test_wasooli_sheet_matches_the_lifetime_balance_on_the_last_active_date()
    {
        $merchant = $this->makeFixtureMerchant();

        $row = $this->wasooliRow($merchant, '2026-01-02');

        $this->assertSame(19600.0, (float) $row['total_baqaya']);
        $this->assertSame(
            (float) $merchant->fresh()->current_balance,
            (float) $row['total_baqaya'],
            'With no later activity the date-scoped and lifetime balances must be equal.'
        );
    }

    // ---------------------------------------------------------------------
    // The Wasooli sheet counts BOTH receipt kinds, and exposes the split.
    // ---------------------------------------------------------------------
    public function test_wasooli_sheet_counts_both_receipt_kinds_and_keeps_the_recovery_split()
    {
        $merchant = $this->makeFixtureMerchant();

        $row = $this->wasooliRow($merchant, '2026-01-01');

        $this->assertSame(8000.0, (float) $row['wasooli'], 'The Wasooli column stays recovery-only.');
        $this->assertSame(2000.0, (float) $row['same_day_cash']);
        $this->assertSame(10000.0, (float) $row['receipts_total']);
        $this->assertCount(2, $row['receipts']);

        $types = array_column($row['receipts'], 'type');
        sort($types);
        $this->assertSame(['recovery', 'same_day_cash'], $types);
    }

    // ---------------------------------------------------------------------
    // The Naqdi sheet sums every cash receipt instead of taking the first.
    // ---------------------------------------------------------------------
    public function test_naqdi_sheet_sums_every_cash_receipt()
    {
        $merchant = $this->makeFixtureMerchant();
        $this->makeReceipt($merchant, '2026-01-01', 1500, 'same_day_cash');

        $row = $this->naqdiRow($merchant, '2026-01-01');

        $this->assertSame(3500.0, (float) $row['naqdi_wasooli']);
        $this->assertCount(2, $row['receipts']);
    }

    // ---------------------------------------------------------------------
    // 5 + 6: the combined Amroza/Wasooli report reconciles and its footer
    //         is the closing balance, not a sum of running balances.
    // ---------------------------------------------------------------------
    public function test_combined_report_rows_and_footer_reconcile()
    {
        $merchant = $this->makeFixtureMerchant();

        $response = $this->actingAs(User::factory()->create())
            ->get('/amroza-wasooli?from_date=2026-01-01&to_date=2026-01-02')
            ->assertOk();

        $props = $response->viewData('page')['props'];
        $rows = $props['rows'];
        $totals = $props['totals'];

        $this->assertCount(2, $rows);

        // The last row is the balance as at to_date.
        $this->assertSame(
            (float) $merchant->getBalanceOn('2026-01-02'),
            (float) $rows[1]['baqaya'],
            'The report row must equal the date-scoped balance.'
        );

        // The footer is the closing balance - NOT the sum of the running balances.
        $this->assertSame((float) $merchant->getBalanceOn('2026-01-02'), (float) $totals['closing_balance']);
        $this->assertNotSame(
            (float) array_sum(array_column($rows, 'baqaya')),
            (float) $totals['closing_balance'],
            'The footer must not be the sum of the daily running balances.'
        );

        // The footer opening balance is the first row's Sabiqa.
        $this->assertSame((float) $rows[0]['sabiqa'], (float) $totals['opening_balance']);

        // Period activity totals stay genuine sums.
        $this->assertSame(13500.0, (float) $totals['total_amroza']);
        $this->assertSame(10000.0, (float) $totals['total_wasooli']);
        $this->assertSame(8000.0, (float) $totals['total_recovery']);
    }

    // ---------------------------------------------------------------------
    // 7 - 10: the dashboard cash figure never counts the same money twice.
    // ---------------------------------------------------------------------
    public function test_dashboard_cash_counts_a_mirrored_receipt_only_once()
    {
        $item = $this->makeItem();
        $merchant = $this->makeMerchant(['code' => 3]);
        $today = date('Y-m-d');

        $this->makeSale($merchant, $item, $today, 137329, 'naqdi');
        $this->makeReceipt($merchant, $today, 137329, 'same_day_cash');

        $stats = app(DashboardService::class)->getDashboardItems()['stats'];

        $this->assertSame(137329.0, (float) $stats['cashInHand']);
        $this->assertSame(137329.0, (float) $stats['received']);
    }

    public function test_dashboard_cash_does_not_add_a_separate_smaller_payment_on_top()
    {
        $item = $this->makeItem();
        $merchant = $this->makeMerchant(['code' => 4]);
        $today = date('Y-m-d');

        $this->makeSale($merchant, $item, $today, 100000, 'naqdi');
        $this->makeReceipt($merchant, $today, 30000, 'same_day_cash');

        $stats = app(DashboardService::class)->getDashboardItems()['stats'];

        // The 30,000 is part of the 100,000 cash sale, not extra money.
        $this->assertSame(100000.0, (float) $stats['cashInHand']);
    }

    public function test_dashboard_cash_counts_a_cash_payment_against_a_credit_sale()
    {
        $merchant = $this->makeMerchant(['code' => 5]);
        $today = date('Y-m-d');

        $this->makeReceipt($merchant, $today, 30000, 'same_day_cash');

        $stats = app(DashboardService::class)->getDashboardItems()['stats'];

        // No cash sale to mirror - this is real incoming cash.
        $this->assertSame(30000.0, (float) $stats['cashInHand']);
    }

    public function test_dashboard_cash_uses_the_larger_side_when_old_dues_are_paid_too()
    {
        $item = $this->makeItem();
        $merchant = $this->makeMerchant(['code' => 6]);
        $today = date('Y-m-d');

        $this->makeSale($merchant, $item, $today, 50000, 'naqdi');
        $this->makeReceipt($merchant, $today, 80000, 'same_day_cash');

        $stats = app(DashboardService::class)->getDashboardItems()['stats'];

        // 80,000 actually arrived (50,000 of goods + 30,000 of old dues).
        $this->assertSame(80000.0, (float) $stats['cashInHand']);
    }

    // ---------------------------------------------------------------------
    // 11: a merchant with no activity is unaffected.
    // ---------------------------------------------------------------------
    public function test_a_merchant_with_no_activity_is_unaffected()
    {
        $this->makeFixtureMerchant();
        $idle = $this->makeMerchant(['code' => 7, 'opening_balance' => 2500]);

        $stats = app(DashboardService::class)->getDashboardItems()['stats'];

        $this->assertSame(2500.0, (float) $idle->fresh()->current_balance);
        $this->assertSame(0.0, (float) $stats['cashInHand'], 'No activity means no cash in hand.');
    }
}
