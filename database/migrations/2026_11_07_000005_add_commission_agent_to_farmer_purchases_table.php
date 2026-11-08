<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add commission agent fields to farmer purchases / arrivals.
     *
     * A purchase / arrival can optionally involve a Commission Agent (دلال / کمیشن ایجنٹ).
     * When selected:
     *   - commission_percent: snapshot of agent's commission percentage (editable per purchase)
     *   - commission_amount: calculated as purchase amount x (commission_percent / 100)
     *   - agent_ledger_entry_id: soft reference to party_ledger_entries (Jama in agent khata)
     */
    public function up(): void
    {
        Schema::table('farmer_purchases', function (Blueprint $table) {
            $table->foreignId('commission_agent_id')
                ->nullable()
                ->after('farmer_mark_id')
                ->constrained('commission_agents')
                ->nullOnDelete();

            $table->decimal('commission_percent', 5, 2)->nullable()->after('charges');
            $table->decimal('commission_amount', 14, 2)->default(0)->after('commission_percent');
            $table->unsignedBigInteger('agent_ledger_entry_id')->nullable()->after('payment_ledger_entry_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('farmer_purchases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('commission_agent_id');
            $table->dropColumn([
                'commission_percent',
                'commission_amount',
                'agent_ledger_entry_id',
            ]);
        });
    }
};
