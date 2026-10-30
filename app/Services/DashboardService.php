<?php

namespace App\Services;

use App\Models\AmrozaSale;
use App\Models\Merchant;
use App\Models\Farmer;
use App\Models\MerchantReceipt;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    public function __construct() {}

    public function getDashboardItems()
    {
        return [
            'stats' => $this->getDashboardStat(),
            'chartData' => $this->getSalesTrends(),
            'topItemsChart' => $this->getTopItemsDistribution(),
            'recentSales' => $this->getRecentSales(),
        ];
    }

    private function getDashboardStat()
    {
        $today = date('Y-m-d');

        // Today's sales from AmrozaSale
        $todaysSales = AmrozaSale::with('merchant')->where('date', $today)->get();
        $todaysSaleTotal = $todaysSales->sum('gross_amount');

        $cashSale = 0;
        $creditSale = 0;

        foreach ($todaysSales as $sale) {
            $isCash = $sale->payment_type === 'naqdi' || ($sale->merchant && (int)$sale->merchant->code === 1);
            if ($isCash) {
                $cashSale += $sale->gross_amount;
            } else {
                $creditSale += $sale->gross_amount;
            }
        }

        // Today's recoveries
        $received = MerchantReceipt::where('date', $today)->sum('amount');

        // Total merchant balance outstanding
        $merchantsBalance = Merchant::where('status', 'active')->sum('current_balance');

        // Total farmer balance outstanding
        $farmersBalance = Farmer::where('status', 'active')->sum('current_balance');

        // Estimated cash in hand: Today's cash sale + Today's recoveries
        $cashInHand = $cashSale + $received;

        return [
            'todaysSale' => round($todaysSaleTotal, 2),
            'cashSale' => round($cashSale, 2),
            'creditSale' => round($creditSale, 2),
            'received' => round($received, 2),
            'merchantsBalance' => round($merchantsBalance, 2),
            'cashInHand' => round($cashInHand, 2),
            'farmersBalance' => round($farmersBalance, 2),
        ];
    }

    /**
     * Get last 7 days sales trend for graph
     */
    private function getSalesTrends()
    {
        $startDate = date('Y-m-d', strtotime('-6 days'));
        $endDate = date('Y-m-d');

        $dailyStats = AmrozaSale::select(
            'date',
            DB::raw('SUM(gross_amount) as total_gross'),
            DB::raw('SUM(CASE WHEN payment_type = "naqdi" THEN gross_amount ELSE 0 END) as cash_gross'),
            DB::raw('SUM(CASE WHEN payment_type != "naqdi" THEN gross_amount ELSE 0 END) as credit_gross'),
            DB::raw('SUM(nag) as total_nag')
        )
        ->whereBetween('date', [$startDate, $endDate])
        ->groupBy('date')
        ->orderBy('date', 'asc')
        ->get()
        ->keyBy(function ($item) {
            return date('Y-m-d', strtotime($item->date));
        });

        $chart = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $displayDate = date('d M', strtotime($d));
            $stat = $dailyStats->get($d);

            $chart[] = [
                'date' => $displayDate,
                'fullDate' => $d,
                'total' => $stat ? round((float)$stat->total_gross, 2) : 0,
                'cash' => $stat ? round((float)$stat->cash_gross, 2) : 0,
                'credit' => $stat ? round((float)$stat->credit_gross, 2) : 0,
                'nag' => $stat ? (int)$stat->total_nag : 0,
            ];
        }

        return $chart;
    }

    /**
     * Top selling vegetables/items distribution
     */
    private function getTopItemsDistribution()
    {
        return AmrozaSale::with('item')
            ->select('item_id', DB::raw('SUM(gross_amount) as total_amount'), DB::raw('SUM(nag) as total_nag'))
            ->groupBy('item_id')
            ->orderByDesc('total_amount')
            ->limit(5)
            ->get()
            ->map(function ($row) {
                return [
                    'name_en' => $row->item->name_en ?? 'Item',
                    'name_ur' => $row->item->name_ur ?? 'آئٹم',
                    'amount' => round((float)$row->total_amount, 2),
                    'nag' => (int)$row->total_nag,
                ];
            });
    }

    /**
     * Recent sales transactions
     */
    private function getRecentSales()
    {
        return AmrozaSale::with(['merchant', 'item'])
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'date' => date('d M Y', strtotime($s->date)),
                    'merchant' => $s->merchant->name_ur ?? $s->merchant->name_en ?? 'Buyer',
                    'merchant_code' => $s->merchant->code ?? '-',
                    'item' => $s->item->name_ur ?? $s->item->name_en ?? 'Item',
                    'nag' => $s->nag,
                    'gross' => round((float)$s->gross_amount, 2),
                    'payment_type' => $s->payment_type ?? 'udhaar',
                ];
            });
    }
}
