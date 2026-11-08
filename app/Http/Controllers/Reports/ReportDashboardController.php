<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\AmrozaSale;
use App\Models\CommissionAgent;
use App\Models\Farmer;
use App\Models\FarmerPurchase;
use App\Models\FarmerSettlement;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use App\Models\SupplierPurchase;
use App\Services\CashBookService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportDashboardController extends Controller
{
    public function __construct(
        protected CashBookService $cashBookService,
    ) {}

    public function index(Request $request): Response
    {
        $preset = $request->query('preset', 'today');
        $today = date('Y-m-d');

        switch ($preset) {
            case 'yesterday':
                $from = Carbon::yesterday()->toDateString();
                $to = $from;
                break;
            case 'this_week':
                $from = Carbon::now()->startOfWeek()->toDateString();
                $to = Carbon::now()->endOfWeek()->toDateString();
                break;
            case 'this_month':
                $from = Carbon::now()->startOfMonth()->toDateString();
                $to = Carbon::now()->endOfMonth()->toDateString();
                break;
            case 'custom':
                $from = $request->query('from', $today);
                $to = $request->query('to', $today);
                break;
            case 'today':
            default:
                $preset = 'today';
                $from = $request->query('from', $today);
                $to = $request->query('to', $today);
                break;
        }

        // Arrivals (Farmer Purchases) in range
        $arrivalsQuery = FarmerPurchase::query()->whereBetween('date', [$from, $to]);
        $arrivalsStats = [
            'count' => (int) (clone $arrivalsQuery)->count(),
            'total_nag' => (float) (clone $arrivalsQuery)->sum('nag'),
            'total_weight' => (float) (clone $arrivalsQuery)->sum('weight'),
            'total_amount' => (float) (clone $arrivalsQuery)->sum('amount'),
            'unsettled_count' => (int) FarmerPurchase::where('is_settled', false)->count(),
        ];

        // Sales (Amroza) in range
        $salesQuery = AmrozaSale::query()->whereBetween('date', [$from, $to]);
        $salesStats = [
            'count' => (int) (clone $salesQuery)->count(),
            'total_nag' => (float) (clone $salesQuery)->sum('nag'),
            'total_amount' => (float) (clone $salesQuery)->sum('gross_amount'),
        ];

        // Cash Collections (Merchant Receipts) in range
        $receiptsQuery = MerchantReceipt::query()->whereBetween('date', [$from, $to]);
        $naqdiTotal = (float) (clone $receiptsQuery)->where('type', 'same_day_cash')->sum('amount');
        $wasooliTotal = (float) (clone $receiptsQuery)->where('type', '!=', 'same_day_cash')->sum('amount');
        $collectionsStats = [
            'naqdi' => $naqdiTotal,
            'wasooli' => $wasooliTotal,
            'total' => $naqdiTotal + $wasooliTotal,
        ];

        // Cash Book position
        $cashData = $this->cashBookService->getCashBook($from, $to);
        $cashStats = [
            'opening_balance' => $cashData['opening_balance'],
            'total_inflow' => $cashData['total_inflow'],
            'total_outflow' => $cashData['total_outflow'],
            'closing_balance' => $cashData['closing_balance'],
        ];

        // Supplier Purchases in range
        $supplierQuery = SupplierPurchase::query()->whereBetween('date', [$from, $to]);
        $supplierStats = [
            'count' => (int) (clone $supplierQuery)->count(),
            'total_amount' => (float) (clone $supplierQuery)->sum('total_amount'),
        ];

        // Summary entity counts
        $entityCounts = [
            'farmers' => Farmer::where('status', 'active')->count(),
            'merchants' => Merchant::where('status', 'active')->count(),
            'suppliers' => JkcSupplier::where('status', 'active')->count(),
            'commission_agents' => CommissionAgent::where('status', 'active')->count(),
        ];

        return Inertia::render('reports/index', [
            'filters' => [
                'preset' => $preset,
                'from' => $from,
                'to' => $to,
            ],
            'arrivalsStats' => $arrivalsStats,
            'salesStats' => $salesStats,
            'collectionsStats' => $collectionsStats,
            'cashStats' => $cashStats,
            'supplierStats' => $supplierStats,
            'entityCounts' => $entityCounts,
        ]);
    }
}
