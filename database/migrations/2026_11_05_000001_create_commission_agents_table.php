<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Commission Agents (کمیشن ایجنٹ) are individual dalals who work on our
     * behalf. They are a Party type, so the table mirrors the `merchants`
     * shape exactly: code, bilingual names, phone, area, opening/current
     * balance, status and soft deletes.
     */
    public function up(): void
    {
        Schema::create('commission_agents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('code')->unique();
            $table->string('name_en')->nullable();
            $table->string('name_ur')->nullable();
            $table->string('phone')->nullable();
            $table->foreignId('area_id')->nullable()->constrained('areas')->nullOnDelete();
            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->decimal('current_balance', 14, 2)->default(0);
            $table->decimal('commission_percent', 5, 2)->nullable();
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
        Schema::dropIfExists('commission_agents');
    }
};
