<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Farmer purchase / arrival register.
     *
     * One row is one arrival: one farmer, one mark (bari), one item and the
     * quantity that came in. The amount follows the POS V1 unit rule, the
     * same shape as the Amroza sale: Units (Nag) x Rate, plus packing charges.
     *
     * The farmer's balance is NOT stored here. It belongs to the party
     * ledger - PartyLedgerService owns the farmer balance and recalculates it
     * from the ledger entries.
     */
    public function up(): void
    {
        Schema::create('farmer_purchases', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('reference')->unique();

            $table->foreignId('farmer_id')->constrained('farmers')->nullOnDelete();
            $table->foreignId('farmer_mark_id')->nullable()->constrained('farmer_marks')->nullOnDelete();
            $table->foreignId('item_id')->constrained('items')->nullOnDelete();

            // Quantity in bags / pieces (nag) and the total physical weight.
            $table->integer('nag')->default(0);
            $table->decimal('weight', 12, 2)->default(0);

            // Purchase rate is per selling unit (bag / piece), like the sale rate.
            $table->decimal('rate', 12, 2)->default(0);

            // Packing and other charges added on top of the line amount.
            $table->decimal('charges', 12, 2)->default(0);

            // amount = (nag x rate) + charges
            $table->decimal('amount', 14, 2)->default(0);

            // Paid at the time of the purchase; the rest stays payable.
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('remaining_amount', 14, 2)->default(0);

            $table->text('notes')->nullable();

            // The ledger rows this purchase owns, so editing it updates the
            // same entries instead of creating new ones.
            $table->unsignedBigInteger('ledger_entry_id')->nullable();
            $table->unsignedBigInteger('payment_ledger_entry_id')->nullable();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['item_id', 'date']);
            $table->index(['farmer_id', 'date']);
        });

        // A sale can be attributed to the arrival it came from, so the farmer
        // behind the stock stays traceable. Optional - the sale works without it.
        Schema::table('amroza_sales', function (Blueprint $table) {
            $table->foreignId('farmer_purchase_id')
                ->nullable()
                ->after('item_id')
                ->constrained('farmer_purchases')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('amroza_sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('farmer_purchase_id');
        });

        Schema::dropIfExists('farmer_purchases');
    }
};
