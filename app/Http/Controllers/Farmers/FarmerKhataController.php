<?php

namespace App\Http\Controllers\Farmers;

use App\Http\Controllers\Controller;
use App\Models\Farmer;
use App\Models\FarmerBill;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FarmerKhataController extends Controller
{
    public function index(Request $request)
    {
        $farmers = Farmer::where('status', 'active')
            ->with(['marks' => function ($q) {
                $q->orderBy('code', 'asc');
            }])
            ->select('id', 'code', 'name_en', 'name_ur', 'current_balance', 'opening_balance')
            ->orderBy('code', 'asc')
            ->get();

        $selectedFarmerId = $request->query('farmer_id');
        if (!$selectedFarmerId && $farmers->isNotEmpty()) {
            $selectedFarmerId = $farmers->first()->id;
        }

        $fromDate = $request->query('from_date', date('Y-m-d'));
        $toDate = $request->query('to_date', date('Y-m-d'));

        $selectedFarmer = $farmers->firstWhere('id', (int) $selectedFarmerId);

        $marksData = [];
        $totalNag = 0;
        $totalJama = 0;
        $totalBanam = 0;

        if ($selectedFarmer) {
            $bills = FarmerBill::where('farmer_id', $selectedFarmer->id)
                ->whereBetween('date', [$fromDate, $toDate])
                ->get();

            foreach ($selectedFarmer->marks as $mark) {
                $markBills = $bills->where('farmer_mark_id', $mark->id);
                $nag = (int) $markBills->sum('nag');
                $jama = (float) $markBills->sum('net_amount');
                
                // If Khud (code 0) and current_balance exists with no separate banam table,
                // reflect opening balance / debits if applicable
                $banam = 0;
                if ((int)$mark->code === 0 && $selectedFarmer->opening_balance > 0) {
                    $banam = (float) $selectedFarmer->opening_balance;
                }

                $marksData[] = [
                    'mark_id' => $mark->id,
                    'name_en' => $mark->name_en ?: 'Khud',
                    'name_ur' => $mark->name_ur ?: 'خود',
                    'nag'     => $nag,
                    'jama'    => $jama,
                    'banam'   => $banam,
                ];

                $totalNag += $nag;
                $totalJama += $jama;
                $totalBanam += $banam;
            }
        }

        $baqaya = $totalJama - $totalBanam;

        return Inertia::render('farmers/khata/index', [
            'farmers' => $farmers,
            'selectedFarmerId' => (int) $selectedFarmerId,
            'selectedFarmer' => $selectedFarmer,
            'marksData' => $marksData,
            'summary' => [
                'baqaya' => round($baqaya, 2),
                'total_nag' => $totalNag,
                'total_jama' => round($totalJama, 2),
                'total_banam' => round($totalBanam, 2),
            ],
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }
}
