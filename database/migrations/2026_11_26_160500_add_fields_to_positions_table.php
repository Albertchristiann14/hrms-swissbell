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
        Schema::table('positions', function (Blueprint $table) {
            if (! Schema::hasColumn('positions', 'code')) {
                $table->string('code', 50)->nullable()->after('name');
            }
            if (! Schema::hasColumn('positions', 'description')) {
                $table->text('description')->nullable()->after('code');
            }
            if (! Schema::hasColumn('positions', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('description');
                $table->index('is_active');
            }
            $table->unique(['department_id', 'name'], 'positions_department_id_name_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('positions', function (Blueprint $table) {
            $table->dropUnique('positions_department_id_name_unique');

            if (Schema::hasColumn('positions', 'is_active')) {
                $table->dropIndex(['is_active']);
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('positions', 'description')) {
                $table->dropColumn('description');
            }
            if (Schema::hasColumn('positions', 'code')) {
                $table->dropColumn('code');
            }
        });
    }
};
