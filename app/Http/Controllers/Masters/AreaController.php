<?php

namespace App\Http\Controllers\Masters;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AreaController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Area::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name_en', 'like', "%{$s}%")
                  ->orWhere('name_ur', 'like', "%{$s}%");
            });
        }

        $areas = $query->orderBy('name_ur', 'asc')
            ->paginate($request->per_page ?? 15)
            ->withQueryString();

        return Inertia::render('masters/areas/index', [
            'areas' => $areas,
            'filters' => $request->only(['search']),
        ]);
    }

    public function search(Request $request)
    {
        $s = $request->get('query', '');
        return Area::query()
            ->where('status', 'active')
            ->where(function ($q) use ($s) {
                if (!empty($s)) {
                    $q->where('name_en', 'like', "%{$s}%")
                      ->orWhere('name_ur', 'like', "%{$s}%");
                }
            })
            ->orderBy('id', 'asc')
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
        ]);

        if (empty($validated['name_ur']) && empty($validated['name_en'])) {
            return back()->withErrors(['name_ur' => 'At least one name (Urdu or English) is required.']);
        }

        Area::create($validated);

        return back()->with('success', 'Area created successfully.');
    }

    public function update(Request $request, int $id)
    {
        $area = Area::findOrFail($id);

        $validated = $request->validate([
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'status' => 'required|string|in:active,inactive',
        ]);

        $area->update($validated);

        return back()->with('success', 'Area updated successfully.');
    }

    public function destroy(int $id)
    {
        try {
            $area = Area::findOrFail($id);
            $area->delete();
            return back()->with('success', 'Area deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
