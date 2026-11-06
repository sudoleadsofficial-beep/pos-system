<?php

use App\Http\Controllers\System\BackupController;
use App\Http\Controllers\System\ExportController;
use App\Http\Controllers\System\ImportController;
use Illuminate\Support\Facades\Route;

/*
 * System section: backup, export and import.
 *
 * These routes only work with a signed-in user - the backup file contains the
 * whole business database, so it must never be reachable by a guest.
 */
Route::middleware(['auth', 'verified'])->prefix('system')->name('system.')->group(function () {
    // A. Full database backup
    Route::get('backup', [BackupController::class, 'index'])->name('backup.index');
    Route::get('backup/download', [BackupController::class, 'download'])->name('backup.download');
    Route::get('backup/file/{name}/download', [BackupController::class, 'downloadExisting'])->name('backup.download.existing');

    // E. Restore a backup
    Route::post('backup/restore/check', [BackupController::class, 'checkRestore'])->name('backup.restore.check');
    Route::post('backup/restore', [BackupController::class, 'restore'])->name('backup.restore');

    // B + C. Exports
    Route::get('export/all', [ExportController::class, 'all'])->name('export.all');
    Route::get('export/{category}/excel', [ExportController::class, 'excel'])->name('export.excel');
    Route::get('export/{category}/pdf', [ExportController::class, 'pdf'])->name('export.pdf');

    // D. Import
    Route::get('import', [ImportController::class, 'index'])->name('import.index');
    Route::get('import/template/{entity}', [ImportController::class, 'template'])->name('import.template');
    Route::post('import/preview', [ImportController::class, 'preview'])->name('import.preview');
    Route::post('import', [ImportController::class, 'store'])->name('import.store');
});
