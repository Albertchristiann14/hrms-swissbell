<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\ItAsset;
use App\Models\ItTicket;
use App\Models\LeaveRequest;
use App\Models\MasterKeyRequest;
use App\Models\OvertimeRequest;
use App\Models\Payroll;
use App\Models\PerformanceScore;
use App\Models\Project;
use App\Models\RoomBorrowingTransaction;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\WorkSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $role = $user->getRoleNames()->first() ?? 'Staff / Employee';
        $today = Carbon::today();
        $view = $request->input('view', 'launcher');

        $latestAnnouncements = Announcement::with('creator')
            ->where(function ($q) use ($role) {
                $q->where('target_audience', 'All')
                    ->orWhere('target_audience', 'like', "%{$role}%");
            })
            ->orderBy('published_at', 'desc')
            ->limit(4)
            ->get();

        $employeeId = $user->employee?->id;
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHRD = $user->hasRole('HRD / Admin');
        $isGM = $user->hasRole('General Manager');
        $isHOD = $user->hasRole('Head of Department');
        $isHK = $user->employee?->department?->name === 'Housekeeping';
        $isSupervisor = $user->hasRole('Supervisor') || $isHOD;
        $isAdmin = $isSuperAdmin || $isHRD || $isGM;
        $canAccessHousekeeping = $isAdmin || $isHOD || $isHK;

        // Dynamic badge counters
        $activeTasksCount = 0;
        if ($employeeId && !$isAdmin) {
            $activeTasksCount = Task::whereHas('assignees', fn ($q) => $q->where('employee_id', $employeeId))
                ->whereNotIn('status', ['Approved', 'Cancelled'])
                ->count();
        } else {
            $activeTasksCount = Task::whereNotIn('status', ['Approved', 'Cancelled'])->count();
        }

        $masterKeyOnRequestCount = 0;
        if ($canAccessHousekeeping && Schema::hasTable('master_key_requests')) {
            $masterKeyQuery = MasterKeyRequest::where('status', 'On Request');
            if (!$isAdmin && !$isSupervisor) {
                $masterKeyQuery->where('employee_id', $employeeId);
            }
            $masterKeyOnRequestCount = $masterKeyQuery->count();
        }

        $pendingLeavesCount = 0;
        $pendingOvertimeCount = 0;
        if ($isAdmin || $isSupervisor) {
            $pendingLeavesCount = LeaveRequest::where('status', 'Pending')->count();
            $pendingOvertimeCount = OvertimeRequest::where('status', 'Pending')->count();
        } else {
            $pendingLeavesCount = LeaveRequest::where('employee_id', $employeeId)->where('status', 'Pending')->count();
            $pendingOvertimeCount = OvertimeRequest::where('employee_id', $employeeId)->where('status', 'Pending')->count();
        }

        $employeeTotalCount = Employee::count();
        $departmentTotalCount = Department::count();

        $openItTicketsCount = 0;
        $totalItAssetsCount = 0;
        if (Schema::hasTable('it_tickets')) {
            $isItStaff = $user->employee && $user->employee->department && strtolower($user->employee->department->name) === 'it';
            $itTicketsQuery = ItTicket::whereIn('status', ['Open', 'In Progress']);
            if (!$isAdmin && !$isItStaff) {
                $itTicketsQuery->where('reported_by_employee_id', $employeeId);
            }
            $openItTicketsCount = $itTicketsQuery->count();
            $totalItAssetsCount = ItAsset::count();
        }

        $pendingRoomReturnsCount = 0;
        $myActiveRoomBorrowingsCount = 0;
        if (Schema::hasTable('room_borrowing_transactions')) {
            $isSecurityUser = $user->hasRole('Security') || $isAdmin;
            if ($isSecurityUser) {
                $pendingRoomReturnsCount = RoomBorrowingTransaction::where('status', RoomBorrowingTransaction::STATUS_PENDING_RETURN)->count();
            }
            if ($employeeId) {
                $myActiveRoomBorrowingsCount = RoomBorrowingTransaction::where('borrower_employee_id', $employeeId)
                    ->whereIn('status', [
                        RoomBorrowingTransaction::STATUS_BORROWED,
                        RoomBorrowingTransaction::STATUS_PENDING_RETURN,
                    ])->count();
            }
        }

        $launcherStats = [
            'activeTasks' => $activeTasksCount,
            'masterKeyOnRequest' => $masterKeyOnRequestCount,
            'pendingLeaves' => $pendingLeavesCount,
            'pendingOvertime' => $pendingOvertimeCount,
            'totalEmployees' => $employeeTotalCount,
            'totalDepartments' => $departmentTotalCount,
            'openItTickets' => $openItTicketsCount,
            'totalItAssets' => $totalItAssetsCount,
            'pendingRoomReturns' => $pendingRoomReturnsCount,
            'myActiveRoomBorrowings' => $myActiveRoomBorrowingsCount,
        ];

        $data = [
            'view' => $view,
            'role' => $role,
            'launcherStats' => $launcherStats,
            'announcements' => $latestAnnouncements,
            'employeeData' => in_array($view, ['tasks', 'overview']) ? $this->getEmployeeData($user, $employeeId, $today, $canAccessHousekeeping) : null,
            'supervisorData' => (in_array($view, ['tasks', 'hr', 'overview']) && ($isAdmin || $isSupervisor)) ? $this->getSupervisorData($user, $today) : null,
            'hrData' => (in_array($view, ['hr', 'overview']) && $isAdmin) ? $this->getHrData($today, $employeeTotalCount) : null,
            'managerData' => ($view === 'overview' && ($isSuperAdmin || $isGM)) ? $this->getManagerData($today, $employeeTotalCount) : null,
            'employeeHrData' => in_array($view, ['hr', 'overview']) ? $this->getEmployeeHrData($user, $employeeId, $today, $pendingOvertimeCount) : null,
        ];

        return Inertia::render('Dashboard', $data);
    }

    /**
     * Compute Employee Tasks & Workspace Data (only queried for 'tasks' & 'overview' views)
     */
    private function getEmployeeData($user, $employeeId, $today, $canAccessHousekeeping)
    {
        $latestScore = PerformanceScore::where('employee_id', $employeeId)
            ->orderBy('created_at', 'desc')
            ->first();

        $leaveStats = [
            'pending' => LeaveRequest::where('employee_id', $employeeId)->where('status', 'Pending')->count(),
            'approved' => LeaveRequest::where('employee_id', $employeeId)->where('status', 'Approved')->whereYear('start_date', $today->year)->count(),
        ];

        $recentActivities = TaskActivity::with(['task:id,title', 'employee.user:id,name'])
            ->where('employee_id', $employeeId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $myRecentServiceRequests = $this->getMyServiceRequests($user, $employeeId, $canAccessHousekeeping);

        $nowStr = now()->toDateTimeString();
        $taskCounts = Task::whereHas('assignees', fn ($q) => $q->where('employee_id', $employeeId))
            ->selectRaw("
                COUNT(CASE WHEN status = 'To Do' THEN 1 END) as todo,
                COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'Done' THEN 1 END) as done,
                COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
                COUNT(CASE WHEN deadline < ? AND status NOT IN ('Approved', 'Cancelled') THEN 1 END) as overdue
            ", [$nowStr])
            ->first();

        return [
            'tasksSummary' => [
                'todo' => (int) ($taskCounts?->todo ?? 0),
                'in_progress' => (int) ($taskCounts?->in_progress ?? 0),
                'review' => (int) ($taskCounts?->done ?? 0),
                'done' => (int) ($taskCounts?->done ?? 0),
                'approved' => (int) ($taskCounts?->approved ?? 0),
                'overdue' => (int) ($taskCounts?->overdue ?? 0),
            ],
            'upcomingTasks' => Task::whereHas('assignees', fn ($q) => $q->where('employee_id', $employeeId))
                ->whereNotIn('status', ['Approved', 'Cancelled'])
                ->whereNotNull('deadline')
                ->orderBy('deadline', 'asc')
                ->limit(5)
                ->get(['id', 'title', 'priority', 'status', 'deadline', 'project_id']),
            'latestPerformanceScore' => $latestScore,
            'leaveStats' => $leaveStats,
            'recentActivities' => $recentActivities,
            'myServiceRequests' => $myRecentServiceRequests,
        ];
    }

    /**
     * Compute Supervisor Team Data (only queried for 'tasks', 'hr', or 'overview' views)
     */
    private function getSupervisorData($user, $today)
    {
        $teamEmployeeIds = Employee::where('supervisor_id', $user->employee?->id)->pluck('id');
        $teamAttendanceToday = Attendance::whereIn('employee_id', $teamEmployeeIds)
            ->where('date', $today->format('Y-m-d'))
            ->get(['id', 'employee_id', 'status']);

        $teamCount = $teamEmployeeIds->count();
        $presentCount = $teamAttendanceToday->whereIn('status', ['Present', 'Late'])->count();
        $teamAttendanceSummary = [
            'total' => $teamCount,
            'present' => $presentCount,
            'late' => $teamAttendanceToday->where('status', 'Late')->count(),
            'absent' => max(0, $teamCount - $presentCount),
        ];

        $pendingLeaves = LeaveRequest::whereIn('employee_id', $teamEmployeeIds)
            ->where('status', 'Pending')
            ->count();

        $projectProgress = Project::where('status', 'Active')
            ->withCount(['tasks as total_tasks', 'tasks as completed_tasks' => function ($query) {
                $query->where('status', 'Approved');
            }])->get(['id', 'name', 'status'])->map(function ($project) {
                $project->progress = $project->total_tasks > 0 ? round(($project->completed_tasks / $project->total_tasks) * 100) : 0;
                return $project;
            });

        $nowStr = now()->toDateTimeString();
        $taskStats = Task::selectRaw("
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'Approved' THEN 1 END) as completed,
            COUNT(CASE WHEN deadline < ? AND status NOT IN ('Approved', 'Cancelled') THEN 1 END) as overdue,
            COUNT(CASE WHEN status = 'Done' THEN 1 END) as pending
        ", [$nowStr])->first();

        return [
            'activeProjects' => Project::where('status', 'Active')->count(),
            'totalTasks' => (int) ($taskStats?->total ?? 0),
            'completedTasks' => (int) ($taskStats?->completed ?? 0),
            'overdueTasks' => (int) ($taskStats?->overdue ?? 0),
            'pendingReview' => (int) ($taskStats?->pending ?? 0),
            'pendingApproval' => (int) ($taskStats?->pending ?? 0),
            'teamWorkload' => Employee::with('user:id,name,email')
                ->whereIn('id', $teamEmployeeIds)
                ->withCount(['tasks as active_tasks_count' => function ($query) {
                    $query->whereNotIn('status', ['Approved', 'Cancelled']);
                }])
                ->get(['id', 'user_id', 'department_id', 'position_id', 'employee_number']),
            'teamAttendanceSummary' => $teamAttendanceSummary,
            'pendingLeaves' => $pendingLeaves,
            'projectProgress' => $projectProgress,
        ];
    }

    /**
     * Compute Management HR Suite Data (only queried for 'hr' or 'overview' views)
     */
    private function getHrData($today, $totalEmployees)
    {
        $attendanceToday = Attendance::where('date', $today->format('Y-m-d'))->get(['id', 'status']);
        $presentCount = $attendanceToday->where('status', 'Present')->count();
        $lateCount = $attendanceToday->where('status', 'Late')->count();

        $hasRecords = $attendanceToday->isNotEmpty();
        $attendanceTodaySummary = [
            'total' => $totalEmployees,
            'present' => $presentCount,
            'late' => $lateCount,
            'absent' => $hasRecords ? max(0, $totalEmployees - ($presentCount + $lateCount)) : 0,
            'has_records' => $hasRecords,
            'recorded' => $attendanceToday->count(),
        ];

        $recentHires = Employee::with(['user:id,name,email', 'department:id,name', 'position:id,name'])
            ->orderBy('join_date', 'desc')
            ->limit(5)
            ->get(['id', 'user_id', 'department_id', 'position_id', 'join_date']);

        return [
            'employeeCount' => $totalEmployees,
            'departmentCount' => Department::count(),
            'employeeWorkload' => Employee::with('user:id,name,email')->withCount(['tasks as active_tasks_count' => function ($query) {
                $query->where('status', '!=', 'Done');
            }])->orderByDesc('active_tasks_count')->limit(5)->get(['id', 'user_id', 'department_id', 'position_id', 'employee_number']),
            'departmentDistribution' => Department::withCount('employees')->get(['id', 'name']),
            'attendanceTodaySummary' => $attendanceTodaySummary,
            'pendingLeaves' => LeaveRequest::where('status', 'Pending')->count(),
            'pendingOvertime' => OvertimeRequest::where('status', 'Pending')->count(),
            'recentHires' => $recentHires,
        ];
    }

    /**
     * Compute General Manager / Super Admin Executive Analytics (only queried for 'overview')
     */
    private function getManagerData($today, $totalEmployees)
    {
        $monthStart = $today->copy()->startOfMonth();
        $workDays = max($today->diffInWeekdays($monthStart) + 1, 1);
        $totalPossible = $totalEmployees * $workDays;
        $totalPresent = Attendance::whereBetween('date', [$monthStart, $today])
            ->whereIn('status', ['Present', 'Late'])
            ->count();
        $attendanceRate = $totalPossible > 0 ? round(($totalPresent / $totalPossible) * 100, 1) : 0;

        // Group by department at assignment time, not by the employee's current department.
        // DISTINCT task_id prevents double counting two recipients from the same department.
        $departmentCounts = DB::table('task_assignment_histories as history')
            ->join('tasks', 'tasks.id', '=', 'history.task_id')
            ->whereNotNull('history.department_id')
            ->selectRaw("history.department_id,
                COUNT(DISTINCT CASE WHEN tasks.status NOT IN ('Approved', 'Cancelled') THEN tasks.id END) as active_count,
                COUNT(DISTINCT CASE WHEN tasks.status = 'Approved' THEN tasks.id END) as approved_count")
            ->groupBy('history.department_id')
            ->get()
            ->keyBy('department_id');

        $departmentPerformance = Department::withCount('employees')
            ->get(['id', 'name'])
            ->map(function ($dept) use ($departmentCounts) {
                $counts = $departmentCounts->get($dept->id);
                $dept->total_active_tasks = (int) ($counts?->active_count ?? 0);
                $dept->total_completed_tasks = (int) ($counts?->approved_count ?? 0);
                return $dept;
            });

        $projectProgress = Project::where('status', 'Active')
            ->withCount(['tasks as total_tasks', 'tasks as completed_tasks' => function ($query) {
                $query->where('status', 'Approved');
            }])->get(['id', 'name', 'status'])->map(function ($project) {
                $project->progress = $project->total_tasks > 0 ? round(($project->completed_tasks / $project->total_tasks) * 100) : 0;
                return $project;
            });

        return [
            'activeProjects' => Project::where('status', 'Active')->count(),
            'activeTasks' => Task::whereNotIn('status', ['Approved', 'Cancelled'])->count(),
            'completedThisMonth' => Task::where('status', 'Approved')
                ->whereHas('activities', fn ($query) => $query->where('action', 'task_approved')
                    ->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]))
                ->count(),
            'overdueTasks' => Task::whereDate('deadline', '<', today())
                ->whereNotIn('status', ['Approved', 'Cancelled'])->count(),
            'projectProgress' => $projectProgress,
            'taskStatusDistribution' => Task::selectRaw('status, count(*) as count')->groupBy('status')->get(),
            'attendanceRate' => $attendanceRate,
            'totalEmployees' => $totalEmployees,
            'pendingLeaves' => LeaveRequest::where('status', 'Pending')->count(),
            'pendingOvertime' => OvertimeRequest::where('status', 'Pending')->count(),
            'departmentPerformance' => $departmentPerformance,
        ];
    }

    /**
     * Compute Employee Personal HR Portal Data (only queried for 'hr' or 'overview' views)
     */
    private function getEmployeeHrData($user, $employeeId, $today, $pendingOvertimeCount)
    {
        $myAttendanceToday = null;
        $myMonthlyAttendance = [
            'present' => 0,
            'late' => 0,
            'absent' => 0,
            'total' => 0,
        ];
        $latestPayslip = null;
        $myRecentLeaves = [];
        $myRecentOvertime = [];

        $leaveStats = [
            'pending' => LeaveRequest::where('employee_id', $employeeId)->where('status', 'Pending')->count(),
            'approved' => LeaveRequest::where('employee_id', $employeeId)->where('status', 'Approved')->whereYear('start_date', $today->year)->count(),
        ];

        if ($employeeId) {
            $myAttendanceToday = Attendance::where('employee_id', $employeeId)
                ->where('date', $today->format('Y-m-d'))
                ->first();

            $monthPattern = $today->format('Y-m') . '%';
            $monthlyStats = Attendance::where('employee_id', $employeeId)
                ->where('date', 'like', $monthPattern)
                ->selectRaw("
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'Present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'Late' THEN 1 END) as late,
                    COUNT(CASE WHEN status = 'Absent' THEN 1 END) as absent
                ")->first();

            $myMonthlyAttendance = [
                'present' => (int) ($monthlyStats?->present ?? 0),
                'late' => (int) ($monthlyStats?->late ?? 0),
                'absent' => (int) ($monthlyStats?->absent ?? 0),
                'total' => (int) ($monthlyStats?->total ?? 0),
            ];

            if (Schema::hasTable('payrolls')) {
                $latestPayslip = Payroll::with('period')
                    ->where('employee_id', $employeeId)
                    ->latest()
                    ->first();
            }

            $myRecentLeaves = LeaveRequest::where('employee_id', $employeeId)
                ->orderBy('created_at', 'desc')
                ->limit(3)
                ->get();

            $myRecentOvertime = OvertimeRequest::where('employee_id', $employeeId)
                ->orderBy('created_at', 'desc')
                ->limit(3)
                ->get();
        }

        return [
            'attendanceToday' => $myAttendanceToday,
            'monthlyAttendance' => $myMonthlyAttendance,
            'leaveStats' => $leaveStats,
            'recentLeaves' => $myRecentLeaves,
            'recentOvertime' => $myRecentOvertime,
            'pendingOvertime' => $pendingOvertimeCount,
            'latestPayslip' => $latestPayslip,
        ];
    }

    /**
     * Compute Personal Service Requests Across Modules
     */
    private function getMyServiceRequests($user, $employeeId, $canAccessHousekeeping)
    {
        $myRecentServiceRequests = [];
        if (!$employeeId) {
            return $myRecentServiceRequests;
        }

        // 1. My Room Borrowings
        if (Schema::hasTable('room_borrowing_transactions')) {
            $borrowings = RoomBorrowingTransaction::with('room')
                ->where('borrower_employee_id', $employeeId)
                ->whereIn('status', [RoomBorrowingTransaction::STATUS_BORROWED, RoomBorrowingTransaction::STATUS_PENDING_RETURN])
                ->get()
                ->map(fn($b) => [
                    'id' => 'rb-' . $b->id,
                    'module' => 'Room & Key',
                    'type' => 'Room Key Borrowing',
                    'title' => $b->room ? ($b->room->name . ' (' . $b->room->room_number . ')') : 'Room Key',
                    'reference' => $b->transaction_number,
                    'status' => $b->status === RoomBorrowingTransaction::STATUS_BORROWED ? 'Active Loan' : 'Pending Return',
                    'raw_status' => $b->status,
                    'status_color' => $b->status === RoomBorrowingTransaction::STATUS_BORROWED ? 'emerald' : 'amber',
                    'date' => $b->borrowed_at ? $b->borrowed_at->format('d M Y, H:i') : null,
                    'link' => route('room-borrowing.index', ['tab' => 'my-borrowings']),
                ]);
            $myRecentServiceRequests = array_merge($myRecentServiceRequests, $borrowings->toArray());
        }

        // 2. My IT Tickets
        if (Schema::hasTable('it_tickets')) {
            $tickets = ItTicket::where('reported_by_employee_id', $employeeId)
                ->whereIn('status', ['Open', 'In Progress'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn($t) => [
                    'id' => 'it-' . $t->id,
                    'module' => 'IT Helpdesk',
                    'type' => 'IT Support Ticket',
                    'title' => $t->title,
                    'reference' => $t->ticket_number,
                    'status' => $t->status,
                    'raw_status' => $t->status,
                    'status_color' => $t->status === 'Open' ? 'rose' : 'amber',
                    'date' => $t->created_at ? $t->created_at->format('d M Y, H:i') : null,
                    'link' => route('it.tickets.show', $t->id),
                ]);
            $myRecentServiceRequests = array_merge($myRecentServiceRequests, $tickets->toArray());
        }

        // 3. My Power Pro Requests
        if (Schema::hasTable('power_pro_requests')) {
            $powerPros = \App\Models\PowerProRequest::where(function($q) use ($user, $employeeId) {
                    $q->where('requested_by_user_id', $user->id);
                    if ($employeeId) {
                        $q->orWhere('employee_id', $employeeId);
                    }
                })
                ->whereIn('status', ['On Request', 'Approved'])
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn($p) => [
                    'id' => 'pp-' . $p->id,
                    'module' => 'IT Operations',
                    'type' => 'PowerPro User ID',
                    'title' => 'PMS Access Request (' . $p->access_level . ')',
                    'reference' => $p->request_number,
                    'status' => $p->status,
                    'raw_status' => $p->status,
                    'status_color' => $p->status === 'On Request' ? 'amber' : 'blue',
                    'date' => $p->created_at ? $p->created_at->format('d M Y, H:i') : null,
                    'link' => route('power-pro.index'),
                ]);
            $myRecentServiceRequests = array_merge($myRecentServiceRequests, $powerPros->toArray());
        }

        // 4. My Master Key Requests
        if ($canAccessHousekeeping && Schema::hasTable('master_key_requests')) {
            $keys = MasterKeyRequest::where('employee_id', $employeeId)
                ->where('status', 'On Request')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn($k) => [
                    'id' => 'mk-' . $k->id,
                    'module' => 'Housekeeping',
                    'type' => 'Master Key Request',
                    'title' => $k->key_type . ' (' . $k->key_number . ')',
                    'reference' => $k->request_number,
                    'status' => $k->status,
                    'raw_status' => $k->status,
                    'status_color' => 'amber',
                    'date' => $k->created_at ? $k->created_at->format('d M Y, H:i') : null,
                    'link' => route('master-keys.index'),
                ]);
            $myRecentServiceRequests = array_merge($myRecentServiceRequests, $keys->toArray());
        }

        // 5. My Leave Requests
        $leaves = LeaveRequest::where('employee_id', $employeeId)
            ->where('status', 'Pending')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn($l) => [
                'id' => 'lv-' . $l->id,
                'module' => 'Human Resources',
                'type' => 'Leave Request (' . $l->type . ')',
                'title' => $l->reason,
                'reference' => 'LV-' . $l->id,
                'status' => $l->status,
                'raw_status' => $l->status,
                'status_color' => 'amber',
                'date' => $l->created_at ? $l->created_at->format('d M Y, H:i') : null,
                'link' => route('leave.index'),
            ]);
        $myRecentServiceRequests = array_merge($myRecentServiceRequests, $leaves->toArray());

        // 6. My Overtime Requests
        $overtimes = OvertimeRequest::where('employee_id', $employeeId)
            ->where('status', 'Pending')
            ->latest()
            ->limit(3)
            ->get()
            ->map(fn($o) => [
                'id' => 'ot-' . $o->id,
                'module' => 'Human Resources',
                'type' => 'Overtime (SPKL)',
                'title' => $o->reason,
                'reference' => 'OT-' . $o->id,
                'status' => $o->status,
                'raw_status' => $o->status,
                'status_color' => 'amber',
                'date' => $o->created_at ? $o->created_at->format('d M Y, H:i') : null,
                'link' => route('overtime.index'),
            ]);
        $myRecentServiceRequests = array_merge($myRecentServiceRequests, $overtimes->toArray());

        return $myRecentServiceRequests;
    }
}
