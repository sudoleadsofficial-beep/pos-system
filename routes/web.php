<?php

use App\Http\Controllers\PageController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::post('locale', function (\Illuminate\Http\Request $request) {
    $request->validate(['locale' => 'required|in:en,ur']);
    $locale = $request->input('locale');
    session(['locale' => $locale]);
    if ($user = $request->user()) {
        $user->update(['locale' => $locale]);
    }
    return response()->json(['success' => true, 'locale' => $locale]);
})->name('locale.update');

Route::middleware(['auth', 'verified'])
    ->group(function () {
        Route::get('dashboard', [PageController::class, 'dashboard'])
            ->name('dashboard');

        // Navigation aliases
        Route::get('bijak', [\App\Http\Controllers\Farmers\BijjakController::class, 'index'])->name('farmer.bijak');
        Route::post('bijak', [\App\Http\Controllers\Farmers\BijjakController::class, 'store'])->name('farmer.bijak.store');
        Route::delete('bijak/{id}', [\App\Http\Controllers\Farmers\BijjakController::class, 'destroy'])->name('farmer.bijak.destroy');

        Route::get('khata', [\App\Http\Controllers\Farmers\FarmerKhataController::class, 'index'])->name('farmer.khata');

        Route::get('general-ledger', [\App\Http\Controllers\Ledger\GeneralLedgerController::class, 'index'])->name('cash_book.general_ledger');
        Route::post('general-ledger', [\App\Http\Controllers\Ledger\GeneralLedgerController::class, 'store'])->name('cash_book.general_ledger.store');

        Route::get('reports', [\App\Http\Controllers\Merchants\MerchantReportController::class, 'index'])->name('reports.index');
        Route::get('reports/data', [\App\Http\Controllers\Merchants\MerchantReportController::class, 'getReportData'])->name('reports.data');
    });

require __DIR__ . '/auth.php';

if (config('jkc.show_legacy_pos', false)) {
    require __DIR__ . "/attributes.php";
    require __DIR__ . '/brands.php';
    require __DIR__ . '/categories.php';
    require __DIR__ . '/customers.php';
    require __DIR__ . '/employees.php';
    require __DIR__ . '/expenses.php';
    require __DIR__ . '/products.php';
    require __DIR__ . '/purchases.php';
    require __DIR__ . '/sales.php';
    require __DIR__ . '/suppliers.php';
}

require __DIR__ . '/masters.php';
require __DIR__ . '/merchants.php';
require __DIR__ . '/settings.php';
require __DIR__ . '/users.php';
