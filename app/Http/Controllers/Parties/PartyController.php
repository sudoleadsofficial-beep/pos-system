<?php

namespace App\Http\Controllers\Parties;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class PartyController extends Controller
{
    public function __construct(private PartyLedgerService $ledger) {}

    /**
     * Unified Party Management list: farmers, JKC suppliers, buyers and
     * commission agents in one searchable, filterable table.
     */
    public function index(Request $request): Response
    {
        $filters = [
            'search' => $request->input('search'),
            'type' => $request->input('type'),
            'area_id' => $request->input('area_id'),
            'status' => $request->input('status'),
            'balance' => $request->input('balance'),
            'per_page' => $request->input('per_page', 15),
            'page' => $request->input('page', 1),
        ];

        $result = PartyService::list($filters);

        $parties = new LengthAwarePaginator(
            $result['rows'],
            $result['total'],
            $result['per_page'],
            $result['page'],
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        return Inertia::render('parties/index', [
            'parties' => $parties,
            'filters' => [
                'search' => $filters['search'],
                'type' => $filters['type'],
                'area_id' => $filters['area_id'],
                'status' => $filters['status'],
                'balance' => $filters['balance'],
            ],
            'areas' => Area::where('status', 'active')->orderBy('name_ur', 'asc')->get(['id', 'name_en', 'name_ur']),
            'types' => PartyService::types(),
        ]);
    }

    /**
     * One party's ledger (khata).
     */
    public function show(Request $request, string $type, int $id): Response
    {
        abort_unless(PartyService::isValidType($type), 404);

        $party = PartyService::find($type, $id);

        abort_if(! $party, 404);

        $from = $request->input('from_date') ?: null;
        $to = $request->input('to_date') ?: null;

        return Inertia::render('parties/ledger', [
            'party' => PartyService::normalize($type, $party),
            'ledger' => $this->ledger->entries($type, $id, $from, $to),
            'filters' => [
                'from_date' => $from,
                'to_date' => $to,
            ],
            'can_write' => $type !== PartyService::BUYER,
        ]);
    }
}
