<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_assignment_histories', function (Blueprint $table) {
            $table->timestamp('reminder_sent_at')->nullable();
            $table->index(['reminder_sent_at', 'assigned_at'], 'task_assignment_reminder_due_idx');
        });

        // Avoid a flood of retroactive reminders for assignments made before
        // this feature was installed. Newly created assignments remain eligible.
        DB::table('task_assignment_histories')
            ->whereNull('acknowledged_at')
            ->update(['reminder_sent_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('task_assignment_histories', function (Blueprint $table) {
            $table->dropIndex('task_assignment_reminder_due_idx');
            $table->dropColumn('reminder_sent_at');
        });
    }
};
