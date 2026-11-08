<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add payment method and category to the existing expenses table so shop
     * expenses can be differentiated between Cash and Bank payments and
     * properly integrated into the Cash Book (روکڑ).
     */
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('payment_method', 30)->default('cash')->after('amount');
            $table->string('category', 50)->default('general')->after('payment_method');
            $table->string('reference', 100)->nullable()->after('category');
            $table->foreignId('created_by')->nullable()->after('description')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['created_by']);
            $table->dropColumn(['payment_method', 'category', 'reference', 'created_by']);
        });
    }
};
