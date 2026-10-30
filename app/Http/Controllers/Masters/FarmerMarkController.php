<?php

namespace App\Http\Controllers\Masters;

use App\Http\Controllers\Controller;
use App\Models\Farmer;
use App\Models\FarmerMark;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FarmerMarkController extends Controller
{
    public function index(Request $request): Response
    {
        $query = FarmerMark::with('farmer');

        if ($request->filled('farmer_id')) {
            $query->where('farmer_id', $request->farmer_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name_en', 'like', "%{$s}%")
                  ->orWhere('name_ur', 'like', "%{$s}%")
                  ->orWhereHas('farmer', function ($fq) use ($s) {
                      $fq->where('name_en', 'like', "%{$s}%")
                         ->orWhere('name_ur', 'like', "%{$s}%");
                  });
            });
        }

        $marks = $query->orderBy('farmer_id', 'asc')
            ->orderBy('code', 'asc')
            ->paginate($request->per_page ?? 15)
            ->withQueryString();

        $farmers = Farmer::where('status', 'active')->select(['id', 'code', 'name_en', 'name_ur'])->get();

        return Inertia::render('masters/marks/index', [
            'marks' => $marks,
            'farmers' => $farmers,
            'filters' => $request->only(['search', 'farmer_id']),
        ]);
    }

    public function byFarmer(int $farmerId)
    {
        return FarmerMark::where('farmer_id', $farmerId)
            ->orderBy('code', 'asc')
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'farmer_id' => 'required|exists:farmers,id',
            'code' => 'nullable|integer',
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
        ]);

        if (empty($validated['code'])) {
            $maxCode = FarmerMark::where('farmer_id', $validated['farmer_id'])->max('code');
            $validated['code'] = ($maxCode !== null) ? $maxCode + 1 : 1;
        }

        FarmerMark::create($validated);

        return back()->with('success', 'Farmer mark created successfully.');
    }

    public function update(Request $request, int $id)
    {
        $mark = FarmerMark::findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|integer',
            'name_ur' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
        ]);

        $mark->update($validated);

        return back()->with('success', 'Farmer mark updated successfully.');
    }

    public function destroy(int $id)
    {
        try {
            $mark = FarmerMark::findOrFail($id);
            if ((int)$mark->code === 0) {
                return back()->with('error', 'Default Mark (0 = Khud) cannot be deleted.');
            }
            $mark->delete();
            return back()->with('success', 'Farmer mark deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
