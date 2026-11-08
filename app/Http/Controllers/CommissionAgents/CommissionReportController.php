<?php

namespace App\Http\Controllers\CommissionAgents;

use App\Http\Controllers\Controller;
use App\Models\CommissionAgent;
use App\Models\FarmerPurchase;
use App\Models\PartyLedgerEntry;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommissionReportController extends Controller
{
    public function __construct(
        protected PartyLedgerService $ledger,
    ) {}

    public function index(Request $request): Response
    {
        $from = $request->query('from', now()->subMonth()->format('Y-m-d'));
        $to = $request->query('to', date('Y-m-d'));

        return Inertia::render('commission-agents/reports/index', [
            'from' => $from,
            'to' => $to,
            'dailySummary' => $this->dailySummary($from, $to),
            'commissionHistory' => $this->commissionHistory($from, $to),
            'outstanding' => $this->outstanding(),
            'paymentHistory' => $this->paymentHistory($from, $to),
            'totals' => $this->totals($from, $to),
            'agents' => $this->agentOptions(),
        ]);
    }

    protected function dailySummary(string $from, string $to): array
    {
        $rows = FarmerPurchase::query()
            ->whereNotNull('commission_agent_id')
            ->where('commission_amount', '>', 0)
            ->whereBetween('date', [$from, $to])
            ->selectRaw('date, COUNT(*) as entries, SUM(amount) as purchase_amount, SUM(commission_amount) as commission_amount')
            ->groupBy('date')
            ->orderByDesc('date')
            ->get();

        $payments = PartyLedgerEntry::query()
            ->where('party_type', PartyService::COMMISSION_AGENT)
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereBetween('date', [$from, $to])
            ->selectRaw('date, SUM(amount) as paid')
            ->groupBy('date')
            ->pluck('paid', 'date');

        return $rows->map(fn ($row) => [
            'date' => (string) $row->date,
            'entries' => (int) $row->entries,
            'purchase_amount' => (float) $row->purchase_amount,
            'commission_amount' => (float) $row->commission_amount,
            'paid_amount' => (float) ($payments[(string) $row->date] ?? 0),
        ])->all();
    }

    protected function commissionHistory(string $from, string $to): array
    {
        return FarmerPurchase::with(['commissionAgent', 'farmer', 'item'])
            ->whereNotNull('commission_agent_id')
            ->where('commission_amount', '>', 0)
            ->whereBetween('date', [$from, $to])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($purchase) => [
                'id' => $purchase->id,
                'date' => $purchase->date->format('Y-m-d'),
                'reference' => $purchase->reference,
                'agent_id' => $purchase->commission_agent_id,
                'agent_code' => $purchase->commissionAgent?->code,
                'agent_name' => $purchase->commissionAgent?->name_en,
                'agent_name_ur' => $purchase->commissionAgent?->name_ur,
                'farmer_name' => $purchase->farmer?->name_en,
                'farmer_name_ur' => $purchase->farmer?->name_ur,
                'item_name' => $purchase->item?->name_en,
                'item_name_ur' => $purchase->item?->name_ur,
                'nag' => (int) $purchase->nag,
                'amount' => (float) $purchase->amount,
                'commission_percent' => (float) $purchase->commission_percent,
                'commission_amount' => (float) $purchase->commission_amount,
            ])->all();
    }

    protected function outstanding(): array
    {
        $rows = [];

        foreach (CommissionAgent::with('area')->orderBy('code')->get() as $agent) {
            $rows[] = [
                'id' => $agent->id,
                'code' => $agent->code,
                'name_en' => $agent->name_en,
                'name_ur' => $agent->name_ur,
                'phone' => $agent->phone,
                'area' => $agent->area?->name_en,
                'area_ur' => $agent->area?->name_ur,
                'commission_percent' => $agent->commission_percent !== null ? (float) $agent->commission_percent : null,
                'opening_balance' => (float) $agent->opening_balance,
                'current_balance' => (float) $agent->current_balance,
            ];
        }

        return $rows;
    }

    protected function paymentHistory(string $from, string $to): array
    {
        $agents = CommissionAgent::all()->keyBy('id');

        return PartyLedgerEntry::query()
            ->where('party_type', PartyService::COMMISSION_AGENT)
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereBetween('date', [$from, $to])
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get()
            ->map(function ($entry) use ($agents) {
                $agent = $agents->get($entry->party_id);

                return [
                    'id' => $entry->id,
                    'date' => $entry->date->format('Y-m-d'),
                    'agent_id' => $entry->party_id,
                    'agent_code' => $agent?->code,
                    'agent_name' => $agent?->name_en,
                    'agent_name_ur' => $agent?->name_ur,
                    'amount' => (float) $entry->amount,
                    'reference' => $entry->reference,
                    'description' => $entry->description,
                ];
            })->all();
    }

    protected function totals(string $from, string $to): array
    {
        $purchaseStats = FarmerPurchase::query()
            ->whereNotNull('commission_agent_id')
            ->where('commission_amount', '>', 0)
            ->whereBetween('date', [$from, $to])
            ->selectRaw('COUNT(*) as entries, SUM(amount) as total_amount, SUM(commission_amount) as total_commission')
            ->first();

        $paidTotal = (float) PartyLedgerEntry::query()
            ->where('party_type', PartyService::COMMISSION_AGENT)
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM)
            ->whereBetween('date', [$from, $to])
            ->sum('amount');

        $totalOutstanding = (float) CommissionAgent::where('status', 'active')->sum('current_balance');

        return [
            'entries' => (int) ($purchaseStats?->entries ?? 0),
            'total_purchase_amount' => round((float) ($purchaseStats?->total_amount ?? 0), 2),
            'total_commission' => round((float) ($purchaseStats?->total_commission ?? 0), 2),
            'total_paid' => round($paidTotal, 2),
            'total_outstanding' => round($totalOutstanding, 2),
        ];
    }

    protected function agentOptions(): array
    {
        return CommissionAgent::where('status', 'active')->orderBy('code')->get()->map(fn ($agent) => [
            'id' => $agent->id,
            'code' => $agent->code,
            'name_en' => $agent->name_en,
            'name_ur' => $agent->name_ur,
            'commission_percent' => $agent->commission_percent !== null ? (float) $agent->commission_percent : null,
            'current_balance' => (float) $agent->current_balance,
        ])->all();
    }
}
