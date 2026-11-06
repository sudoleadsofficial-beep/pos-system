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
        $totalReceipts = 0;
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

            // Every receipt for this merchant on this date - both kinds, every row.
            $receipts = MerchantReceipt::where('merchant_id', $merchant->id)
                ->where('date', $date)
                ->orderBy('id')
                ->get();

            $recoveryTotal = round((float) $receipts->where('type', 'recovery')->sum('amount'), 2);
            $sameDayCashTotal = round((float) $receipts->where('type', 'same_day_cash')->sum('amount'), 2);
            $receiptsTotal = round($recoveryTotal + $sameDayCashTotal, 2);

            // The "Wasooli" column keeps its meaning: recoveries only.
            $wasooli = $recoveryTotal;

            // Total Baqaya = Sabiqa + Amroza - every receipt of this date.
            // This is identical to Merchant::getBalanceOn($date): the merchant's
            // outstanding balance as at this date. Sabiqa already subtracted all
            // earlier receipts, so only this date's receipts are deducted here.
            $baqaya = round($sabiqa + $amroza - $receiptsTotal, 2);

            // If no search filter, show merchants that have a balance or activity
            // (or if code is not 1, or has activity)
            $hasActivity = (abs($sabiqa) > 0.001 || $amroza > 0 || $receiptsTotal > 0);

            if ($search || $hasActivity || (int) $merchant->code === 1) {
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
                    'same_day_cash' => $sameDayCashTotal,
                    'receipts_total' => $receiptsTotal,
                    'receipt_id' => $receipts->first()?->id,
                    'receipts' => $receipts->map(fn ($receipt) => [
                        'id' => $receipt->id,
                        'type' => $receipt->type,
                        'amount' => (float) $receipt->amount,
                        'note' => $receipt->note,
                    ])->values()->all(),
                    'total_baqaya' => $baqaya,
                ];

                $totalSabiqa += $sabiqa;
                $totalAmroza += $amroza;
                $totalWasooli += $wasooli;
                $totalReceipts += $receiptsTotal;
                $totalBaqaya += $baqaya;
            }
        }

        return [
            'rows' => $rows,
            'totals' => [
                'total_sabiqa' => round($totalSabiqa, 2),
                'total_amroza' => round($totalAmroza, 2),
                'total_wasooli' => round($totalWasooli, 2),
                'total_receipts' => round($totalReceipts, 2),
                'total_baqaya' => round($totalBaqaya, 2),
            ],
        ];
    }

    /**
     * Save a recovery receipt for a merchant on a date.
     *
     * Every payment is its own row: a merchant may pay more than once on the
     * same day and an earlier payment is never overwritten.
     */
    public function saveWasooliReceipt(int $merchantId, string $date, float $amount, ?string $note = null): MerchantReceipt
    {
        return DB::transaction(function () use ($merchantId, $date, $amount, $note) {
            $receipt = MerchantReceipt::create([
                'merchant_id' => $merchantId,
                'date' => $date,
                'type' => 'recovery',
                'amount' => $amount,
                'note' => $note,
                'created_by' => auth()->id(),
            ]);

            // Update merchant balance
            app(AmrozaService::class)->recalculateMerchantBalance($merchantId);

            return $receipt;
        });
    }
}
