<?php

namespace App\Http\Controllers;

use App\Enums\ProjectStatus;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProjectController extends Controller
{
    private function checkAccess(Project $project)
    {
        $user = Auth::user();
        if ($user->hasAnyRole(['Super Admin', 'General Manager'])) {
            return;
        }

        $employeeId = $user->employee->id ?? null;
        $isOwner = $project->owner_id && $employeeId && $project->owner_id == $employeeId;
        $isMember = $employeeId && $project->members()->where('employee_id', $employeeId)->exists();
        $isCreator = $project->created_by === $user->id;

        if (!$isOwner && !$isMember && !$isCreator) {
            abort(403, 'You do not have access to this project.');
        }
    }
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Project::with(['owner.user', 'department'])
            ->withCount([
                'tasks as total_tasks',
                'tasks as completed_tasks' => function ($query) {
                    $query->where('status', TaskStatus::Approved->value);
                },
            ])
            ->latest();

        if ($request->filled('status')) {
            if ($request->status === 'all') {
                $query->where('status', '!=', ProjectStatus::Archived->value);
            } else {
                $query->where('status', $request->status);
            }
        } else {
            // Default: sembunyikan proyek yang diarsipkan agar tidak menumpuk
            $query->where('status', '!=', ProjectStatus::Archived->value);
        }

        if (!$user->hasAnyRole(['Super Admin', 'General Manager'])) {
            $employeeId = $user->employee->id ?? null;
            $query->where(function ($q) use ($employeeId, $user) {
                $q->where('created_by', $user->id);
                if ($employeeId) {
                    $q->orWhere('owner_id', $employeeId)
                      ->orWhereHas('members', function ($q2) use ($employeeId) {
                          $q2->where('employee_id', $employeeId);
                      });
                }
            });
        }

        $projects = $query->paginate(10)->withQueryString();

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'filters' => $request->only(['status']),
            'projectStatuses' => ProjectStatus::cases(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Projects/Create', [
            'employees' => Employee::with(['user', 'department'])->get(),
            'departments' => Department::all(),
            'projectStatuses' => ProjectStatus::cases(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'owner_id' => 'nullable|exists:employees,id',
            'department_id' => 'nullable|exists:departments,id',
            'start_date' => 'nullable|date',
            'deadline' => 'nullable|date' . ($request->filled('start_date') ? '|after_or_equal:start_date' : ''),
            'status' => 'nullable|string',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = $validated['status'] ?? ProjectStatus::Planning->value;

        $project = Project::create($validated);

        return redirect()->route('projects.show', $project)->with('success', 'Project created successfully.');
    }

    public function show(Project $project)
    {
        $this->checkAccess($project);

        $project->load([
            'owner.user:id,name,email',
            'department:id,name',
            'members.user:id,name,email',
            'tasks.assignees.user:id,name,email,profile_photo_path',
            'tasks.assignees.department:id,name',
            'tasks.comments.employee.user:id,name,profile_photo_path',
            'tasks.attachments.employee.user:id,name',
            'tasks.checklists',
            'tasks.activities.employee.user:id,name',
        ]);

        $user = Auth::user();
        $canEdit = $project->created_by === $user->id 
            || ($project->owner_id && $user->employee && $project->owner_id === $user->employee->id)
            || $user->hasRole('Super Admin');

        return Inertia::render('Projects/Show', [
            'project' => $project,
            'canEdit' => $canEdit,
            'statuses' => TaskStatus::cases(),
            'priorities' => TaskPriority::cases(),
            'projectStatuses' => ProjectStatus::cases(),
            'departments' => Department::getCachedList(),
            'employees' => Employee::with(['user:id,name', 'department:id,name'])->get(['id', 'user_id', 'department_id', 'employee_number']),
        ]);
    }

    private function checkEditAccess(Project $project)
    {
        $user = Auth::user();
        $isCreator = $project->created_by === $user->id 
            || ($project->owner_id && $user->employee && $project->owner_id === $user->employee->id)
            || $user->hasRole('Super Admin');

        if (!$isCreator) {
            abort(403, 'Only the project creator, project owner, or Super Admin can modify or delete this project.');
        }
    }

    public function edit(Project $project)
    {
        $this->checkEditAccess($project);

        return Inertia::render('Projects/Edit', [
            'project' => $project->load(['owner.user', 'department']),
            'employees' => Employee::with(['user', 'department'])->get(),
            'departments' => Department::all(),
            'projectStatuses' => ProjectStatus::cases(),
        ]);
    }

    public function update(Request $request, Project $project)
    {
        $this->checkEditAccess($project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'owner_id' => 'nullable|exists:employees,id',
            'department_id' => 'nullable|exists:departments,id',
            'start_date' => 'nullable|date',
            'deadline' => 'nullable|date' . ($request->filled('start_date') ? '|after_or_equal:start_date' : ''),
            'status' => 'required|string',
        ]);

        $project->update($validated);

        return redirect()->route('projects.show', $project)->with('success', 'Project updated successfully.');
    }

    public function destroy(Project $project)
    {
        $this->checkEditAccess($project);

        $name = $project->name;
        $project->delete();

        return redirect()->route('projects.index')->with('success', "Project '{$name}' was deleted successfully.");
    }

    public function archive(Project $project)
    {
        $this->checkEditAccess($project);

        $project->update(['status' => ProjectStatus::Archived->value]);

        return back()->with('success', 'Project archived successfully.');
    }

    public function restore(Project $project)
    {
        $this->checkEditAccess($project);

        $project->update(['status' => ProjectStatus::Active->value]);

        return back()->with('success', 'Project restored successfully.');
    }
}
