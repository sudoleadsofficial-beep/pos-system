<?php

namespace App\Http\Controllers\Masters;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MerchantController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Merchant::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                  ->orWhere('name_en', 'like', "%{$s}%")
                  ->orWhere('name_ur', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $merchants = $query->orderBy('code', 'asc')
            ->paginate($request->per_page ?? 15)
            ->withQueryString();

        return Inertia::render('masters/merchants/index', [
            'merchants' => $merchants,
            'filters' => $request->only(['search']),
        ]);
    }

    public function search(Request $request)
    {
        $s = $request->get('query', '');
        return Merchant::query()
            ->where('status', 'active')
            ->where(function ($q) use ($s) {
                if (!empty($s)) {
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
            'code' => 'nullable|integer|unique:merchants,code',
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'opening_balance' => 'nullable|numeric',
        ]);

        if (empty($validated['name_ur']) && empty($validated['name_en'])) {
            return back()->withErrors(['name_ur' => 'At least one name (Urdu or English) is required.']);
        }

        if (empty($validated['code'])) {
            $validated['code'] = ((int) Merchant::max('code')) + 1;
        }

        $validated['current_balance'] = $validated['opening_balance'] ?? 0;
        Merchant::create($validated);

        return back()->with('success', 'Merchant created successfully.');
    }

    public function update(Request $request, int $id)
    {
        $merchant = Merchant::findOrFail($id);

        $validated = $request->validate([
            'code' => "required|integer|unique:merchants,code,{$id}",
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'opening_balance' => 'nullable|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        if ($merchant->isNaqdi() && (int)$validated['code'] !== 1) {
            return back()->withErrors(['code' => 'Cannot change code for protected Naqdi record.']);
        }

        $merchant->update($validated);

        return back()->with('success', 'Merchant updated successfully.');
    }

    public function destroy(int $id)
    {
        try {
            $merchant = Merchant::findOrFail($id);
            if ($merchant->isNaqdi()) {
                return back()->with('error', 'Merchant code 1 (Naqdi) cannot be deleted.');
            }
            $merchant->delete();
            return back()->with('success', 'Merchant deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
