<?php

use App\Http\Controllers\Parties\PartyController;
use App\Http\Controllers\Parties\PartyLedgerEntryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->prefix('parties')->name('parties.')->group(function () {
    // Unified party list (farmers, JKC suppliers, buyers, commission agents)
    Route::get('/', [PartyController::class, 'index'])->name('index');

    // One party's ledger (khata)
    Route::get('{type}/{id}', [PartyController::class, 'show'])
        ->name('show')
        ->whereNumber('id');

    // Ledger entries (not writable for buyers: their rows come from Amroza/Wasooli)
    Route::post('{type}/{id}/entries', [PartyLedgerEntryController::class, 'store'])
        ->name('entries.store')
        ->whereNumber('id');

    Route::put('{type}/{id}/entries/{entry}', [PartyLedgerEntryController::class, 'update'])
        ->name('entries.update')
        ->whereNumber(['id', 'entry']);

    Route::delete('{type}/{id}/entries/{entry}', [PartyLedgerEntryController::class, 'destroy'])
        ->name('entries.destroy')
        ->whereNumber(['id', 'entry']);
});
