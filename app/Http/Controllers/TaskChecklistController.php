<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskChecklist;
use App\Services\TaskAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskChecklistController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $user = Auth::user();
        if (! TaskAccessService::canAccessTask($user, $task)) {
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
        if (! $task || ! TaskAccessService::canAccessTask($user, $task)) {
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
        if (! $task || ! TaskAccessService::canAccessTask($user, $task)) {
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
