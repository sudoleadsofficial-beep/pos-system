<?php

namespace Tests\Feature;

use App\Models\AmrozaSale;
use App\Models\Item;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use App\Models\User;
use App\Services\AmrozaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Merchant receipts.
 *
 * - a merchant may pay more than once on the same day; every payment is its
 *   own row and an earlier payment is never overwritten
 * - a receipt can be edited and deleted
 * - the merchant balance is always refreshed through
 *   AmrozaService::recalculateMerchantBalance()
 */
class MerchantReceiptTest extends TestCase
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

    protected function makeSale(Merchant $merchant, string $date, float $gross): AmrozaSale
    {
        $item = Item::first() ?: Item::create(['name_en' => 'Potato', 'name_ur' => 'آلو', 'unit' => 'Nag']);

        $sale = AmrozaSale::create([
            'date' => $date,
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 1,
            'weight' => 0,
            'rate' => $gross,
            'bardana' => 0,
            'payment_type' => 'udhaar',
        ]);

        app(AmrozaService::class)->recalculateMerchantBalance($merchant->id);

        return $sale;
    }

    // ---------------------------------------------------------------------
    // 1. Multiple receipts for the same merchant on the same date.
    // ---------------------------------------------------------------------
    public function test_two_payments_on_the_same_day_are_both_kept()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/merchants/wasooli', [
                'merchant_id' => $merchant->id,
                'date' => '2026-01-01',
                'amount' => 5000,
            ])
            ->assertRedirect();

        $this->actingAs($user)
            ->post('/merchants/wasooli', [
                'merchant_id' => $merchant->id,
                'date' => '2026-01-01',
                'amount' => 3000,
            ])
            ->assertRedirect();

        $receipts = MerchantReceipt::where('merchant_id', $merchant->id)->get();

        $this->assertCount(2, $receipts, 'A second payment must not overwrite the first.');
        $this->assertSame(8000.0, (float) $receipts->sum('amount'));

        // The merchant balance drops by the sum of both payments.
        $this->assertSame(-8000.0, (float) $merchant->fresh()->current_balance);
    }

    public function test_a_later_payment_does_not_overwrite_an_earlier_one()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/naqdi', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 5000,
        ]);
        $this->actingAs($user)->post('/merchants/naqdi', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-02', 'amount' => 3000,
        ]);

        $this->assertSame(2, MerchantReceipt::where('merchant_id', $merchant->id)->count());
        $this->assertSame(5000.0, (float) MerchantReceipt::where('date', '2026-01-01')->first()->amount);
        $this->assertSame(3000.0, (float) MerchantReceipt::where('date', '2026-01-02')->first()->amount);
    }

    // ---------------------------------------------------------------------
    // 2. Naqdi and Wasooli stay distinct.
    // ---------------------------------------------------------------------
    public function test_naqdi_and_wasooli_receipts_keep_their_own_type()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/naqdi', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 1000,
        ]);
        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 2000,
        ]);

        $this->assertSame(1, MerchantReceipt::where('type', 'same_day_cash')->count());
        $this->assertSame(1, MerchantReceipt::where('type', 'recovery')->count());

        // Both are separate rows - the second screen never overwrites the first.
        $this->assertSame(2, MerchantReceipt::where('merchant_id', $merchant->id)->count());
        $this->assertSame(-3000.0, (float) $merchant->fresh()->current_balance);
    }

    // ---------------------------------------------------------------------
    // 3. Editing a receipt.
    // ---------------------------------------------------------------------
    public function test_editing_a_receipt_changes_the_amount_and_the_balance()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 5000,
        ]);

        $receipt = MerchantReceipt::first();
        $this->assertSame(-5000.0, (float) $merchant->fresh()->current_balance);

        $this->actingAs($user)
            ->put("/merchants/receipts/{$receipt->id}", [
                'amount' => 2000,
                'date' => '2026-01-01',
                'merchant_id' => $merchant->id,
            ])
            ->assertRedirect();

        $this->assertSame(2000.0, (float) $receipt->fresh()->amount);
        $this->assertSame(-2000.0, (float) $merchant->fresh()->current_balance);
    }

    public function test_editing_a_receipt_keeps_its_type()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/naqdi', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 1000,
        ]);

        $receipt = MerchantReceipt::first();

        $this->actingAs($user)->put("/merchants/receipts/{$receipt->id}", [
            'amount' => 1500,
            'date' => '2026-01-01',
            'merchant_id' => $merchant->id,
            'type' => 'recovery',
        ])->assertRedirect();

        // The type is never changed by an edit.
        $this->assertSame('same_day_cash', $receipt->fresh()->type);
    }

    public function test_editing_the_note_keeps_it_saved()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id,
            'date' => '2026-01-01',
            'amount' => 5000,
            'note' => 'Daily recovery',
        ])->assertRedirect();

        $receipt = MerchantReceipt::first();
        $this->assertSame('Daily recovery', $receipt->note);

        // A later edit that sends no note must not wipe it.
        $this->actingAs($user)->put("/merchants/receipts/{$receipt->id}", [
            'amount' => 6000,
            'date' => '2026-01-01',
            'merchant_id' => $merchant->id,
        ])->assertRedirect();

        $this->assertSame('Daily recovery', $receipt->fresh()->note);
        $this->assertSame(6000.0, (float) $receipt->fresh()->amount);
    }

    public function test_moving_a_receipt_to_another_merchant_refreshes_both_balances()
    {
        $first = $this->makeMerchant(['code' => 2, 'name_en' => 'First']);
        $second = $this->makeMerchant(['code' => 3, 'name_en' => 'Second']);
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $first->id, 'date' => '2026-01-01', 'amount' => 5000,
        ]);

        $receipt = MerchantReceipt::first();

        $this->actingAs($user)->put("/merchants/receipts/{$receipt->id}", [
            'amount' => 5000,
            'date' => '2026-01-01',
            'merchant_id' => $second->id,
        ])->assertRedirect();

        $this->assertSame((int) $second->id, (int) $receipt->fresh()->merchant_id);
        $this->assertSame(0.0, (float) $first->fresh()->current_balance);
        $this->assertSame(-5000.0, (float) $second->fresh()->current_balance);
    }

    // ---------------------------------------------------------------------
    // 4. Deleting a receipt.
    // ---------------------------------------------------------------------
    public function test_deleting_a_receipt_restores_the_balance()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 5000,
        ]);

        $receipt = MerchantReceipt::first();
        $this->assertSame(-5000.0, (float) $merchant->fresh()->current_balance);

        $this->actingAs($user)
            ->delete("/merchants/receipts/{$receipt->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('merchant_receipts', ['id' => $receipt->id]);
        $this->assertSame(0.0, (float) $merchant->fresh()->current_balance);
    }

    public function test_deleting_one_receipt_keeps_the_other_one()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 5000,
        ]);
        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 3000,
        ]);

        $receipts = MerchantReceipt::orderBy('id')->get();
        $this->assertCount(2, $receipts);

        $this->actingAs($user)->delete("/merchants/receipts/{$receipts[0]->id}")->assertRedirect();

        $this->assertSoftDeleted('merchant_receipts', ['id' => $receipts[0]->id]);
        $this->assertSame(1, MerchantReceipt::count());
        $this->assertSame(-3000.0, (float) $merchant->fresh()->current_balance);
    }

    // ---------------------------------------------------------------------
    // 5. Validation and guards.
    // ---------------------------------------------------------------------
    public function test_a_zero_amount_is_rejected()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/merchants/wasooli', [
                'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 0,
            ])
            ->assertSessionHasErrors('amount');

        $this->assertSame(0, MerchantReceipt::count());
    }

    public function test_an_unknown_receipt_cannot_be_edited_or_deleted()
    {
        $user = User::factory()->create();
        $merchant = $this->makeMerchant();

        $this->actingAs($user)
            ->put('/merchants/receipts/999999', [
                'amount' => 100, 'date' => '2026-01-01', 'merchant_id' => $merchant->id,
            ])
            ->assertNotFound();

        $this->actingAs($user)
            ->delete('/merchants/receipts/999999')
            ->assertNotFound();
    }

    // ---------------------------------------------------------------------
    // 6. The sheets show every receipt and still reconcile.
    // ---------------------------------------------------------------------
    public function test_the_wasooli_sheet_lists_every_receipt_and_reconciles()
    {
        $merchant = $this->makeMerchant(['opening_balance' => 10000]);
        $user = User::factory()->create();

        $this->makeSale($merchant, '2026-01-01', 8000);
        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 3000,
        ]);
        $this->actingAs($user)->post('/merchants/naqdi', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 1000,
        ]);

        $response = $this->actingAs($user)->get('/wasooli?date=2026-01-01')->assertOk();
        $props = $response->viewData('page')['props'];
        $row = collect($props['rows'])->firstWhere('merchant_id', $merchant->id);

        $this->assertCount(2, $row['receipts']);
        $this->assertSame(4000.0, (float) $row['receipts_total']);
        $this->assertSame(3000.0, (float) $row['wasooli']);

        // The sheet's Baqaya equals the merchant's balance as at that date.
        $this->assertSame(
            (float) $merchant->getBalanceOn('2026-01-01'),
            (float) $row['total_baqaya']
        );
    }

    public function test_the_naqdi_sheet_sums_every_cash_receipt()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->makeSale($merchant, '2026-01-01', 8000);
        $this->actingAs($user)->post('/merchants/naqdi', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 2000,
        ]);
        $this->actingAs($user)->post('/merchants/naqdi', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 1000,
        ]);

        $response = $this->actingAs($user)->get('/naqdi?date=2026-01-01')->assertOk();
        $props = $response->viewData('page')['props'];
        $row = collect($props['rows'])->firstWhere('merchant_id', $merchant->id);

        $this->assertCount(2, $row['receipts']);
        $this->assertSame(3000.0, (float) $row['naqdi_wasooli']);
    }

    // ---------------------------------------------------------------------
    // 7. Transaction history is never rewritten.
    // ---------------------------------------------------------------------
    public function test_earlier_receipts_keep_their_amounts_and_created_at()
    {
        $merchant = $this->makeMerchant();
        $user = User::factory()->create();

        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 5000,
        ]);
        $first = MerchantReceipt::first();
        $firstCreatedAt = $first->created_at;

        $this->actingAs($user)->post('/merchants/wasooli', [
            'merchant_id' => $merchant->id, 'date' => '2026-01-01', 'amount' => 3000,
        ]);

        $this->assertSame(5000.0, (float) $first->fresh()->amount);
        $this->assertSame((string) $firstCreatedAt, (string) $first->fresh()->created_at);
    }
}
