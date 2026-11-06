<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * JKC Suppliers (سپلائر) are the vegetable suppliers of the mandi.
     *
     * This is a brand new table and is deliberately separate from the legacy
     * POS `suppliers` table (which stores FMCG / product vendors and keeps
     * its own `name`, `address`, `brands` columns). The legacy table is not
     * altered, referenced or migrated in any way.
     */
    public function up(): void
    {
        Schema::create('jkc_suppliers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('code')->unique();
            $table->string('name_en')->nullable();
            $table->string('name_ur')->nullable();
            $table->string('phone')->nullable();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->decimal('current_balance', 14, 2)->default(0);
            $table->string('status')->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jkc_suppliers');
    }
};
