<?php

namespace App\Http\Controllers\Masters;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Farmer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FarmerController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Farmer::with(['area', 'marks']);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                  ->orWhere('name_en', 'like', "%{$s}%")
                  ->orWhere('name_ur', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $farmers = $query->orderBy('code', 'asc')
            ->paginate($request->per_page ?? 15)
            ->withQueryString();

        $areas = Area::where('status', 'active')->get();

        return Inertia::render('masters/farmers/index', [
            'farmers' => $farmers,
            'areas' => $areas,
            'filters' => $request->only(['search']),
        ]);
    }

    public function search(Request $request)
    {
        $s = $request->get('query', '');
        return Farmer::with(['area', 'marks'])
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
            'code' => 'nullable|integer|unique:farmers,code',
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'area_id' => 'nullable|exists:areas,id',
            'opening_balance' => 'nullable|numeric',
        ]);

        if (empty($validated['name_ur']) && empty($validated['name_en'])) {
            return back()->withErrors(['name_ur' => 'At least one name (Urdu or English) is required.']);
        }

        if (empty($validated['code'])) {
            $validated['code'] = ((int) Farmer::max('code')) + 1;
        }

        $validated['current_balance'] = $validated['opening_balance'] ?? 0;
        Farmer::create($validated);

        return back()->with('success', 'Farmer created successfully.');
    }

    public function update(Request $request, int $id)
    {
        $farmer = Farmer::findOrFail($id);

        $validated = $request->validate([
            'code' => "required|integer|unique:farmers,code,{$id}",
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'area_id' => 'nullable|exists:areas,id',
            'opening_balance' => 'nullable|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        $farmer->update($validated);

        return back()->with('success', 'Farmer updated successfully.');
    }

    public function destroy(int $id)
    {
        try {
            $farmer = Farmer::findOrFail($id);
            $farmer->delete();
            return back()->with('success', 'Farmer deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
