<?php

namespace App\Http\Controllers;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Services\TaskAssignmentHistoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $employee = $user->employee ?? $user->ensureEmployeeProfile();

        $query = Task::with([
            'project:id,name,status',
            'assignees.user:id,name,email,profile_photo_path',
            'assignees.department:id,name',
            'creator:id,name',
            'comments.employee.user:id,name,profile_photo_path',
            'attachments.employee.user:id,name',
            'checklists',
            'activities.employee.user:id,name'
        ]);

        // Access scope:
        // Super Admin, General Manager, HRD / Admin see all hotel tasks.
        // Supervisors & Head of Department see all tasks in their department or assigned to them.
        // Other staff see assigned tasks, created tasks, or tasks in their department.
        if (! $user->hasAnyRole(['Super Admin', 'General Manager', 'HRD / Admin'])) {
            $query->where(function ($q) use ($user, $employee) {
                if ($employee) {
                    $q->whereHas('assignees', function ($sq) use ($employee) {
                        $sq->where('employee_id', $employee->id);
                    });
                    if ($employee->department_id) {
                        $q->orWhereHas('assignees', function ($sq) use ($employee) {
                            $sq->where('department_id', $employee->department_id);
                        });
                    }
                }
                $q->orWhere('created_by', $user->id);
            });
        }

        if ($request->filled('filter')) {
            if ($request->filter === 'active') {
                $query->whereNotIn('status', [TaskStatus::Approved->value, TaskStatus::Cancelled->value]);
            } elseif ($request->filter === 'completed') {
                $query->where('status', TaskStatus::Approved->value);
            } elseif ($request->filter === 'overdue') {
                $query->where('deadline', '<', now())->whereNotIn('status', [TaskStatus::Approved->value, TaskStatus::Cancelled->value]);
            }
        } elseif ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $tasks = $query->orderBy('deadline', 'asc')->get();

        return Inertia::render('Tasks/Index', [
            'tasks' => $tasks,
            'filters' => $request->only(['filter', 'status']),
            'employees' => \App\Models\Employee::with(['user:id,name,email', 'department:id,name'])->get(['id', 'user_id', 'department_id', 'employee_number']),
            'projects' => \App\Models\Project::select('id', 'name', 'status')->get(),
            'statuses' => TaskStatus::cases(),
            'priorities' => TaskPriority::cases(),
        ]);
    }

    public function kanban()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $employee = $user->employee ?? $user->ensureEmployeeProfile();

        $query = Task::with([
            'project:id,name,status',
            'assignees.user:id,name,email,profile_photo_path',
            'assignees.department:id,name',
            'creator:id,name',
            'comments.employee.user:id,name,profile_photo_path',
            'attachments.employee.user:id,name',
            'checklists',
            'activities.employee.user:id,name'
        ]);

        if (! $user->hasAnyRole(['Super Admin', 'General Manager', 'HRD / Admin'])) {
            $query->where(function ($q) use ($user, $employee) {
                if ($employee) {
                    $q->whereHas('assignees', function ($sq) use ($employee) {
                        $sq->where('employee_id', $employee->id);
                    });
                    if ($employee->department_id) {
                        $q->orWhereHas('assignees', function ($sq) use ($employee) {
                            $sq->where('department_id', $employee->department_id);
                        });
                    }
                }
                $q->orWhere('created_by', $user->id);
            });
        }

        $tasks = $query->get();

        return Inertia::render('Tasks/Kanban', [
            'tasks' => $tasks,
            'employees' => \App\Models\Employee::with(['user:id,name,email', 'department:id,name'])->get(['id', 'user_id', 'department_id', 'employee_number']),
            'projects' => \App\Models\Project::select('id', 'name', 'status')->get(),
            'statuses' => TaskStatus::cases(),
            'priorities' => TaskPriority::cases(),
        ]);
    }

    public function calendar(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $employee = $user->employee ?? $user->ensureEmployeeProfile();

        $query = Task::with([
            'project:id,name,status',
            'assignees.user:id,name,email,profile_photo_path',
            'assignees.department:id,name',
            'creator:id,name',
            'comments.employee.user:id,name,profile_photo_path',
            'attachments.employee.user:id,name',
            'checklists',
            'activities.employee.user:id,name'
        ]);

        if ($request->filled('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        if ($request->filled('employee_id')) {
            $query->whereHas('assignees', function ($q) use ($request) {
                $q->where('employee_id', $request->employee_id);
            });
        }

        // Access scope:
        // Super Admin, HRD / Admin, General Manager see all tasks.
        // Other roles see assigned tasks, created tasks, or tasks in their department.
        if (! $user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager'])) {
            $query->where(function ($q) use ($user, $employee) {
                if ($employee) {
                    $q->whereHas('assignees', function ($sq) use ($employee) {
                        $sq->where('employee_id', $employee->id);
                    });
                    if ($employee->department_id) {
                        $q->orWhereHas('assignees', function ($sq) use ($employee) {
                            $sq->where('department_id', $employee->department_id);
                        });
                    }
                }
                $q->orWhere('created_by', $user->id);
            });
        }

        $tasks = $query->get();

        $employees = \App\Models\Employee::with(['user', 'department', 'position'])
            ->get();

        $projects = \App\Models\Project::select('id', 'name', 'status')
            ->orderBy('name')
            ->get();

        return Inertia::render('Tasks/Calendar', [
            'tasks' => $tasks,
            'employees' => $employees,
            'projects' => $projects,
            'statuses' => TaskStatus::cases(),
            'priorities' => TaskPriority::cases(),
            'filters' => $request->only(['project_id', 'employee_id']),
        ]);
    }

    public function create(Request $request)
    {
        return redirect()->route('tasks.index', array_merge(['create' => 1], $request->query()));
    }

    public function show(Task $task)
    {
        if ($task->project_id) {
            return redirect()->route('projects.show', [
                'project' => $task->project_id,
                'task_id' => $task->id,
            ]);
        }

        return redirect()->route('tasks.index', ['task_id' => $task->id]);
    }

    public function edit(Task $task)
    {
        if ($task->project_id) {
            return redirect()->route('projects.show', [
                'project' => $task->project_id,
                'task_id' => $task->id,
                'edit' => 1,
            ]);
        }

        return redirect()->route('tasks.index', ['task_id' => $task->id, 'edit' => 1]);
    }

    public function store(Request $request, TaskAssignmentHistoryService $assignmentHistory)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'project_id' => 'nullable|exists:projects,id',
            'priority' => 'required|string',
            'deadline' => 'nullable|date',
            'start_date' => 'nullable|date',
            'estimated_duration' => 'nullable|integer',
            'status' => 'required|string',
            'assignees' => 'nullable|array',
            'assignees.*' => 'exists:employees,id',
        ]);

        $validated['created_by'] = Auth::id();

        $task = Task::create(collect($validated)->except('assignees')->toArray());

        if (! empty($validated['assignees'])) {
            $assignmentHistory->sync($task, $validated['assignees'], Auth::id());

            // Notify assigned users
            $users = \App\Models\Employee::whereIn('id', $validated['assignees'])
                ->with('user')
                ->get()
                ->pluck('user')
                ->filter();

            \Illuminate\Support\Facades\Notification::send($users, new \App\Notifications\TaskAssigned($task));
        }

        return back()->with('success', 'Task created successfully.');
    }

    public function update(Request $request, Task $task, TaskAssignmentHistoryService $assignmentHistory)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $isCreator = $task->created_by === $user->id
            || ($task->project && $task->project->created_by === $user->id)
            || ($task->project && $task->project->owner_id && $user->employee && $task->project->owner_id === $user->employee->id)
            || $user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager']);

        $isAssignee = $user->employee && $task->assignees()->where('employee_id', $user->employee->id)->exists();

        // Normalize status alias if passed (e.g. 'Approve' -> 'Approved')
        if ($request->has('status') && in_array(strtolower($request->status), ['approve', 'approved'], true)) {
            $request->merge(['status' => TaskStatus::Approved->value]);
        }

        // Rule: Only the task creator (or admin) can approve a task
        if ($request->has('status') && $request->status === TaskStatus::Approved->value) {
            if (!$isCreator) {
                abort(403, 'Only the task creator or administrator can approve this task.');
            }
        }

        // Rule: Once approved, only creator or admin can change status back
        $currentStatusVal = $task->status instanceof TaskStatus ? $task->status->value : (string) $task->status;
        if ($currentStatusVal === TaskStatus::Approved->value && $request->has('status') && $request->status !== TaskStatus::Approved->value) {
            if (!$isCreator) {
                abort(403, 'Approved tasks cannot be reverted by assignees.');
            }
        }

        // Check if this is exclusively a status or schedule change (e.g. from Kanban/Calendar drag/drop or revision)
        $isStatusOrScheduleUpdate = !$request->hasAny(['title', 'description', 'priority', 'assignees'])
            && $request->hasAny(['status', 'deadline', 'start_date', 'estimated_duration', 'revision_note']);

        if ($isStatusOrScheduleUpdate) {
            if (!$isCreator && !$isAssignee) {
                abort(403, 'You do not have permission to modify the schedule or status of this task.');
            }
        } else {
            if (!$isCreator) {
                abort(403, 'Only the task creator or an administrator can modify full details of this task.');
            }
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'project_id' => 'nullable|exists:projects,id',
            'priority' => 'sometimes|required|string',
            'deadline' => 'nullable|date',
            'start_date' => 'nullable|date',
            'estimated_duration' => 'nullable|integer',
            'status' => 'sometimes|required|string',
            'revision_note' => 'nullable|string|max:1000',
            'assignees' => 'nullable|array',
            'assignees.*' => 'exists:employees,id',
        ]);

        $taskData = collect($validated)->except(['assignees', 'revision_note'])->toArray();
        if (!empty($taskData)) {
            $task->update($taskData);
        }

        if ($request->filled('revision_note') && $isCreator) {
            $employeeId = $user->employee?->id;
            $task->comments()->create([
                'employee_id' => $employeeId,
                'content' => "📌 **Revision Notes from Assigner:**\n" . $request->revision_note,
            ]);
        }

        if ($task->wasChanged('deadline')) {
            $task->activities()->create([
                'employee_id' => Auth::user()?->employee?->id,
                'action' => 'deadline_updated',
                'description' => $task->deadline ? "Deadline updated to " . $task->deadline->format('d M Y') : "Deadline removed",
            ]);
        }

        if ($request->has('assignees')) {
            $changes = $assignmentHistory->sync($task, $validated['assignees'] ?? [], Auth::id());

            if (!empty($changes['attached'])) {
                $newEmployees = \App\Models\Employee::whereIn('id', $changes['attached'])
                    ->with('user')
                    ->get();

                $names = $newEmployees->map(fn($e) => $e->user?->name ?? $e->employee_number)->implode(', ');
                $task->activities()->create([
                    'employee_id' => Auth::user()?->employee?->id,
                    'action' => 'assignee_added',
                    'description' => "Added assignee(s): {$names}",
                ]);

                $newUsers = $newEmployees->pluck('user')->filter();
                if ($newUsers->isNotEmpty()) {
                    \Illuminate\Support\Facades\Notification::send($newUsers, new \App\Notifications\TaskAssigned($task));
                }
            }

            if (!empty($changes['detached'])) {
                $removedEmployees = \App\Models\Employee::whereIn('id', $changes['detached'])
                    ->with('user')
                    ->get();
                $names = $removedEmployees->map(fn($e) => $e->user?->name ?? $e->employee_number)->implode(', ');
                $task->activities()->create([
                    'employee_id' => Auth::user()?->employee?->id,
                    'action' => 'assignee_removed',
                    'description' => "Removed assignee(s): {$names}",
                ]);
            }
        }

        return back()->with('success', 'Task updated successfully.');
    }

    public function destroy(Task $task)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $isCreator = $task->created_by === $user->id
            || ($task->project && $task->project->created_by === $user->id)
            || ($task->project && $task->project->owner_id && $user->employee && $task->project->owner_id === $user->employee->id)
            || $user->hasRole('Super Admin');

        if (!$isCreator) {
            abort(403, 'Only the task creator, project owner, or Super Admin can delete this task.');
        }

        $task->delete();

        return back()->with('success', 'Task deleted successfully.');
    }

    public function acknowledge(Task $task, TaskAssignmentHistoryService $assignmentHistory)
    {
        $employee = Auth::user()->employee;
        if (! $employee) {
            return back()->with('error', 'Only employees can acknowledge tasks.');
        }

        if (! $task->assignees()->where('employee_id', $employee->id)->exists()) {
            abort(403, 'You are not assigned to this task.');
        }

        if (! $assignmentHistory->acknowledge($task, $employee)) {
            return back()->with('info', 'Task already acknowledged.');
        }

        return back()->with('success', 'Task acknowledged successfully.');
    }

    public function decline(Request $request, Task $task, TaskAssignmentHistoryService $assignmentHistory)
    {
        $employee = Auth::user()->employee;
        if (! $employee) {
            return back()->with('error', 'Only employees can decline task assignments.');
        }

        if (! $task->assignees()->where('employee_id', $employee->id)->exists()) {
            abort(403, 'You are not assigned to this task.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:1000',
        ], [
            'reason.required' => 'Please provide a reason for declining the task assignment.',
            'reason.min' => 'The reason must be at least 5 characters.',
        ]);

        if (! $assignmentHistory->decline($task, $employee, trim($validated['reason']))) {
            return back()->with('error', 'Unable to decline assignment. The task may have already been acknowledged or unassigned.');
        }

        return back()->with('success', 'Task assignment declined successfully.');
    }
}
