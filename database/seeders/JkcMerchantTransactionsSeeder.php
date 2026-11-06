<?php

namespace Database\Seeders;

use App\Models\AmrozaSale;
use App\Models\Item;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use Illuminate\Database\Seeder;

class JkcMerchantTransactionsSeeder extends Seeder
{
    public function run(): void
    {
        $today = date('Y-m-d');

        // Fetch seed merchants BY NAME, never by code: an existing merchant that
        // happens to hold one of these codes must not be mistaken for the
        // merchant this seeder means.
        $naqdi = Merchant::where('name_en', Merchant::NAQDI_NAME_EN)->first();
        $tariq = Merchant::where('name_en', 'Haji Tariq')->first();
        $ismail = Merchant::where('name_en', 'Ismail Bhai')->first();
        $aslam = Merchant::where('name_en', 'Aslam Sabzi Farosh')->first();
        $farhan = Merchant::where('name_en', 'Farhan Brothers')->first();

        // Fetch seed items
        $potato = Item::where('name_en', 'Potato')->first() ?? Item::first();
        $onion = Item::where('name_en', 'Onion')->first() ?? Item::first();
        $tomato = Item::where('name_en', 'Tomato')->first() ?? Item::first();

        // Check if sales already seeded
        if (AmrozaSale::count() === 0 && $naqdi && $tariq && $potato && $onion) {
            // 1. Cash sale (Merchant 1 Naqdi)
            // Sample test number: 137329 cash amount
            // Let's create:
            // Sale 1: Nag 100, Rate 1200 = 120,000 + Bardana 200 = 120,200
            // Sale 2: Weight 16, Rate 1069 = 17,104 + Bardana 25 = 17,129
            // Total cash gross: 137,329!
            AmrozaSale::create([
                'date' => $today,
                'merchant_id' => $naqdi->id,
                'item_id' => $potato->id,
                'nag' => 100,
                'weight' => 0,
                'rate' => 1200,
                'bardana' => 200,
            ]);

            AmrozaSale::create([
                'date' => $today,
                'merchant_id' => $naqdi->id,
                'item_id' => $onion->id,
                'nag' => 16,
                'weight' => 16,
                'rate' => 1069,
                'bardana' => 25,
            ]);

            // 2. Credit sales:
            // Haji Tariq: brief sample: Weight 20, Rate 1069 = 21,380!
            AmrozaSale::create([
                'date' => $today,
                'merchant_id' => $tariq->id,
                'item_id' => $onion->id,
                'nag' => 20,
                'weight' => 20,
                'rate' => 1069,
                'bardana' => 0,
            ]);

            // Ismail Bhai: Nag 5, Rate 1200 = 6,000
            if ($ismail) {
                AmrozaSale::create([
                    'date' => $today,
                    'merchant_id' => $ismail->id,
                    'item_id' => $potato->id,
                    'nag' => 5,
                    'weight' => 0,
                    'rate' => 1200,
                    'bardana' => 0,
                ]);
            }

            // Aslam Sabzi Farosh: Amroza 8,500 (part of brief example: 16100 + 8500 - 8000 = 16600)
            if ($aslam) {
                // Sabiqa will be opening_balance. Only set it when the
                // merchant has no opening balance yet, so an existing
                // merchant's own opening balance is never overwritten.
                if ((float) $aslam->opening_balance === 0.0) {
                    $aslam->update(['opening_balance' => 16100]);
                }

                AmrozaSale::create([
                    'date' => $today,
                    'merchant_id' => $aslam->id,
                    'item_id' => $tomato ? $tomato->id : $potato->id,
                    'nag' => 10,
                    'weight' => 0,
                    'rate' => 850,
                    'bardana' => 0,
                ]);

                // Recovery receipt of 8,000 for Aslam
                MerchantReceipt::create([
                    'date' => $today,
                    'merchant_id' => $aslam->id,
                    'amount' => 8000,
                    'type' => 'recovery',
                    'note' => 'Daily recovery',
                ]);
            }

            // Same day cash receipt for Naqdi
            MerchantReceipt::create([
                'date' => $today,
                'merchant_id' => $naqdi->id,
                'amount' => 137329,
                'type' => 'same_day_cash',
                'note' => 'Cash received',
            ]);
        }
    }
}
