<?php

use App\Http\Controllers\Suppliers\SupplierPurchaseController;
use App\Http\Controllers\Suppliers\SupplierReportController;
use Illuminate\Support\Facades\Route;

/*
 * Supplier side: purchases of materials, packaging and services, plus the
 * supplier reports.
 *
 * This is separate from the legacy FMCG `routes/suppliers.php`, which stays
 * behind the SHOW_LEGACY_POS feature flag.
 */
Route::middleware(['auth', 'verified'])->prefix('supplier-purchases')->name('suppliers.purchases.')->group(function () {
    Route::get('/', [SupplierPurchaseController::class, 'index'])->name('index');
    Route::post('/', [SupplierPurchaseController::class, 'store'])->name('store');
    Route::put('/{purchase}', [SupplierPurchaseController::class, 'update'])->name('update');
    Route::delete('/{purchase}', [SupplierPurchaseController::class, 'destroy'])->name('destroy');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Payments made to a supplier after the purchase was recorded.
    Route::post('supplier-payments', [SupplierPurchaseController::class, 'payment'])
        ->name('suppliers.payments.store');
    Route::put('supplier-payments/{payment}', [SupplierPurchaseController::class, 'updatePayment'])
        ->name('suppliers.payments.update');
    Route::delete('supplier-payments/{payment}', [SupplierPurchaseController::class, 'destroyPayment'])
        ->name('suppliers.payments.destroy');

    // Supplier reports
    Route::get('supplier-reports', [SupplierReportController::class, 'index'])
        ->name('suppliers.reports');
});
