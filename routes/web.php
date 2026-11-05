<?php


use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentTaskHistoryController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\ItOperationsController;
use App\Http\Controllers\ItRegistrationController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\OvertimeRequestController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\WorkScheduleController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\PerformanceController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\TaskAttachmentController;
use App\Http\Controllers\TaskChecklistController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\MasterKeyRequestController;
use App\Http\Controllers\PowerProRequestController;
use App\Http\Controllers\RoomBorrowingController;
use App\Http\Controllers\TaskController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

Route::get('/', function () {
    if (Illuminate\Support\Facades\Auth::check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'approved'])->name('dashboard');

Route::middleware(['auth', 'approved'])->group(function () {
    Route::get('/dashboard/departments/tasks/history', [DepartmentTaskHistoryController::class, 'index'])
        ->middleware('role:Super Admin|General Manager')
        ->name('dashboard.departments.tasks.index');
    Route::get('/dashboard/departments/{department}/tasks/history', [DepartmentTaskHistoryController::class, 'index'])
        ->middleware('role:Super Admin|General Manager')
        ->name('dashboard.departments.tasks.history');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::resource('projects', ProjectController::class);
    Route::post('/projects/{project}/archive', [ProjectController::class, 'archive'])->name('projects.archive');
    Route::post('/projects/{project}/restore', [ProjectController::class, 'restore'])->name('projects.restore');
    Route::get('/tasks/summary', function () {
        return redirect()->route('dashboard', ['view' => 'tasks']);
    })->name('tasks.summary');
    Route::get('/tasks/kanban', [TaskController::class, 'kanban'])->name('tasks.kanban');
    Route::get('/tasks/calendar', [TaskController::class, 'calendar'])->name('tasks.calendar');
    Route::resource('tasks', TaskController::class);

    // Collaboration Routes
    Route::post('/tasks/{task}/comments', [TaskCommentController::class, 'store'])->name('tasks.comments.store');
    Route::delete('/comments/{comment}', [TaskCommentController::class, 'destroy'])->name('tasks.comments.destroy');

    Route::post('/tasks/{task}/attachments', [TaskAttachmentController::class, 'store'])->name('tasks.attachments.store');
    Route::delete('/attachments/{attachment}', [TaskAttachmentController::class, 'destroy'])->name('tasks.attachments.destroy');

    Route::post('/tasks/{task}/checklists', [TaskChecklistController::class, 'store'])->name('tasks.checklists.store');
    Route::put('/checklists/{checklist}', [TaskChecklistController::class, 'update'])->name('tasks.checklists.update');
    Route::delete('/checklists/{checklist}', [TaskChecklistController::class, 'destroy'])->name('tasks.checklists.destroy');

    Route::post('/tasks/{task}/acknowledge', [TaskController::class, 'acknowledge'])->name('tasks.acknowledge');



    // Notifications Route
    Route::delete('/notifications', function () {
        Illuminate\Support\Facades\Auth::user()->notifications()->delete();
        return back();
    })->name('notifications.destroyAll');

    Route::delete('/notifications/{id}', function ($id) {
        Illuminate\Support\Facades\Auth::user()->notifications()->where('id', $id)->delete();
        return back();
    })->name('notifications.destroy');

    // Performance Routes
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::get('/performance', [PerformanceController::class, 'index'])->name('performance.index');
        Route::post('/performance/calculate', [PerformanceController::class, 'calculate'])->name('performance.calculate');
        Route::post('/performance/periods', [PerformanceController::class, 'storePeriod'])->name('performance.periods.store');
        Route::delete('/performance/periods/{period}', [PerformanceController::class, 'destroyPeriod'])->name('performance.periods.destroy');
    });
    Route::get('/performance/{employee}/{period}', [PerformanceController::class, 'show'])->name('performance.show');
    Route::get('/performance/{employee}/{period}/assess', [PerformanceController::class, 'assess'])->name('performance.assess');
    Route::post('/performance/{employee}/{period}/assess', [PerformanceController::class, 'storeAssessment'])->name('performance.storeAssessment');

    // Leave Routes
    Route::get('/leave', [LeaveRequestController::class, 'index'])->name('leave.index');
    Route::post('/leave', [LeaveRequestController::class, 'store'])->name('leave.store');
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::patch('/leave/{leaveRequest}/status', [LeaveRequestController::class, 'updateStatus'])->name('leave.status');
    });

    // Overtime Routes
    Route::get('/overtime', [OvertimeRequestController::class, 'index'])->name('overtime.index');
    Route::post('/overtime', [OvertimeRequestController::class, 'store'])->name('overtime.store');
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::patch('/overtime/{overtimeRequest}/status', [OvertimeRequestController::class, 'updateStatus'])->name('overtime.status');
    });

    // Shift & Schedule Routes
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager|Head of Department|Supervisor'])->group(function () {
        Route::resource('/shifts', ShiftController::class)->except(['create', 'show', 'edit']);
        Route::get('/schedules', [WorkScheduleController::class, 'index'])->name('schedules.index');
        Route::post('/schedules', [WorkScheduleController::class, 'store'])->name('schedules.store');
        Route::post('/schedules/bulk', [WorkScheduleController::class, 'bulkStore'])->name('schedules.bulk');
        Route::post('/schedules/copy-previous-week', [WorkScheduleController::class, 'copyPreviousWeek'])->name('schedules.copyPreviousWeek');
        Route::post('/schedules/clear-week', [WorkScheduleController::class, 'clearWeek'])->name('schedules.clearWeek');
        Route::delete('/schedules/{schedule}', [WorkScheduleController::class, 'destroy'])->name('schedules.destroy');
    });

    // Attendance Routes
    Route::get('/my-attendance', [AttendanceController::class, 'myAttendance'])->name('attendance.my');
    Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn'])->name('attendance.clockIn');
    Route::post('/attendance/clock-out', [AttendanceController::class, 'clockOut'])->name('attendance.clockOut');

    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::get('/attendance', [AttendanceController::class, 'index'])->name('attendance.index');
        Route::get('/attendance/export', [AttendanceController::class, 'export'])->name('attendance.export');
        Route::patch('/attendance/location', [AttendanceController::class, 'updateLocation'])->name('attendance.location.update');
        Route::patch('/attendance/{attendance}/correct', [AttendanceController::class, 'correct'])->name('attendance.correct');
    });

    // Payroll Routes
    Route::get('/my-payslips', [PayrollController::class, 'myPayslips'])->name('payroll.my');
    Route::get('/payroll/{id}/payslip', [PayrollController::class, 'showPayslip'])->name('payroll.show');
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::get('/payroll', [PayrollController::class, 'index'])->name('payroll.index');
        Route::post('/payroll/generate', [PayrollController::class, 'generate'])->name('payroll.generate');
    });

    // Announcement Routes
    Route::get('/announcements', [AnnouncementController::class, 'index'])->name('announcements.index');
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::post('/announcements', [AnnouncementController::class, 'store'])->name('announcements.store');
    });

    // Document Routes
    Route::get('/documents', [DocumentController::class, 'index'])->name('documents.index');
    Route::get('/documents/{id}/download', [DocumentController::class, 'download'])->name('documents.download');
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::post('/documents', [DocumentController::class, 'store'])->name('documents.store');
    });

    // Directory Routes
    Route::get('/directory', [DirectoryController::class, 'index'])->name('directory.index');

    // Master Key Access Routes (Housekeeping & IT)
    Route::get('/master-keys', [MasterKeyRequestController::class, 'index'])->name('master-keys.index');
    Route::get('/master-keys/export', [MasterKeyRequestController::class, 'export'])->name('master-keys.export');
    Route::post('/master-keys', [MasterKeyRequestController::class, 'store'])->name('master-keys.store');
    Route::get('/master-keys/{masterKeyRequest}/print', [MasterKeyRequestController::class, 'print'])->name('master-keys.print');
    Route::post('/master-keys/{masterKeyRequest}/renew', [MasterKeyRequestController::class, 'renew'])->name('master-keys.renew');
    Route::patch('/master-keys/{masterKeyRequest}/status', [MasterKeyRequestController::class, 'updateStatus'])->name('master-keys.status');
    Route::patch('/master-keys/{masterKeyRequest}/approve', [MasterKeyRequestController::class, 'approve'])->name('master-keys.approve');
    Route::patch('/master-keys/{masterKeyRequest}/process-key', [MasterKeyRequestController::class, 'processKey'])->name('master-keys.process-key');
    Route::delete('/master-keys/{masterKeyRequest}', [MasterKeyRequestController::class, 'destroy'])->name('master-keys.destroy');

    // Room Borrowing & Key Management Routes (Security & Facilities)
    Route::get('/room-borrowing', [RoomBorrowingController::class, 'index'])->name('room-borrowing.index');
    Route::post('/room-borrowing/borrow', [RoomBorrowingController::class, 'borrow'])->name('room-borrowing.borrow');
    Route::post('/room-borrowing/{transaction}/return-request', [RoomBorrowingController::class, 'requestReturn'])->name('room-borrowing.return-request');
    Route::post('/room-borrowing/{transaction}/confirm-return', [RoomBorrowingController::class, 'confirmReturn'])->name('room-borrowing.confirm-return');
    Route::post('/room-borrowing/rooms', [RoomBorrowingController::class, 'storeRoom'])->name('room-borrowing.rooms.store');
    Route::put('/room-borrowing/rooms/{room}', [RoomBorrowingController::class, 'updateRoom'])->name('room-borrowing.rooms.update');
    Route::patch('/room-borrowing/rooms/{room}/toggle', [RoomBorrowingController::class, 'toggleRoomStatus'])->name('room-borrowing.rooms.toggle');

    // IT Operations & Helpdesk Routes
    Route::get('/it', [ItOperationsController::class, 'index'])->name('it.index');
    Route::post('/it/assets', [ItOperationsController::class, 'storeAsset'])->name('it.assets.store');
    Route::match(['put', 'post'], '/it/assets/{asset}', [ItOperationsController::class, 'updateAsset'])->name('it.assets.update');
    Route::delete('/it/assets/{asset}', [ItOperationsController::class, 'destroyAsset'])->name('it.assets.destroy');
    Route::post('/it/tickets', [ItOperationsController::class, 'storeTicket'])->name('it.tickets.store');
    Route::get('/it/tickets/{ticket}', [ItOperationsController::class, 'showTicket'])->name('it.tickets.show');
    Route::patch('/it/tickets/{ticket}/status', [ItOperationsController::class, 'updateTicketStatus'])->name('it.tickets.status');
    Route::post('/it/tickets/{ticket}/updates', [ItOperationsController::class, 'addTicketUpdate'])->name('it.tickets.updates');
    Route::delete('/it/tickets/{ticket}', [ItOperationsController::class, 'destroyTicket'])->name('it.tickets.destroy');

    // IT Registration Approvals
    Route::get('/it/registrations', [ItRegistrationController::class, 'index'])->name('it.registrations.index');
    Route::post('/it/registrations/{user}/approve', [ItRegistrationController::class, 'approve'])->name('it.registrations.approve');
    Route::post('/it/registrations/{user}/reject', [ItRegistrationController::class, 'reject'])->name('it.registrations.reject');

    // Power Pro User Access Request Routes (IT Operations)
    Route::get('/it/power-pro', [PowerProRequestController::class, 'index'])->name('power-pro.index');
    Route::get('/it/power-pro/export', [PowerProRequestController::class, 'export'])->name('power-pro.export');
    Route::post('/it/power-pro', [PowerProRequestController::class, 'store'])->name('power-pro.store');
    Route::get('/it/power-pro/{powerProRequest}/print', [PowerProRequestController::class, 'print'])->name('power-pro.print');
    Route::patch('/it/power-pro/{powerProRequest}/approve', [PowerProRequestController::class, 'approve'])->name('power-pro.approve');
    Route::patch('/it/power-pro/{powerProRequest}/process', [PowerProRequestController::class, 'process'])->name('power-pro.process');
    Route::patch('/it/power-pro/{powerProRequest}/reject', [PowerProRequestController::class, 'reject'])->name('power-pro.reject');
    Route::delete('/it/power-pro/{powerProRequest}', [PowerProRequestController::class, 'destroy'])->name('power-pro.destroy');

    // Administration & Organization Routes
    Route::middleware(['role:Super Admin|HRD / Admin|General Manager'])->group(function () {
        Route::resource('departments', DepartmentController::class)->except(['create', 'edit', 'show']);
        Route::resource('employees', EmployeeController::class)->except(['show']);
    });

    // System Administration Routes
    Route::middleware(['role:Super Admin'])->group(function () {
        Route::get('/roles', function () {
            return Inertia::render('Administration/Roles', [
                'roles' => Role::with('permissions')->get(),
            ]);
        })->name('roles.index');
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::get('/settings', function () {
            return Inertia::render('Administration/Settings');
        })->name('settings.index');
        Route::get('/system/run-migrations', function () {
            try {
                \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
                $output = \Illuminate\Support\Facades\Artisan::output();
                return response()->json([
                    'status' => 'success',
                    'message' => 'Database migrations executed successfully.',
                    'output' => $output,
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'status' => 'error',
                    'message' => $e->getMessage(),
                ], 500);
            }
        })->name('system.migrate');
    });
});

// API Sync for Attendance
Route::post('/api/attendance/sync', [AttendanceController::class, 'sync']);

require __DIR__.'/auth.php';
