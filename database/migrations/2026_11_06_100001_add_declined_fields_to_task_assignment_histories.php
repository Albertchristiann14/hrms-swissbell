<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_assignment_histories', function (Blueprint $table) {
            $table->timestamp('declined_at')->nullable()->after('unassigned_at');
            $table->text('decline_reason')->nullable()->after('declined_at');
        });
    }

    public function down(): void
    {
        Schema::table('task_assignment_histories', function (Blueprint $table) {
            $table->dropColumn(['declined_at', 'decline_reason']);
        });
    }
};

