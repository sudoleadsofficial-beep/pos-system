<?php

namespace App\Services;

use App\Models\AmrozaSale;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use Illuminate\Support\Facades\DB;

class NaqdiService
{
    /**
     * Get Naqdi sheet for a date
     * One row per merchant who had sales or cash transactions on that date
     */
    public function getNaqdiSheet(string $date): array
    {
        // Find all merchants with sales on this date or cash receipts on this date
        $merchantIdsFromSales = AmrozaSale::where('date', $date)->pluck('merchant_id')->toArray();
        $merchantIdsFromReceipts = MerchantReceipt::where('date', $date)
            ->where('type', 'same_day_cash')
            ->pluck('merchant_id')
            ->toArray();

        // Always include merchant 1 (Naqdi) if active
        $naqdiMerchant = Merchant::where('code', 1)->first();
        if ($naqdiMerchant) {
            $merchantIdsFromSales[] = $naqdiMerchant->id;
        }

        $allMerchantIds = array_unique(array_merge($merchantIdsFromSales, $merchantIdsFromReceipts));

        $merchants = Merchant::whereIn('id', $allMerchantIds)
            ->orderBy('code', 'asc')
            ->get();

        $rows = [];
        $totalNag = 0;
        $totalKhamBikri = 0;
        $totalCashReceived = 0;
        $totalBaqaya = 0;

        foreach ($merchants as $merchant) {
            $sales = AmrozaSale::where('date', $date)
                ->where('merchant_id', $merchant->id)
                ->get();

            $nag = $sales->sum('nag');
            $khamBikri = round($sales->sum('gross_amount'), 2);

            $receipt = MerchantReceipt::where('date', $date)
                ->where('merchant_id', $merchant->id)
                ->where('type', 'same_day_cash')
                ->first();

            $cashReceived = $receipt ? floatval($receipt->amount) : 0;
            $baqaya = round($khamBikri - $cashReceived, 2);

            $rows[] = [
                'merchant_id' => $merchant->id,
                'code' => $merchant->code,
                'name' => $merchant->name,
                'name_ur' => $merchant->name_ur,
                'name_en' => $merchant->name_en,
                'total_nag' => $nag,
                'kham_bikri' => $khamBikri,
                'naqdi_wasooli' => $cashReceived,
                'receipt_id' => $receipt ? $receipt->id : null,
                'total_baqaya' => $baqaya,
            ];

            $totalNag += $nag;
            $totalKhamBikri += $khamBikri;
            $totalCashReceived += $cashReceived;
            $totalBaqaya += $baqaya;
        }

        return [
            'rows' => $rows,
            'totals' => [
                'total_nag' => $totalNag,
                'total_kham_bikri' => round($totalKhamBikri, 2),
                'total_cash_received' => round($totalCashReceived, 2),
                'total_baqaya' => round($totalBaqaya, 2),
            ],
        ];
    }

    /**
     * Save/update cash receipt for a merchant on date
     */
    public function saveNaqdiReceipt(int $merchantId, string $date, float $amount): MerchantReceipt
    {
        return DB::transaction(function () use ($merchantId, $date, $amount) {
            $receipt = MerchantReceipt::updateOrCreate(
                [
                    'merchant_id' => $merchantId,
                    'date' => $date,
                    'type' => 'same_day_cash',
                ],
                [
                    'amount' => $amount,
                    'created_by' => auth()->id(),
                ]
            );

            // Update merchant balance
            app(AmrozaService::class)->recalculateMerchantBalance($merchantId);

            return $receipt;
        });
    }
}
