<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PageController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}


    public function dashboard(Request $request)
    {
        $range = $request->query('range', 'today');
        $items = $this->dashboardService->getDashboardItems($range);
        return Inertia::render('dashboard/index', array_merge($items, [
            'activeRange' => $range,
        ]));
    }
}
