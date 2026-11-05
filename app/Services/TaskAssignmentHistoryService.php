<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Task;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;

class TaskAssignmentHistoryService
{
    /**
     * Keep the active assignee pivot and its immutable assignment snapshots in sync.
     * Reassigning a removed employee starts a new history entry.
     *
     * @return array{attached: array, detached: array, updated: array}
     */
    public function sync(Task $task, array $employeeIds, ?int $actorId = null): array
    {
        return DB::transaction(function () use ($task, $employeeIds, $actorId): array {
            Task::whereKey($task->id)->lockForUpdate()->firstOrFail();

            $changes = $task->assignees()->sync(array_values(array_unique($employeeIds)));
            $now = now();

            if ($changes['detached'] !== []) {
                $task->assignmentHistories()
                    ->whereIn('employee_id', $changes['detached'])
                    ->whereNull('unassigned_at')
                    ->update(['unassigned_at' => $now]);
            }

            if ($changes['attached'] !== []) {
                $employees = Employee::with(['user:id,name', 'department:id,name'])
                    ->whereIn('id', $changes['attached'])
                    ->get();

                foreach ($employees as $employee) {
                    $task->assignmentHistories()->create([
                        'employee_id' => $employee->id,
                        'employee_name' => $employee->user?->name,
                        'employee_number' => $employee->employee_number,
                        'department_id' => $employee->department_id,
                        'department_name' => $employee->department?->name,
                        'assigned_by_user_id' => $actorId,
                        'assigned_at' => $now,
                    ]);
                }
            }

            return $changes;
        });
    }

    /** The first acknowledgement is the authoritative timestamp. */
    public function acknowledge(Task $task, Employee $employee, ?DateTimeInterface $at = null): bool
    {
        return DB::transaction(function () use ($task, $employee, $at): bool {
            Task::whereKey($task->id)->lockForUpdate()->firstOrFail();

            $acknowledgedAt = $at ?? now();
            $changed = DB::table('task_assignees')
                ->where('task_id', $task->id)
                ->where('employee_id', $employee->id)
                ->whereNull('acknowledged_at')
                ->update(['acknowledged_at' => $acknowledgedAt, 'updated_at' => now()]);

            if ($changed !== 1) {
                return false;
            }

            $task->assignmentHistories()
                ->where('employee_id', $employee->id)
                ->whereNull('unassigned_at')
                ->whereNull('acknowledged_at')
                ->update(['acknowledged_at' => $acknowledgedAt]);

            $task->activities()->create([
                'employee_id' => $employee->id,
                'action' => 'task_acknowledged',
                'description' => 'Acknowledged and accepted the task assignment',
            ]);

            return true;
        });
    }
}
