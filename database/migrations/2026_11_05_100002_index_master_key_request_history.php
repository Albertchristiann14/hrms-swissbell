<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('master_key_requests', function (Blueprint $table) {
            $table->index('key_number', 'master_key_requests_key_number_idx');
        });
    }

    public function down(): void
    {
        Schema::table('master_key_requests', function (Blueprint $table) {
            $table->dropIndex('master_key_requests_key_number_idx');
        });
    }
};
