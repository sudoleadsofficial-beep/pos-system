<?php

namespace App\Http\Controllers\Parties;

use App\Http\Controllers\Controller;
use App\Models\PartyLedgerEntry;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use Illuminate\Http\Request;

class PartyLedgerEntryController extends Controller
{
    public function __construct(private PartyLedgerService $ledger) {}

    /**
     * Record a new ledger entry for a party.
     *
     * Buyer ledgers are read-only: a buyer's rows are derived from the
     * Amroza and Wasooli screens, so they cannot be entered by hand.
     */
    public function store(Request $request, string $type, int $id)
    {
        $this->guardWritable($type);

        abort_if(! PartyService::find($type, $id), 404);

        $validated = $request->validate([
            'date' => 'required|date',
            'direction' => 'required|in:'.PartyLedgerEntry::DIRECTION_JAMA.','.PartyLedgerEntry::DIRECTION_BANAM,
            'amount' => 'required|numeric|min:0.01',
            'category' => 'required|in:payment,advance,consignment,purchase,commission,adjustment,other',
            'description' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
        ]);

        $this->ledger->addEntry($type, $id, $validated + ['created_by' => $request->user()?->id]);

        return back()->with('success', 'Ledger entry added successfully.');
    }

    /**
     * Update a ledger entry.
     */
    public function update(Request $request, string $type, int $id, int $entry)
    {
        $this->guardWritable($type);

        $validated = $request->validate([
            'date' => 'required|date',
            'direction' => 'required|in:'.PartyLedgerEntry::DIRECTION_JAMA.','.PartyLedgerEntry::DIRECTION_BANAM,
            'amount' => 'required|numeric|min:0.01',
            'category' => 'required|in:payment,advance,consignment,purchase,commission,adjustment,other',
            'description' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
        ]);

        $ledgerEntry = PartyLedgerEntry::query()->forParty($type, $id)->findOrFail($entry);

        $this->ledger->updateEntry($type, $ledgerEntry, $validated);

        return back()->with('success', 'Ledger entry updated successfully.');
    }

    /**
     * Delete a ledger entry.
     */
    public function destroy(string $type, int $id, int $entry)
    {
        $this->guardWritable($type);

        $ledgerEntry = PartyLedgerEntry::query()->forParty($type, $id)->findOrFail($entry);

        $this->ledger->deleteEntry($type, $ledgerEntry);

        return back()->with('success', 'Ledger entry deleted successfully.');
    }

    /**
     * Only farmer / JKC supplier / commission agent ledgers can be written.
     */
    protected function guardWritable(string $type): void
    {
        abort_unless(PartyService::isValidType($type), 404);

        if ($type === PartyService::BUYER) {
            abort(403, 'Buyer ledger entries are created from the Amroza and Wasooli screens.');
        }
    }
}
