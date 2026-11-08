<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Farmer Bijak / Consignment Settlement (تصفیہ مال و بیجک کسان).
     * Connects to farmer arrivals (farmer_purchases), calculates gross sales,
     * JKC Aarhat commission, expenses/deductions (mazdoori, carriage, chungi,
     * bardana), and final net payable to the farmer.
     */
    public function up(): void
    {
        // 1. Add settlement status fields to farmer_purchases
        Schema::table('farmer_purchases', function (Blueprint $table) {
            $table->boolean('is_settled')->default(false)->after('commission_amount');
            $table->unsignedBigInteger('settlement_id')->nullable()->after('is_settled');
            $table->index('is_settled');
        });

        // 2. Create farmer_settlements table
        Schema::create('farmer_settlements', function (Blueprint $table) {
            $table->id();
            $table->string('settlement_no', 50)->unique();
            $table->date('date')->index();

            $table->foreignId('farmer_id')->constrained('farmers')->cascadeOnDelete();
            $table->foreignId('farmer_purchase_id')->unique()->constrained('farmer_purchases')->cascadeOnDelete();

            $table->integer('nag')->default(0);
            $table->decimal('weight', 10, 2)->default(0);

            // Gross sales proceeds
            $table->decimal('gross_sale_amount', 14, 2)->default(0);

            // JKC Aarhat commission
            $table->decimal('commission_rate', 5, 2)->default(0);
            $table->decimal('commission_amount', 14, 2)->default(0);

            // Itemized deductions
            $table->decimal('mazdoori', 12, 2)->default(0);
            $table->decimal('carriage', 12, 2)->default(0);
            $table->decimal('chungi', 12, 2)->default(0);
            $table->decimal('bardana', 12, 2)->default(0);
            $table->decimal('other_deductions', 12, 2)->default(0);

            // Additional charges added to farmer
            $table->decimal('charges', 12, 2)->default(0);

            // Net payable totals
            $table->decimal('total_deductions', 14, 2)->default(0);
            $table->decimal('net_payable', 14, 2)->default(0);
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->decimal('remaining_payable', 14, 2)->default(0);

            // Linked ledger entry in farmer's khata
            $table->unsignedBigInteger('ledger_entry_id')->nullable();

            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['farmer_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('farmer_settlements');

        Schema::table('farmer_purchases', function (Blueprint $table) {
            $table->dropColumn(['is_settled', 'settlement_id']);
        });
    }
};
