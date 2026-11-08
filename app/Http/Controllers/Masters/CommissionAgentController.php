<?php

namespace App\Http\Controllers\Masters;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\CommissionAgent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CommissionAgentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = CommissionAgent::with('area');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                    ->orWhere('name_en', 'like', "%{$s}%")
                    ->orWhere('name_ur', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $agents = $query->orderBy('code', 'asc')
            ->paginate($request->per_page ?? 15)
            ->withQueryString();

        $areas = Area::where('status', 'active')->get();

        return Inertia::render('masters/commission-agents/index', [
            'agents' => $agents,
            'areas' => $areas,
            'filters' => $request->only(['search']),
        ]);
    }

    public function search(Request $request)
    {
        $s = $request->get('query', '');

        return CommissionAgent::with('area')
            ->where('status', 'active')
            ->where(function ($q) use ($s) {
                if (! empty($s)) {
                    $q->where('code', 'like', "%{$s}%")
                        ->orWhere('name_en', 'like', "%{$s}%")
                        ->orWhere('name_ur', 'like', "%{$s}%");
                }
            })
            ->orderBy('code', 'asc')
            ->take(20)
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'nullable|integer|unique:commission_agents,code',
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'area_id' => 'nullable|exists:areas,id',
            'opening_balance' => 'nullable|numeric',
            'commission_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        if (empty($validated['name_ur']) && empty($validated['name_en'])) {
            return back()->withErrors(['name_ur' => 'At least one name (Urdu or English) is required.']);
        }

        // code and current_balance are filled in by the model's creating hook.
        CommissionAgent::create($validated + ['created_by' => $request->user()?->id]);

        return back()->with('success', 'Commission agent created successfully.');
    }

    public function update(Request $request, int $id)
    {
        $agent = CommissionAgent::findOrFail($id);

        $validated = $request->validate([
            'code' => "required|integer|unique:commission_agents,code,{$id}",
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'area_id' => 'nullable|exists:areas,id',
            'opening_balance' => 'nullable|numeric',
            'commission_percent' => 'nullable|numeric|min:0|max:100',
            'status' => 'required|string|in:active,inactive',
        ]);

        $agent->update($validated);

        return back()->with('success', 'Commission agent updated successfully.');
    }

    public function destroy(int $id)
    {
        try {
            $agent = CommissionAgent::findOrFail($id);
            $agent->delete();

            return back()->with('success', 'Commission agent deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function payment(Request $request)
    {
        $validated = $request->validate([
            'commission_agent_id' => 'required|exists:commission_agents,id',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
        ]);

        $agentId = (int) $validated['commission_agent_id'];

        app(\App\Services\PartyLedgerService::class)->addEntry(
            \App\Services\PartyService::COMMISSION_AGENT,
            $agentId,
            [
                'date' => $validated['date'],
                'direction' => \App\Models\PartyLedgerEntry::DIRECTION_BANAM,
                'amount' => round((float) $validated['amount'], 2),
                'category' => 'payment',
                'description' => ($validated['description'] ?? null) ?: 'Cash Paid',
                'reference' => $validated['reference'] ?? null,
                'created_by' => $request->user()?->id,
            ]
        );

        return back()->with('success', 'Payment recorded.');
    }
}
