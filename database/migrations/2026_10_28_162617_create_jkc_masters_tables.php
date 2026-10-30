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
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->string('name_en')->nullable();
            $table->string('name_ur')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('merchants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('code')->unique();
            $table->string('name_en')->nullable();
            $table->string('name_ur')->nullable();
            $table->string('phone')->nullable();
            $table->decimal('opening_balance', 14, 2)->default(0);
            $table->decimal('current_balance', 14, 2)->default(0);
            $table->string('status')->default('active');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('farmers', function (Blueprint $table) {
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

        Schema::create('farmer_marks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('code')->default(0);
            $table->foreignId('farmer_id')->constrained('farmers')->cascadeOnDelete();
            $table->string('name_en')->nullable();
            $table->string('name_ur')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['farmer_id', 'code']);
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('name_en')->nullable();
            $table->string('name_ur')->nullable();
            $table->string('unit')->default('Nag');
            $table->decimal('default_rate', 10, 2)->nullable();
            $table->decimal('default_bardana', 10, 2)->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
        Schema::dropIfExists('farmer_marks');
        Schema::dropIfExists('farmers');
        Schema::dropIfExists('merchants');
        Schema::dropIfExists('areas');
    }
};
