<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;

class TaskAccessService
{
    /**
     * Check if user is authorized to interact with the task.
     */
    public static function canAccessTask(?User $user, Task $task): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager'])) {
            return true;
        }

        if ($task->created_by === $user->id) {
            return true;
        }

        $employee = $user->employee;
        if (! $employee) {
            return false;
        }

        if ($task->assignees()->where('employee_id', $employee->id)->exists()) {
            return true;
        }

        if ($task->project && ($task->project->created_by === $user->id || ($task->project->owner_id && $task->project->owner_id === $employee->id))) {
            return true;
        }

        if ($employee->department_id) {
            if ($task->assignees()->where('department_id', $employee->department_id)->exists()) {
                return true;
            }
            if ($task->project && $task->project->department_id === $employee->department_id) {
                return true;
            }
        }

        // Open/unassigned tasks with no restricted assignees or creator can be accessed by any active employee
        if (is_null($task->created_by) && ! $task->assignees()->exists()) {
            return true;
        }

        return false;
    }
}
