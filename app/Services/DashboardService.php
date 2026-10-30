<?php

namespace App\Services;

use App\Models\Customer;

class DashboardService
{
    public function __construct() {}

    public function getDashboardItems()
    {
        return [
            'stats' => $this->getDashboardStat()
        ];
    }

    private function getDashboardStat()
    {
        return [
            'todaysSale' => 0,
            'cashSale' => 0,
            'creditSale' => 0,
            'received' => 0,
            'merchantsBalance' => 0,
            'cashInHand' => 0,
            'farmersBalance' => 0,
            'activeCustomers' => Customer::query()->where('status', 'active')->count(),
        ];
    }
}
