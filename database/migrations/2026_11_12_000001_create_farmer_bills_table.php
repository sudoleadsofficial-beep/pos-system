<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('farmer_bills', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->foreignId('farmer_id')->constrained('farmers')->cascadeOnDelete();
            $table->foreignId('farmer_mark_id')->nullable()->constrained('farmer_marks')->nullOnDelete();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->integer('nag')->default(0);
            $table->decimal('weight', 10, 2)->default(0);
            $table->decimal('rate', 10, 2)->default(0);
            $table->decimal('commission_pct', 5, 2)->default(6);
            $table->decimal('bardana_per_nag', 10, 2)->default(0);
            $table->decimal('gross_amount', 12, 2)->default(0);
            $table->decimal('commission_amount', 12, 2)->default(0);
            $table->decimal('bardana_amount', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2)->default(0);
            $table->string('note')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('farmer_bills');
    }
};
