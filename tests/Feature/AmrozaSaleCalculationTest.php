<?php

namespace Tests\Feature;

use App\Models\AmrozaSale;
use App\Models\Item;
use App\Models\Merchant;
use App\Models\User;
use App\Services\AmrozaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Amroza sale calculation - POS V1 unit-based pricing.
 *
 * The approved rule is:
 *
 *     gross_amount = (nag x rate) + bardana
 *
 * - Units (Nag/Bags) is the quantity that determines the amount.
 * - Rate is the selling price per the item's selling unit (Bori/Bag,
 *   Peti/Crate, Nag, ...) as defined by the item master.
 * - Weight (Kg/Maund) is the TOTAL physical weight of the whole line. It is
 *   recorded and reported separately and NEVER multiplies the amount.
 * - Bardana (packing charge) is added on top.
 *
 * Weight stays optional. An empty weight is stored as 0 because the column is
 * NOT NULL; a weight that was really entered is kept exactly as it was.
 */
class AmrozaSaleCalculationTest extends TestCase
{
    use RefreshDatabase;

    protected function makeMerchant(array $attributes = []): Merchant
    {
        return Merchant::create(array_merge([
            'code' => 2,
            'name_en' => 'Test Buyer',
            'name_ur' => 'ٹیسٹ خریدار',
            'opening_balance' => 0,
        ], $attributes));
    }

    protected function makeItem(): Item
    {
        return Item::create([
            'name_en' => 'Aloo (Potato)',
            'name_ur' => 'آلو',
            'unit' => 'Bori (Bag)',
            'default_rate' => 1200,
        ]);
    }

    /**
     * The value as the database actually holds it, read with raw SQL so the
     * assertion does not depend on the model's own cast.
     */
    protected function rawColumn(int $saleId, string $column): float
    {
        $row = DB::selectOne("SELECT {$column} FROM amroza_sales WHERE id = ?", [$saleId]);

        return (float) $row->{$column};
    }

    /**
     * Post a sale the way the Amroza form does.
     *
     * @return array{0: \Illuminate\Testing\TestResponse, 1: Merchant, 2: Item}
     */
    protected function postSale(array $overrides = [])
    {
        $merchant = $overrides['merchant'] ?? $this->makeMerchant();
        $item = $overrides['item'] ?? $this->makeItem();

        $payload = array_merge([
            'date' => '2026-01-01',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => '',
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'udhaar',
        ], array_diff_key($overrides, ['merchant' => null, 'item' => null]));

        $response = $this->actingAs(User::factory()->create())
            ->post('/merchants/amroza', $payload);

        return [$response, $merchant, $item];
    }

    // ---------------------------------------------------------------------
    // 1. The approved formula: Units x Rate + Bardana.
    // ---------------------------------------------------------------------
    public function test_two_units_with_weight_forty_are_priced_by_units()
    {
        [$response] = $this->postSale([
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $this->assertSame(1, AmrozaSale::count());

        // 2 x 1,800 = 3,600. The weight of 40 must not multiply the amount.
        $this->assertSame(3600.0, (float) AmrozaSale::first()->gross_amount);
    }

    public function test_two_units_without_a_weight_are_priced_by_units()
    {
        [$response] = $this->postSale([
            'nag' => 2,
            'weight' => 0,
            'rate' => 1800,
            'bardana' => 0,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        // 2 x 1,800 = 3,600 - the same amount as the line with a weight.
        $this->assertSame(3600.0, (float) AmrozaSale::first()->gross_amount);
    }

    public function test_packing_charges_are_added_to_the_unit_amount()
    {
        [$response] = $this->postSale([
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 500,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        // 2 x 1,800 + 500 = 4,100
        $this->assertSame(4100.0, (float) AmrozaSale::first()->gross_amount);
    }

    public function test_ten_units_with_a_weight_are_priced_by_units()
    {
        [$response] = $this->postSale([
            'nag' => 10,
            'weight' => 20,
            'rate' => 850,
            'bardana' => 0,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        // 10 x 850 = 8,500
        $this->assertSame(8500.0, (float) AmrozaSale::first()->gross_amount);
    }

    public function test_the_amount_does_not_depend_on_the_weight_at_all()
    {
        $merchant = $this->makeMerchant();
        $item = $this->makeItem();

        $amounts = [];

        foreach ([0, 1, 20, 40, 400] as $weight) {
            $this->postSale([
                'merchant' => $merchant,
                'item' => $item,
                'nag' => 2,
                'weight' => $weight,
                'rate' => 1800,
                'bardana' => 0,
            ]);

            $amounts[] = (float) AmrozaSale::latest('id')->first()->gross_amount;
        }

        $this->assertSame(
            [3600.0, 3600.0, 3600.0, 3600.0, 3600.0],
            $amounts,
            'The amount must be the same for every weight of the same line.'
        );
    }

    // ---------------------------------------------------------------------
    // 2. Weight is recorded, never NULL, and never changed.
    // ---------------------------------------------------------------------
    public function test_an_entered_weight_is_preserved_in_the_database()
    {
        [$response] = $this->postSale([
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
        ]);

        $response->assertRedirect();

        $sale = AmrozaSale::first();
        $this->assertSame(40.0, $this->rawColumn($sale->id, 'weight'));
        $this->assertSame(40.0, (float) $sale->weight);
    }

    public function test_a_fractional_weight_is_preserved_in_the_database()
    {
        [$response] = $this->postSale([
            'nag' => 2,
            'weight' => 12.5,
            'rate' => 1800,
            'bardana' => 0,
        ]);

        $response->assertRedirect();

        $sale = AmrozaSale::first();
        $this->assertSame(12.5, $this->rawColumn($sale->id, 'weight'));
    }

    public function test_an_empty_weight_is_stored_as_zero_and_never_null()
    {
        [$response] = $this->postSale([
            'nag' => 2,
            'weight' => '',
            'rate' => 1800,
            'bardana' => 0,
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $sale = AmrozaSale::first();
        $this->assertSame(0.0, $this->rawColumn($sale->id, 'weight'));

        $row = DB::selectOne('SELECT weight FROM amroza_sales WHERE weight IS NULL');
        $this->assertNull($row, 'No row may hold a NULL weight.');
    }

    public function test_a_missing_weight_is_stored_as_zero()
    {
        $merchant = $this->makeMerchant();
        $item = $this->makeItem();

        $response = $this->actingAs(User::factory()->create())
            ->post('/merchants/amroza', [
                'date' => '2026-01-01',
                'merchant_id' => $merchant->id,
                'item_id' => $item->id,
                'nag' => 2,
                // no weight key at all
                'rate' => 1800,
                'bardana' => 0,
                'payment_type' => 'udhaar',
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $this->assertSame(0.0, $this->rawColumn(AmrozaSale::first()->id, 'weight'));
    }

    public function test_an_empty_bardana_is_stored_as_zero()
    {
        [$response] = $this->postSale([
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => '',
        ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $sale = AmrozaSale::first();
        $this->assertSame(0.0, $this->rawColumn($sale->id, 'bardana'));
        $this->assertSame(3600.0, (float) $sale->gross_amount);
    }

    // ---------------------------------------------------------------------
    // 3. The merchant balance follows the corrected gross amount.
    // ---------------------------------------------------------------------
    public function test_the_merchant_balance_changes_by_the_correct_gross_amount()
    {
        [$response, $merchant] = $this->postSale([
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
        ]);

        $response->assertRedirect();

        // The balance must move by 3,600 - not by 72,000.
        $this->assertSame(3600.0, (float) $merchant->fresh()->current_balance);
    }

    public function test_the_merchant_balance_includes_packing_charges()
    {
        [$response, $merchant] = $this->postSale([
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 500,
        ]);

        $response->assertRedirect();

        $this->assertSame(4100.0, (float) $merchant->fresh()->current_balance);
    }

    // ---------------------------------------------------------------------
    // 4. Editing a sale.
    // ---------------------------------------------------------------------
    public function test_editing_a_sale_and_leaving_the_weight_empty_keeps_it_zero()
    {
        [$response, $merchant] = $this->postSale([
            'nag' => 2,
            'weight' => '',
            'rate' => 1800,
            'bardana' => 0,
        ]);

        $response->assertRedirect();

        $sale = AmrozaSale::first();
        $this->assertSame(0.0, $this->rawColumn($sale->id, 'weight'));

        // The edit form sends '' for a sale that has no weight.
        $update = $this->actingAs(User::factory()->create())
            ->put("/merchants/amroza/{$sale->id}", [
                'date' => '2026-01-01',
                'merchant_id' => $merchant->id,
                'item_id' => $sale->item_id,
                'nag' => 20,
                'weight' => '',
                'rate' => 1800,
                'bardana' => 0,
                'payment_type' => 'udhaar',
            ]);

        $update->assertRedirect();
        $update->assertSessionHasNoErrors();

        $this->assertSame(0.0, $this->rawColumn($sale->id, 'weight'));
        $this->assertSame(36000.0, (float) $sale->fresh()->gross_amount);
    }

    // ---------------------------------------------------------------------
    // 5. Validation: Units stay mandatory and positive, Rate stays valid.
    // ---------------------------------------------------------------------
    public function test_zero_units_are_rejected()
    {
        [$response] = $this->postSale(['nag' => 0]);

        $response->assertSessionHasErrors('nag');
        $this->assertSame(0, AmrozaSale::count());
    }

    public function test_a_missing_units_value_is_rejected()
    {
        $merchant = $this->makeMerchant();
        $item = $this->makeItem();

        $response = $this->actingAs(User::factory()->create())
            ->post('/merchants/amroza', [
                'date' => '2026-01-01',
                'merchant_id' => $merchant->id,
                'item_id' => $item->id,
                // no nag key at all
                'weight' => 40,
                'rate' => 1800,
                'bardana' => 0,
                'payment_type' => 'udhaar',
            ]);

        $response->assertSessionHasErrors('nag');
        $this->assertSame(0, AmrozaSale::count());
    }

    public function test_a_zero_rate_is_rejected()
    {
        [$response] = $this->postSale(['rate' => 0]);

        $response->assertSessionHasErrors('rate');
        $this->assertSame(0, AmrozaSale::count());
    }

    public function test_a_negative_weight_is_rejected()
    {
        [$response] = $this->postSale(['weight' => -5]);

        $response->assertSessionHasErrors('weight');
        $this->assertSame(0, AmrozaSale::count());
    }

    // ---------------------------------------------------------------------
    // 6. A sale that fails must leave nothing behind.
    // ---------------------------------------------------------------------
    public function test_a_failed_sale_insert_leaves_no_row_and_does_not_change_the_balance()
    {
        $merchant = $this->makeMerchant(['opening_balance' => 500]);
        $item = $this->makeItem();

        $balanceBefore = (float) $merchant->fresh()->current_balance;
        $salesBefore = AmrozaSale::count();

        $thrown = null;

        try {
            app(AmrozaService::class)->createSale([
                'date' => '2026-01-01',
                'merchant_id' => $merchant->id,
                'item_id' => 999999,   // does not exist -> the insert fails
                'nag' => 2,
                'weight' => 40,
                'rate' => 1800,
                'bardana' => 0,
                'payment_type' => 'udhaar',
            ]);
        } catch (\Throwable $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'The insert was expected to fail.');

        $this->assertSame($salesBefore, AmrozaSale::count(), 'No sale row may survive the failure.');
        $this->assertSame(
            $balanceBefore,
            (float) $merchant->fresh()->current_balance,
            'A failed sale must not move the merchant balance.'
        );
    }

    // ---------------------------------------------------------------------
    // 7. The daily summary and the reports use the corrected gross amount.
    // ---------------------------------------------------------------------
    public function test_the_daily_summary_uses_the_corrected_gross_amount()
    {
        $merchant = $this->makeMerchant();
        $item = $this->makeItem();

        $this->postSale([
            'merchant' => $merchant,
            'item' => $item,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'udhaar',
        ]);

        $summary = app(AmrozaService::class)->getDailySummary('2026-01-01');

        $this->assertSame(3600.0, (float) $summary['total_gross']);
        $this->assertSame(3600.0, (float) $summary['credit_amount']);
        $this->assertSame(2, (int) $summary['total_nag']);
        $this->assertSame(2, (int) $summary['credit_nag']);
    }

    public function test_the_am_total_reports_weight_separately_from_the_amount()
    {
        $merchant = $this->makeMerchant();
        $item = $this->makeItem();

        $this->postSale([
            'merchant' => $merchant,
            'item' => $item,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'udhaar',
        ]);

        $total = app(AmrozaService::class)->getAmTotal('2026-01-01');

        $this->assertSame(3600.0, (float) $total['by_merchant'][0]['gross']);
        $this->assertSame(2, (int) $total['by_merchant'][0]['nag']);
        $this->assertSame(40.0, (float) $total['by_merchant'][0]['weight']);
    }
}
