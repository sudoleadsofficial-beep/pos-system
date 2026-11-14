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

    public function getDashboardItems(string $range = 'today')
    {
        $dates = $this->resolveDateRange($range);

        return [
            'range' => $range,
            'rangeLabels' => $dates['labels'],
            'stats' => $this->getDashboardStat($dates),
            'chartData' => $this->getSalesTrends(),
            'chartSummary' => $this->getSalesTrendsSummary(),
            'topMerchants' => $this->getTopOutstandingMerchants(),
            'topItemsChart' => $this->getTopItemsDistribution(),
            'recentSales' => $this->getRecentSales($dates),
            'alerts' => $this->getNeedsAttention(),
        ];
    }

    private function resolveDateRange(string $range): array
    {
        $today = date('Y-m-d');

        switch ($range) {
            case 'yesterday':
                $start = date('Y-m-d', strtotime('-1 day'));
                $end = $start;
                $prevStart = date('Y-m-d', strtotime('-2 days'));
                $prevEnd = $prevStart;
                $labels = [
                    'saleTitle' => 'Yesterday’s sale',
                    'saleTitleUr' => 'کل کی سیل',
                    'cashReceivedSub' => 'of yesterday’s sale',
                    'cashReceivedSubUr' => 'کل کی کل سیل کا',
                    'recoveryTitle' => 'Yesterday’s recovery',
                    'recoveryTitleUr' => 'کل کی وصولی',
                    'compText' => 'vs day before',
                    'compTextUr' => 'پچھلے دن کے مقابلے',
                ];
                break;

            case 'week':
                $start = date('Y-m-d', strtotime('-6 days'));
                $end = $today;
                $prevStart = date('Y-m-d', strtotime('-13 days'));
                $prevEnd = date('Y-m-d', strtotime('-7 days'));
                $labels = [
                    'saleTitle' => 'This week’s sale',
                    'saleTitleUr' => 'اس ہفتے کی سیل',
                    'cashReceivedSub' => 'of this week’s sale',
                    'cashReceivedSubUr' => 'اس ہفتے کی کل سیل کا',
                    'recoveryTitle' => 'Recovery this week',
                    'recoveryTitleUr' => 'اس ہفتے کی وصولی',
                    'compText' => 'vs last week',
                    'compTextUr' => 'پچھلے ہفتے کے مقابلے',
                ];
                break;

            case 'month':
                $start = date('Y-m-d', strtotime('-29 days'));
                $end = $today;
                $prevStart = date('Y-m-d', strtotime('-59 days'));
                $prevEnd = date('Y-m-d', strtotime('-30 days'));
                $labels = [
                    'saleTitle' => 'This month’s sale',
                    'saleTitleUr' => 'اس مہینے کی سیل',
                    'cashReceivedSub' => 'of this month’s sale',
                    'cashReceivedSubUr' => 'اس مہینے کی کل سیل کا',
                    'recoveryTitle' => 'Recovery this month',
                    'recoveryTitleUr' => 'اس مہینے کی وصولی',
                    'compText' => 'vs last month',
                    'compTextUr' => 'پچھلے مہینے کے مقابلے',
                ];
                break;

            case 'today':
            default:
                $start = $today;
                $end = $today;
                $prevStart = date('Y-m-d', strtotime('-1 day'));
                $prevEnd = $prevStart;
                $labels = [
                    'saleTitle' => 'Today’s sale',
                    'saleTitleUr' => 'آج کی سیل',
                    'cashReceivedSub' => 'of today’s sale',
                    'cashReceivedSubUr' => 'آج کی کل سیل کا',
                    'recoveryTitle' => 'Recovery today',
                    'recoveryTitleUr' => 'آج کی وصولی',
                    'compText' => 'vs yesterday',
                    'compTextUr' => 'پچھلے دن کے مقابلے',
                ];
                break;
        }

        return [
            'start' => $start,
            'end' => $end,
            'prevStart' => $prevStart,
            'prevEnd' => $prevEnd,
            'labels' => $labels,
        ];
    }

    private function getDashboardStat(array $dates): array
    {
        $sales = AmrozaSale::with('merchant')
            ->whereBetween('date', [$dates['start'], $dates['end']])
            ->get();

        $saleTotal = (float)$sales->sum('gross_amount');

        $prevSaleTotal = (float)AmrozaSale::whereBetween('date', [$dates['prevStart'], $dates['prevEnd']])
            ->sum('gross_amount');

        $saleChangePct = $prevSaleTotal > 0
            ? round((($saleTotal - $prevSaleTotal) / $prevSaleTotal) * 100, 1)
            : ($saleTotal > 0 ? 100 : 0);

        $cashSale = 0;
        $creditSale = 0;
        $totalNag = 0;

        foreach ($sales as $sale) {
            $isCash = $sale->payment_type === 'naqdi' || ($sale->merchant && (int)$sale->merchant->code === 1);
            if ($isCash) {
                $cashSale += (float)$sale->gross_amount;
            } else {
                $creditSale += (float)$sale->gross_amount;
            }
            $totalNag += (int)$sale->nag;
        }

        // Recoveries in this range
        $received = (float)MerchantReceipt::whereBetween('date', [$dates['start'], $dates['end']])
            ->where('type', 'recovery')
            ->sum('amount');

        $recoveryMerchantsCount = MerchantReceipt::whereBetween('date', [$dates['start'], $dates['end']])
            ->where('type', 'recovery')
            ->distinct('merchant_id')
            ->count('merchant_id');

        // Total active merchant balance outstanding across system
        $merchantsBalance = (float)Merchant::where('status', 'active')->sum('current_balance');

        // Total farmer balance outstanding
        $farmersBalance = (float)Farmer::where('status', 'active')->sum('current_balance');

        $cashInHand = $cashSale + $received;
        $cashPct = $saleTotal > 0 ? round(($cashSale / $saleTotal) * 100) : 0;

        return [
            'todaysSale' => round($saleTotal, 2),
            'saleChangePct' => $saleChangePct,
            'cashSale' => round($cashSale, 2),
            'creditSale' => round($creditSale, 2),
            'cashReceived' => round($cashSale, 2),
            'cashPct' => $cashPct,
            'received' => round($received, 2),
            'recoveryMerchantsCount' => $recoveryMerchantsCount,
            'merchantsBalance' => round($merchantsBalance, 2),
            'farmersBalance' => round($farmersBalance, 2),
            'cashInHand' => round($cashInHand, 2),
            'expectedCash' => round($cashInHand, 2),
            'cashDiff' => 0,
            'billsToday' => $sales->count(),
            'totalNagSold' => $totalNag,
            'weekChange' => round($merchantsBalance > 0 ? $merchantsBalance * 0.18 : 0, 0),
        ];
    }

    /**
     * Get last 7 days sales trend for graph from actual database records
     */
    private function getSalesTrends(): array
    {
        $startDate = date('Y-m-d', strtotime('-6 days'));
        $endDate = date('Y-m-d');

        $dailyStats = AmrozaSale::select(
            'date',
            DB::raw('SUM(gross_amount) as total_gross'),
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
        $maxVal = 1;
        for ($i = 6; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $stat = $dailyStats->get($d);
            $tot = $stat ? round((float)$stat->total_gross, 2) : 0;
            if ($tot > $maxVal) $maxVal = $tot;
        }

        for ($i = 6; $i >= 0; $i--) {
            $d = date('Y-m-d', strtotime("-{$i} days"));
            $dayName = date('D', strtotime($d));
            $stat = $dailyStats->get($d);
            $total = $stat ? round((float)$stat->total_gross, 2) : 0;

            $chart[] = [
                'day' => $dayName,
                'val' => round($total / 1000, 1),
                'amount' => $total,
                'isToday' => ($i === 0),
                'heightPct' => $maxVal > 0 ? max(round(($total / $maxVal) * 88), $total > 0 ? 10 : 4) : 4,
            ];
        }

        return $chart;
    }

    /**
     * Calculate summary of actual DB sales over the last 7 days
     */
    private function getSalesTrendsSummary(): array
    {
        $startDate = date('Y-m-d', strtotime('-6 days'));
        $endDate = date('Y-m-d');

        $sevenDaysSales = AmrozaSale::whereBetween('date', [$startDate, $endDate])->get();
        $total = (float)$sevenDaysSales->sum('gross_amount');
        $average = round($total / 7, 2);

        // Find day with highest sales
        $bestDayStat = AmrozaSale::select('date', DB::raw('SUM(gross_amount) as total_gross'))
            ->whereBetween('date', [$startDate, $endDate])
            ->groupBy('date')
            ->orderByDesc('total_gross')
            ->first();

        $bestDay = $bestDayStat && $bestDayStat->total_gross > 0
            ? date('l', strtotime($bestDayStat->date))
            : '—';

        return [
            'total' => round($total, 2),
            'average' => $average,
            'bestDay' => $bestDay,
        ];
    }

    private function getTopOutstandingMerchants(): array
    {
        $merchants = Merchant::where('status', 'active')
            ->where('current_balance', '>', 0)
            ->orderByDesc('current_balance')
            ->limit(5)
            ->get();

        if ($merchants->isEmpty()) {
            return [];
        }

        return $merchants->map(function ($m) {
            return [
                'name' => $m->name_ur ?: ($m->name_en ?: $m->name),
                'code' => 'Code ' . $m->code,
                'balance' => round((float)$m->current_balance, 2),
            ];
        })->toArray();
    }

    private function getNeedsAttention(): array
    {
        $alerts = [];

        // Check top debtor merchant
        $topDebtor = Merchant::where('status', 'active')
            ->where('current_balance', '>', 50000)
            ->orderByDesc('current_balance')
            ->first();

        if ($topDebtor) {
            $name = $topDebtor->name_ur ?: ($topDebtor->name_en ?: 'Merchant');
            $alerts[] = [
                'title' => "{$name} ka baqaya Rs. " . number_format($topDebtor->current_balance) . " se zyada hai",
                'subtitle' => 'Pichli wasooli ka jaiza lein',
                'type' => 'warn',
            ];
        }

        // Farmer bills count check
        $farmersWithCredit = Farmer::where('status', 'active')
            ->where('current_balance', '>', 0)
            ->count();

        if ($farmersWithCredit > 0) {
            $alerts[] = [
                'title' => "{$farmersWithCredit} kisano ka hisaab baqi hai",
                'subtitle' => 'Bijak aur fard hisaab check karein',
                'type' => 'warn',
            ];
        }

        if (empty($alerts)) {
            $alerts[] = [
                'title' => 'Tamam accounts normal hain',
                'subtitle' => 'Koi fori tavajjah talab issue nahi hai',
                'type' => 'info',
            ];
        }

        return $alerts;
    }

    private function getTopItemsDistribution(): array
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
            })->toArray();
    }

    private function getRecentSales(array $dates): array
    {
        $sales = AmrozaSale::with(['merchant', 'item'])
            ->whereBetween('date', [$dates['start'], $dates['end']])
            ->orderBy('id', 'desc')
            ->limit(5)
            ->get();

        // If no sales in range, fallback to latest overall entries
        if ($sales->isEmpty()) {
            $sales = AmrozaSale::with(['merchant', 'item'])
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get();
        }

        return $sales->map(function ($s) {
            $isCash = $s->payment_type === 'naqdi' || ($s->merchant && (int)$s->merchant->code === 1);
            return [
                'id' => $s->id,
                'time' => date('h:i A', strtotime($s->created_at ?? $s->date)),
                'type' => $isCash ? 'Cash sale' : 'Sale',
                'isCash' => $isCash,
                'party' => $s->merchant->name_ur ?: ($s->merchant->name_en ?: 'Buyer'),
                'item' => $s->item->name_ur ?: ($s->item->name_en ?: 'Item'),
                'nag' => $s->nag,
                'amount' => round((float)$s->gross_amount, 2),
            ];
        })->toArray();
    }
}
