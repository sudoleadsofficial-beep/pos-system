<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login_from_reports(): void
    {
        $response = $this->get('/reports');
        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_access_reports_dashboard(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/reports');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('reports/index')
            ->has('filters')
            ->has('arrivalsStats')
            ->has('salesStats')
            ->has('collectionsStats')
            ->has('cashStats')
            ->has('supplierStats')
            ->has('entityCounts')
        );
    }

    public function test_reports_supports_date_presets(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/reports?preset=this_month');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('reports/index')
            ->where('filters.preset', 'this_month')
        );
    }
}
