<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Farmer;
use App\Models\Item;
use App\Models\Merchant;
use Illuminate\Database\Seeder;

class JkcMastersSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Merchant Code 1 (Naqdi Cash Customer - Protected System Record)
        Merchant::firstOrCreate(
            ['code' => 1],
            [
                'name_en' => 'Naqdi (Cash Customer)',
                'name_ur' => 'نقدی (عام خریدار)',
                'phone' => '0300-0000000',
                'opening_balance' => 0,
                'current_balance' => 0,
                'status' => 'active',
            ]
        );

        // Sample Merchants from Mandi
        $sampleMerchants = [
            ['code' => 2, 'name_en' => 'Haji Gul Merchant', 'name_ur' => 'حاجی گل ماشاخور', 'phone' => '0301-2345678', 'opening_balance' => 16100],
            ['code' => 3, 'name_en' => 'Baloch Trading Co', 'name_ur' => 'بلوچ ٹریڈنگ کمپنی', 'phone' => '0302-3456789', 'opening_balance' => 45000],
            ['code' => 4, 'name_en' => 'Muhammad Raza & Sons', 'name_ur' => 'محمد رضا اینڈ سنز', 'phone' => '0340-2108382', 'opening_balance' => 8500],
            ['code' => 5, 'name_en' => 'Karachi Fresh Store', 'name_ur' => 'کراچی فریش سٹور', 'phone' => '0312-9876543', 'opening_balance' => 0],
        ];

        foreach ($sampleMerchants as $m) {
            Merchant::firstOrCreate(['code' => $m['code']], $m);
        }

        // 2. Areas
        $sampleAreas = [
            ['name_en' => 'Malir', 'name_ur' => 'ملیر'],
            ['name_en' => 'Hyderabad', 'name_ur' => 'حیدرآباد'],
            ['name_en' => 'Mirpurkhas', 'name_ur' => 'میرپورخاص'],
            ['name_en' => 'Sukkur', 'name_ur' => 'سکھر'],
            ['name_en' => 'Ghotki', 'name_ur' => 'گھوٹکی'],
            ['name_en' => 'Quetta', 'name_ur' => 'کوئٹہ'],
        ];

        $createdAreas = [];
        foreach ($sampleAreas as $a) {
            $createdAreas[] = Area::firstOrCreate(['name_en' => $a['name_en']], $a);
        }

        // 3. Farmers with Marks
        $sampleFarmers = [
            ['code' => 101, 'name_en' => 'Wadera Ali Muhammad', 'name_ur' => 'وڈیرہ علی محمد', 'phone' => '0300-1122334', 'area_id' => $createdAreas[0]->id, 'opening_balance' => 50000],
            ['code' => 102, 'name_en' => 'Jamali Zamindar', 'name_ur' => 'جمالی زمیندار', 'phone' => '0305-5566778', 'area_id' => $createdAreas[1]->id, 'opening_balance' => 125000],
            ['code' => 103, 'name_en' => 'Haji Noor Muhammad', 'name_ur' => 'حاجی نور محمد', 'phone' => '0313-9988776', 'area_id' => $createdAreas[2]->id, 'opening_balance' => 37491],
        ];

        foreach ($sampleFarmers as $f) {
            $farmer = Farmer::firstOrCreate(['code' => $f['code']], $f);
            // Add an extra mark besides 0 (Khud)
            if ($farmer->code == 101) {
                $farmer->marks()->firstOrCreate(['code' => 1], ['name_en' => 'Bari Red', 'name_ur' => 'باری سرخ']);
            }
            if ($farmer->code == 103) {
                $farmer->marks()->firstOrCreate(['code' => 2], ['name_en' => 'Bari Special', 'name_ur' => 'باری اسپیشل']);
            }
        }

        // 4. Items (Jins)
        $sampleItems = [
            ['name_en' => 'Aloo (Potato)', 'name_ur' => 'آلو', 'unit' => 'Bori (Bag)', 'default_rate' => 1200, 'default_bardana' => 20],
            ['name_en' => 'Piyaz (Onion)', 'name_ur' => 'پیاز', 'unit' => 'Bori (Bag)', 'default_rate' => 1500, 'default_bardana' => 20],
            ['name_en' => 'Tamatar (Tomato)', 'name_ur' => 'ٹماٹر', 'unit' => 'Peti (Crate)', 'default_rate' => 850, 'default_bardana' => 15],
            ['name_en' => 'Harri Mirch (Green Chilli)', 'name_ur' => 'ہری مرچ', 'unit' => 'Thaili (Bag)', 'default_rate' => 2200, 'default_bardana' => 30],
            ['name_en' => 'Band Gobhi (Cabbage)', 'name_ur' => 'بند گوبھی', 'unit' => 'Nag', 'default_rate' => 60, 'default_bardana' => 5],
            ['name_en' => 'Lehsan (Garlic)', 'name_ur' => 'لہسن', 'unit' => 'Bori (Bag)', 'default_rate' => 4500, 'default_bardana' => 25],
        ];

        foreach ($sampleItems as $item) {
            Item::firstOrCreate(['name_en' => $item['name_en']], $item);
        }
    }
}
