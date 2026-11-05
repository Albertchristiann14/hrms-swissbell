<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /** Add the Management / General Manager master data to existing databases. */
    public function up(): void
    {
        $managementId = DB::table('departments')->where('name', 'Management')->value('id');

        if (! $managementId) {
            $managementId = DB::table('departments')->insertGetId([
                'name' => 'Management',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (! DB::table('positions')->where('department_id', $managementId)->where('name', 'General Manager')->exists()) {
            DB::table('positions')->insert([
                'department_id' => $managementId,
                'name' => 'General Manager',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // This is master data, potentially referenced by employees.
        // Do not delete it on rollback.
    }
};
