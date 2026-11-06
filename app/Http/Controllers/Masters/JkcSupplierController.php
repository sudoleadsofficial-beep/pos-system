<?php

namespace App\Http\Controllers\Masters;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\JkcSupplier;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JkcSupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $query = JkcSupplier::with('area');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                    ->orWhere('name_en', 'like', "%{$s}%")
                    ->orWhere('name_ur', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        $suppliers = $query->orderBy('code', 'asc')
            ->paginate($request->per_page ?? 15)
            ->withQueryString();

        $areas = Area::where('status', 'active')->get();

        return Inertia::render('masters/suppliers/index', [
            'suppliers' => $suppliers,
            'areas' => $areas,
            'filters' => $request->only(['search']),
        ]);
    }

    public function search(Request $request)
    {
        $s = $request->get('query', '');

        return JkcSupplier::with('area')
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
            'code' => 'nullable|integer|unique:jkc_suppliers,code',
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'area_id' => 'nullable|exists:areas,id',
            'opening_balance' => 'nullable|numeric',
        ]);

        if (empty($validated['name_ur']) && empty($validated['name_en'])) {
            return back()->withErrors(['name_ur' => 'At least one name (Urdu or English) is required.']);
        }

        // code and current_balance are filled in by the model's creating hook.
        JkcSupplier::create($validated + ['created_by' => $request->user()?->id]);

        return back()->with('success', 'Supplier created successfully.');
    }

    public function update(Request $request, int $id)
    {
        $supplier = JkcSupplier::findOrFail($id);

        $validated = $request->validate([
            'code' => "required|integer|unique:jkc_suppliers,code,{$id}",
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'area_id' => 'nullable|exists:areas,id',
            'opening_balance' => 'nullable|numeric',
            'status' => 'required|string|in:active,inactive',
        ]);

        $supplier->update($validated);

        return back()->with('success', 'Supplier updated successfully.');
    }

    public function destroy(int $id)
    {
        try {
            $supplier = JkcSupplier::findOrFail($id);
            $supplier->delete();

            return back()->with('success', 'Supplier deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
