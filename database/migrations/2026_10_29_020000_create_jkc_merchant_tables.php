<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('amroza_sales', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->foreignId('merchant_id')->constrained('merchants')->onDelete('cascade');
            $table->foreignId('item_id')->constrained('items')->onDelete('cascade');
            $table->integer('nag')->default(0);
            $table->decimal('weight', 10, 2)->default(0);
            $table->decimal('rate', 10, 2)->default(0);
            $table->decimal('bardana', 10, 2)->default(0);
            $table->decimal('gross_amount', 12, 2)->default(0);
            $table->unsignedBigInteger('consignment_id')->nullable()->index();
            $table->integer('year')->default(2026)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('merchant_receipts', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->foreignId('merchant_id')->constrained('merchants')->onDelete('cascade');
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('type', 30)->default('recovery'); // 'same_day_cash' or 'recovery'
            $table->string('note')->nullable();
            $table->integer('year')->default(2026)->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_receipts');
        Schema::dropIfExists('amroza_sales');
    }
};
