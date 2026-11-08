<?php

namespace App\Services;

use App\Models\AmrozaSale;
use App\Models\CommissionAgent;
use App\Models\Expense;
use App\Models\Farmer;
use App\Models\FarmerPurchase;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use App\Models\MerchantReceipt;
use App\Models\Purchase;
use App\Models\SupplierPurchase;
use App\Support\Xlsx;
use App\Support\Zip;
use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Data exports.
 *
 * Every category is turned into one dataset - headings, rows and totals -
 * which is then written as a real Excel workbook or a real, printable PDF.
 * Ledger categories read straight from PartyLedgerService so an export shows
 * exactly the figures the on-screen khata shows.
 */
class ExportService
{
    public function __construct(
        protected BusinessSettingsService $settings,
        protected PartyLedgerService $ledger,
    ) {}

    /**
     * Every export category the client can pick.
     *
     * @return array<string, string>
     */
    public function categories(): array
    {
        $categories = [
            'farmers' => 'Farmers',
            'buyers' => 'Buyers / Merchants',
            'suppliers' => 'Suppliers',
            'commission_agents' => 'Commission Agents',
            'farmer_ledgers' => 'Farmer Ledgers',
            'buyer_ledgers' => 'Buyer Ledgers',
            'supplier_ledgers' => 'Supplier Ledgers',
            'commission_agent_ledgers' => 'Commission Agent Ledgers',
            'amroza_sales' => 'Amroza Sales',
            'naqdi_receipts' => 'Naqdi Receipts',
            'wasooli_receipts' => 'Wasooli Receipts',
        ];

        // These come from the legacy purchasing module, so they are only
        // offered when that module is actually present.
        if ($this->tableExists('purchases')) {
            $categories['purchases'] = 'Purchase Records';
        }

        if ($this->tableExists('expenses')) {
            $categories['expenses_payments'] = 'Expenses and Payments';
        }

        // The farmer purchase / arrival register, once it exists.
        if ($this->tableExists('farmer_purchases')) {
            $categories['farmer_purchases'] = 'Farmer Purchases';
        }

        // The supplier purchase register (materials, packaging and services).
        if ($this->tableExists('supplier_purchases')) {
            $categories['supplier_purchases'] = 'Supplier Purchases';
        }

        return $categories;
    }

    /**
     * The headings and rows of one category.
     *
     * @return array{title: string, headers: array<int, string>, rows: array<int, array<int, mixed>>, widths: array<int, array{0: int, 1: float}>, totals: array<int, array{0: string, 1: mixed}>}
     */
    public function dataset(string $key): array
    {
        return match ($key) {
            'farmers' => $this->farmers(),
            'buyers' => $this->buyers(),
            'suppliers' => $this->suppliers(),
            'commission_agents' => $this->commissionAgents(),
            'farmer_ledgers' => $this->partyLedger('farmer', 'Farmer'),
            'buyer_ledgers' => $this->buyerLedger(),
            'supplier_ledgers' => $this->partyLedger('supplier', 'Supplier'),
            'commission_agent_ledgers' => $this->partyLedger('commission_agent', 'Commission Agent'),
            'amroza_sales' => $this->amrozaSales(),
            'naqdi_receipts' => $this->receipts('same_day_cash', 'Naqdi (Cash) Receipts'),
            'wasooli_receipts' => $this->receipts('recovery', 'Wasooli (Recovery) Receipts'),
            'purchases' => $this->purchases(),
            'expenses_payments' => $this->expensesAndPayments(),
            'farmer_purchases' => $this->farmerPurchases(),
            'supplier_purchases' => $this->supplierPurchases(),
            default => throw new \InvalidArgumentException('Unknown export category "'.$key.'".'),
        };
    }

    // ---------------------------------------------------------------------
    // Master records
    // ---------------------------------------------------------------------

    protected function farmers(): array
    {
        $rows = [];

        foreach (Farmer::with('area')->orderBy('code')->get() as $farmer) {
            $rows[] = [
                $farmer->code,
                $farmer->name_en,
                $farmer->name_ur,
                $farmer->phone,
                $farmer->area?->name_en,
                (float) $farmer->opening_balance,
                (float) $farmer->current_balance,
                $farmer->status,
            ];
        }

        return $this->simple(
            'Farmers',
            ['Code', 'Name (English)', 'Name (Urdu)', 'Phone', 'Area', 'Opening Balance', 'Current Balance', 'Status'],
            $rows,
            [5, 28, 26, 14, 18, 16, 16, 10],
            ['Opening Balance' => 'col5', 'Current Balance' => 'col6']
        );
    }

    protected function buyers(): array
    {
        $rows = [];

        foreach (Merchant::orderBy('code')->get() as $merchant) {
            $rows[] = [
                $merchant->code,
                $merchant->name_en,
                $merchant->name_ur,
                $merchant->phone,
                (float) $merchant->opening_balance,
                (float) $merchant->current_balance,
                $merchant->status,
            ];
        }

        return $this->simple(
            'Buyers / Merchants',
            ['Code', 'Name (English)', 'Name (Urdu)', 'Phone', 'Opening Balance', 'Current Balance', 'Status'],
            $rows,
            [5, 30, 26, 14, 16, 16, 10],
            ['Opening Balance' => 'col4', 'Current Balance' => 'col5']
        );
    }

    protected function suppliers(): array
    {
        $rows = [];

        foreach (JkcSupplier::with('area')->orderBy('code')->get() as $supplier) {
            $rows[] = [
                $supplier->code,
                $supplier->name_en,
                $supplier->name_ur,
                $supplier->phone,
                $supplier->area?->name_en,
                (float) $supplier->opening_balance,
                (float) $supplier->current_balance,
                $supplier->status,
            ];
        }

        return $this->simple(
            'Suppliers',
            ['Code', 'Name (English)', 'Name (Urdu)', 'Phone', 'Area', 'Opening Balance', 'Current Balance', 'Status'],
            $rows,
            [5, 28, 26, 14, 18, 16, 16, 10],
            ['Opening Balance' => 'col5', 'Current Balance' => 'col6']
        );
    }

    protected function commissionAgents(): array
    {
        $rows = [];

        foreach (CommissionAgent::with('area')->orderBy('code')->get() as $agent) {
            $rows[] = [
                $agent->code,
                $agent->name_en,
                $agent->name_ur,
                $agent->phone,
                $agent->area?->name_en,
                $agent->commission_percent === null ? '' : (float) $agent->commission_percent,
                (float) $agent->opening_balance,
                (float) $agent->current_balance,
                $agent->status,
            ];
        }

        return $this->simple(
            'Commission Agents',
            ['Code', 'Name (English)', 'Name (Urdu)', 'Phone', 'Area', 'Commission %', 'Opening Balance', 'Current Balance', 'Status'],
            $rows,
            [5, 26, 24, 14, 18, 13, 16, 16, 10],
            ['Opening Balance' => 'col6', 'Current Balance' => 'col7']
        );
    }

    // ---------------------------------------------------------------------
    // Ledgers
    // ---------------------------------------------------------------------

    /**
     * The stored ledger of every farmer, supplier or commission agent.
     */
    protected function partyLedger(string $type, string $label): array
    {
        $rows = [];

        $parties = match ($type) {
            'farmer' => Farmer::orderBy('code')->get(),
            'supplier' => JkcSupplier::orderBy('code')->get(),
            default => CommissionAgent::orderBy('code')->get(),
        };

        foreach ($parties as $party) {
            $ledger = $this->ledger->entries($type, $party->id);

            foreach ($ledger['entries'] as $entry) {
                $rows[] = [
                    $party->code,
                    $party->name_en,
                    $this->settings->formatDate($entry['date']),
                    $entry['kind'],
                    $entry['description'],
                    $entry['reference'],
                    (float) $entry['jama'],
                    (float) $entry['banam'],
                    (float) $entry['balance'],
                ];
            }
        }

        return $this->simple(
            $label.' Ledgers',
            ['Code', 'Name', 'Date', 'Type', 'Description', 'Reference', 'Jama (Debit)', 'Banam (Credit)', 'Balance'],
            $rows,
            [6, 26, 12, 14, 28, 18, 15, 15, 15],
            ['Jama (Debit)' => 'col6', 'Banam (Credit)' => 'col7']
        );
    }

    /**
     * The derived buyer ledger, exactly as the buyer khata screen shows it.
     */
    protected function buyerLedger(): array
    {
        $rows = [];

        foreach (Merchant::orderBy('code')->get() as $merchant) {
            $ledger = $this->ledger->entries('buyer', $merchant->id);

            foreach ($ledger['entries'] as $entry) {
                $rows[] = [
                    $merchant->code,
                    $merchant->name_en,
                    $this->settings->formatDate($entry['date']),
                    $entry['kind'] === 'amroza_wasooli' ? 'Amroza + Wasooli' : ucfirst((string) $entry['kind']),
                    (float) $entry['jama'],
                    (float) $entry['banam'],
                    $entry['sabiqa'] === null ? '' : (float) $entry['sabiqa'],
                    (float) $entry['balance'],
                ];
            }
        }

        return $this->simple(
            'Buyer Ledgers',
            ['Code', 'Name', 'Date', 'Type', 'Amroza (Jama)', 'Receipts (Banam)', 'Sabiqa', 'Balance'],
            $rows,
            [6, 28, 12, 20, 16, 17, 15, 15],
            ['Amroza (Jama)' => 'col4', 'Receipts (Banam)' => 'col5']
        );
    }

    // ---------------------------------------------------------------------
    // Transactions
    // ---------------------------------------------------------------------

    protected function amrozaSales(): array
    {
        $rows = [];
        $total = 0.0;

        $sales = AmrozaSale::with(['merchant', 'item'])->orderBy('date')->orderBy('id')->get();

        foreach ($sales as $sale) {
            $total += (float) $sale->gross_amount;

            $rows[] = [
                $this->settings->formatDate($sale->date),
                $sale->merchant?->code,
                $sale->merchant?->name_en,
                $sale->item?->name_en,
                (int) $sale->nag,
                (float) $sale->weight,
                (float) $sale->rate,
                (float) $sale->bardana,
                (float) $sale->gross_amount,
                $sale->payment_type === 'naqdi' ? 'Cash' : 'Credit',
            ];
        }

        return $this->simple(
            'Amroza Sales',
            ['Date', 'Buyer Code', 'Buyer', 'Item', 'Units (Nag)', 'Weight', 'Rate', 'Packing', 'Gross Amount', 'Payment'],
            $rows,
            [12, 11, 26, 22, 12, 11, 11, 11, 15, 11],
            ['Gross Amount' => 'col8']
        );
    }

    /**
     * The supplier purchase register (materials, packaging and services).
     */
    protected function supplierPurchases(): array
    {
        $rows = [];

        $purchases = SupplierPurchase::with(['supplier', 'items'])
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        foreach ($purchases as $purchase) {
            $rows[] = [
                $this->settings->formatDate($purchase->date),
                $purchase->reference,
                $purchase->supplier?->code,
                $purchase->supplier?->name_en,
                $purchase->items->map(fn ($line) => $line->description)->implode(', '),
                $purchase->items->count(),
                (float) $purchase->charges,
                (float) $purchase->subtotal,
                (float) $purchase->total_amount,
                (float) $purchase->paid_amount,
                (float) $purchase->remaining_amount,
            ];
        }

        return $this->simple(
            'Supplier Purchases',
            ['Date', 'Reference', 'Supplier Code', 'Supplier', 'Items', 'Lines', 'Charges', 'Subtotal', 'Total Amount', 'Paid', 'Remaining'],
            $rows,
            [12, 14, 12, 26, 34, 8, 12, 14, 14, 13, 13],
            ['Charges' => 'col6', 'Subtotal' => 'col7', 'Total Amount' => 'col8', 'Paid' => 'col9', 'Remaining' => 'col10']
        );
    }

    /**
     * The farmer purchase / arrival register.
     */
    protected function farmerPurchases(): array
    {
        $rows = [];

        $purchases = FarmerPurchase::with(['farmer', 'mark', 'item', 'commissionAgent'])
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        foreach ($purchases as $purchase) {
            $rows[] = [
                $this->settings->formatDate($purchase->date),
                $purchase->reference,
                $purchase->farmer?->code,
                $purchase->farmer?->name_en,
                $purchase->mark?->name_en,
                $purchase->item?->name_en,
                (int) $purchase->nag,
                (float) $purchase->weight,
                (float) $purchase->rate,
                (float) $purchase->charges,
                (float) $purchase->amount,
                (float) $purchase->paid_amount,
                (float) $purchase->remaining_amount,
                $purchase->commissionAgent?->name_en ?? '',
                $purchase->commission_percent !== null ? (float) $purchase->commission_percent : '',
                (float) $purchase->commission_amount,
            ];
        }

        return $this->simple(
            'Farmer Purchases',
            ['Date', 'Reference', 'Farmer Code', 'Farmer', 'Mark', 'Item', 'Bags (Nag)', 'Weight', 'Rate', 'Charges', 'Amount', 'Paid', 'Remaining', 'Agent', 'Comm %', 'Comm Amount'],
            $rows,
            [12, 14, 12, 26, 16, 22, 12, 11, 11, 11, 14, 13, 13, 20, 10, 13],
            ['Amount' => 'col10', 'Paid' => 'col11', 'Remaining' => 'col12', 'Comm Amount' => 'col15']
        );
    }

    protected function receipts(string $type, string $title): array
    {
        $rows = [];
        $total = 0.0;

        $receipts = MerchantReceipt::with('merchant')->where('type', $type)->orderBy('date')->orderBy('id')->get();

        foreach ($receipts as $receipt) {
            $total += (float) $receipt->amount;

            $rows[] = [
                $this->settings->formatDate($receipt->date),
                $receipt->merchant?->code,
                $receipt->merchant?->name_en,
                (float) $receipt->amount,
                $receipt->note,
            ];
        }

        return $this->simple(
            $title,
            ['Date', 'Buyer Code', 'Buyer', 'Amount', 'Note'],
            $rows,
            [12, 11, 28, 15, 30],
            ['Amount' => 'col3']
        );
    }

    protected function purchases(): array
    {
        $rows = [];
        $total = 0.0;
        $due = 0.0;

        foreach (Purchase::with('supplier')->orderBy('date')->get() as $purchase) {
            $total += (float) $purchase->total_amount;
            $due += (float) $purchase->due_amount;

            $rows[] = [
                $this->settings->formatDate($purchase->date),
                $purchase->reference,
                $purchase->supplier?->name,
                (float) $purchase->total_amount,
                (float) $purchase->paid_amount,
                (float) $purchase->due_amount,
                $purchase->status,
            ];
        }

        return $this->simple(
            'Purchase Records',
            ['Date', 'Reference', 'Supplier', 'Total', 'Paid', 'Due', 'Status'],
            $rows,
            [12, 18, 28, 15, 15, 15, 12],
            ['Total' => 'col3', 'Due' => 'col5']
        );
    }

    protected function expensesAndPayments(): array
    {
        $rows = [];

        if ($this->tableExists('expenses')) {
            foreach (Expense::orderBy('date')->get() as $expense) {
                $rows[] = [
                    $this->settings->formatDate($expense->date),
                    'Expense',
                    $expense->category ?? '',
                    $expense->description ?? '',
                    (float) $expense->amount,
                    $expense->note ?? '',
                ];
            }
        }

        if ($this->tableExists('purchase_payments')) {
            foreach (\App\Models\PurchasePayment::with('purchase')->orderBy('date')->get() as $payment) {
                $rows[] = [
                    $this->settings->formatDate($payment->date),
                    'Payment',
                    $payment->purchase?->supplier?->name ?? '',
                    $payment->reference,
                    (float) $payment->amount,
                    $payment->payment_method ?? '',
                ];
            }
        }

        usort($rows, fn ($a, $b) => strcmp((string) $a[0], (string) $b[0]));

        return $this->simple(
            'Expenses and Payments',
            ['Date', 'Kind', 'Party', 'Description / Reference', 'Amount', 'Note / Method'],
            $rows,
            [12, 12, 26, 30, 15, 20],
            ['Amount' => 'col4']
        );
    }

    // ---------------------------------------------------------------------
    // Writers
    // ---------------------------------------------------------------------

    /**
     * The category as an Excel workbook.
     */
    public function xlsx(string $key): string
    {
        $dataset = $this->dataset($key);
        $rows = $dataset['rows'];

        foreach ($dataset['totals'] as $total) {
            $rows[] = $total;
        }

        return Xlsx::write($dataset['headers'], $rows, $dataset['widths'], $dataset['title']);
    }

    /**
     * The category as a printable PDF.
     */
    public function pdf(string $key): string
    {
        $dompdf = new Dompdf($this->pdfOptions());

        if ($this->settings->paperSize() === 'thermal') {
            $dompdf->setPaper([0, 0, 226.77, 566.93], 'portrait');
        } else {
            $dompdf->setPaper('a4', 'portrait');
        }

        $dompdf->loadHtml($this->pdfHtml($key));
        $dompdf->render();

        return (string) $dompdf->output();
    }

    /**
     * The HTML the PDF is rendered from.
     *
     * Kept separate so the layout can be checked without having to dig the
     * text out of a font-subset PDF.
     */
    public function pdfHtml(string $key): string
    {
        $dataset = $this->dataset($key);
        $business = $this->settings->business();

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'.$this->pdfStyles().'</style></head><body>';
        $html .= $this->pdfHeader($dataset['title'], $business);

        if ($dataset['rows'] === []) {
            $html .= '<p class="empty">There are no records in this category yet.</p>';
        } else {
            $html .= '<table><thead><tr>';
            foreach ($dataset['headers'] as $header) {
                $html .= '<th>'.htmlspecialchars($header).'</th>';
            }
            $html .= '</tr></thead><tbody>';

            foreach ($dataset['rows'] as $row) {
                $html .= '<tr>';
                foreach (array_values($row) as $cell) {
                    $html .= '<td>'.htmlspecialchars($this->cellText($cell)).'</td>';
                }
                $html .= '</tr>';
            }

            $html .= '</tbody>';
        }

        if ($dataset['totals'] !== []) {
            $html .= '<table class="totals"><tbody>';
            foreach ($dataset['totals'] as $total) {
                $html .= '<tr><th>'.htmlspecialchars((string) $total[0]).'</th><td>'.$this->cellText($total[1]).'</td></tr>';
            }
            $html .= '</tbody></table>';
        }

        $html .= '<p class="footer">Generated '.now()->format('d-m-Y H:i').' &middot; '.$this->settings->formatDate(now()).'</p>';
        $html .= '</body></html>';

        return $html;
    }

    protected function pdfOptions(): Options
    {
        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        return $options;
    }

    /**
     * Every available export, plus a README, as one ZIP archive.
     */
    public function allZip(): string
    {
        $files = [];
        $readme = [];

        foreach ($this->categories() as $key => $label) {
            $folder = $this->folderName($key);
            $dataset = $this->dataset($key);

            $files['Excel/'.$folder.'/'.$folder.'.xlsx'] = $this->xlsx($key);
            $files['PDF/'.$folder.'/'.$folder.'.pdf'] = $this->pdf($key);

            $readme[] = '- Excel/'.$folder.'/'.$folder.'.xlsx  -  '.$label.' ('.count($dataset['rows']).' records)';
            $readme[] = '  PDF/'.$folder.'/'.$folder.'.pdf  -  '.$label;
        }

        $files['README.txt'] = $this->readme($readme);

        return Zip::create($files);
    }

    /**
     * A folder name for one category.
     */
    public function folderName(string $key): string
    {
        return str_replace(' ', '_', (string) ($this->categories()[$key] ?? $key));
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    /**
     * Build a dataset from plain rows.
     */
    protected function simple(string $title, array $headers, array $rows, array $widths, array $totalColumns): array
    {
        $totals = [];

        foreach ($totalColumns as $label => $column) {
            $index = (int) str_replace('col', '', $column);

            if (! isset($headers[$index])) {
                continue;
            }

            $sum = 0.0;

            foreach ($rows as $row) {
                $value = array_values($row)[$index] ?? 0;

                if (is_numeric($value)) {
                    $sum += (float) $value;
                }
            }

            $totals[] = [$label, round($sum, 2)];
        }

        return [
            'title' => $title,
            'headers' => $headers,
            'rows' => $rows,
            'widths' => array_map(fn ($width, $index) => [$index, $width], $widths, array_keys($widths)),
            'totals' => $totals,
        ];
    }

    protected function cellText(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        if (is_float($value) || is_int($value)) {
            return number_format((float) $value, 2);
        }

        return (string) $value;
    }

    protected function tableExists(string $table): bool
    {
        return \Illuminate\Support\Facades\Schema::hasTable($table);
    }

    protected function pdfStyles(): string
    {
        return 'body{font-family:"DejaVu Sans",sans-serif;font-size:10px;color:#111;margin:0;}'
            .'h1{font-size:15px;margin:0 0 2px 0;}'
            .'.meta{font-size:9px;color:#444;margin:0 0 8px 0;}'
            .'.meta div{margin:0 0 1px 0;}'
            .'table{width:100%;border-collapse:collapse;margin-bottom:8px;}'
            .'th{background:#e8eef7;border:1px solid #9aa8bd;padding:4px 5px;text-align:left;font-size:9px;}'
            .'td{border:1px solid #c3ccd8;padding:3px 5px;font-size:9px;}'
            .'table.totals{width:auto;margin-top:6px;}'
            .'table.totals th{background:#f1f5fa;width:auto;white-space:nowrap;}'
            .'table.totals td{text-align:right;font-weight:bold;}'
            .'.empty{font-size:10px;color:#666;}'
            .'.footer{margin-top:10px;font-size:8px;color:#777;}'
            .'@page{margin:10mm;}';
    }

    protected function pdfHeader(string $title, array $business): string
    {
        $html = '';

        if ($business['show_on_print']) {
            $html .= '<div class="meta">';
            $html .= '<div><strong>'.$this->escape($business['name']).'</strong>'
                .($business['tagline'] !== '' ? ' &middot; '.$this->escape($business['tagline']) : '').'</div>';

            if ($business['address'] !== '') {
                $html .= '<div>'.$this->escape($business['address']).'</div>';
            }

            $phones = array_filter([$business['phone'], $business['phone2']]);

            if ($phones) {
                $html .= '<div>'.implode(' | ', array_map([$this, 'escape'], $phones)).'</div>';
            }

            $html .= '</div>';
        }

        $html .= '<h1>'.$this->escape($title).'</h1>';
        $html .= '<p class="meta">Exported on '.$this->settings->formatDate(now()).'</p>';

        return $html;
    }

    protected function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    protected function readme(array $lines): string
    {
        $business = $this->settings->business();

        $text = "Sabzi Mandi POS - Export of All Data\n";
        $text .= str_repeat('=', 40)."\n\n";
        $text .= 'Business: '.$business['name']."\n";
        $text .= 'Exported: '.now()->format('d-m-Y H:i')."\n\n";
        $text .= "This archive contains every export the POS can produce.\n";
        $text .= "Each category has an Excel workbook (structured rows and columns)\n";
        $text .= "and a PDF (formatted for reading and printing).\n\n";
        $text .= "CONTENTS\n".str_repeat('-', 40)."\n";
        $text .= implode("\n", $lines)."\n\n";
        $text .= "The Excel files are plain .xlsx workbooks - open them in Excel,\n";
        $text .= "LibreOffice or WPS Office.\n";
        $text .= "The PDF files are ordinary PDFs - open them in any PDF reader.\n\n";
        $text .= "This archive contains business data only. No passwords, no\n";
        $text .= "environment settings and no application files are included.\n";
        $text .= "A full restorable database backup is produced separately by\n";
        $text .= "the Backup page.\n";

        return $text;
    }
}
