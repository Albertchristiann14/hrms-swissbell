<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class EmployeeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Employee::with(['user', 'department', 'position', 'supervisor.user']);

        if ($search = $request->input('search')) {
            $query->where(function ($sub) use ($search) {
                $sub->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%");
                })->orWhere('employee_number', 'like', "%{$search}%");
            });
        }

        if ($department = $request->input('department')) {
            $query->where('department_id', $department);
        }

        if ($status = $request->input('status')) {
            $query->where('employment_status', $status);
        }

        // Sort on the server so the order remains correct across all pages.
        // Never pass a user-provided column name or direction directly to SQL.
        $sort = $request->input('sort');
        $directionInput = $request->input('direction', 'asc');
        $direction = is_string($directionInput) ? strtolower($directionInput) : '';
        $sortableColumns = ['employee', 'id', 'department', 'position', 'status', 'join_date'];
        $isSorted = in_array($sort, $sortableColumns, true) && in_array($direction, ['asc', 'desc'], true);

        if ($isSorted) {
            switch ($sort) {
                case 'employee':
                    $query->orderByRaw('CASE WHEN employees.user_id IS NULL THEN 1 ELSE 0 END');
                    $query->orderBy(User::query()->selectRaw('LOWER(name)')->whereColumn('users.id', 'employees.user_id')->limit(1), $direction);
                    break;
                case 'department':
                    $query->orderByRaw('CASE WHEN employees.department_id IS NULL THEN 1 ELSE 0 END');
                    $query->orderBy(Department::query()->selectRaw('LOWER(name)')->whereColumn('departments.id', 'employees.department_id')->limit(1), $direction);
                    break;
                case 'position':
                    $query->orderByRaw('CASE WHEN employees.position_id IS NULL THEN 1 ELSE 0 END');
                    $query->orderBy(Position::query()->selectRaw('LOWER(name)')->whereColumn('positions.id', 'employees.position_id')->limit(1), $direction);
                    break;
                case 'id':
                    $query->orderBy('employees.employee_number', $direction);
                    break;
                case 'status':
                    $query->orderBy('employees.employment_status', $direction);
                    break;
                case 'join_date':
                    $query->orderByRaw('CASE WHEN employees.join_date IS NULL THEN 1 ELSE 0 END');
                    $query->orderBy('employees.join_date', $direction);
                    break;
            }

            $query->orderBy('employees.id');
        } else {
            // Third click restores the existing default (newest records first).
            $query->latest('employees.created_at')->orderByDesc('employees.id');
        }

        $employees = $query->paginate(15)->withQueryString();

        $filters = $request->only(['search', 'department', 'status']);
        if ($isSorted) {
            $filters['sort'] = $sort;
            $filters['direction'] = $direction;
        }

        return Inertia::render('Organization/Employees/Index', [
            'employees' => $employees,
            'departments' => Department::getCachedList(),
            'positions' => Position::getCachedList(),
            'roles' => Role::pluck('name'),
            'filters' => $filters,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $latestEmployee = Employee::orderBy('id', 'desc')->first();
        $nextNumber = 1;
        
        if ($latestEmployee && preg_match('/-(\d+)$/', $latestEmployee->employee_number, $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        } else {
            $nextNumber = (Employee::max('id') ?? 0) + 1;
        }
        
        $suggestedEmployeeNumber = 'SBH-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        return Inertia::render('Organization/Employees/Form', [
            'suggestedEmployeeNumber' => $suggestedEmployeeNumber,
            'departments' => Department::getCachedList(),
            'positions' => Position::getCachedList(),
            'roles' => Role::pluck('name'),
            'supervisors' => Employee::with('user:id,name')->get(['id', 'user_id', 'employee_number'])->map(fn ($e) => [
                'id' => $e->id,
                'name' => $e->user?->name ?? 'Unknown',
            ]),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'employee_number' => 'required|string|unique:employees,employee_number',
            'phone_number' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'position_id' => ['nullable', Rule::exists('positions', 'id')->where('department_id', $request->input('department_id'))],
            'supervisor_id' => 'nullable|exists:employees,id',
            'join_date' => 'nullable|date',
            'employment_status' => 'required|string',
            'role' => 'required|string|exists:roles,name',
        ]);

        $emailPrefix = Str::lower(explode('@', $validated['email'])[0] ?? '');
        $cleanUsername = preg_replace('/[^a-zA-Z0-9._]/', '_', $emailPrefix);
        if (strlen($cleanUsername) < 3) {
            $cleanUsername = 'emp_' . Str::lower(str_replace('-', '_', $validated['employee_number']));
        }
        $candidateUsername = $cleanUsername;
        $counter = 1;
        while (User::where('username', $candidateUsername)->exists()) {
            $candidateUsername = $cleanUsername . '_' . $counter;
            $counter++;
        }

        // Create user account
        $user = User::create([
            'name' => $validated['name'],
            'username' => $candidateUsername,
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'status' => 'active',
            'email_verified_at' => now(),
            'terms_accepted_at' => now(),
        ]);
        $user->assignRole($validated['role']);

        // Create employee record
        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_number' => $validated['employee_number'],
            'phone_number' => $validated['phone_number'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'position_id' => $validated['position_id'] ?? null,
            'supervisor_id' => $validated['supervisor_id'] ?? null,
            'join_date' => $validated['join_date'] ?? now(),
            'employment_status' => $validated['employment_status'],
        ]);

        AuditLog::log([
            'action' => 'created',
            'model_type' => 'Employee',
            'model_id' => $employee->id,
            'description' => 'Created employee: '.$validated['name'].' ('.$validated['employee_number'].')',
        ]);

        return redirect()->route('employees.index')->with('success', 'Employee created successfully.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Employee $employee)
    {
        $employee->load(['user', 'department', 'position', 'supervisor.user']);

        return Inertia::render('Organization/Employees/Form', [
            'employee' => $employee,
            'currentRole' => $employee->user?->getRoleNames()->first(),
            'departments' => Department::getCachedList(),
            'positions' => Position::getCachedList(),
            'roles' => Role::pluck('name'),
            'supervisors' => Employee::with('user:id,name')
                ->where('id', '!=', $employee->id)
                ->get(['id', 'user_id', 'employee_number'])
                ->map(fn ($e) => [
                    'id' => $e->id,
                    'name' => $e->user?->name ?? 'Unknown',
                ]),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$employee->user_id,
            'employee_number' => 'required|string|unique:employees,employee_number,'.$employee->id,
            'phone_number' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'position_id' => ['nullable', Rule::exists('positions', 'id')->where('department_id', $request->input('department_id'))],
            'supervisor_id' => 'nullable|exists:employees,id',
            'join_date' => 'nullable|date',
            'employment_status' => 'required|string',
            'role' => 'required|string|exists:roles,name',
            'password' => 'nullable|string|min:8',
        ]);

        // Update user account
        $user = $employee->user;
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if (! empty($validated['password'])) {
            $user->update(['password' => bcrypt($validated['password'])]);
        }

        $user->syncRoles([$validated['role']]);

        // Update employee record
        $employee->update([
            'employee_number' => $validated['employee_number'],
            'phone_number' => $validated['phone_number'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'position_id' => $validated['position_id'] ?? null,
            'supervisor_id' => $validated['supervisor_id'] ?? null,
            'join_date' => $validated['join_date'] ?? null,
            'employment_status' => $validated['employment_status'],
        ]);

        return redirect()->route('employees.index')->with('success', 'Employee updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Employee $employee)
    {
        $user = $employee->user;
        $employee->delete();
        $user?->delete();

        return redirect()->route('employees.index')->with('success', 'Employee deleted successfully.');
    }
}
