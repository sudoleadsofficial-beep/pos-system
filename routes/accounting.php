<?php

use App\Http\Controllers\Accounting\CashBookController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Cash Book & Rokad (روکڑ)
    Route::get('cash-book', [CashBookController::class, 'index'])->name('cash-book.index');

    // General Ledger (کھاتہ جات)
    Route::get('general-ledger', [CashBookController::class, 'generalLedger'])->name('general-ledger.index');

    // Direct Expenses & Balance Adjustments
    Route::post('accounting/expenses', [CashBookController::class, 'storeExpense'])->name('accounting.expenses.store');
    Route::delete('accounting/expenses/{id}', [CashBookController::class, 'destroyExpense'])->name('accounting.expenses.destroy');
    Route::post('accounting/opening-balances', [CashBookController::class, 'updateOpeningBalances'])->name('accounting.opening-balances.update');
});
