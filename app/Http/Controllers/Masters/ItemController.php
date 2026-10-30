<?php

namespace App\Http\Controllers\Masters;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Item::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name_en', 'like', "%{$s}%")
                  ->orWhere('name_ur', 'like', "%{$s}%")
                  ->orWhere('unit', 'like', "%{$s}%");
            });
        }

        $items = $query->orderBy('name_ur', 'asc')
            ->paginate($request->per_page ?? 15)
            ->withQueryString();

        return Inertia::render('masters/items/index', [
            'items' => $items,
            'filters' => $request->only(['search']),
        ]);
    }

    public function search(Request $request)
    {
        $s = $request->get('query', '');
        return Item::query()
            ->where('status', 'active')
            ->where(function ($q) use ($s) {
                if (!empty($s)) {
                    $q->where('name_en', 'like', "%{$s}%")
                      ->orWhere('name_ur', 'like', "%{$s}%");
                }
            })
            ->orderBy('id', 'asc')
            ->take(20)
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'unit' => 'required|string|max:50',
            'default_rate' => 'nullable|numeric',
            'default_bardana' => 'nullable|numeric',
        ]);

        if (empty($validated['name_ur']) && empty($validated['name_en'])) {
            return back()->withErrors(['name_ur' => 'At least one name (Urdu or English) is required.']);
        }

        Item::create($validated);

        return back()->with('success', 'Item created successfully.');
    }

    public function update(Request $request, int $id)
    {
        $item = Item::findOrFail($id);

        $validated = $request->validate([
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'unit' => 'required|string|max:50',
            'default_rate' => 'nullable|numeric',
            'default_bardana' => 'nullable|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        $item->update($validated);

        return back()->with('success', 'Item updated successfully.');
    }

    public function destroy(int $id)
    {
        try {
            $item = Item::findOrFail($id);
            $item->delete();
            return back()->with('success', 'Item deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
