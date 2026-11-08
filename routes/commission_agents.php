<?php

use App\Http\Controllers\CommissionAgents\CommissionReportController;
use App\Http\Controllers\Masters\CommissionAgentController;
use Illuminate\Support\Facades\Route;

/*
 * Commission Agent side: payments and commission reports.
 */
Route::middleware(['auth', 'verified'])->group(function () {
    // Record payment to a commission agent (Banam)
    Route::post('commission-agents/payments', [CommissionAgentController::class, 'payment'])
        ->name('commission-agents.payments.store');

    // Commission reports
    Route::get('commission-reports', [CommissionReportController::class, 'index'])
        ->name('commission-agents.reports');
});
