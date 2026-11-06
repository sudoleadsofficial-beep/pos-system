<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Ledger entries for a Party (khata entries).
     *
     * `party_type` + `party_id` is a soft reference on purpose: one table
     * serves all four party tables (`farmers`, `jkc_suppliers`, `merchants`
     * for buyers, `commission_agents`), so a single foreign key cannot be
     * used. The composite index below keeps the per-party lookup fast.
     *
     * direction: 'jama'  = credit, increases the party's balance
     *            'banam' = debit,  decreases the party's balance
     *
     * current_balance = opening_balance + SUM(jama) - SUM(banam)
     */
    public function up(): void
    {
        Schema::create('party_ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->string('party_type', 20)->index();
            $table->unsignedBigInteger('party_id')->index();
            $table->date('date')->index();
            $table->string('direction', 10); // 'jama' or 'banam'
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('category', 40)->default('other');
            $table->string('description')->nullable();
            $table->string('reference')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['party_type', 'party_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('party_ledger_entries');
    }
};
