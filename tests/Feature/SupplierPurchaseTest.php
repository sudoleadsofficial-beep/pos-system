<?php

namespace Tests\Feature;

use App\Models\AmrozaSale;
use App\Models\Farmer;
use App\Models\FarmerPurchase;
use App\Models\Item;
use App\Models\JkcSupplier;
use App\Models\Merchant;
use App\Models\PartyLedgerEntry;
use App\Models\SupplierPayment;
use App\Models\SupplierPurchase;
use App\Models\User;
use App\Services\ExportService;
use App\Services\FarmerPurchaseService;
use App\Services\InventoryService;
use App\Services\PartyLedgerService;
use App\Services\PartyService;
use App\Services\SupplierPurchaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Supplier purchases and the supplier khata.
 *
 * A supplier purchase is for MATERIALS, PACKAGING AND SERVICES - crates,
 * jute bags, transport, labour and other supplies. It is NOT a vegetable
 * purchase, so it never creates stock.
 *
 * Calculations:
 *
 *     line amount  = quantity x rate
 *     subtotal     = SUM(line amounts)
 *     total        = subtotal + charges
 *     remaining    = total - paid
 *
 * Accounting:
 *
 *     purchase  -> a Jama entry  (JKC owes the supplier more)
 *     payment   -> a Banam entry (JKC owes the supplier less)
 *
 *     supplier balance = opening + SUM(jama) - SUM(banam)
 */
class SupplierPurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected int $supplierCode = 0;

    protected int $merchantCode = 0;

    protected int $itemNumber = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    protected function makeSupplier(array $attributes = []): JkcSupplier
    {
        $this->supplierCode++;

        return JkcSupplier::create(array_merge([
            'code' => $this->supplierCode,
            'name_en' => 'Test Supplier '.$this->supplierCode,
            'name_ur' => 'ٹیسٹ سپلائر',
            'opening_balance' => 0,
            'current_balance' => 0,
            'status' => 'active',
        ], $attributes));
    }

    protected function makeItem(array $attributes = []): Item
    {
        $this->itemNumber++;

        return Item::create(array_merge([
            'name_en' => 'Onion '.$this->itemNumber,
            'name_ur' => 'پیاز',
            'unit' => 'Mun',
            'default_rate' => 1800,
        ], $attributes));
    }

    protected function makeMerchant(array $attributes = []): Merchant
    {
        $this->merchantCode++;

        return Merchant::create(array_merge([
            'code' => $this->merchantCode + 1,
            'name_en' => 'Test Buyer '.$this->merchantCode,
            'name_ur' => 'ٹیسٹ خریدار',
            'opening_balance' => 0,
        ], $attributes));
    }

    /**
     * The default payload of a purchase with one line.
     */
    protected function payload(array $overrides = []): array
    {
        return array_merge([
            'date' => '2026-11-07',
            'supplier_id' => '',
            'charges' => '0',
            'paid_amount' => '0',
            'payment_method' => 'cash',
            'notes' => null,
            'items' => [
                ['description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
            ],
        ], $overrides);
    }

    /**
     * Post a purchase the way the purchase form does.
     */
    protected function postPurchase(array $overrides = [])
    {
        $supplier = $overrides['supplier'] ?? $this->makeSupplier();
        $payload = $this->payload($overrides['payload'] ?? []);
        $payload['supplier_id'] = $supplier->id;

        $response = $this->post(route('suppliers.purchases.store'), $payload);

        return [$response, $supplier];
    }

    /**
     * The ledger rows of one supplier.
     */
    protected function ledgerRows(int $supplierId): array
    {
        return PartyLedgerEntry::forParty('supplier', $supplierId)->orderBy('id')->get()->all();
    }

    protected function balance(int $supplierId): float
    {
        return app(PartyLedgerService::class)->currentBalance(PartyService::SUPPLIER, $supplierId);
    }

    // -----------------------------------------------------------------
    // Calculations
    // -----------------------------------------------------------------

    public function test_line_amount_is_quantity_times_rate(): void
    {
        $service = app(SupplierPurchaseService::class);

        $this->assertEquals(2500.0, $service->calculateLineAmount(10, 250));
        $this->assertEquals(0.0, $service->calculateLineAmount(0, 250));
        $this->assertEquals(250.25, $service->calculateLineAmount(2.5, 100.1));
    }

    public function test_subtotal_is_the_sum_of_the_line_amounts(): void
    {
        $service = app(SupplierPurchaseService::class);

        $subtotal = $service->calculateSubtotal([
            ['quantity' => 10, 'rate' => 250],
            ['quantity' => 2, 'rate' => 1500],
        ]);

        $this->assertEquals(5500.0, $subtotal);
    }

    public function test_total_is_the_subtotal_plus_the_additional_charges(): void
    {
        $service = app(SupplierPurchaseService::class);

        $this->assertEquals(5800.0, $service->calculateTotal(5500, 300));
        $this->assertEquals(5500.0, $service->calculateTotal(5500, 0));
    }

    public function test_a_purchase_stores_the_calculated_amounts(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'charges' => '300',
                'paid_amount' => '1000',
                'items' => [
                    ['description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
                    ['description' => 'Transport', 'item_id' => null, 'quantity' => '2', 'unit' => 'trip', 'rate' => '1500'],
                ],
            ],
        ]);

        $response->assertRedirect();

        $purchase = SupplierPurchase::first();

        $this->assertEquals(5500.0, (float) $purchase->subtotal);
        $this->assertEquals(5800.0, (float) $purchase->total_amount);
        $this->assertEquals(1000.0, (float) $purchase->paid_amount);
        $this->assertEquals(4800.0, (float) $purchase->remaining_amount);
    }

    public function test_a_payment_cannot_be_more_than_the_purchase_total(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['paid_amount' => '9999'],
        ]);

        $response->assertSessionHasErrors('paid_amount');

        $this->assertSame(0, SupplierPurchase::count());
        $this->assertSame(0, PartyLedgerEntry::count());
    }

    public function test_a_purchase_needs_a_supplier_a_date_and_at_least_one_line(): void
    {
        $this->post(route('suppliers.purchases.store'), [
            'date' => '',
            'supplier_id' => '',
            'items' => [],
        ])->assertSessionHasErrors(['date', 'supplier_id', 'items']);

        $this->assertSame(0, SupplierPurchase::count());
    }

    // -----------------------------------------------------------------
    // Lines
    // -----------------------------------------------------------------

    public function test_a_purchase_can_have_multiple_lines(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'items' => [
                    ['description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
                    ['description' => 'Jute bag', 'item_id' => null, 'quantity' => '50', 'unit' => 'piece', 'rate' => '60'],
                    ['description' => 'Transport', 'item_id' => null, 'quantity' => '2', 'unit' => 'trip', 'rate' => '1500'],
                ],
            ],
        ]);

        $response->assertRedirect();

        $purchase = SupplierPurchase::with('items')->first();

        $this->assertCount(3, $purchase->items);
        $this->assertEquals(8500.0, (float) $purchase->total_amount);
    }

    public function test_the_same_material_may_appear_twice_on_one_purchase(): void
    {
        $item = $this->makeItem();

        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'items' => [
                    ['description' => 'Plastic crate', 'item_id' => $item->id, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
                    ['description' => 'Plastic crate', 'item_id' => $item->id, 'quantity' => '5', 'unit' => 'piece', 'rate' => '250'],
                ],
            ],
        ]);

        $response->assertRedirect();

        $purchase = SupplierPurchase::with('items')->first();

        $this->assertCount(2, $purchase->items);
        $this->assertNotSame($purchase->items[0]->id, $purchase->items[1]->id);
        $this->assertEquals(3750.0, (float) $purchase->total_amount);
    }

    public function test_duplicate_descriptions_are_allowed(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'items' => [
                    ['description' => 'Labour', 'item_id' => null, 'quantity' => '5', 'unit' => 'service', 'rate' => '300'],
                    ['description' => 'Labour', 'item_id' => null, 'quantity' => '3', 'unit' => 'service', 'rate' => '300'],
                ],
            ],
        ]);

        $response->assertRedirect();

        $this->assertCount(2, SupplierPurchase::with('items')->first()->items);
        $this->assertEquals(2400.0, (float) SupplierPurchase::first()->total_amount);
    }

    public function test_an_optional_item_reference_is_stored(): void
    {
        $item = $this->makeItem();

        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'items' => [
                    ['description' => 'Onion sack', 'item_id' => $item->id, 'quantity' => '1', 'unit' => 'piece', 'rate' => '400'],
                ],
            ],
        ]);

        $response->assertRedirect();

        $this->assertSame($item->id, SupplierPurchase::first()->items->first()->item_id);
    }

    // -----------------------------------------------------------------
    // The supplier khata
    // -----------------------------------------------------------------

    public function test_a_purchase_creates_one_jama_entry_for_the_full_amount(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['charges' => '300'],
        ]);

        $rows = $this->ledgerRows($supplier->id);

        $this->assertCount(1, $rows);

        $row = $rows[0];

        $this->assertSame(PartyLedgerEntry::DIRECTION_JAMA, $row->direction);
        $this->assertSame('purchase', $row->category);
        $this->assertEquals(2800.0, (float) $row->amount);
        $this->assertSame(SupplierPurchase::first()->reference, $row->reference);
        $this->assertStringContainsString(SupplierPurchase::first()->reference, (string) $row->description);
    }

    public function test_an_immediate_payment_creates_one_banam_entry(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['paid_amount' => '1000'],
        ]);

        $rows = $this->ledgerRows($supplier->id);

        $this->assertCount(2, $rows);

        $payment = collect($rows)->firstWhere('direction', PartyLedgerEntry::DIRECTION_BANAM);

        $this->assertNotNull($payment);
        $this->assertEquals(1000.0, (float) $payment->amount);
        $this->assertSame('payment', $payment->category);
    }

    public function test_the_supplier_balance_is_opening_plus_jama_minus_banam(): void
    {
        $supplier = $this->makeSupplier(['opening_balance' => 5000]);

        $this->postPurchase([
            'supplier' => $supplier,
            'payload' => ['paid_amount' => '1000'],
        ]);

        $supplier->refresh();

        // 5000 opening + 2500 purchase - 1000 paid
        $this->assertEquals(6500.0, (float) $supplier->current_balance);
        $this->assertEquals(6500.0, $this->balance($supplier->id));
    }

    public function test_a_later_payment_lowers_what_jkc_owes(): void
    {
        [$response, $supplier] = $this->postPurchase();

        $this->assertEquals(2500.0, $this->balance($supplier->id));

        $this->post(route('suppliers.payments.store'), [
            'supplier_id' => $supplier->id,
            'date' => '2026-11-08',
            'amount' => '800',
            'payment_method' => 'bank',
            'reference' => 'TRF-99',
            'note' => 'Bank transfer',
        ])->assertRedirect();

        $this->assertEquals(1700.0, $this->balance($supplier->id));

        $payment = SupplierPayment::first();

        $this->assertEquals(800.0, (float) $payment->amount);
        $this->assertSame('bank', $payment->payment_method);
        $this->assertSame('TRF-99', $payment->reference);
        $this->assertSame('Bank transfer', $payment->note);
        $this->assertSame('2026-11-08', $payment->date->format('Y-m-d'));
    }

    public function test_every_later_payment_keeps_its_own_ledger_row(): void
    {
        [$response, $supplier] = $this->postPurchase();

        $this->post(route('suppliers.payments.store'), [
            'supplier_id' => $supplier->id, 'date' => '2026-11-08', 'amount' => '500',
        ]);
        $this->post(route('suppliers.payments.store'), [
            'supplier_id' => $supplier->id, 'date' => '2026-11-09', 'amount' => '700',
        ]);

        $payments = collect($this->ledgerRows($supplier->id))
            ->where('direction', PartyLedgerEntry::DIRECTION_BANAM);

        $this->assertCount(2, $payments);
        $this->assertEquals(1200.0, (float) $payments->sum('amount'));

        // 2500 purchased - 1200 paid later
        $this->assertEquals(1300.0, $this->balance($supplier->id));
    }

    public function test_a_later_payment_never_overwrites_the_on_the_spot_payment(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['paid_amount' => '1000'],
        ]);

        $this->post(route('suppliers.payments.store'), [
            'supplier_id' => $supplier->id, 'date' => '2026-11-08', 'amount' => '500',
        ]);

        $purchase = SupplierPurchase::first();

        // The purchase still carries its own payment row.
        $this->assertEquals(1000.0, (float) $purchase->paid_amount);
        $this->assertNotNull($purchase->payment_ledger_entry_id);

        $rows = $this->ledgerRows($supplier->id);

        $this->assertCount(3, $rows);
    }

    public function test_the_purchase_category_is_allowed_in_the_khata(): void
    {
        $supplier = $this->makeSupplier();

        $this->post(route('parties.entries.store', ['type' => 'supplier', 'id' => $supplier->id]), [
            'date' => '2026-11-07',
            'direction' => 'jama',
            'amount' => '500',
            'category' => 'purchase',
            'description' => 'Manual purchase row',
        ])->assertRedirect();

        $this->assertSame(1, PartyLedgerEntry::forParty('supplier', $supplier->id)->count());
    }

    // -----------------------------------------------------------------
    // Editing
    // -----------------------------------------------------------------

    public function test_editing_a_purchase_does_not_create_a_second_ledger_row(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['paid_amount' => '1000'],
        ]);

        $purchase = SupplierPurchase::first();

        $this->assertCount(2, $this->ledgerRows($supplier->id));

        $this->put(route('suppliers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'supplier_id' => $supplier->id,
            'charges' => '0',
            'paid_amount' => '1000',
            'payment_method' => 'cash',
            'notes' => null,
            'items' => [
                ['id' => $purchase->items->first()->id, 'description' => 'Plastic crate', 'item_id' => null, 'quantity' => '20', 'unit' => 'piece', 'rate' => '250'],
            ],
        ])->assertRedirect();

        $this->assertCount(2, $this->ledgerRows($supplier->id));

        $jama = collect($this->ledgerRows($supplier->id))->firstWhere('direction', PartyLedgerEntry::DIRECTION_JAMA);

        $this->assertEquals(5000.0, (float) $jama->amount);
        $this->assertEquals(4000.0, $this->balance($supplier->id));
    }

    public function test_editing_the_immediate_payment_updates_the_same_banam_row(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['paid_amount' => '1000'],
        ]);

        $purchase = SupplierPurchase::first();
        $paymentEntryId = $purchase->payment_ledger_entry_id;

        $this->put(route('suppliers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'supplier_id' => $supplier->id,
            'charges' => '0',
            'paid_amount' => '1500',
            'payment_method' => 'cash',
            'notes' => null,
            'items' => $purchase->items->map(fn ($line) => [
                'id' => $line->id, 'description' => $line->description, 'item_id' => null,
                'quantity' => (string) $line->quantity, 'unit' => $line->unit, 'rate' => (string) $line->rate,
            ])->all(),
        ])->assertRedirect();

        $this->assertCount(2, $this->ledgerRows($supplier->id));

        $payment = collect($this->ledgerRows($supplier->id))->firstWhere('direction', PartyLedgerEntry::DIRECTION_BANAM);

        $this->assertSame($paymentEntryId, (int) $payment->id);
        $this->assertEquals(1500.0, (float) $payment->amount);
    }

    public function test_removing_the_on_the_spot_payment_removes_its_ledger_row(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['paid_amount' => '1000'],
        ]);

        $purchase = SupplierPurchase::first();

        $this->put(route('suppliers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'supplier_id' => $supplier->id,
            'charges' => '0',
            'paid_amount' => '0',
            'payment_method' => 'cash',
            'notes' => null,
            'items' => $purchase->items->map(fn ($line) => [
                'id' => $line->id, 'description' => $line->description, 'item_id' => null,
                'quantity' => (string) $line->quantity, 'unit' => $line->unit, 'rate' => (string) $line->rate,
            ])->all(),
        ])->assertRedirect();

        $this->assertCount(1, $this->ledgerRows($supplier->id));
        $this->assertEquals(2500.0, $this->balance($supplier->id));
    }

    public function test_editing_the_lines_does_not_create_another_ledger_row(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'items' => [
                    ['description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
                    ['description' => 'Transport', 'item_id' => null, 'quantity' => '2', 'unit' => 'trip', 'rate' => '1500'],
                ],
            ],
        ]);

        $purchase = SupplierPurchase::with('items')->first();

        $this->assertCount(1, $this->ledgerRows($supplier->id));

        // Keep the first line, change the second, drop nothing.
        $this->put(route('suppliers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'supplier_id' => $supplier->id,
            'charges' => '0',
            'paid_amount' => '0',
            'payment_method' => 'cash',
            'notes' => null,
            'items' => [
                ['id' => $purchase->items[0]->id, 'description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
                ['id' => $purchase->items[1]->id, 'description' => 'Transport', 'item_id' => null, 'quantity' => '3', 'unit' => 'trip', 'rate' => '1500'],
            ],
        ])->assertRedirect();

        $this->assertCount(1, $this->ledgerRows($supplier->id));
        $this->assertCount(2, SupplierPurchase::with('items')->first()->items);
        $this->assertEquals(7000.0, $this->balance($supplier->id));
    }

    public function test_a_removed_line_is_deleted(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'items' => [
                    ['description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
                    ['description' => 'Transport', 'item_id' => null, 'quantity' => '2', 'unit' => 'trip', 'rate' => '1500'],
                ],
            ],
        ]);

        $purchase = SupplierPurchase::with('items')->first();

        $this->put(route('suppliers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'supplier_id' => $supplier->id,
            'charges' => '0',
            'paid_amount' => '0',
            'payment_method' => 'cash',
            'notes' => null,
            'items' => [
                ['id' => $purchase->items[0]->id, 'description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
            ],
        ])->assertRedirect();

        $this->assertCount(1, SupplierPurchase::with('items')->first()->items);
        $this->assertEquals(2500.0, $this->balance($supplier->id));
    }

    public function test_moving_a_purchase_to_another_supplier_fixes_both_balances(): void
    {
        $first = $this->makeSupplier();
        $second = $this->makeSupplier();

        [$response] = $this->postPurchase(['supplier' => $first]);

        $purchase = SupplierPurchase::first();

        $this->put(route('suppliers.purchases.update', $purchase->id), [
            'date' => '2026-11-07',
            'supplier_id' => $second->id,
            'charges' => '0',
            'paid_amount' => '0',
            'payment_method' => 'cash',
            'notes' => null,
            'items' => $purchase->items->map(fn ($line) => [
                'id' => $line->id, 'description' => $line->description, 'item_id' => null,
                'quantity' => (string) $line->quantity, 'unit' => $line->unit, 'rate' => (string) $line->rate,
            ])->all(),
        ])->assertRedirect();

        $first->refresh();
        $second->refresh();

        $this->assertEquals(0.0, (float) $first->current_balance);
        $this->assertEquals(2500.0, (float) $second->current_balance);
    }

    public function test_editing_a_later_payment_updates_the_same_ledger_row(): void
    {
        [$response, $supplier] = $this->postPurchase();

        $this->post(route('suppliers.payments.store'), [
            'supplier_id' => $supplier->id, 'date' => '2026-11-08', 'amount' => '500',
        ]);

        $payment = SupplierPayment::first();
        $entryId = $payment->ledger_entry_id;

        $this->put(route('suppliers.payments.update', $payment->id), [
            'supplier_id' => $supplier->id,
            'date' => '2026-11-09',
            'amount' => '900',
            'payment_method' => 'cheque',
            'reference' => 'CHQ-7',
            'note' => null,
        ])->assertRedirect();

        $this->assertCount(2, $this->ledgerRows($supplier->id));

        $banam = collect($this->ledgerRows($supplier->id))->firstWhere('direction', PartyLedgerEntry::DIRECTION_BANAM);

        $this->assertSame($entryId, (int) $banam->id);
        $this->assertEquals(900.0, (float) $banam->amount);
        $this->assertEquals(1600.0, $this->balance($supplier->id));
    }

    public function test_deleting_a_later_payment_restores_the_balance(): void
    {
        [$response, $supplier] = $this->postPurchase();

        $this->post(route('suppliers.payments.store'), [
            'supplier_id' => $supplier->id, 'date' => '2026-11-08', 'amount' => '500',
        ]);

        $this->assertEquals(2000.0, $this->balance($supplier->id));

        $this->delete(route('suppliers.payments.destroy', SupplierPayment::first()->id))->assertRedirect();

        $this->assertEquals(2500.0, $this->balance($supplier->id));
        $this->assertCount(1, $this->ledgerRows($supplier->id));
    }

    // -----------------------------------------------------------------
    // Deleting a purchase
    // -----------------------------------------------------------------

    public function test_deleting_a_purchase_removes_only_its_own_ledger_rows(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['paid_amount' => '1000'],
        ]);

        // A manual row the user added by hand.
        $manual = PartyLedgerEntry::create([
            'party_type' => 'supplier',
            'party_id' => $supplier->id,
            'date' => '2026-11-06',
            'direction' => PartyLedgerEntry::DIRECTION_BANAM,
            'amount' => 250,
            'category' => 'payment',
            'description' => 'Manual row',
        ]);

        $purchase = SupplierPurchase::first();

        $this->delete(route('suppliers.purchases.destroy', $purchase->id))->assertRedirect();

        $rows = $this->ledgerRows($supplier->id);

        $this->assertCount(1, $rows);
        $this->assertSame((int) $manual->id, (int) $rows[0]->id);

        // The manual row is a payment JKC made, so the supplier is owed -250.
        $this->assertEquals(-250.0, $this->balance($supplier->id));
    }

    public function test_deleting_a_purchase_leaves_later_payments_alone(): void
    {
        [$response, $supplier] = $this->postPurchase();

        $this->post(route('suppliers.payments.store'), [
            'supplier_id' => $supplier->id, 'date' => '2026-11-08', 'amount' => '500',
        ]);

        $this->delete(route('suppliers.purchases.destroy', SupplierPurchase::first()->id))->assertRedirect();

        // The later payment is its own record and must survive.
        $this->assertSame(1, SupplierPayment::count());
        $this->assertEquals(-500.0, $this->balance($supplier->id));
    }

    public function test_deleting_a_purchase_removes_its_lines(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => [
                'items' => [
                    ['description' => 'Plastic crate', 'item_id' => null, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
                    ['description' => 'Transport', 'item_id' => null, 'quantity' => '2', 'unit' => 'trip', 'rate' => '1500'],
                ],
            ],
        ]);

        $this->assertSame(2, \App\Models\SupplierPurchaseItem::count());

        $this->delete(route('suppliers.purchases.destroy', SupplierPurchase::first()->id));

        $this->assertSame(0, \App\Models\SupplierPurchaseItem::count());
    }

    // -----------------------------------------------------------------
    // Historical balance date filtering
    // -----------------------------------------------------------------

    public function test_the_balance_on_a_date_counts_both_stored_date_formats(): void
    {
        $supplier = $this->makeSupplier(['opening_balance' => 1000]);

        // A row written as a plain date, and a row written with a time part.
        DB::table('party_ledger_entries')->insert([
            [
                'party_type' => 'supplier', 'party_id' => $supplier->id,
                'date' => '2026-11-06', 'direction' => 'jama', 'amount' => 5000,
                'category' => 'payment', 'description' => 'Plain date row', 'reference' => null,
                'created_at' => '2026-11-06 10:00:00', 'updated_at' => '2026-11-06 10:00:00',
            ],
            [
                'party_type' => 'supplier', 'party_id' => $supplier->id,
                'date' => '2026-11-06 00:00:00', 'direction' => 'banam', 'amount' => 2000,
                'category' => 'payment', 'description' => 'Timestamp row', 'reference' => null,
                'created_at' => '2026-11-06 10:00:00', 'updated_at' => '2026-11-06 10:00:00',
            ],
        ]);

        $service = app(PartyLedgerService::class);

        // 1000 opening + 5000 - 2000 = 4000
        $this->assertEquals(4000.0, $service->balanceOn(PartyService::SUPPLIER, $supplier->id, '2026-11-06'));
        $this->assertEquals(4000.0, $service->currentBalance(PartyService::SUPPLIER, $supplier->id));

        // A date before the rows must not see them.
        $this->assertEquals(1000.0, $service->balanceOn(PartyService::SUPPLIER, $supplier->id, '2026-11-05'));
    }

    public function test_the_historical_farmer_balance_is_correct_for_both_date_formats(): void
    {
        $farmer = Farmer::create([
            'code' => 1, 'name_en' => 'Farmer', 'name_ur' => 'کسان',
            'opening_balance' => 1000, 'current_balance' => 1000, 'status' => 'active',
        ]);

        DB::table('party_ledger_entries')->insert([
            [
                'party_type' => 'farmer', 'party_id' => $farmer->id,
                'date' => '2026-11-06', 'direction' => 'jama', 'amount' => 3000,
                'category' => 'consignment', 'description' => 'Plain date row', 'reference' => null,
                'created_at' => '2026-11-06 10:00:00', 'updated_at' => '2026-11-06 10:00:00',
            ],
            [
                'party_type' => 'farmer', 'party_id' => $farmer->id,
                'date' => '2026-11-06 00:00:00', 'direction' => 'banam', 'amount' => 1000,
                'category' => 'payment', 'description' => 'Timestamp row', 'reference' => null,
                'created_at' => '2026-11-06 10:00:00', 'updated_at' => '2026-11-06 10:00:00',
            ],
        ]);

        $service = app(PartyLedgerService::class);

        // 1000 opening + 3000 - 1000 = 3000
        $this->assertEquals(3000.0, $service->balanceOn(PartyService::FARMER, $farmer->id, '2026-11-06'));
    }

    public function test_a_new_purchase_writes_a_plain_date_into_the_ledger(): void
    {
        [$response, $supplier] = $this->postPurchase();

        $stored = DB::table('party_ledger_entries')
            ->where('party_type', 'supplier')
            ->value('date');

        $this->assertSame('2026-11-07', $stored);
    }

    // -----------------------------------------------------------------
    // Nothing else moves
    // -----------------------------------------------------------------

    public function test_farmer_balances_are_not_changed_by_a_supplier_purchase(): void
    {
        $farmer = Farmer::create([
            'code' => 1, 'name_en' => 'Farmer', 'name_ur' => 'کسان',
            'opening_balance' => 1000, 'current_balance' => 1000, 'status' => 'active',
        ]);

        app(FarmerPurchaseService::class)->create([
            'date' => '2026-11-06',
            'farmer_id' => $farmer->id,
            'item_id' => $this->makeItem()->id,
            'nag' => 2, 'weight' => 40, 'rate' => 1600, 'charges' => 0, 'paid_amount' => 500,
            'created_by' => $this->user->id,
        ]);

        $farmer->refresh();
        $farmerBalance = (float) $farmer->current_balance;

        $this->postPurchase();

        $farmer->refresh();

        $this->assertEquals($farmerBalance, (float) $farmer->current_balance);

        // 1000 opening + 3200 purchased - 500 paid
        $this->assertEquals(3700.0, $farmerBalance);
    }

    public function test_merchant_balances_are_not_changed_by_a_supplier_purchase(): void
    {
        $merchant = $this->makeMerchant(['opening_balance' => 1000]);
        $item = $this->makeItem();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-06',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $balance = (float) $merchant->fresh()->current_balance;

        $this->assertEquals(4600.0, $balance);

        $this->postPurchase();

        $this->assertEquals($balance, (float) $merchant->fresh()->current_balance);
    }

    public function test_the_inventory_is_not_changed_by_a_supplier_purchase(): void
    {
        $farmer = Farmer::create([
            'code' => 1, 'name_en' => 'Farmer', 'name_ur' => 'کسان',
            'opening_balance' => 0, 'current_balance' => 0, 'status' => 'active',
        ]);
        $item = $this->makeItem();

        app(FarmerPurchaseService::class)->create([
            'date' => '2026-11-06',
            'farmer_id' => $farmer->id,
            'item_id' => $item->id,
            'nag' => 5, 'weight' => 100, 'rate' => 1600, 'charges' => 0, 'paid_amount' => 0,
            'created_by' => $this->user->id,
        ]);

        $inventory = app(InventoryService::class);

        $before = $inventory->summary();
        $this->assertEquals(5.0, $before[0]['received_bags']);

        $this->postPurchase(['payload' => [
            'items' => [
                ['description' => 'Plastic crate', 'item_id' => $item->id, 'quantity' => '10', 'unit' => 'piece', 'rate' => '250'],
            ],
        ]]);

        $after = $inventory->summary();

        $this->assertEquals($before[0]['received_bags'], $after[0]['received_bags']);
        $this->assertEquals($before[0]['remaining_bags'], $after[0]['remaining_bags']);
        $this->assertEquals($before[0]['remaining_weight'], $after[0]['remaining_weight']);
        $this->assertEquals(5.0, $after[0]['remaining_bags']);
    }

    public function test_amroza_sales_are_not_rewritten_by_a_supplier_purchase(): void
    {
        $merchant = $this->makeMerchant();
        $item = $this->makeItem();

        $this->post(route('merchants.amroza.store'), [
            'date' => '2026-11-06',
            'merchant_id' => $merchant->id,
            'item_id' => $item->id,
            'nag' => 2,
            'weight' => 40,
            'rate' => 1800,
            'bardana' => 0,
            'payment_type' => 'naqdi',
        ])->assertRedirect();

        $before = DB::table('amroza_sales')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();

        $this->postPurchase();

        $after = DB::table('amroza_sales')->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();

        $this->assertEquals($before, $after);
        $this->assertSame(1, AmrozaSale::count());
    }

    // -----------------------------------------------------------------
    // References, screens and export
    // -----------------------------------------------------------------

    public function test_the_reference_is_generated_and_unique(): void
    {
        $this->postPurchase();
        $this->postPurchase();

        $references = SupplierPurchase::pluck('reference')->all();

        $this->assertSame('SUP-2026-0001', $references[0]);
        $this->assertSame('SUP-2026-0002', $references[1]);
        $this->assertCount(2, array_unique($references));
    }

    public function test_the_screens_load(): void
    {
        $this->get(route('suppliers.purchases.index'))->assertOk();
        $this->get(route('suppliers.reports'))->assertOk();
    }

    public function test_the_supplier_purchases_can_be_exported(): void
    {
        [$response, $supplier] = $this->postPurchase();

        $export = app(ExportService::class);

        $this->assertArrayHasKey('supplier_purchases', $export->categories());

        $dataset = $export->dataset('supplier_purchases');

        $this->assertCount(1, $dataset['rows']);
        $this->assertSame('SUP-2026-0001', $dataset['rows'][0][1]);
        $this->assertEquals(2500.0, (float) $dataset['rows'][0][8]);

        $this->get('/system/export/supplier_purchases/excel')->assertOk();
        $this->get('/system/export/supplier_purchases/pdf')->assertOk();
    }

    public function test_the_existing_export_categories_still_work(): void
    {
        $export = app(ExportService::class);

        foreach (['farmers', 'buyers', 'suppliers', 'supplier_ledgers', 'amroza_sales', 'farmer_purchases'] as $key) {
            $this->assertArrayHasKey($key, $export->categories());
            $this->assertIsArray($export->dataset($key));
        }
    }

    public function test_the_reports_screen_shows_the_totals(): void
    {
        [$response, $supplier] = $this->postPurchase([
            'payload' => ['charges' => '300', 'paid_amount' => '1000'],
        ]);

        $this->get(route('suppliers.reports', ['from' => '2026-11-01', 'to' => '2026-11-30']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('suppliers/reports/index')
                ->where('totals.purchases', 1)
                ->where('totals.purchase_total', 2800)
                ->where('totals.paid_on_purchase', 1000)
                ->where('totals.remaining_total', 1800)
            );
    }
}
