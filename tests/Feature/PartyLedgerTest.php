<?php

namespace Tests\Feature;

use App\Models\Farmer;
use App\Models\Merchant;
use App\Models\PartyLedgerEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartyLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected function makeFarmer(array $attributes = []): Farmer
    {
        return Farmer::create(array_merge([
            'code' => 101,
            'name_en' => 'Wadera Ali',
            'name_ur' => 'وڈیرہ علی',
            'opening_balance' => 5000,
        ], $attributes));
    }

    public function test_a_ledger_entry_can_be_added_and_recalculates_the_balance()
    {
        $farmer = $this->makeFarmer();

        $this->actingAs(User::factory()->create())
            ->post("/parties/farmer/{$farmer->id}/entries", [
                'date' => '2026-01-01',
                'direction' => 'jama',
                'amount' => 3000,
                'category' => 'consignment',
                'description' => 'Consignment value',
            ])
            ->assertRedirect();

        $entry = PartyLedgerEntry::first();

        $this->assertNotNull($entry);
        $this->assertSame('farmer', $entry->party_type);
        $this->assertSame($farmer->id, $entry->party_id);
        $this->assertSame(3000.0, (float) $entry->amount);

        // 5000 opening + 3000 jama
        $this->assertSame(8000.0, (float) $farmer->fresh()->current_balance);
    }

    public function test_a_banam_entry_reduces_the_balance()
    {
        $farmer = $this->makeFarmer();

        $this->actingAs(User::factory()->create())
            ->post("/parties/farmer/{$farmer->id}/entries", [
                'date' => '2026-01-02',
                'direction' => 'banam',
                'amount' => 1200,
                'category' => 'payment',
            ])
            ->assertRedirect();

        // 5000 opening - 1200 banam
        $this->assertSame(3800.0, (float) $farmer->fresh()->current_balance);
    }

    public function test_ledger_entries_are_validated()
    {
        $farmer = $this->makeFarmer();

        $this->actingAs(User::factory()->create())
            ->post("/parties/farmer/{$farmer->id}/entries", [])
            ->assertSessionHasErrors(['date', 'direction', 'amount', 'category']);

        $this->actingAs(User::factory()->create())
            ->post("/parties/farmer/{$farmer->id}/entries", [
                'date' => '2026-01-01',
                'direction' => 'sideways',
                'amount' => 100,
                'category' => 'payment',
            ])
            ->assertSessionHasErrors('direction');
    }

    public function test_buyer_ledger_entries_cannot_be_entered_by_hand()
    {
        $merchant = Merchant::create([
            'code' => 2,
            'name_en' => 'Baloch Trading',
            'opening_balance' => 1000,
        ]);

        $this->actingAs(User::factory()->create())
            ->post("/parties/buyer/{$merchant->id}/entries", [
                'date' => '2026-01-01',
                'direction' => 'jama',
                'amount' => 500,
                'category' => 'payment',
            ])
            ->assertForbidden();

        $this->assertSame(0, PartyLedgerEntry::count());
    }

    public function test_a_ledger_entry_can_be_updated()
    {
        $farmer = $this->makeFarmer();

        $this->actingAs(User::factory()->create())
            ->post("/parties/farmer/{$farmer->id}/entries", [
                'date' => '2026-01-01',
                'direction' => 'jama',
                'amount' => 3000,
                'category' => 'consignment',
            ])
            ->assertRedirect();

        $entry = PartyLedgerEntry::first();

        $this->actingAs(User::factory()->create())
            ->put("/parties/farmer/{$farmer->id}/entries/{$entry->id}", [
                'date' => '2026-01-01',
                'direction' => 'jama',
                'amount' => 4000,
                'category' => 'consignment',
            ])
            ->assertRedirect();

        $this->assertSame(4000.0, (float) $entry->fresh()->amount);
        $this->assertSame(9000.0, (float) $farmer->fresh()->current_balance);
    }

    public function test_a_ledger_entry_can_be_deleted()
    {
        $farmer = $this->makeFarmer();

        $this->actingAs(User::factory()->create())
            ->post("/parties/farmer/{$farmer->id}/entries", [
                'date' => '2026-01-01',
                'direction' => 'jama',
                'amount' => 3000,
                'category' => 'consignment',
            ])
            ->assertRedirect();

        $entry = PartyLedgerEntry::first();

        $this->actingAs(User::factory()->create())
            ->delete("/parties/farmer/{$farmer->id}/entries/{$entry->id}")
            ->assertRedirect();

        $this->assertSame(0, PartyLedgerEntry::count());
        $this->assertSame(5000.0, (float) $farmer->fresh()->current_balance);
    }

    public function test_an_entry_belonging_to_another_party_cannot_be_touched()
    {
        $farmer = $this->makeFarmer();
        $otherFarmer = $this->makeFarmer(['code' => 102]);

        $this->actingAs(User::factory()->create())
            ->post("/parties/farmer/{$farmer->id}/entries", [
                'date' => '2026-01-01',
                'direction' => 'jama',
                'amount' => 3000,
                'category' => 'consignment',
            ])
            ->assertRedirect();

        $entry = PartyLedgerEntry::first();

        $this->actingAs(User::factory()->create())
            ->delete("/parties/farmer/{$otherFarmer->id}/entries/{$entry->id}")
            ->assertNotFound();

        $this->assertSame(1, PartyLedgerEntry::count());
    }

    public function test_entries_for_an_unknown_party_return_404()
    {
        $this->actingAs(User::factory()->create())
            ->post('/parties/farmer/999999/entries', [
                'date' => '2026-01-01',
                'direction' => 'jama',
                'amount' => 100,
                'category' => 'payment',
            ])
            ->assertNotFound();
    }
}
