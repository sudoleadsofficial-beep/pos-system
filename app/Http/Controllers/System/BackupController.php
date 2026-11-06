<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Services\BackupService;
use App\Services\BusinessSettingsService;
use App\Services\ExportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function __construct(
        protected BackupService $backup,
        protected BusinessSettingsService $settings,
        protected ExportService $export,
    ) {}

    /**
     * The Backup & Export page.
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('system/backup/index', [
            'backups' => $this->backup->available(),
            'lastBackupAt' => $this->settings->lastBackupAt(),
            'categories' => $this->export->categories(),
        ]);
    }

    /**
     * Download a full database backup.
     */
    public function download(): BinaryFileResponse
    {
        $name = $this->backup->create();

        return response()->download(
            $this->backup->path($name),
            $name,
            ['Content-Type' => 'application/octet-stream']
        );
    }

    /**
     * Download a backup that was taken earlier.
     */
    public function downloadExisting(string $name): BinaryFileResponse
    {
        $path = $this->backup->path($name);

        if (! is_file($path)) {
            abort(404, 'That backup file is no longer available.');
        }

        return response()->download($path, basename($name), ['Content-Type' => 'application/octet-stream']);
    }

    /**
     * Check an uploaded backup and show what would happen.
     */
    public function checkRestore(Request $request): InertiaResponse
    {
        $request->validate([
            'backup' => 'required|file',
        ]);

        $file = $request->file('backup');
        $path = $file->getRealPath();

        $validation = $this->backup->validate($path);

        return Inertia::render('system/backup/restore', [
            'fileName' => $file->getClientOriginalName(),
            'fileSize' => $file->getSize(),
            'validation' => $validation,
            'uploadedPath' => $validation['valid'] ? $this->stageUpload($file) : null,
        ]);
    }

    /**
     * Restore a validated backup.
     */
    public function restore(Request $request): RedirectResponse
    {
        $request->validate([
            'uploadedPath' => 'required|string',
            'confirmation' => 'required|accepted',
        ]);

        $path = storage_path('app/private/restores/'.basename($request->input('uploadedPath')));

        if (! is_file($path)) {
            return back()->withErrors(['backup' => 'The uploaded backup is no longer available. Please upload it again.']);
        }

        try {
            $result = $this->backup->restore($path);
        } catch (\Throwable $e) {
            return back()->withErrors(['backup' => $e->getMessage()]);
        }

        @unlink($path);

        return redirect()->route('system.backup.index')
            ->with('success', 'The database was restored. A safety copy of the previous data was saved as "'.$result['safety_backup'].'".');
    }

    /**
     * Keep the uploaded restore file until the client confirms.
     */
    protected function stageUpload(\Illuminate\Http\UploadedFile $file): string
    {
        $directory = storage_path('app/private/restores');

        if (! is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $name = bin2hex(random_bytes(16)).'.sqlite';
        $file->move($directory, $name);

        return $name;
    }
}
