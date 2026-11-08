<?php

use App\Http\Controllers\Farmers\FarmerPurchaseController;
use App\Http\Controllers\Farmers\InventoryController;
use Illuminate\Support\Facades\Route;

/*
 * Farmer side: purchase / arrival register, inventory and reports.
 */
Route::middleware(['auth', 'verified'])->group(function () {
    // Purchase & arrival register. The URL follows the planned navigation
    // ("Register (Consignment Entry)").
    Route::get('register-consignment', [FarmerPurchaseController::class, 'index'])
        ->name('farmers.purchases.index');
    Route::post('register-consignment', [FarmerPurchaseController::class, 'store'])
        ->name('farmers.purchases.store');
    Route::put('register-consignment/{purchase}', [FarmerPurchaseController::class, 'update'])
        ->name('farmers.purchases.update');
    Route::delete('register-consignment/{purchase}', [FarmerPurchaseController::class, 'destroy'])
        ->name('farmers.purchases.destroy');

    // Pay a farmer - lowers what the farmer is owed.
    Route::post('farmers/payments', [FarmerPurchaseController::class, 'payment'])
        ->name('farmers.payments.store');

    // Inventory
    Route::get('farmers/inventory', [InventoryController::class, 'index'])
        ->name('farmers.inventory');

    // Farmer side reports
    Route::get('farmers/reports', [InventoryController::class, 'reports'])
        ->name('farmers.reports');

    // Consignment Settlement & Farmer Bijak (بیجک کسان)
    Route::get('farmers/settlements', [\App\Http\Controllers\Farmers\FarmerSettlementController::class, 'index'])
        ->name('farmers.settlements.index');
    Route::post('farmers/settlements', [\App\Http\Controllers\Farmers\FarmerSettlementController::class, 'store'])
        ->name('farmers.settlements.store');
    Route::get('farmers/settlements/{id}', [\App\Http\Controllers\Farmers\FarmerSettlementController::class, 'show'])
        ->name('farmers.settlements.show');
    Route::delete('farmers/settlements/{id}', [\App\Http\Controllers\Farmers\FarmerSettlementController::class, 'destroy'])
        ->name('farmers.settlements.destroy');
});
