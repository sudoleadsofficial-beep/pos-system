<?php

namespace App\Http\Controllers\Merchants;

use App\Http\Controllers\Controller;
use App\Models\MerchantReceipt;
use App\Services\AmrozaService;
use Illuminate\Http\Request;

class MerchantReceiptController extends Controller
{
    /**
     * Edit an existing receipt.
     *
     * The receipt type is never changed here, so a Naqdi (same day cash)
     * receipt can never turn into a Wasooli (recovery) receipt, or the other
     * way round.
     */
    public function update(Request $request, int $receipt)
    {
        // Look the receipt up first: an unknown receipt must 404 whatever the
        // request body says.
        $existing = MerchantReceipt::findOrFail($receipt);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'merchant_id' => 'required|exists:merchants,id',
            'note' => 'nullable|string|max:255',
        ]);

        $previousMerchantId = (int) $existing->merchant_id;
        $newMerchantId = (int) $validated['merchant_id'];

        $existing->update([
            'amount' => $validated['amount'],
            'date' => $validated['date'],
            'merchant_id' => $newMerchantId,
            // Only overwrite the note when one was actually sent.
            'note' => array_key_exists('note', $validated) ? $validated['note'] : $existing->note,
        ]);

        // Refresh the balance of the merchant the receipt left and, when the
        // receipt moved, of the merchant it now belongs to.
        // AmrozaService stays the only owner of the merchant balance formula.
        app(AmrozaService::class)->recalculateMerchantBalance($previousMerchantId);

        if ($previousMerchantId !== $newMerchantId) {
            app(AmrozaService::class)->recalculateMerchantBalance($newMerchantId);
        }

        return back()->with('success', 'Receipt updated successfully.');
    }

    /**
     * Delete a receipt and refresh the merchant's balance.
     */
    public function destroy(int $receipt)
    {
        $existing = MerchantReceipt::findOrFail($receipt);
        $merchantId = (int) $existing->merchant_id;

        $existing->delete();

        app(AmrozaService::class)->recalculateMerchantBalance($merchantId);

        return back()->with('success', 'Receipt deleted successfully.');
    }
}
