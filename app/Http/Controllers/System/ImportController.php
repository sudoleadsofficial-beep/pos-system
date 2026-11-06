<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Services\ImportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class ImportController extends Controller
{
    public function __construct(
        protected ImportService $import,
    ) {}

    /**
     * The import page.
     */
    public function index(): InertiaResponse
    {
        return Inertia::render('system/import/index', [
            'entities' => $this->import->entities(),
        ]);
    }

    /**
     * Download a sample template.
     */
    public function template(string $entity): Response
    {
        abort_unless(array_key_exists($entity, $this->import->entities()), 404);

        $content = $this->import->template($entity);
        $name = $entity.'-template.csv';

        return response($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    /**
     * Check an uploaded file and show the client what would happen.
     */
    public function preview(Request $request): InertiaResponse
    {
        $request->validate([
            'entity' => 'required|string',
            'file' => 'required|file|mimes:csv,xlsx',
        ]);

        abort_unless(array_key_exists($request->input('entity'), $this->import->entities()), 404);

        try {
            $preview = $this->import->preview($request->input('entity'), $request->file('file'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => $e->getMessage()]);
        }

        return Inertia::render('system/import/preview', [
            'entity' => $request->input('entity'),
            'entityLabel' => $this->import->entities()[$request->input('entity')]['label'],
            'rows' => $preview['rows'],
            'summary' => $preview['summary'],
            'blockedColumns' => $preview['blocked_columns'],
            'stagedFile' => $preview['file'],
        ]);
    }

    /**
     * Write the rows the client confirmed.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'entity' => 'required|string',
            'stagedFile' => 'required|string',
            'confirmation' => 'required|accepted',
        ]);

        abort_unless(array_key_exists($request->input('entity'), $this->import->entities()), 404);

        try {
            $result = $this->import->import($request->input('entity'), $request->input('stagedFile'));
        } catch (\Throwable $e) {
            return back()->withErrors(['file' => $e->getMessage()]);
        }

        $summary = $result['summary'];

        return redirect()->route('system.import.index')
            ->with('success', sprintf(
                'Import finished: %d added, %d skipped, %d rejected.',
                $summary['add'],
                $summary['skip'],
                $summary['reject']
            ));
    }
}
