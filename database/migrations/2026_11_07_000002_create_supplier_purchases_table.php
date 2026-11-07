<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Supplier purchases for materials, packaging and services.
     *
     * These purchases are NOT vegetables. They never touch the vegetable
     * inventory - they only move the supplier's payable balance.
     *
     * The supplier's balance is NOT stored here. It belongs to the party
     * ledger - PartyLedgerService owns the supplier balance and recalculates
     * it from the ledger entries.
     *
     * ledger_entry_id        -> the Jama row (what JKC owes the supplier)
     * payment_ledger_entry_id -> the Banam row (the payment made on the spot)
     *
     * Both ids let an edit update the same rows instead of creating a second
     * pair, and they are the only link back to the ledger, so a delete can
     * remove exactly its own rows and nothing else.
     */
    public function up(): void
    {
        Schema::create('supplier_purchases', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('reference')->unique();

            $table->foreignId('supplier_id')->constrained('jkc_suppliers')->nullOnDelete();

            // Additional charges on top of the line subtotal.
            $table->decimal('charges', 14, 2)->default(0);

            // subtotal = SUM(line amounts)
            // total_amount = subtotal + charges
            // remaining_amount = total_amount - paid_amount
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('total_amount', 14, 2)->default(0);
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('remaining_amount', 14, 2)->default(0);

            $table->string('payment_method', 30)->nullable();
            $table->text('notes')->nullable();

            $table->unsignedBigInteger('ledger_entry_id')->nullable();
            $table->unsignedBigInteger('payment_ledger_entry_id')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['supplier_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_purchases');
    }
};
