<?php

namespace App\Http\Controllers\Merchants;

use App\Http\Controllers\Controller;
use App\Models\AmrozaSale;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MerchantReportController extends Controller
{
    /**
     * Merchant-wise Amroza Summary
     */
    public function merchantAmroza(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));

        $sales = AmrozaSale::with('merchant')
            ->where('date', $date)
            ->get();

        $byMerchant = [];
        $totalNag = 0;
        $totalGross = 0;

        foreach ($sales as $sale) {
            $mId = $sale->merchant_id;
            $mCode = $sale->merchant ? $sale->merchant->code : '-';
            $mName = $sale->merchant ? $sale->merchant->name : 'Unknown';

            if (!isset($byMerchant[$mId])) {
                $byMerchant[$mId] = [
                    'merchant_id' => $mId,
                    'code' => $mCode,
                    'name' => $mName,
                    'name_ur' => $sale->merchant ? $sale->merchant->name_ur : '',
                    'name_en' => $sale->merchant ? $sale->merchant->name_en : '',
                    'is_naqdi' => (int)$mCode === 1,
                    'total_nag' => 0,
                    'total_weight' => 0,
                    'total_gross' => 0,
                ];
            }

            $byMerchant[$mId]['total_nag'] += intval($sale->nag);
            $byMerchant[$mId]['total_weight'] += floatval($sale->weight);
            $byMerchant[$mId]['total_gross'] += floatval($sale->gross_amount);

            $totalNag += intval($sale->nag);
            $totalGross += floatval($sale->gross_amount);
        }

        // Sort by merchant code
        usort($byMerchant, fn($a, $b) => $a['code'] <=> $b['code']);

        return Inertia::render('merchants/reports/merchant-amroza', [
            'rows' => $byMerchant,
            'totals' => [
                'total_nag' => $totalNag,
                'total_gross' => round($totalGross, 2),
            ],
            'filters' => [
                'date' => $date,
            ],
        ]);
    }

    /**
     * Merchant-wise Wasooli Summary
     */
    public function merchantWasooli(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));

        $receipts = MerchantReceipt::with('merchant')
            ->where('date', $date)
            ->get();

        $rows = [];
        $totalWasooli = 0;

        foreach ($receipts as $receipt) {
            $amount = floatval($receipt->amount);
            $rows[] = [
                'id' => $receipt->id,
                'merchant_id' => $receipt->merchant_id,
                'code' => $receipt->merchant ? $receipt->merchant->code : '-',
                'name' => $receipt->merchant ? $receipt->merchant->name : 'Unknown',
                'name_ur' => $receipt->merchant ? $receipt->merchant->name_ur : '',
                'name_en' => $receipt->merchant ? $receipt->merchant->name_en : '',
                'amount' => $amount,
                'type' => $receipt->type,
                'note' => $receipt->note,
            ];
            $totalWasooli += $amount;
        }

        usort($rows, fn($a, $b) => $a['code'] <=> $b['code']);

        return Inertia::render('merchants/reports/merchant-wasooli', [
            'rows' => $rows,
            'totals' => [
                'total_wasooli' => round($totalWasooli, 2),
            ],
            'filters' => [
                'date' => $date,
            ],
        ]);
    }

    /**
     * Amroza Detail (Line-by-line sales)
     */
    public function amrozaDetail(Request $request)
    {
        $fromDate = $request->query('from_date', date('Y-m-d'));
        $toDate = $request->query('to_date', date('Y-m-d'));

        $sales = AmrozaSale::with(['merchant', 'item'])
            ->whereBetween('date', [$fromDate, $toDate])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $totalNag = 0;
        $totalWeight = 0;
        $totalGross = 0;

        $rows = $sales->map(function ($s) use (&$totalNag, &$totalWeight, &$totalGross) {
            $totalNag += intval($s->nag);
            $totalWeight += floatval($s->weight);
            $totalGross += floatval($s->gross_amount);

            return [
                'id' => $s->id,
                'date' => $s->date->format('Y-m-d'),
                'merchant_code' => $s->merchant ? $s->merchant->code : '-',
                'merchant_name_ur' => $s->merchant ? $s->merchant->name_ur : '',
                'merchant_name_en' => $s->merchant ? $s->merchant->name_en : '',
                'is_naqdi' => $s->merchant ? ((int)$s->merchant->code === 1) : false,
                'item_name_ur' => $s->item ? $s->item->name_ur : '',
                'item_name_en' => $s->item ? $s->item->name_en : '',
                'unit' => $s->item ? $s->item->unit : '',
                'nag' => $s->nag,
                'weight' => $s->weight,
                'rate' => $s->rate,
                'bardana' => $s->bardana,
                'gross_amount' => $s->gross_amount,
            ];
        });

        return Inertia::render('merchants/reports/amroza-detail', [
            'rows' => $rows,
            'totals' => [
                'total_nag' => $totalNag,
                'total_weight' => round($totalWeight, 2),
                'total_gross' => round($totalGross, 2),
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }

    /**
     * Wasooli Detail (Line-by-line recovery)
     */
    public function wasooliDetail(Request $request)
    {
        $fromDate = $request->query('from_date', date('Y-m-d'));
        $toDate = $request->query('to_date', date('Y-m-d'));

        $receipts = MerchantReceipt::with('merchant')
            ->whereBetween('date', [$fromDate, $toDate])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $totalAmount = 0;

        $rows = $receipts->map(function ($r) use (&$totalAmount) {
            $amount = floatval($r->amount);
            $totalAmount += $amount;

            return [
                'id' => $r->id,
                'date' => $r->date->format('Y-m-d'),
                'merchant_code' => $r->merchant ? $r->merchant->code : '-',
                'merchant_name_ur' => $r->merchant ? $r->merchant->name_ur : '',
                'merchant_name_en' => $r->merchant ? $r->merchant->name_en : '',
                'amount' => $amount,
                'type' => $r->type,
                'note' => $r->note,
            ];
        });

        return Inertia::render('merchants/reports/wasooli-detail', [
            'rows' => $rows,
            'totals' => [
                'total_amount' => round($totalAmount, 2),
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }

    /**
     * Amroza / Wasooli Combined Sheet (Section 9.3 & 10)
     * Shows Date, Sabiqa, Amroza, Wasooli, Baqaya
     */
    public function amrozaWasooli(Request $request)
    {
        $fromDate = $request->query('from_date', date('Y-m-d', strtotime('-6 days')));
        $toDate = $request->query('to_date', date('Y-m-d'));

        // Generate list of dates between fromDate and toDate
        $period = new \DatePeriod(
            new \DateTime($fromDate),
            new \DateInterval('P1D'),
            (new \DateTime($toDate))->modify('+1 day')
        );

        $rows = [];
        $totalSabiqa = 0;
        $totalAmroza = 0;
        $totalWasooli = 0;
        $totalBaqaya = 0;

        $merchants = Merchant::all();
        $totalOpening = $merchants->sum('opening_balance');

        foreach ($period as $dt) {
            $dateStr = $dt->format('Y-m-d');

            // Prior sales and receipts before this date across all merchants
            $priorSales = AmrozaSale::where('date', '<', $dateStr)->sum('gross_amount');
            $priorReceipts = MerchantReceipt::where('date', '<', $dateStr)->sum('amount');
            $sabiqa = round($totalOpening + $priorSales - $priorReceipts, 2);

            // Day sales (Amroza)
            $amroza = round(AmrozaSale::where('date', $dateStr)->sum('gross_amount'), 2);

            // Day receipts (Wasooli)
            $wasooli = round(MerchantReceipt::where('date', $dateStr)->where('type', 'recovery')->sum('amount'), 2);

            // Total Baqaya = Sabiqa + Amroza - Wasooli
            $baqaya = round($sabiqa + $amroza - $wasooli, 2);

            $rows[] = [
                'date' => $dateStr,
                'sabiqa' => $sabiqa,
                'amroza' => $amroza,
                'wasooli' => $wasooli,
                'baqaya' => $baqaya,
            ];

            $totalSabiqa += $sabiqa;
            $totalAmroza += $amroza;
            $totalWasooli += $wasooli;
            $totalBaqaya += $baqaya;
        }

        return Inertia::render('merchants/reports/amroza-wasooli', [
            'rows' => $rows,
            'totals' => [
                'total_sabiqa' => round($totalSabiqa, 2),
                'total_amroza' => round($totalAmroza, 2),
                'total_wasooli' => round($totalWasooli, 2),
                'total_baqaya' => round($totalBaqaya, 2),
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }
}
