<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('farmer_bills', function (Blueprint $table) {
            $table->string('truck_no')->nullable()->after('farmer_mark_id');
            $table->decimal('kiraya', 10, 2)->default(0)->after('bardana_amount');
            $table->decimal('mazdoori', 10, 2)->default(0)->after('kiraya');
            $table->decimal('market_fee', 10, 2)->default(0)->after('mazdoori');
        });
    }

    public function down(): void
    {
        Schema::table('farmer_bills', function (Blueprint $table) {
            $table->dropColumn(['truck_no', 'kiraya', 'mazdoori', 'market_fee']);
        });
    }
};
