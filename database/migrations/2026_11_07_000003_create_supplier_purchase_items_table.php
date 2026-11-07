<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The lines of a supplier purchase.
     *
     * Every line has its own id. Lines are NOT identified by item_id,
     * because the same material may appear more than once on one purchase
     * (two lots of the same crate, for example).
     *
     * item_id is optional and only a reference for traceability - a supplier
     * purchase never creates stock, so it never affects the inventory.
     */
    public function up(): void
    {
        Schema::create('supplier_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_purchase_id')->constrained('supplier_purchases')->cascadeOnDelete();

            // What was bought: "Plastic crate", "Transport", "Labour", ...
            $table->string('description');

            // Optional reference to the item master. Never used for stock.
            $table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();

            $table->decimal('quantity', 12, 2)->default(0);
            $table->string('unit', 30)->default('piece');
            $table->decimal('rate', 12, 2)->default(0);

            // amount = quantity x rate
            $table->decimal('amount', 14, 2)->default(0);

            $table->timestamps();

            $table->index('supplier_purchase_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_purchase_items');
    }
};
