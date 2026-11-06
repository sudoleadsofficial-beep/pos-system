<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\CommissionAgent;
use App\Models\Farmer;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PartyManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function makeArea(): Area
    {
        return Area::create(['name_en' => 'Malir', 'name_ur' => 'ملیر']);
    }

    protected function makeAllParties(): void
    {
        $area = $this->makeArea();

        Farmer::create([
            'code' => 101,
            'name_en' => 'Wadera Ali',
            'name_ur' => 'وڈیرہ علی',
            'phone' => '0300-1111111',
            'area_id' => $area->id,
            'opening_balance' => 5000,
        ]);

        Merchant::create([
            'code' => 2,
            'name_en' => 'Baloch Trading',
            'name_ur' => 'بلوچ ٹریڈنگ',
            'opening_balance' => 1000,
        ]);

        JkcSupplier::create([
            'code' => 1,
            'name_en' => 'Fresh Farm',
            'name_ur' => 'تازہ فارم',
            'area_id' => $area->id,
            'opening_balance' => 250,
        ]);

        CommissionAgent::create([
            'code' => 1,
            'name_en' => 'Haji Gul',
            'name_ur' => 'حاجی گل',
            'opening_balance' => 750,
        ]);
    }

    public function test_guests_are_redirected_from_the_party_list()
    {
        $this->get('/parties')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_view_the_party_list()
    {
        $this->actingAs(User::factory()->create())
            ->get('/parties')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('parties/index')
                ->where('parties.total', 0)
                ->has('types', 4)
            );
    }

    public function test_party_list_contains_all_four_party_types()
    {
        $this->makeAllParties();

        $this->actingAs(User::factory()->create())
            ->get('/parties')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('parties/index')
                ->where('parties.total', 4)
                ->has('parties.data', 4)
                ->where('parties.data.0.type', 'farmer')
                ->where('parties.data.1.type', 'supplier')
                ->where('parties.data.2.type', 'buyer')
                ->where('parties.data.3.type', 'commission_agent')
            );
    }

    public function test_party_list_can_be_searched_by_code_and_both_names()
    {
        $this->makeAllParties();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/parties?search=101')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('parties.total', 1)
                ->where('parties.data.0.name_en', 'Wadera Ali')
            );

        $this->actingAs($user)
            ->get('/parties?search='.urlencode('وڈیرہ'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('parties.total', 1)
                ->where('parties.data.0.code', 101)
            );

        $this->actingAs($user)
            ->get('/parties?search=Baloch')
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('parties.total', 1)
                ->where('parties.data.0.type', 'buyer')
            );
    }

    public function test_party_list_can_be_filtered_by_type()
    {
        $this->makeAllParties();

        $this->actingAs(User::factory()->create())
            ->get('/parties?type=supplier')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('parties.total', 1)
                ->where('parties.data.0.type', 'supplier')
                ->where('filters.type', 'supplier')
            );
    }

    public function test_party_ledger_page_renders_for_every_party_type()
    {
        $this->makeAllParties();
        $user = User::factory()->create();

        $parties = [
            ['farmer', Farmer::first()->id],
            ['supplier', JkcSupplier::first()->id],
            ['buyer', Merchant::first()->id],
            ['commission_agent', CommissionAgent::first()->id],
        ];

        foreach ($parties as [$type, $id]) {
            $this->actingAs($user)
                ->get("/parties/{$type}/{$id}")
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('parties/ledger')
                    ->where('party.type', $type)
                    ->where('party.id', $id)
                    ->has('ledger.entries')
                    ->has('ledger.totals')
                );
        }
    }

    public function test_buyer_ledger_is_read_only()
    {
        $this->makeAllParties();

        $this->actingAs(User::factory()->create())
            ->get('/parties/buyer/'.Merchant::first()->id)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('can_write', false));
    }

    public function test_farmer_ledger_is_writable()
    {
        $this->makeAllParties();

        $this->actingAs(User::factory()->create())
            ->get('/parties/farmer/'.Farmer::first()->id)
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('can_write', true));
    }

    public function test_unknown_party_type_or_id_returns_404()
    {
        $this->makeAllParties();
        $user = User::factory()->create();

        $this->actingAs($user)->get('/parties/alien/1')->assertNotFound();
        $this->actingAs($user)->get('/parties/farmer/999999')->assertNotFound();
    }

    public function test_jkc_supplier_can_be_created_updated_and_deleted()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/masters/suppliers', [
                'name_ur' => 'تازہ فارم',
                'name_en' => 'Fresh Farm',
                'phone' => '0301-2222222',
                'opening_balance' => 1500,
            ])
            ->assertRedirect();

        $supplier = JkcSupplier::first();

        $this->assertSame('تازہ فارم', $supplier->name_ur);
        $this->assertSame(1, $supplier->code);
        $this->assertSame(1500.0, (float) $supplier->current_balance);

        $this->actingAs($user)
            ->put("/masters/suppliers/{$supplier->id}", [
                'code' => $supplier->code,
                'name_ur' => 'تازہ فارم 2',
                'name_en' => 'Fresh Farm 2',
                'status' => 'active',
            ])
            ->assertRedirect();

        $this->assertSame('تازہ فارم 2', $supplier->fresh()->name_ur);

        $this->actingAs($user)
            ->delete("/masters/suppliers/{$supplier->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('jkc_suppliers', ['id' => $supplier->id]);
    }

    public function test_supplier_requires_at_least_one_name()
    {
        $this->actingAs(User::factory()->create())
            ->post('/masters/suppliers', ['phone' => '0300-0000000'])
            ->assertSessionHasErrors('name_ur');
    }

    public function test_commission_agent_can_be_created_updated_and_deleted()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post('/masters/commission-agents', [
                'name_ur' => 'حاجی گل',
                'name_en' => 'Haji Gul',
                'phone' => '0302-3333333',
                'opening_balance' => 750,
                'commission_percent' => 5.5,
            ])
            ->assertRedirect();

        $agent = CommissionAgent::first();

        $this->assertSame('حاجی گل', $agent->name_ur);
        $this->assertSame(1, $agent->code);
        $this->assertSame(750.0, (float) $agent->current_balance);
        $this->assertSame(5.5, (float) $agent->commission_percent);

        $this->actingAs($user)
            ->put("/masters/commission-agents/{$agent->id}", [
                'code' => $agent->code,
                'name_ur' => 'حاجی گل 2',
                'name_en' => 'Haji Gul 2',
                'commission_percent' => 6,
                'status' => 'inactive',
            ])
            ->assertRedirect();

        $this->assertSame('حاجی گل 2', $agent->fresh()->name_ur);
        $this->assertSame('inactive', $agent->fresh()->status);

        $this->actingAs($user)
            ->delete("/masters/commission-agents/{$agent->id}")
            ->assertRedirect();

        $this->assertSoftDeleted('commission_agents', ['id' => $agent->id]);
    }

    public function test_commission_agent_requires_at_least_one_name()
    {
        $this->actingAs(User::factory()->create())
            ->post('/masters/commission-agents', ['phone' => '0300-0000000'])
            ->assertSessionHasErrors('name_ur');
    }

    public function test_new_master_screens_render()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/masters/suppliers')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('masters/suppliers/index'));

        $this->actingAs($user)
            ->get('/masters/commission-agents')
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('masters/commission-agents/index'));
    }

    public function test_existing_master_screens_are_unaffected()
    {
        $user = User::factory()->create();

        foreach (['/masters/farmers', '/masters/merchants', '/masters/marks', '/masters/areas', '/masters/items'] as $url) {
            $this->actingAs($user)->get($url)->assertOk();
        }
    }

    public function test_legacy_supplier_routes_are_not_replaced()
    {
        // The legacy POS suppliers table/routes stay behind the feature flag.
        $this->assertTrue(Route::has('masters.suppliers.index'));
        $this->assertFalse(Route::has('suppliers.index'));
    }

    public function test_amroza_naqdi_and_wasooli_routes_are_untouched()
    {
        $this->assertTrue(Route::has('amroza.index'));
        $this->assertTrue(Route::has('naqdi.index'));
        $this->assertTrue(Route::has('wasooli.index'));

        $this->assertSame(
            \App\Http\Controllers\Merchants\AmrozaController::class,
            explode('@', Route::getRoutes()->getByName('amroza.index')->getActionName())[0]
        );
        $this->assertSame(
            \App\Http\Controllers\Merchants\NaqdiController::class,
            explode('@', Route::getRoutes()->getByName('naqdi.index')->getActionName())[0]
        );
        $this->assertSame(
            \App\Http\Controllers\Merchants\WasooliController::class,
            explode('@', Route::getRoutes()->getByName('wasooli.index')->getActionName())[0]
        );
    }

    public function test_naqdi_and_wasooli_screens_still_render()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/naqdi')->assertOk();
        $this->actingAs($user)->get('/wasooli')->assertOk();
    }
}
