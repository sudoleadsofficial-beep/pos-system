<?php

namespace Tests\Feature;

use App\Models\Merchant;
use App\Models\User;
use Database\Seeders\JkcMastersSeeder;
use Database\Seeders\JkcMerchantTransactionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Merchant code allocation.
 *
 * Code 1 is permanently reserved for the protected Naqdi (Cash Customer)
 * record. Every other merchant starts at code 2 and gets a unique code.
 */
class MerchantCodeAllocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_first_merchant_created_receives_code_two_not_code_one()
    {
        $merchant = Merchant::create(['name_en' => 'First Buyer', 'name_ur' => 'پہلا خریدار']);

        $this->assertSame(2, (int) $merchant->code);
    }

    public function test_subsequent_merchants_receive_unique_codes()
    {
        $a = Merchant::create(['name_en' => 'A']);
        $b = Merchant::create(['name_en' => 'B']);
        $c = Merchant::create(['name_en' => 'C']);

        $this->assertSame([2, 3, 4], [(int) $a->code, (int) $b->code, (int) $c->code]);
        $this->assertSame(3, Merchant::count());
    }

    public function test_code_one_is_refused_for_an_ordinary_merchant()
    {
        $this->expectException(\LogicException::class);

        Merchant::create(['code' => 1, 'name_en' => 'Sneaky']);
    }

    public function test_the_naqdi_record_keeps_code_one()
    {
        $naqdi = Merchant::ensureNaqdiRecord();

        $this->assertSame(1, (int) $naqdi->code);
        $this->assertSame('Naqdi (Cash Customer)', $naqdi->name_en);
        $this->assertSame('نقدی (عام خریدار)', $naqdi->name_ur);
        $this->assertTrue($naqdi->isNaqdi());

        // Calling it again must not create a second record.
        Merchant::ensureNaqdiRecord();

        $this->assertSame(1, Merchant::where('code', 1)->count());
    }

    public function test_existing_merchant_codes_are_not_changed()
    {
        $bilal = Merchant::create(['name_en' => 'bilal', 'name_ur' => 'بلال', 'opening_balance' => 1000]);
        $naqdi = Merchant::ensureNaqdiRecord();

        $this->assertSame(2, (int) $bilal->code);
        $this->assertSame(1, (int) $naqdi->code);

        // Creating more merchants must not disturb the existing codes.
        Merchant::create(['name_en' => 'Third Buyer']);

        $this->assertSame(2, (int) $bilal->fresh()->code);
        $this->assertSame(1, (int) $naqdi->fresh()->code);
        $this->assertSame(1000.0, (float) $bilal->fresh()->current_balance);
    }

    public function test_a_code_held_by_a_soft_deleted_merchant_is_not_handed_out_again()
    {
        $a = Merchant::create(['name_en' => 'A']);
        $b = Merchant::create(['name_en' => 'B']);

        $this->assertSame(3, (int) $b->code);

        $b->delete();

        $c = Merchant::create(['name_en' => 'C']);

        // Code 3 still occupies the unique index, so it must not be reused.
        $this->assertSame(4, (int) $c->code);
        $this->assertSame(2, (int) $a->fresh()->code);
    }

    public function test_the_controller_rejects_code_one()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/masters/merchants', ['code' => 1, 'name_en' => 'Sneaky'])
            ->assertSessionHasErrors('code');

        $this->assertSame(0, Merchant::where('name_en', 'Sneaky')->count());
    }

    public function test_the_controller_allocates_the_next_code()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/masters/merchants', ['name_en' => 'Through The Screen'])
            ->assertRedirect();

        $created = Merchant::where('name_en', 'Through The Screen')->first();

        $this->assertNotNull($created);
        $this->assertSame(2, (int) $created->code);
    }

    public function test_the_controller_refuses_to_move_a_merchant_into_code_one()
    {
        $user = User::factory()->create();
        $merchant = Merchant::create(['name_en' => 'Ordinary Buyer']);

        $this->actingAs($user)
            ->put("/masters/merchants/{$merchant->id}", [
                'code' => 1,
                'name_en' => 'Ordinary Buyer',
                'status' => 'active',
            ])
            ->assertSessionHasErrors('code');

        $this->assertSame(2, (int) $merchant->fresh()->code);
    }

    public function test_running_the_seeder_does_not_overwrite_existing_merchant_data()
    {
        $bilal = Merchant::create([
            'name_en' => 'bilal',
            'name_ur' => 'بلال',
            'phone' => '+92 316 8171556',
            'opening_balance' => 1000,
        ]);
        $naqdi = Merchant::ensureNaqdiRecord();

        $this->seed(JkcMastersSeeder::class);

        $bilal->refresh();

        // Bilal must be completely untouched.
        $this->assertSame(2, (int) $bilal->code);
        $this->assertSame('bilal', $bilal->name_en);
        $this->assertSame('بلال', $bilal->name_ur);
        $this->assertSame('+92 316 8171556', $bilal->phone);
        $this->assertSame(1000.0, (float) $bilal->opening_balance);
        $this->assertSame(1000.0, (float) $bilal->current_balance);

        // The Naqdi record must still hold code 1.
        $naqdi->refresh();
        $this->assertSame(1, (int) $naqdi->code);
        $this->assertSame('Naqdi (Cash Customer)', $naqdi->name_en);
        $this->assertSame(1, Merchant::where('code', 1)->count());

        // The sample merchant whose code was taken must still be created,
        // under a free code, and must not be confused with Bilal.
        $hajiGul = Merchant::where('name_en', 'Haji Gul Merchant')->first();

        $this->assertNotNull($hajiGul, 'The sample merchant must still be created.');
        $this->assertNotSame(2, (int) $hajiGul->code);
        $this->assertNotSame(1, (int) $hajiGul->code);
        $this->assertSame(2, (int) $bilal->fresh()->code);

        // Every merchant code is still unique.
        $this->assertSame(0, Merchant::selectRaw('code, COUNT(*) as c')->groupBy('code')->havingRaw('COUNT(*) > 1')->get()->count());
    }

    public function test_running_the_transaction_seeder_does_not_overwrite_existing_merchant_data()
    {
        // A merchant that happens to hold the code the transaction seeder
        // used to look up by code.
        $ordinary = Merchant::create([
            'name_en' => 'Some Ordinary Buyer',
            'name_ur' => 'کوئی عام خریدار',
            'opening_balance' => 2500,
        ]);

        $this->seed(JkcMastersSeeder::class);
        $this->seed(JkcMerchantTransactionsSeeder::class);

        $ordinary->refresh();

        $this->assertSame(2, (int) $ordinary->code);
        $this->assertSame(2500.0, (float) $ordinary->opening_balance);
        $this->assertSame(2500.0, (float) $ordinary->current_balance);
        $this->assertSame('Some Ordinary Buyer', $ordinary->name_en);
    }
}
