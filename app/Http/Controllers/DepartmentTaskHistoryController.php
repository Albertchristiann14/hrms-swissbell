<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Models\Department;
use App\Models\Task;
use App\Models\TaskAssignmentHistory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DepartmentTaskHistoryController extends Controller
{
    public function index(Request $request, ?Department $department = null)
    {
        $departments = Department::query()->orderBy('name')->get(['id', 'name']);

        // The GM first opens the workspace and chooses which department to inspect.
        if ($department === null) {
            return Inertia::render('Dashboard/DepartmentTaskHistory', [
                'department' => null,
                'departments' => $departments,
                'summary' => null,
                'tasks' => null,
                'employees' => [],
                'statuses' => array_map(fn (TaskStatus $s) => $s->value, TaskStatus::cases()),
                'filters' => [],
            ]);
        }

        $filters = $request->validate([
            'status' => ['nullable', 'string', Rule::in(array_map(fn (TaskStatus $s) => $s->value, TaskStatus::cases()))],
            'employee_id' => ['nullable', 'integer', 'min:1'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        // Keep all recipient/date filters inside the SAME assignment history row.
        // A task can be counted in more than one department, but only once per department.
        $assignmentScope = function (Builder $query) use ($department, $filters): void {
            $query->where('department_id', $department->id);

            if (!empty($filters['employee_id'])) {
                $query->where('employee_id', $filters['employee_id']);
            }
            if (!empty($filters['from'])) {
                $query->whereDate('assigned_at', '>=', $filters['from']);
            }
            if (!empty($filters['to'])) {
                $query->whereDate('assigned_at', '<=', $filters['to']);
            }
        };

        $base = Task::query()->whereHas('assignmentHistories', $assignmentScope);
        if (!empty($filters['search'])) {
            $term = $filters['search'];
            $base->where(function (Builder $query) use ($term): void {
                $query->where('title', 'like', "%{$term}%")
                    ->orWhereHas('creator', fn (Builder $creator) => $creator->where('name', 'like', "%{$term}%"));
            });
        }

        $summary = [
            'total' => (clone $base)->count(),
            'active' => (clone $base)->whereNotIn('status', [TaskStatus::Approved->value, TaskStatus::Cancelled->value])->count(),
            'pending_approval' => (clone $base)->where('status', TaskStatus::Done->value)->count(),
            'approved' => (clone $base)->where('status', TaskStatus::Approved->value)->count(),
            'overdue' => (clone $base)->whereDate('deadline', '<', today())
                ->whereNotIn('status', [TaskStatus::Approved->value, TaskStatus::Cancelled->value])->count(),
            'pending_ack' => (clone $base)
                ->whereNotIn('status', [TaskStatus::Approved->value, TaskStatus::Cancelled->value])
                ->whereHas('assignmentHistories', function (Builder $query) use ($assignmentScope): void {
                    $assignmentScope($query);
                    $query->whereNull('unassigned_at')->whereNull('acknowledged_at');
                })
                ->count(),
        ];

        $tasksQuery = clone $base;
        if (!empty($filters['status'])) {
            $tasksQuery->where('status', $filters['status']);
        }

        $tasks = $tasksQuery
            ->withMax(['assignmentHistories as latest_department_assignment' => $assignmentScope], 'assigned_at')
            ->with([
                'creator:id,name',
                'project:id,name,created_by,owner_id',
                'latestActivity',
                // Reuse the exact TaskDetailModal payload shape from My List.
                'assignees.user:id,name,email,profile_photo_path',
                'assignees.department:id,name',
                'comments.employee.user:id,name,profile_photo_path',
                'comments.employee.department:id,name',
                'attachments.employee.user:id,name',
                'checklists',
                'activities.employee.user:id,name',
                'assignmentHistories' => fn ($query) => $query
                    ->where('department_id', $department->id)
                    ->with('assignedBy:id,name')
                    ->orderByDesc('assigned_at'),
            ])
            // An operational report prioritizes actionable tasks and urgent work.
            ->orderByRaw("CASE status WHEN 'To Do' THEN 0 WHEN 'In Progress' THEN 1 WHEN 'Blocked' THEN 2 WHEN 'Review' THEN 3 WHEN 'Done' THEN 4 WHEN 'Approved' THEN 5 ELSE 6 END")
            ->orderByRaw("CASE priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 WHEN 'Normal' THEN 2 WHEN 'Low' THEN 3 ELSE 4 END")
            ->orderBy('deadline')
            ->orderByDesc('latest_department_assignment')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'status' => $task->status instanceof TaskStatus ? $task->status->value : (string) $task->status,
                'priority' => $task->priority?->value,
                'deadline' => $task->deadline?->toDateString(),
                'is_overdue' => $task->deadline !== null
                    && $task->deadline->lt(today())
                    && !in_array($task->status?->value, [TaskStatus::Approved->value, TaskStatus::Cancelled->value], true),
                'created_at' => $task->created_at,
                'creator' => $task->creator?->name,
                'project' => $task->project?->name,
                'latest_activity' => $task->latestActivity ? [
                    'description' => $task->latestActivity->description,
                    'created_at' => $task->latestActivity->created_at,
                ] : null,
                'detail' => $task,
                'assignments' => $task->assignmentHistories->map(fn (TaskAssignmentHistory $history) => [
                    'id' => $history->id,
                    'employee_name' => $history->employee_name ?? $history->employee_number ?? 'Unknown employee',
                    'employee_number' => $history->employee_number,
                    'department_name' => $history->department_name,
                    'assigned_by' => $history->assignedBy?->name,
                    'assigned_at' => $history->assigned_at,
                    'acknowledged_at' => $history->acknowledged_at,
                    'unassigned_at' => $history->unassigned_at,
                    'source' => $history->source,
                ])->values(),
            ]);

        $employees = TaskAssignmentHistory::query()
            ->where('department_id', $department->id)
            ->whereNotNull('employee_id')
            ->selectRaw('employee_id, MAX(employee_name) as employee_name, MAX(employee_number) as employee_number')
            ->groupBy('employee_id')
            ->orderBy('employee_name')
            ->get();

        return Inertia::render('Dashboard/DepartmentTaskHistory', [
            'department' => $department->only('id', 'name'),
            'departments' => $departments,
            'summary' => $summary,
            'tasks' => $tasks,
            'employees' => $employees,
            'statuses' => array_map(fn (TaskStatus $s) => $s->value, TaskStatus::cases()),
            'filters' => $filters,
        ]);
    }
}
