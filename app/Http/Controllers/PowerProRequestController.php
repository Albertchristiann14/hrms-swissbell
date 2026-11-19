<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\PowerProRequest;
use App\Models\User;
use App\Notifications\PowerProStatusNotification;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PowerProRequestController extends Controller
{
    /**
     * Determine role/permissions of user for Power Pro module.
     */
    protected function getUserPermissions($user): array
    {
        if (!$user) {
            return [
                'isAdmin' => false,
                'isItStaff' => false,
                'isHod' => false,
                'isSupervisor' => false,
                'departmentId' => null,
            ];
        }

        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHRD = $user->hasRole('HRD / Admin');
        $isGM = $user->hasRole('General Manager');
        $isHod = $user->hasRole('Head of Department');
        $isSupervisor = $user->hasRole('Supervisor');

        $userEmployee = $user->employee;
        $department = $userEmployee?->department;
        $isItStaff = $isSuperAdmin || $isGM || ($department && strtolower($department->name) === 'it');

        return [
            'isAdmin' => $isSuperAdmin || $isHRD || $isGM,
            'isItStaff' => $isItStaff,
            'isHod' => $isHod,
            'isSupervisor' => $isSupervisor,
            'departmentId' => $department?->id,
            'departmentName' => $department?->name,
        ];
    }

    /**
     * Display a listing of Power Pro User ID requests.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $perms = $this->getUserPermissions($user);

        $query = PowerProRequest::with([
            'employee.user',
            'employee.position',
            'department',
            'requestedBy',
            'approvedBy',
            'processedBy',
        ]);

        // Non-IT, non-Admin, non-HOD can only view their own requests and their department's requests
        if (!$perms['isItStaff'] && !$perms['isAdmin']) {
            if ($perms['isHod'] && $perms['departmentId']) {
                $query->where('department_id', $perms['departmentId']);
            } else {
                $query->where(function ($q) use ($user, $perms) {
                    $q->where('requested_by_user_id', $user->id);
                    if ($user->employee) {
                        $q->orWhere('employee_id', $user->employee->id);
                    }
                });
            }
        }

        // Filters
        $search = $request->query('search', '');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                    ->orWhere('created_user_id', 'like', "%{$search}%")
                    ->orWhere('proposed_username', 'like', "%{$search}%")
                    ->orWhereHas('employee.user', function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('employee', function ($sub) use ($search) {
                        $sub->where('employee_number', 'like', "%{$search}%");
                    });
            });
        }

        $statusFilter = $request->query('status', 'all');
        if ($statusFilter !== 'all' && in_array($statusFilter, ['On Request', 'Approved', 'Done', 'Rejected'])) {
            $query->where('status', $statusFilter);
        }

        $typeFilter = $request->query('request_type', 'all');
        if ($typeFilter !== 'all') {
            $query->where('request_type', $typeFilter);
        }

        $deptFilter = $request->query('department_id', 'all');
        if ($deptFilter !== 'all') {
            $query->where('department_id', $deptFilter);
        }

        // Stats summary calculation (computed based on user visibility)
        $statsQuery = PowerProRequest::query();
        if (!$perms['isItStaff'] && !$perms['isAdmin']) {
            if ($perms['isHod'] && $perms['departmentId']) {
                $statsQuery->where('department_id', $perms['departmentId']);
            } else {
                $statsQuery->where(function ($q) use ($user) {
                    $q->where('requested_by_user_id', $user->id);
                    if ($user->employee) {
                        $q->orWhere('employee_id', $user->employee->id);
                    }
                });
            }
        }

        // Stats summary calculation (single aggregate query)
        $raw = (clone $statsQuery)->selectRaw("
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'On Request' THEN 1 END) as on_request,
            COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status = 'Done' THEN 1 END) as done,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected
        ")->first();

        $stats = [
            'total' => (int) ($raw?->total ?? 0),
            'on_request' => (int) ($raw?->on_request ?? 0),
            'approved' => (int) ($raw?->approved ?? 0),
            'done' => (int) ($raw?->done ?? 0),
            'rejected' => (int) ($raw?->rejected ?? 0),
        ];

        $requests = $query->latest()->paginate(15)->withQueryString();

        // Data for request form modal
        $departments = Department::getCachedList();
        $employees = Employee::with(['user:id,name', 'department:id,name', 'position:id,name'])
            ->whereNotNull('user_id')
            ->orderBy('id', 'desc')
            ->get(['id', 'user_id', 'department_id', 'position_id', 'employee_number']);

        return Inertia::render('IT/PowerPro/Index', [
            'requests' => $requests,
            'stats' => $stats,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
                'request_type' => $typeFilter,
                'department_id' => $deptFilter,
            ],
            'permissions' => $perms,
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'employee_id' => $user->employee?->id,
                'department_id' => $user->employee?->department_id,
                'department_name' => $user->employee?->department?->name,
                'position_name' => $user->employee?->position?->name,
            ],
        ]);
    }

    /**
     * Store a newly created Power Pro request.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'request_type' => ['required', 'string', 'in:create_new,modify_access,reset_password,deactivate'],
            'employment_status' => ['nullable', 'string', 'max:50'],
            'power_pro_modules' => ['required', 'array', 'min:1'],
            'power_pro_modules.*' => ['string'],
            'access_level' => ['required', 'string', 'max:100'],
            'special_privileges' => ['nullable', 'array'],
            'special_privileges.*' => ['string'],
            'proposed_username' => ['nullable', 'string', 'max:50'],
            'reason' => ['nullable', 'string', 'max:1000'],
            'requester_signature' => ['nullable', 'string'],
        ], [
            'employee_id.required' => 'Pilih karyawan yang diajukan.',
            'power_pro_modules.required' => 'Pilih minimal satu modul Power Pro yang dibutuhkan.',
            'power_pro_modules.min' => 'Pilih minimal satu modul Power Pro yang dibutuhkan.',
            'access_level.required' => 'Tentukan level akses / peran jabatan di sistem Power Pro.',
        ]);

        $employee = Employee::with('department')->findOrFail($validated['employee_id']);
        $departmentId = $employee->department_id;

        // Generate formatted Request Number: PPR-YYYYMM-XXXX
        $yearMonth = Carbon::now()->format('Ym');
        $lastRequest = PowerProRequest::where('request_number', 'like', "PPR-{$yearMonth}-%")
            ->orderBy('id', 'desc')
            ->first();

        $sequence = 1;
        if ($lastRequest && preg_match('/PPR-\d{6}-(\d{4})/', $lastRequest->request_number, $matches)) {
            $sequence = (int) $matches[1] + 1;
        }
        $requestNumber = sprintf("PPR-%s-%04d", $yearMonth, $sequence);

        $powerProRequest = PowerProRequest::create([
            'request_number' => $requestNumber,
            'request_type' => $validated['request_type'],
            'employee_id' => $employee->id,
            'department_id' => $departmentId,
            'employment_status' => $validated['employment_status'] ?? 'Permanent',
            'system_type' => 'Power Pro PMS',
            'power_pro_modules' => $validated['power_pro_modules'],
            'access_level' => $validated['access_level'],
            'special_privileges' => $validated['special_privileges'] ?? [],
            'proposed_username' => $validated['proposed_username'],
            'reason' => $validated['reason'],
            'status' => 'On Request',
            'requested_by_user_id' => $user->id,
            'requested_by_username' => $user->name,
            'requested_at' => Carbon::now(),
            'requester_signature' => $validated['requester_signature'],
        ]);

        // Audit Log
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'CREATE_POWER_PRO_REQUEST',
            'model_type' => PowerProRequest::class,
            'model_id' => $powerProRequest->id,
            'description' => "Pengajuan ID Power Pro {$requestNumber} untuk {$employee->user?->name}",
            'new_values' => $powerProRequest->toArray(),
            'ip_address' => $request->ip(),
        ]);

        $powerProRequest->load(['employee.user', 'department']);
        $this->notifyHodApprovers($powerProRequest, 'NEW_REQUEST');

        return redirect()->back()->with('success', "Form permohonan User ID Power Pro ({$requestNumber}) berhasil dikirimkan ke HOD & IT.");
    }

    /**
     * Head of Department (HOD) or Admin approves the request.
     */
    public function approve(Request $request, PowerProRequest $powerProRequest): RedirectResponse
    {
        $user = Auth::user();
        $perms = $this->getUserPermissions($user);

        // Authorization check: HOD of matching dept, Super Admin, GM, or HRD
        $isAuthorized = $perms['isAdmin'] || ($perms['isHod'] && $perms['departmentId'] === $powerProRequest->department_id);
        if (!$isAuthorized) {
            abort(403, 'Akses Ditolak: Hanya Head of Department (HOD) terkait atau Manajemen yang dapat menyetujui permohonan ini.');
        }

        $validated = $request->validate([
            'approver_signature' => ['nullable', 'string'],
            'approval_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $oldValues = $powerProRequest->toArray();

        $powerProRequest->update([
            'status' => 'Approved',
            'approved_by_user_id' => $user->id,
            'approved_by_username' => $user->name,
            'approved_at' => Carbon::now(),
            'approver_signature' => $validated['approver_signature'] ?? $powerProRequest->approver_signature,
            'approval_notes' => $validated['approval_notes'] ?? null,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'APPROVE_POWER_PRO_REQUEST',
            'model_type' => PowerProRequest::class,
            'model_id' => $powerProRequest->id,
            'description' => "Persetujuan HOD untuk permohonan {$powerProRequest->request_number}",
            'old_values' => $oldValues,
            'new_values' => $powerProRequest->toArray(),
            'ip_address' => $request->ip(),
        ]);

        $powerProRequest->load(['employee.user', 'department', 'requestedBy']);
        $this->notifyItStaff($powerProRequest, 'APPROVED_BY_HOD');
        $this->notifyRequester($powerProRequest, 'APPROVED_BY_HOD');

        return redirect()->back()->with('success', "Permohonan {$powerProRequest->request_number} telah disetujui HOD dan diteruskan ke Tim IT.");
    }

    /**
     * IT Department processes and issues the Power Pro User ID.
     */
    public function process(Request $request, PowerProRequest $powerProRequest): RedirectResponse
    {
        $user = Auth::user();
        $perms = $this->getUserPermissions($user);

        if (!$perms['isItStaff'] && !$perms['isAdmin']) {
            abort(403, 'Akses Ditolak: Hanya Tim IT atau Administrator yang dapat menyelesaikan permohonan User ID Power Pro.');
        }

        $validated = $request->validate([
            'created_user_id' => ['required', 'string', 'max:50'],
            'it_notes' => ['nullable', 'string', 'max:1000'],
            'it_signature' => ['nullable', 'string'],
        ], [
            'created_user_id.required' => 'Masukkan User ID Power Pro resmi yang telah dibuatkan pada server.',
        ]);

        $oldValues = $powerProRequest->toArray();

        $powerProRequest->update([
            'status' => 'Done',
            'created_user_id' => strtoupper(trim($validated['created_user_id'])),
            'it_notes' => $validated['it_notes'] ?? null,
            'it_signature' => $validated['it_signature'] ?? $powerProRequest->it_signature,
            'processed_by_user_id' => $user->id,
            'processed_by_username' => $user->name,
            'processed_at' => Carbon::now(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'COMPLETE_POWER_PRO_REQUEST',
            'model_type' => PowerProRequest::class,
            'model_id' => $powerProRequest->id,
            'description' => "Penerbitan User ID Power Pro {$powerProRequest->created_user_id} ({$powerProRequest->request_number})",
            'old_values' => $oldValues,
            'new_values' => $powerProRequest->toArray(),
            'ip_address' => $request->ip(),
        ]);

        $powerProRequest->load(['employee.user', 'department', 'requestedBy', 'approvedBy']);
        $this->notifyRequester($powerProRequest, 'USER_ID_ISSUED');

        return redirect()->back()->with('success', "User ID Power Pro {$powerProRequest->created_user_id} berhasil diterbitkan dan status diselesaikan.");
    }

    /**
     * Reject a request.
     */
    public function reject(Request $request, PowerProRequest $powerProRequest): RedirectResponse
    {
        $user = Auth::user();
        $perms = $this->getUserPermissions($user);

        $isAuthorized = $perms['isAdmin'] || $perms['isItStaff'] || ($perms['isHod'] && $perms['departmentId'] === $powerProRequest->department_id);
        if (!$isAuthorized) {
            abort(403, 'Akses Ditolak: Anda tidak memiliki wewenang untuk menolak permohonan ini.');
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ], [
            'rejection_reason.required' => 'Sebutkan alasan penolakan permohonan.',
        ]);

        $oldValues = $powerProRequest->toArray();

        $powerProRequest->update([
            'status' => 'Rejected',
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'REJECT_POWER_PRO_REQUEST',
            'model_type' => PowerProRequest::class,
            'model_id' => $powerProRequest->id,
            'description' => "Penolakan permohonan {$powerProRequest->request_number}: {$validated['rejection_reason']}",
            'old_values' => $oldValues,
            'new_values' => $powerProRequest->toArray(),
            'ip_address' => $request->ip(),
        ]);

        $powerProRequest->load(['employee.user', 'department', 'requestedBy', 'approvedBy']);
        $this->notifyRequester($powerProRequest, 'REJECTED');

        return redirect()->back()->with('success', "Permohonan {$powerProRequest->request_number} telah ditolak.");
    }

    /**
     * Official SOP Print page for physical documentation and compliance.
     */
    public function print(PowerProRequest $powerProRequest): Response
    {
        $powerProRequest->load([
            'employee.user',
            'employee.position',
            'department',
            'requestedBy',
            'approvedBy',
            'processedBy',
        ]);

        // Fetch IT Head / Manager and GM for reference signatures if available
        $itDept = Department::where('name', 'like', '%IT%')->first();
        $hodIT = Employee::with(['user', 'position'])
            ->where('department_id', $itDept?->id)
            ->whereHas('user.roles', fn($q) => $q->whereIn('name', ['Head of Department', 'Supervisor', 'Super Admin']))
            ->first();

        $gmUser = User::whereHas('roles', fn($q) => $q->where('name', 'General Manager'))->first();

        return Inertia::render('IT/PowerPro/Print', [
            'requestData' => $powerProRequest,
            'hodIT' => $hodIT,
            'gmUser' => $gmUser,
        ]);
    }

    /**
     * Export requests to CSV for IT audit records.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = Auth::user();
        $perms = $this->getUserPermissions($user);

        if (!$perms['isItStaff'] && !$perms['isAdmin']) {
            abort(403, 'Akses Ditolak: Hanya Tim IT yang berwenang mengekspor data audit.');
        }

        $fileName = 'PowerPro_User_Requests_' . date('Ymd_His') . '.csv';

        $requests = PowerProRequest::with(['employee.user', 'department', 'requestedBy', 'approvedBy', 'processedBy'])
            ->latest()
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($requests) {
            $handle = fopen('php://output', 'w');
            
            // UTF-8 BOM for Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'No. Permohonan',
                'Tanggal Pengajuan',
                'Tipe Request',
                'Status',
                'Nama Karyawan',
                'NIK / Employee ID',
                'Departemen',
                'Modul Power Pro',
                'Level Akses / Role',
                'Hak Istimewa',
                'User ID Diterbitkan',
                'Diajukan Oleh',
                'Disetujui Oleh (HOD)',
                'Dikerjakan Oleh (IT)',
                'Tanggal Selesai',
                'Catatan IT',
            ]);

            foreach ($requests as $item) {
                fputcsv($handle, [
                    $item->request_number,
                    $item->requested_at ? $item->requested_at->format('Y-m-d H:i') : '-',
                    $item->request_type_label,
                    $item->status,
                    $item->employee?->user?->name ?? '-',
                    $item->employee?->employee_number ?? '-',
                    $item->department?->name ?? '-',
                    is_array($item->power_pro_modules) ? implode(', ', $item->power_pro_modules) : '-',
                    $item->access_level,
                    is_array($item->special_privileges) ? implode(', ', $item->special_privileges) : '-',
                    $item->created_user_id ?? '-',
                    $item->requested_by_username ?? '-',
                    $item->approved_by_username ?? '-',
                    $item->processed_by_username ?? '-',
                    $item->processed_at ? $item->processed_at->format('Y-m-d H:i') : '-',
                    $item->it_notes ?? '-',
                ]);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Delete a request (if On Request or Admin).
     */
    public function destroy(PowerProRequest $powerProRequest): RedirectResponse
    {
        $user = Auth::user();
        $perms = $this->getUserPermissions($user);
        $isOwner = $powerProRequest->requested_by_user_id === $user->id 
            || ($user->employee && $powerProRequest->employee_id === $user->employee->id);

        if (!$perms['isAdmin'] && (!$isOwner || $powerProRequest->status !== 'On Request')) {
            abort(403, 'Akses Ditolak: Anda hanya dapat membatalkan permohonan milik Anda sendiri yang masih berstatus On Request.');
        }

        $reqNumber = $powerProRequest->request_number;
        $powerProRequest->delete();

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'DELETE_POWER_PRO_REQUEST',
            'model_type' => PowerProRequest::class,
            'model_id' => null,
            'description' => "Menghapus permohonan User ID Power Pro {$reqNumber}",
            'ip_address' => request()->ip(),
        ]);

        return redirect()->back()->with('success', "Permohonan {$reqNumber} berhasil dihapus.");
    }

    /**
     * Notify Head of Department for employee's department and Super Admins.
     */
    protected function notifyHodApprovers(PowerProRequest $request, string $type): void
    {
        try {
            $deptId = $request->department_id;
            $approvers = User::where(function ($q) use ($deptId) {
                $q->whereHas('roles', function ($r) {
                    $r->where('name', 'Head of Department');
                })->whereHas('employee', function ($e) use ($deptId) {
                    $e->where('department_id', $deptId);
                });
            })->orWhereHas('roles', function ($r) {
                $r->whereIn('name', ['Super Admin', 'General Manager']);
            })->get();

            foreach ($approvers as $approver) {
                $approver->notify(new PowerProStatusNotification($request, $type));
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to notify HOD approvers for PowerPro request {$request->request_number}: {$e->getMessage()}", [
                'request_id' => $request->id,
                'type' => $type,
                'exception' => $e,
            ]);
        }
    }

    /**
     * Notify IT staff and Super Admins.
     */
    protected function notifyItStaff(PowerProRequest $request, string $type): void
    {
        try {
            $itDept = Department::whereRaw('LOWER(name) = ?', ['it'])->first();
            $itUsers = User::where(function ($q) use ($itDept) {
                if ($itDept) {
                    $q->whereHas('employee', function ($e) use ($itDept) {
                        $e->where('department_id', $itDept->id);
                    });
                }
            })->orWhereHas('roles', function ($r) {
                $r->where('name', 'Super Admin');
            })->get();

            foreach ($itUsers as $itUser) {
                $itUser->notify(new PowerProStatusNotification($request, $type));
            }
        } catch (\Throwable $e) {
            Log::warning("Failed to notify IT staff for PowerPro request {$request->request_number}: {$e->getMessage()}", [
                'request_id' => $request->id,
                'type' => $type,
                'exception' => $e,
            ]);
        }
    }

    /**
     * Notify requester, employee, and HOD.
     */
    protected function notifyRequester(PowerProRequest $request, string $type): void
    {
        try {
            $recipients = collect();
            if ($request->requestedBy) {
                $recipients->push($request->requestedBy);
            }
            if ($request->employee?->user) {
                $recipients->push($request->employee->user);
            }
            if ($request->approvedBy && $type !== 'APPROVED_BY_HOD') {
                $recipients->push($request->approvedBy);
            }

            $recipients->unique('id')->each(function ($recipient) use ($request, $type) {
                $recipient->notify(new PowerProStatusNotification($request, $type));
            });
        } catch (\Throwable $e) {
            Log::warning("Failed to notify requester/employee for PowerPro request {$request->request_number}: {$e->getMessage()}", [
                'request_id' => $request->id,
                'type' => $type,
                'exception' => $e,
            ]);
        }
    }
}
