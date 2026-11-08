<?php

use App\Http\Controllers\Reports\ReportDashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('reports', [ReportDashboardController::class, 'index'])->name('reports.index');
});
