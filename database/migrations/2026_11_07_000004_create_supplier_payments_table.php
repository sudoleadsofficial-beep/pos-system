<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payments made to a supplier AFTER the purchase was recorded.
     *
     * The payment made on the spot belongs to the purchase header
     * (supplier_purchases.paid_amount / payment_ledger_entry_id). Later
     * payments are separate transaction records against the supplier and
     * never overwrite the on-the-spot payment.
     *
     * This table exists because the party ledger has no field for a payment
     * method: it stores date, direction, amount, category, description and
     * reference only. Keeping the method, the reference and the note here
     * preserves them for the payment history report.
     *
     * ledger_entry_id points at the Banam row this payment owns, so an edit
     * updates that row instead of creating a second one.
     */
    public function up(): void
    {
        Schema::create('supplier_payments', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();

            $table->foreignId('supplier_id')->constrained('jkc_suppliers')->nullOnDelete();

            $table->decimal('amount', 14, 2)->default(0);
            $table->string('payment_method', 30)->default('cash');
            $table->string('reference', 100)->nullable();
            $table->text('note')->nullable();

            $table->unsignedBigInteger('ledger_entry_id')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['supplier_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_payments');
    }
};
