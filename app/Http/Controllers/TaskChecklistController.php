<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskChecklist;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskChecklistController extends Controller
{
    /**
     * Check if user is authorized to interact with the task.
     */
    protected function canAccessTask($user, Task $task): bool
    {
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

    public function store(Request $request, Task $task)
    {
        $user = Auth::user();
        if (! $this->canAccessTask($user, $task)) {
            abort(403, 'You do not have permission to add checklists to this task.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $task->checklists()->create([
            'title' => $validated['title'],
        ]);

        $employeeId = $user->employee?->id;
        $task->activities()->create([
            'employee_id' => $employeeId,
            'action' => 'checklist_added',
            'description' => "Added checklist item: \"{$validated['title']}\"",
        ]);

        return back()->with('success', 'Checklist item added.');
    }

    public function update(Request $request, TaskChecklist $checklist)
    {
        $user = Auth::user();
        $task = $checklist->task;
        if (! $task || ! $this->canAccessTask($user, $task)) {
            abort(403, 'You do not have permission to update this checklist item.');
        }

        $validated = $request->validate([
            'is_completed' => 'required|boolean',
        ]);

        $checklist->update([
            'is_completed' => $validated['is_completed'],
            'completed_by' => $validated['is_completed'] ? $user->employee?->id : null,
        ]);

        $employeeId = $user->employee?->id;
        $statusText = $validated['is_completed'] ? 'completed' : 'unmarked';
        $task->activities()->create([
            'employee_id' => $employeeId,
            'action' => 'checklist_updated',
            'description' => "Marked checklist item as {$statusText}: \"{$checklist->title}\"",
        ]);

        return back()->with('success', 'Checklist updated.');
    }

    public function destroy(TaskChecklist $checklist)
    {
        $user = Auth::user();
        $task = $checklist->task;
        if (! $task || ! $this->canAccessTask($user, $task)) {
            abort(403, 'You do not have permission to delete this checklist item.');
        }

        $title = $checklist->title;
        $employeeId = $user->employee?->id;

        $checklist->delete();

        if ($task) {
            $task->activities()->create([
                'employee_id' => $employeeId,
                'action' => 'checklist_deleted',
                'description' => "Deleted checklist item: \"{$title}\"",
            ]);
        }

        return back()->with('success', 'Checklist item deleted.');
    }
}
