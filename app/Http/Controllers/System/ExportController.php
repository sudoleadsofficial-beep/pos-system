<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Services\ExportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ExportController extends Controller
{
    public function __construct(
        protected ExportService $export,
    ) {}

    /**
     * Export one category as an Excel workbook.
     */
    public function excel(Request $request, string $category): Response
    {
        $this->guard($category);

        $content = $this->export->xlsx($category);
        $name = $this->export->folderName($category).'-'.now()->format('Y-m-d').'.xlsx';

        return $this->download($content, $name, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    /**
     * Export one category as a PDF.
     */
    public function pdf(Request $request, string $category): Response
    {
        $this->guard($category);

        $content = $this->export->pdf($category);
        $name = $this->export->folderName($category).'-'.now()->format('Y-m-d').'.pdf';

        return $this->download($content, $name, 'application/pdf');
    }

    /**
     * Export every category as one ZIP archive.
     */
    public function all(): Response
    {
        $content = $this->export->allZip();
        $name = 'jkc-pos-all-data-'.now()->format('Y-m-d-His').'.zip';

        return $this->download($content, $name, 'application/zip');
    }

    protected function guard(string $category): void
    {
        abort_unless(array_key_exists($category, $this->export->categories()), 404);
    }

    protected function download(string $content, string $name, string $type): Response
    {
        return response($content, 200, [
            'Content-Type' => $type,
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
            'Content-Length' => (string) strlen($content),
        ]);
    }
}
