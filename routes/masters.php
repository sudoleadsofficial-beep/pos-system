<?php

use App\Http\Controllers\Masters\AreaController;
use App\Http\Controllers\Masters\FarmerController;
use App\Http\Controllers\Masters\FarmerMarkController;
use App\Http\Controllers\Masters\ItemController;
use App\Http\Controllers\Masters\MerchantController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('masters')->name('masters.')->group(function () {
    // Merchants
    Route::get('merchants/search', [MerchantController::class, 'search'])->name('merchants.search');
    Route::resource('merchants', MerchantController::class)->except(['create', 'edit', 'show']);

    // Farmers
    Route::get('farmers/search', [FarmerController::class, 'search'])->name('farmers.search');
    Route::resource('farmers', FarmerController::class)->except(['create', 'edit', 'show']);

    // Marks
    Route::get('marks/by-farmer/{farmerId}', [FarmerMarkController::class, 'byFarmer'])->name('marks.by-farmer');
    Route::resource('marks', FarmerMarkController::class)->except(['create', 'edit', 'show']);

    // Items
    Route::get('items/search', [ItemController::class, 'search'])->name('items.search');
    Route::resource('items', ItemController::class)->except(['create', 'edit', 'show']);

    // Areas
    Route::get('areas/search', [AreaController::class, 'search'])->name('areas.search');
    Route::resource('areas', AreaController::class)->except(['create', 'edit', 'show']);
});
