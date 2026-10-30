<?php

use App\Http\Controllers\Merchants\AmrozaController;
use App\Http\Controllers\Merchants\MerchantReportController;
use App\Http\Controllers\Merchants\NaqdiController;
use App\Http\Controllers\Merchants\WasooliController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Top-level aliases for quick navigation
    Route::get('amroza', [AmrozaController::class, 'index'])->name('amroza.index');
    Route::get('naqdi', [NaqdiController::class, 'index'])->name('naqdi.index');
    Route::get('wasooli', [WasooliController::class, 'index'])->name('wasooli.index');

    // Merchant Reports & Detail Views
    Route::get('merchant-amroza', [MerchantReportController::class, 'merchantAmroza'])->name('reports.merchant_amroza');
    Route::get('merchant-wasooli', [MerchantReportController::class, 'merchantWasooli'])->name('reports.merchant_wasooli');
    Route::get('amroza-detail', [MerchantReportController::class, 'amrozaDetail'])->name('reports.amroza_detail');
    Route::get('wasooli-detail', [MerchantReportController::class, 'wasooliDetail'])->name('reports.wasooli_detail');
    Route::get('amroza-wasooli', [MerchantReportController::class, 'amrozaWasooli'])->name('reports.amroza_wasooli');

    Route::prefix('merchants')->name('merchants.')->group(function () {
        // Amroza (Daily Sales)
        Route::get('amroza', [AmrozaController::class, 'index'])->name('amroza.index');
        Route::post('amroza', [AmrozaController::class, 'store'])->name('amroza.store');
        Route::put('amroza/{id}', [AmrozaController::class, 'update'])->name('amroza.update');
        Route::delete('amroza/{id}', [AmrozaController::class, 'destroy'])->name('amroza.destroy');
        Route::get('amroza/totals', [AmrozaController::class, 'amTotal'])->name('amroza.totals');

        // Naqdi (Cash Sales)
        Route::get('naqdi', [NaqdiController::class, 'index'])->name('naqdi.index');
        Route::post('naqdi', [NaqdiController::class, 'store'])->name('naqdi.store');

        // Wasooli (Recovery)
        Route::get('wasooli', [WasooliController::class, 'index'])->name('wasooli.index');
        Route::post('wasooli', [WasooliController::class, 'store'])->name('wasooli.store');

        // Reports with /merchants prefix as well
        Route::get('merchant-amroza', [MerchantReportController::class, 'merchantAmroza'])->name('merchant_amroza');
        Route::get('merchant-wasooli', [MerchantReportController::class, 'merchantWasooli'])->name('merchant_wasooli');
        Route::get('amroza-detail', [MerchantReportController::class, 'amrozaDetail'])->name('amroza_detail');
        Route::get('wasooli-detail', [MerchantReportController::class, 'wasooliDetail'])->name('wasooli_detail');
        Route::get('amroza-wasooli', [MerchantReportController::class, 'amrozaWasooli'])->name('amroza_wasooli');
    });
});
