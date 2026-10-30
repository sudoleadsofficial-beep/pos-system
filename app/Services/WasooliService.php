<?php

namespace App\Services;

use App\Models\AmrozaSale;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use Illuminate\Support\Facades\DB;

class WasooliService
{
    /**
     * Get Wasooli recovery sheet for a date
     * One row per merchant with balance or activity
     */
    public function getWasooliSheet(string $date, ?string $search = null): array
    {
        $query = Merchant::where('status', 'active');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name_ur', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $allMerchants = $query->orderBy('code', 'asc')->get();

        $rows = [];
        $totalSabiqa = 0;
        $totalAmroza = 0;
        $totalWasooli = 0;
        $totalBaqaya = 0;

        foreach ($allMerchants as $merchant) {
            // Sabiqa: previous balance before this date
            $sabiqa = $merchant->getSabiqaBalance($date);

            // Amroza: today's sales on this date
            $amroza = round(
                AmrozaSale::where('merchant_id', $merchant->id)
                    ->where('date', $date)
                    ->sum('gross_amount'),
                2
            );

            // Wasooli: recovery payment on this date
            $receipt = MerchantReceipt::where('merchant_id', $merchant->id)
                ->where('date', $date)
                ->where('type', 'recovery')
                ->first();

            $wasooli = $receipt ? floatval($receipt->amount) : 0;

            // Total Baqaya = Sabiqa + Amroza - Wasooli
            // Example: 16100 + 8500 - 8000 = 16600
            $baqaya = round($sabiqa + $amroza - $wasooli, 2);

            // If no search filter, show merchants that have a balance or activity
            // (or if code is not 1, or has activity)
            $hasActivity = (abs($sabiqa) > 0.001 || $amroza > 0 || $wasooli > 0);

            if ($search || $hasActivity || (int)$merchant->code === 1) {
                $rows[] = [
                    'merchant_id' => $merchant->id,
                    'code' => $merchant->code,
                    'name' => $merchant->name,
                    'name_ur' => $merchant->name_ur,
                    'name_en' => $merchant->name_en,
                    'phone' => $merchant->phone,
                    'sabiqa' => $sabiqa,
                    'amroza' => $amroza,
                    'wasooli' => $wasooli,
                    'receipt_id' => $receipt ? $receipt->id : null,
                    'total_baqaya' => $baqaya,
                ];

                $totalSabiqa += $sabiqa;
                $totalAmroza += $amroza;
                $totalWasooli += $wasooli;
                $totalBaqaya += $baqaya;
            }
        }

        return [
            'rows' => $rows,
            'totals' => [
                'total_sabiqa' => round($totalSabiqa, 2),
                'total_amroza' => round($totalAmroza, 2),
                'total_wasooli' => round($totalWasooli, 2),
                'total_baqaya' => round($totalBaqaya, 2),
            ],
        ];
    }

    /**
     * Save/update Wasooli recovery receipt
     */
    public function saveWasooliReceipt(int $merchantId, string $date, float $amount, ?string $note = null): MerchantReceipt
    {
        return DB::transaction(function () use ($merchantId, $date, $amount, $note) {
            $receipt = MerchantReceipt::updateOrCreate(
                [
                    'merchant_id' => $merchantId,
                    'date' => $date,
                    'type' => 'recovery',
                ],
                [
                    'amount' => $amount,
                    'note' => $note,
                    'created_by' => auth()->id(),
                ]
            );

            // Update merchant balance
            app(AmrozaService::class)->recalculateMerchantBalance($merchantId);

            return $receipt;
        });
    }
}
