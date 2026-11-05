<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_assignment_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->string('employee_name')->nullable();
            $table->string('employee_number')->nullable();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('department_name')->nullable();
            $table->foreignId('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at');
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('unassigned_at')->nullable();
            $table->string('source')->default('application');
            $table->timestamps();

            $table->index(['department_id', 'assigned_at'], 'assignment_history_department_date_idx');
            $table->index(['task_id', 'employee_id', 'unassigned_at'], 'assignment_history_active_idx');
        });

        // A clone with existing data only retains current pivot rows. Historical removals
        // that happened before this migration cannot be recovered reliably.
        DB::table('task_assignees')
            ->join('employees', 'employees.id', '=', 'task_assignees.employee_id')
            ->leftJoin('users', 'users.id', '=', 'employees.user_id')
            ->leftJoin('departments', 'departments.id', '=', 'employees.department_id')
            ->join('tasks', 'tasks.id', '=', 'task_assignees.task_id')
            ->select([
                'task_assignees.task_id',
                'task_assignees.employee_id',
                'task_assignees.created_at as assigned_at',
                'task_assignees.acknowledged_at',
                'employees.employee_number',
                'employees.department_id',
                'users.name as employee_name',
                'departments.name as department_name',
                'tasks.created_at as task_created_at',
            ])
            ->orderBy('task_assignees.task_id')
            ->orderBy('task_assignees.employee_id')
            ->chunk(500, function ($rows): void {
                $now = now();
                $records = [];

                foreach ($rows as $row) {
                    $records[] = [
                        'task_id' => $row->task_id,
                        'employee_id' => $row->employee_id,
                        'employee_name' => $row->employee_name,
                        'employee_number' => $row->employee_number,
                        'department_id' => $row->department_id,
                        'department_name' => $row->department_name,
                        'assigned_by_user_id' => null, // historical actor is not known
                        'assigned_at' => $row->assigned_at ?? $row->task_created_at ?? $now,
                        'acknowledged_at' => $row->acknowledged_at,
                        'unassigned_at' => null,
                        'source' => 'backfill',
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($records !== []) {
                    DB::table('task_assignment_histories')->insert($records);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_assignment_histories');
    }
};
