<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Employee;
use App\Models\MasterKeyRequest;
use App\Models\User;
use App\Notifications\MasterKeyStatusNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MasterKeyRequestController extends Controller
{
    /**
     * Ensure the master_key_requests table exists.
     */
    private function ensureTableExists(): bool
    {
        return Schema::hasTable('master_key_requests') && Schema::hasColumn('master_key_requests', 'request_by');
    }

    /**
     * Check if the authenticated user is authorized to access Housekeeping Master Key module.
     * Allowed: Super Admin, HRD / Admin, General Manager, Head of Department (HOD), Housekeeping staff, or Department IT.
     */
    private function canAccessMasterKey(): bool
    {
        $user = Auth::user();
        if (!$user) {
            return false;
        }

        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHRD = $user->hasRole('HRD / Admin');
        $isGM = $user->hasRole('General Manager');
        $isHOD = $user->hasRole('Head of Department');
        $isHK = $user->employee?->department?->name === 'Housekeeping';
        $isIT = $user->employee?->department?->name === 'IT';

        return $isSuperAdmin || $isHRD || $isGM || $isHOD || $isHK || $isIT;
    }

    /**
     * Display a listing of master key access requests.
     */
    public function index(Request $request)
    {
        if (!$this->canAccessMasterKey()) {
            abort(403, 'Akses Ditolak: Modul Housekeeping hanya dapat diakses oleh Departemen Housekeeping, HOD Housekeeping, Departemen IT, dan manajemen yang berwenang.');
        }

        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHRD = $user->hasRole('HRD / Admin');
        $isGM = $user->hasRole('General Manager');
        $isHOD = $user->hasRole('Head of Department');
        $isSupervisor = $user->hasRole('Supervisor');

        $userEmployee = $user->employee;
        $isHK = $userEmployee?->department?->name === 'Housekeeping';
        $isIT = $userEmployee?->department?->name === 'IT';

        // Approvals strictly received/handled by HOD Housekeeping (or Super Admin)
        $canApprove = $isSuperAdmin || ($isHOD && $isHK);
        // Master key creation, RFID programming & issuance performed by Department IT (or Super Admin)
        $canCreateKey = $isSuperAdmin || $isIT;
        // View/manage all requests
        $canManageAll = $canApprove || $canCreateKey || $isHRD || $isGM || ($isSupervisor && $isHK);

        if (!$this->ensureTableExists()) {
            $hkDepartment = Department::where('name', 'Housekeeping')->first();
            $hkEmployees = Employee::with(['user', 'position'])
                ->where('department_id', $hkDepartment?->id)
                ->get();

            return Inertia::render('MasterKey/Index', [
                'requests' => new \Illuminate\Pagination\LengthAwarePaginator([], 0, 15),
                'filters' => [
                    'tab' => $request->input('tab', 'all'),
                    'search' => $request->input('search', ''),
                    'key_type' => $request->input('key_type', ''),
                    'request_type' => $request->input('request_type', ''),
                ],
                'stats' => [
                    'total' => 0,
                    'on_request' => 0,
                    'done' => 0,
                    'expiring_soon' => 0,
                    'expired' => 0,
                ],
                'canApprove' => $canApprove,
                'canCreateKey' => $canCreateKey,
                'canManageAll' => $canManageAll,
                'currentEmployee' => $userEmployee?->load(['department', 'position']),
                'currentUser' => $user,
                'hkEmployees' => $hkEmployees,
                'existingKeys' => [],
                'defaultKeyTypes' => [
                    'Grand Master Key',
                    'Master Key',
                    'Floor Key',
                    'Lift Only',
                ],
                'commonRoomRanges' => [
                    'Lantai 2 (Kamar 201 - 210)',
                    'Lantai 3 (Kamar 301 - 318)',
                    'Lantai 5 (Kamar 501 - 518)',
                    'Lantai 6 (Kamar 601 - 618)',
                    'Lantai 7 (Kamar 701 - 718)',
                    'Lantai 8 (Kamar 801 - 818)',
                    'Lantai 9 (Kamar 901 - 918)',
                    'Lantai 10 (Kamar 1001 - 1018)',
                    'Seluruh Area Kamar Tamu (All HK Guest Rooms)',
                    'Area Publik & Linen Room',
                ],
                'migrationNotice' => 'Tabel "master_key_requests" belum tersedia di database MySQL server ini. Sistem mencoba menjalankan migrasi otomatis, atau Anda dapat menjalankan "php artisan migrate" di terminal server.',
            ]);
        }

        $query = MasterKeyRequest::with([
            'employee.user',
            'employee.department',
            'employee.position',
            'requestedBy',
            'approvedBy.employee.position',
            'doneBy.employee.position',
            'previousRequest',
            'auditLogs.user',
        ])->latest();

        // If regular staff, view own requests
        if (!$canManageAll) {
            $query->where('employee_id', $userEmployee?->id);
        }

        // Search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                    ->orWhere('key_number', 'like', "%{$search}%")
                    ->orWhere('remark', 'like', "%{$search}%")
                    ->orWhere('room_range_access', 'like', "%{$search}%")
                    ->orWhere('request_by', 'like', "%{$search}%")
                    ->orWhere('requested_by_username', 'like', "%{$search}%")
                    ->orWhere('approved_by_username', 'like', "%{$search}%")
                    ->orWhere('done_by_username', 'like', "%{$search}%")
                    ->orWhereHas('employee.user', function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('employee', function ($sub) use ($search) {
                        $sub->where('employee_number', 'like', "%{$search}%");
                    });
            });
        }

        // Key Type filter
        if ($keyType = $request->input('key_type')) {
            $query->where('key_type', $keyType);
        }

        // Request Type filter (create_new, extension, replacement)
        if ($requestType = $request->input('request_type')) {
            $query->where('request_type', $requestType);
        }

        // Tab status filter: all, on_request, approved, done (created/updated/done), rejected, expiring, expired
        $tab = $request->input('tab', 'all');
        $today = Carbon::today()->toDateString();
        $fourteenDaysLater = Carbon::today()->addDays(14)->toDateString();

        if ($tab === 'on_request') {
            $query->where('status', 'On Request');
        } elseif ($tab === 'approved') {
            $query->where('status', 'Approved');
        } elseif ($tab === 'done') {
            $query->whereIn('status', ['Created', 'Updated', 'Done']);
        } elseif ($tab === 'rejected') {
            $query->where('status', 'Rejected');
        } elseif ($tab === 'expiring') {
            $query->whereIn('status', ['Created', 'Updated', 'Done'])
                ->where('valid_until', '>=', $today)
                ->where('valid_until', '<=', $fourteenDaysLater);
        } elseif ($tab === 'expired') {
            $query->whereIn('status', ['Created', 'Updated', 'Done'])
                ->where('valid_until', '<', $today);
        }

        $requests = $query->paginate(15)->withQueryString();

        // One lightweight query for the currently visible keys: preserve their
        // complete request / extension history even when older rows are on other pages.
        $visibleKeyNumbers = $requests->getCollection()->pluck('key_number')->filter()->unique()->values();
        $renewalHistories = [];
        if ($visibleKeyNumbers->isNotEmpty()) {
            $historyQuery = MasterKeyRequest::query()
                ->whereIn('key_number', $visibleKeyNumbers)
                ->orderByRaw('COALESCE(requested_at, created_at) DESC')
                ->orderByDesc('id');

            if (! $canManageAll) {
                $historyQuery->where('employee_id', $userEmployee?->id);
            }

            $renewalHistories = $historyQuery->get([
                'id', 'request_number', 'request_type', 'key_number',
                'request_by', 'requested_by_username', 'status', 'requested_at', 'created_at',
                'valid_from', 'valid_until', 'previous_request_id',
            ])->groupBy('key_number')->map(fn ($rows) => $rows->map(fn ($row) => [
                'id' => $row->id,
                'request_number' => $row->request_number,
                'request_type' => $row->request_type,
                'request_by' => $row->getRawOriginal('request_by') ?: ($row->requested_by_username ?: '-'),
                'status' => $row->status,
                'requested_at' => ($row->requested_at ?? $row->created_at)?->toIso8601String(),
                'valid_from' => $row->valid_from?->format('Y-m-d'),
                'valid_until' => $row->valid_until?->format('Y-m-d'),
                'previous_request_id' => $row->previous_request_id,
            ])->values()->all())->all();
        }

        // Statistics
        $statsBaseQuery = MasterKeyRequest::query();
        if (!$canManageAll) {
            $statsBaseQuery->where('employee_id', $userEmployee?->id);
        }

        // Statistics (single aggregation query)
        $raw = (clone $statsBaseQuery)->selectRaw("
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'On Request' THEN 1 END) as on_request,
            COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
            COUNT(CASE WHEN status IN ('Created', 'Updated', 'Done') THEN 1 END) as done,
            COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
            COUNT(CASE WHEN status IN ('Created', 'Updated', 'Done') AND valid_until >= ? AND valid_until <= ? THEN 1 END) as expiring_soon,
            COUNT(CASE WHEN status IN ('Created', 'Updated', 'Done') AND valid_until < ? THEN 1 END) as expired
        ", [$today, $fourteenDaysLater, $today])->first();

        $stats = [
            'total' => (int) ($raw?->total ?? 0),
            'on_request' => (int) ($raw?->on_request ?? 0),
            'approved' => (int) ($raw?->approved ?? 0),
            'done' => (int) ($raw?->done ?? 0),
            'rejected' => (int) ($raw?->rejected ?? 0),
            'expiring_soon' => (int) ($raw?->expiring_soon ?? 0),
            'expired' => (int) ($raw?->expired ?? 0),
        ];

        // Housekeeping employees list for selection
        $hkDepartment = Department::where('name', 'Housekeeping')->first();
        $hkEmployees = Employee::with(['user', 'position'])
            ->where('department_id', $hkDepartment?->id)
            ->get();

        // Recent / Active keys list for Quick Select when creating Extension / Replacement
        $existingKeys = MasterKeyRequest::with(['employee.user'])
            ->select('id', 'request_number', 'key_number', 'key_type', 'room_range_access', 'valid_until', 'employee_id', 'request_by')
            ->latest()
            ->take(30)
            ->get();

        // Detect current HOD HK & IT Department officer for dynamic signing references
        $hodHK = Employee::with(['user', 'position', 'department'])
            ->where('department_id', $hkDepartment?->id)
            ->where(function ($q) {
                $q->whereHas('user.roles', function ($r) {
                    $r->where('name', 'Head of Department');
                })->orWhereHas('position', function ($p) {
                    $p->where('name', 'like', '%Executive Housekeeper%')
                      ->orWhere('name', 'like', '%Head of Department%')
                      ->orWhere('name', 'like', '%HOD%')
                      ->orWhere('name', 'like', '%EHK%');
                });
            })
            ->whereDoesntHave('user.roles', function ($r) {
                $r->where('name', 'Super Admin');
            })
            ->first();

        $itDepartment = Department::where('name', 'IT')->orWhere('name', 'like', '%Information Technology%')->first();
        $itStaff = Employee::with(['user', 'position', 'department'])
            ->where('department_id', $itDepartment?->id)
            ->whereHas('position', function ($p) {
                $p->where('name', 'like', '%Staff%')
                  ->orWhere('name', 'like', '%Support%');
            })
            ->first() ?? Employee::with(['user', 'position', 'department'])
            ->where('department_id', $itDepartment?->id)
            ->whereDoesntHave('user.roles', function ($r) {
                $r->whereIn('name', ['Super Admin', 'Head of Department']);
            })
            ->first();

        return Inertia::render('MasterKey/Index', [
            'requests' => $requests,
            'renewalHistories' => $renewalHistories,
            'filters' => [
                'tab' => $tab,
                'search' => $search ?? '',
                'key_type' => $keyType ?? '',
                'request_type' => $requestType ?? '',
            ],
            'stats' => $stats,
            'canApprove' => $canApprove,
            'canCreateKey' => $canCreateKey,
            'canManageAll' => $canManageAll,
            'currentEmployee' => $userEmployee?->load(['department', 'position']),
            'currentUser' => $user,
            'hkEmployees' => $hkEmployees,
            'existingKeys' => $existingKeys,
            'hodHK' => $hodHK,
            'itStaff' => $itStaff,
            'defaultKeyTypes' => [
                'Grand Master Key',
                'Master Key',
                'Floor Key',
                'Lift Only',
            ],
            'commonRoomRanges' => [
                'Lantai 2 (Kamar 201 - 210)',
                'Lantai 3 (Kamar 301 - 318)',
                'Lantai 5 (Kamar 501 - 518)',
                'Lantai 6 (Kamar 601 - 618)',
                'Lantai 7 (Kamar 701 - 718)',
                'Lantai 8 (Kamar 801 - 818)',
                'Lantai 9 (Kamar 901 - 918)',
                'Lantai 10 (Kamar 1001 - 1018)',
                'Seluruh Area Kamar Tamu (All HK Guest Rooms)',
                'Area Publik & Linen Room',
            ],
        ]);
    }

    /**
     * Store a newly created master key access request (1 Form: create new, extension, replacement).
     */
    public function store(Request $request)
    {
        if (!$this->canAccessMasterKey()) {
            abort(403, 'Akses Ditolak: Modul Housekeeping hanya dapat diakses oleh Departemen Housekeeping, Head of Department (HOD), dan manajemen yang berwenang.');
        }

        if (!$this->ensureTableExists()) {
            return back()->with('error', 'Tabel master_key_requests belum tersedia di database. Silakan jalankan "php artisan migrate" di server terlebih dahulu.');
        }

        $user = Auth::user();
        $userEmployee = $user->employee;
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHRD = $user->hasRole('HRD / Admin');
        $isGM = $user->hasRole('General Manager');
        $isHOD = $user->hasRole('Head of Department');
        $isSupervisor = $user->hasRole('Supervisor');
        $isHK = $userEmployee?->department?->name === 'Housekeeping';

        $canManageAll = $isSuperAdmin || $isHRD || $isGM || ($isHOD && $isHK) || ($isSupervisor && $isHK);

        $rules = [
            'request_type' => 'required|in:create_new,extension,replacement',
            'request_by' => 'required|string|max:255',
            'key_number' => 'required|string|max:50',
            'key_type' => 'required|string|max:100',
            'room_range_access' => 'required|string|max:255',
            'valid_from' => 'required|date',
            'renewal_cycle_months' => 'nullable|integer|min:1|max:12',
            'remark' => 'required|string|max:1000',
            'purpose' => 'nullable|string|max:1000',
            'requester_signature' => 'nullable|string',
            'previous_request_id' => 'nullable|exists:master_key_requests,id',
            'employee_id' => 'nullable|exists:employees,id',
        ];

        $validated = $request->validate($rules);

        $requestBy = trim($validated['request_by']);

        // Check if an employee matches by name, or fall back to user's employee
        $targetEmployee = null;
        if (!empty($validated['employee_id'])) {
            $targetEmployee = Employee::with(['department', 'user'])->find($validated['employee_id']);
        }
        if (!$targetEmployee) {
            $targetEmployee = Employee::with(['department', 'user'])
                ->whereHas('user', function ($q) use ($requestBy) {
                    $q->where('name', $requestBy);
                })->first() ?? $userEmployee;
        }

        $hkDepartment = Department::where('name', 'Housekeeping')->first();
        $targetDepartmentId = $targetEmployee?->department_id ?? $hkDepartment?->id;
        $targetEmployeeId = $targetEmployee?->id;

        $cycleMonths = (int) ($validated['renewal_cycle_months'] ?? 3);
        $validFrom = Carbon::parse($validated['valid_from'])->startOfDay();
        $validUntil = $validFrom->copy()->addMonths($cycleMonths);

        $requestedAt = Carbon::now();
        $requestedByUsername = $user->name;

        $masterKeyRequest = MasterKeyRequest::create([
            'request_number' => MasterKeyRequest::generateRequestNumber(),
            'request_type' => $validated['request_type'],
            'request_by' => $requestBy,
            'employee_id' => $targetEmployeeId,
            'department_id' => $targetDepartmentId,
            'key_number' => $validated['key_number'],
            'key_type' => $validated['key_type'],
            'room_range_access' => $validated['room_range_access'],
            'valid_from' => $validFrom->toDateString(),
            'valid_until' => $validUntil->toDateString(),
            'renewal_cycle_months' => $cycleMonths,
            'remark' => $validated['remark'],
            'purpose' => $validated['purpose'] ?? $validated['remark'],
            'status' => 'On Request',
            'requested_by_user_id' => $user->id,
            'requested_by_username' => $requestedByUsername,
            'requested_at' => $requestedAt,
            'requester_signature' => $validated['requester_signature'] ?? null,
            'previous_request_id' => $validated['previous_request_id'] ?? null,
        ]);

        $typeLabels = [
            'create_new' => 'Create New Key',
            'extension' => 'Key Extension (3 Months)',
            'replacement' => 'Key Replacement',
        ];
        $typeLabel = $typeLabels[$validated['request_type']] ?? 'Key Request';

        // Record in Audit Log with username, requester name, date requested, and remark
        AuditLog::log([
            'action' => 'REQUEST_MASTER_KEY',
            'model_type' => MasterKeyRequest::class,
            'model_id' => $masterKeyRequest->id,
            'description' => "[{$typeLabel}] Requested by '{$requestBy}' (Account: {$requestedByUsername}) on " . $requestedAt->format('Y-m-d H:i:s') . ". Key: {$masterKeyRequest->key_number} ({$masterKeyRequest->request_number}). Remark: {$masterKeyRequest->remark}",
            'new_values' => $masterKeyRequest->toArray(),
        ]);

        // Send In-App Notification to Executive Housekeeper (HOD) and Admins
        $this->notifyApprovers($masterKeyRequest);

        return redirect()->route('master-keys.index')->with('success', "{$typeLabel} form for master key {$masterKeyRequest->key_number} was successfully submitted with status [On Request].");
    }

    /**
     * HOD Housekeeping approval / rejection handler.
     * Only Head of Department Housekeeping (or Super Admin) can approve.
     * Once Approved, it transitions to Stage 3 for Department IT to create/update.
     */
    public function approve(Request $request, MasterKeyRequest $masterKeyRequest)
    {
        if (!$this->canAccessMasterKey()) {
            abort(403, 'Akses Ditolak: Modul Housekeeping hanya dapat diakses oleh Departemen Housekeeping, HOD Housekeeping, Departemen IT, dan manajemen yang berwenang.');
        }

        if (!$this->ensureTableExists()) {
            return back()->with('error', 'Tabel master_key_requests belum tersedia di database. Silakan jalankan "php artisan migrate" di server terlebih dahulu.');
        }

        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHOD = $user->hasRole('Head of Department');
        $isHK = $user->employee?->department?->name === 'Housekeeping';

        $canApprove = $isSuperAdmin || ($isHOD && $isHK);
        if (!$canApprove) {
            return back()->with('error', 'Akses Ditolak: Hanya Head of Department (HOD) Housekeeping atau Super Admin yang berwenang menyetujui request master key ini.');
        }

        $validated = $request->validate([
            'action' => 'required|in:Approved,Rejected',
            'approval_notes' => 'nullable|string|max:1000',
            'hod_signature' => 'nullable|string',
        ]);

        $oldStatus = $masterKeyRequest->status;
        $newStatus = $validated['action'];
        $now = Carbon::now();

        $updateData = [
            'status' => $newStatus,
            'approved_by_user_id' => $user->id,
            'approved_by_username' => $user->name,
            'approved_at' => $now,
            'approval_notes' => $validated['approval_notes'] ?? null,
            'hod_signature' => $validated['hod_signature'] ?? null,
            'approver_signature' => $validated['hod_signature'] ?? null,
        ];

        $masterKeyRequest->update($updateData);

        // Record to Audit Log with HOD details
        AuditLog::log([
            'action' => $newStatus === 'Approved' ? 'HOD_APPROVED_MASTER_KEY' : 'HOD_REJECTED_MASTER_KEY',
            'model_type' => MasterKeyRequest::class,
            'model_id' => $masterKeyRequest->id,
            'description' => "Permintaan master key {$masterKeyRequest->request_number} ({$masterKeyRequest->key_number}) telah di-{$newStatus} oleh HOD Housekeeping '{$user->name}' pada " . $now->format('Y-m-d H:i:s') . ". Catatan: " . ($validated['approval_notes'] ?? '-'),
            'old_values' => ['status' => $oldStatus],
            'new_values' => [
                'status' => $newStatus,
                'approved_by_username' => $user->name,
                'approved_at' => $now->toDateTimeString(),
                'approval_notes' => $validated['approval_notes'] ?? null,
            ],
        ]);

        // Send In-App Notification to Requester Employee
        if ($masterKeyRequest->employee?->user) {
            try {
                $masterKeyRequest->employee->user->notify(
                    new MasterKeyStatusNotification($masterKeyRequest, $newStatus === 'Approved' ? 'HOD_APPROVED' : 'STATUS_UPDATED')
                );
            } catch (\Throwable $e) {}
        }

        // If Approved, Notify IT Department to create / update the physical/RFID card
        if ($newStatus === 'Approved') {
            $this->notifyITDept($masterKeyRequest);
        }

        $msg = $newStatus === 'Approved'
            ? "Permintaan master key {$masterKeyRequest->request_number} berhasil disetujui (Approved) oleh HOD Housekeeping. Diteruskan ke Departemen IT untuk pembuatan kartu."
            : "Permintaan master key {$masterKeyRequest->request_number} ditolak (Rejected) oleh HOD Housekeeping.";

        return back()->with('success', $msg);
    }

    /**
     * Department IT card creation, RFID programming & issuance handler.
     * Department IT can ONLY process after HOD Housekeeping has Approved the request.
     * Sets status to 'Created' (for new keys) or 'Updated' (for extensions/replacements).
     */
    public function processKey(Request $request, MasterKeyRequest $masterKeyRequest)
    {
        if (!$this->canAccessMasterKey()) {
            abort(403, 'Akses Ditolak.');
        }

        if (!$this->ensureTableExists()) {
            return back()->with('error', 'Tabel master_key_requests belum tersedia di database.');
        }

        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isIT = $user->employee?->department?->name === 'IT';

        $canCreateKey = $isSuperAdmin || $isIT;
        if (!$canCreateKey) {
            return back()->with('error', 'Akses Ditolak: Hanya Departemen IT atau Super Admin yang berwenang menerbitkan atau memperbarui kartu master key.');
        }

        // Strict workflow check: must be Approved by HOD HK first
        if ($masterKeyRequest->status !== 'Approved' && !$isSuperAdmin) {
            return back()->with('error', 'Departemen IT hanya dapat memproses kartu setelah disetujui (Approved) oleh HOD Housekeeping.');
        }

        $validated = $request->validate([
            'status' => 'nullable|in:Created,Updated,Done',
            'done_notes' => 'nullable|string|max:1000',
            'it_signature' => 'required|string',
        ]);

        // Automatically determine status based on request_type if not explicitly set
        $newStatus = $validated['status'] ?? null;
        if (!$newStatus || $newStatus === 'Done') {
            $newStatus = ($masterKeyRequest->request_type === 'create_new') ? 'Created' : 'Updated';
        }

        $oldStatus = $masterKeyRequest->status;
        $now = Carbon::now();

        $masterKeyRequest->update([
            'status' => $newStatus,
            'done_by_user_id' => $user->id,
            'done_by_username' => $user->name,
            'done_at' => $now,
            'done_notes' => $validated['done_notes'] ?? "Kartu master key {$newStatus} & RFID diprogram oleh Departemen IT ({$user->name}).",
            'it_signature' => $validated['it_signature'],
        ]);

        // Audit Log
        AuditLog::log([
            'action' => "IT_{$newStatus}_MASTER_KEY",
            'model_type' => MasterKeyRequest::class,
            'model_id' => $masterKeyRequest->id,
            'description' => "Kartu Master Key {$masterKeyRequest->key_number} ({$masterKeyRequest->request_number}) berhasil di-{$newStatus} dan diprogram oleh IT Officer '{$user->name}' pada " . $now->format('Y-m-d H:i:s') . ". Catatan: " . ($validated['done_notes'] ?? '-'),
            'old_values' => ['status' => $oldStatus],
            'new_values' => [
                'status' => $newStatus,
                'done_by_username' => $user->name,
                'done_at' => $now->toDateTimeString(),
                'done_notes' => $validated['done_notes'] ?? null,
            ],
        ]);

        // Send In-App Notification to Requester Employee
        if ($masterKeyRequest->employee?->user) {
            try {
                $notifType = $newStatus === 'Created' ? 'KEY_CREATED' : ($newStatus === 'Updated' ? 'KEY_UPDATED' : 'STATUS_UPDATED');
                $masterKeyRequest->employee->user->notify(
                    new MasterKeyStatusNotification($masterKeyRequest, $notifType)
                );
            } catch (\Throwable $e) {}
        }

        return back()->with('success', "Kartu master key {$masterKeyRequest->key_number} berhasil diproses dengan status [{$newStatus}] oleh Departemen IT.");
    }

    /**
     * Mark master key request as DONE or update status.
     * Records username, done timestamp, notes, and audit log.
     */
    public function updateStatus(Request $request, MasterKeyRequest $masterKeyRequest)
    {
        if (!$this->ensureTableExists()) {
            return back()->with('error', 'Table master_key_requests is not available in the database. Please run "php artisan migrate" on the server first.');
        }

        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHOD = $user->hasRole('Head of Department');
        $isHK = $user->employee?->department?->name === 'Housekeeping';
        $isIT = $user->employee?->department?->name === 'IT';

        // Approvals strictly handled by HOD Housekeeping (or Super Admin)
        $canApprove = $isSuperAdmin || ($isHOD && $isHK);
        // Master key creation strictly performed by Department IT (or Super Admin)
        $canCreateKey = $isSuperAdmin || $isIT;

        if (!$canApprove && !$canCreateKey) {
            return back()->with('error', 'You do not have permission to approve or create this master key request.');
        }

        $validated = $request->validate([
            'status' => 'required|in:Done,Created,Updated,Approved,Rejected,On Request',
            'done_notes' => 'nullable|string|max:1000',
            'approver_signature' => 'nullable|string',
            'it_signature' => 'nullable|string',
            'hod_signature' => 'nullable|string',
        ]);

        $oldStatus = $masterKeyRequest->status;
        $newStatus = $validated['status'];
        $now = Carbon::now();

        $updateData = [
            'status' => $newStatus,
        ];

        if (in_array($newStatus, ['Done', 'Created', 'Updated'])) {
            $updateData['done_by_user_id'] = $user->id;
            $updateData['done_by_username'] = $user->name;
            $updateData['done_at'] = $now;
            $deptName = $user->employee?->department?->name ?? ($isSuperAdmin ? 'IT / Admin' : 'Staff');
            $updateData['done_notes'] = $validated['done_notes'] ?? "Master key {$newStatus}, programmed & issued by Department {$deptName}.";
            if (!empty($validated['it_signature'])) {
                $updateData['it_signature'] = $validated['it_signature'];
            }
        } elseif ($newStatus === 'Approved') {
            $updateData['approved_by_user_id'] = $user->id;
            $updateData['approved_by_username'] = $user->name;
            $updateData['approved_at'] = $now;
            if (!empty($validated['hod_signature'])) {
                $updateData['hod_signature'] = $validated['hod_signature'];
                $updateData['approver_signature'] = $validated['hod_signature'];
            }
        } else {
            // Revert back to On Request
            $updateData['done_by_user_id'] = null;
            $updateData['done_by_username'] = null;
            $updateData['done_at'] = null;
            $updateData['done_notes'] = null;
            $updateData['approved_by_user_id'] = null;
            $updateData['approved_by_username'] = null;
            $updateData['approved_at'] = null;
            $updateData['approval_notes'] = null;
        }

        $masterKeyRequest->update($updateData);

        // Record to Audit Log with completed-by username and timestamp
        AuditLog::log([
            'action' => in_array($newStatus, ['Done', 'Created', 'Updated']) ? 'DONE_MASTER_KEY' : 'UPDATE_MASTER_KEY_STATUS',
            'model_type' => MasterKeyRequest::class,
            'model_id' => $masterKeyRequest->id,
            'description' => "Request status for {$masterKeyRequest->request_number} updated to [{$newStatus}] by user '{$user->name}' on " . $now->format('Y-m-d H:i:s') . ".",
            'old_values' => ['status' => $oldStatus],
            'new_values' => [
                'status' => $newStatus,
                'done_by_username' => $user->name,
                'done_at' => $now->toDateTimeString(),
                'done_notes' => $validated['done_notes'] ?? null,
            ],
        ]);

        return back()->with('success', "Master key request {$masterKeyRequest->request_number} status updated to {$newStatus}.");
    }

    /**
     * Export master key records to Excel-compatible CSV with full username and timestamps log.
     */
    public function export(Request $request): StreamedResponse
    {
        if (!$this->canAccessMasterKey()) {
            abort(403, 'Akses Ditolak: Modul Housekeeping hanya dapat diakses oleh Departemen Housekeeping, Head of Department (HOD), dan manajemen yang berwenang.');
        }

        if (!$this->ensureTableExists()) {
            abort(404, 'Table master_key_requests is not available in the database. Please run "php artisan migrate" on the server first.');
        }

        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHRD = $user->hasRole('HRD / Admin');
        $isGM = $user->hasRole('General Manager');
        $isHOD = $user->hasRole('Head of Department');
        $isSupervisor = $user->hasRole('Supervisor');

        $userEmployee = $user->employee;
        $isHK = $userEmployee?->department?->name === 'Housekeeping';

        $canApprove = $isSuperAdmin || $isHRD || $isGM || ($isHOD && $isHK);
        $canManageAll = $canApprove || ($isSupervisor && $isHK);

        $query = MasterKeyRequest::with([
            'employee.user',
            'employee.department',
            'employee.position',
            'requestedBy',
            'approvedBy',
            'doneBy',
            'previousRequest',
            'auditLogs.user',
        ])->latest();

        if (!$canManageAll) {
            $query->where('employee_id', $userEmployee?->id);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                    ->orWhere('key_number', 'like', "%{$search}%")
                    ->orWhere('remark', 'like', "%{$search}%")
                    ->orWhere('room_range_access', 'like', "%{$search}%")
                    ->orWhere('request_by', 'like', "%{$search}%")
                    ->orWhere('requested_by_username', 'like', "%{$search}%")
                    ->orWhere('approved_by_username', 'like', "%{$search}%")
                    ->orWhere('done_by_username', 'like', "%{$search}%")
                    ->orWhereHas('employee.user', function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('employee', function ($sub) use ($search) {
                        $sub->where('employee_number', 'like', "%{$search}%");
                    });
            });
        }

        if ($keyType = $request->input('key_type')) {
            $query->where('key_type', $keyType);
        }

        if ($requestType = $request->input('request_type')) {
            $query->where('request_type', $requestType);
        }

        $tab = $request->input('tab', 'all');
        $today = Carbon::today()->toDateString();
        $fourteenDaysLater = Carbon::today()->addDays(14)->toDateString();

        if ($tab === 'on_request') {
            $query->where('status', 'On Request');
        } elseif ($tab === 'approved') {
            $query->where('status', 'Approved');
        } elseif ($tab === 'done') {
            $query->whereIn('status', ['Created', 'Updated', 'Done']);
        } elseif ($tab === 'rejected') {
            $query->where('status', 'Rejected');
        } elseif ($tab === 'expiring') {
            $query->whereIn('status', ['Created', 'Updated', 'Done'])->where('valid_until', '>=', $today)->where('valid_until', '<=', $fourteenDaysLater);
        } elseif ($tab === 'expired') {
            $query->whereIn('status', ['Created', 'Updated', 'Done'])->where('valid_until', '<', $today);
        }

        $records = $query->get();
        $filename = 'Master_Key_Log_SwissBelinn_' . date('Ymd_His') . '.csv';

        $response = new StreamedResponse(function () use ($records) {
            $handle = fopen('php://output', 'w');

            // Add UTF-8 BOM for Microsoft Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header row
            fputcsv($handle, [
                'Registration No.',
                'Request Form Type',
                'Remark / Request Reason',
                'Status',
                'Requested By',
                'Requester Account Username',
                'Request Date & Time',
                'Approved By (HOD HK)',
                'Approval Date & Time',
                'Approval Notes',
                'Card Created / Updated By (IT)',
                'IT Issuance Date & Time',
                'IT Notes',
                'Key Holder Employee ID',
                'Department',
                'Position',
                'Master Key No.',
                'Key Type',
                'Room Range Access',
                'Valid From',
                'Valid Until (3 Months)',
                'Days Remaining',
            ]);

            foreach ($records as $r) {
                fputcsv($handle, [
                    $r->request_number,
                    $r->request_type_label,
                    $r->remark ?? '-',
                    $r->status,
                    $r->request_by ?? ($r->employee?->user?->name ?? '-'),
                    $r->requested_by_username ?? ($r->requestedBy?->name ?? '-'),
                    $r->requested_at ? $r->requested_at->format('Y-m-d H:i:s') : $r->created_at->format('Y-m-d H:i:s'),
                    $r->approved_by_username ?? ($r->approvedBy?->name ?? '-'),
                    $r->approved_at ? $r->approved_at->format('Y-m-d H:i:s') : '-',
                    $r->approval_notes ?? '-',
                    $r->done_by_username ?? ($r->doneBy?->name ?? '-'),
                    $r->done_at ? $r->done_at->format('Y-m-d H:i:s') : '-',
                    $r->done_notes ?? '-',
                    $r->employee?->employee_number ?? '-',
                    $r->employee?->department?->name ?? 'Housekeeping',
                    $r->employee?->position?->name ?? 'Room Attendant',
                    $r->key_number,
                    $r->key_type,
                    $r->room_range_access,
                    $r->valid_from->format('Y-m-d'),
                    $r->valid_until->format('Y-m-d'),
                    in_array($r->status, ['Created', 'Updated', 'Done']) ? $r->days_remaining . ' days' : '-',
                ]);
            }

            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        return $response;
    }

    /**
     * Renew / extend master key access request.
     */
    public function renew(Request $request, MasterKeyRequest $masterKeyRequest)
    {
        $request->merge([
            'request_type' => 'extension',
            'previous_request_id' => $masterKeyRequest->id,
            'key_number' => $request->input('key_number', $masterKeyRequest->key_number),
            'key_type' => $request->input('key_type', $masterKeyRequest->key_type),
            'room_range_access' => $request->input('room_range_access', $masterKeyRequest->room_range_access),
            'request_by' => $request->input('request_by', $masterKeyRequest->request_by),
            'valid_from' => $request->input('valid_from', now()->toDateString()),
            'renewal_cycle_months' => $request->input('renewal_cycle_months', 3),
            'remark' => $request->input('remark', 'Renewal / extension request for key ' . $masterKeyRequest->key_number),
        ]);

        return $this->store($request);
    }

    /**
     * Display printable official hotel SOP form.
     */
    public function print(MasterKeyRequest $masterKeyRequest)
    {
        if (!$this->canAccessMasterKey()) {
            abort(403, 'Akses Ditolak: Modul Housekeeping hanya dapat diakses oleh Departemen Housekeeping, Head of Department (HOD), dan manajemen yang berwenang.');
        }

        $masterKeyRequest->load([
            'employee.user',
            'employee.department',
            'employee.position',
            'employee.supervisor.user',
            'employee.supervisor.position',
            'requestedBy',
            'approvedBy.employee.department',
            'approvedBy.employee.position',
            'doneBy.employee.department',
            'doneBy.employee.position',
            'previousRequest',
            'auditLogs.user',
        ]);

        // 1. Find Executive Housekeeper / HK HOD for "Approve by" signature section
        $hkDept = Department::where('name', 'Housekeeping')
            ->orWhere('name', 'like', '%Housekeeping%')
            ->first();

        $hodHK = null;
        if ($masterKeyRequest->approved_by_user_id) {
            $approvedUserEmployee = Employee::with(['user', 'position', 'department'])
                ->where('user_id', $masterKeyRequest->approved_by_user_id)
                ->first();
            if ($approvedUserEmployee) {
                $hodHK = $approvedUserEmployee;
            }
        }

        if (!$hodHK && $hkDept) {
            $hodHK = Employee::with(['user', 'position', 'department'])
                ->where('department_id', $hkDept->id)
                ->where(function ($q) {
                    $q->whereHas('user.roles', function ($r) {
                        $r->where('name', 'Head of Department');
                    })->orWhereHas('position', function ($p) {
                        $p->where('name', 'like', '%Executive Housekeeper%')
                          ->orWhere('name', 'like', '%Head of Department%')
                          ->orWhere('name', 'like', '%HOD%')
                          ->orWhere('name', 'like', '%EHK%');
                    });
                })
                ->whereDoesntHave('user.roles', function ($r) {
                    $r->where('name', 'Super Admin');
                })
                ->first();
        }

        // 2. Find IT Department Staff for "Create by" signature section
        $itDept = Department::where('name', 'IT')
            ->orWhere('name', 'like', '%Information Technology%')
            ->first();

        $itStaff = null;
        // If request has been marked Created/Updated/Done by a user, check if that user is ACTUALLY from IT or Super Admin
        if ($masterKeyRequest->done_by_user_id) {
            $doneUserEmployee = Employee::with(['user', 'position', 'department'])
                ->where('user_id', $masterKeyRequest->done_by_user_id)
                ->first();
            if ($doneUserEmployee && ($doneUserEmployee->department?->name === 'IT' || $doneUserEmployee->user?->hasRole('Super Admin'))) {
                $itStaff = $doneUserEmployee;
            }
        }

        // Fallback: pick IT Support Staff / IT Officer from IT department
        if (!$itStaff && $itDept) {
            $itStaff = Employee::with(['user', 'position', 'department'])
                ->where('department_id', $itDept->id)
                ->whereHas('position', function ($p) {
                    $p->where('name', 'like', '%Staff%')
                      ->orWhere('name', 'like', '%Support%');
                })
                ->first() ?? Employee::with(['user', 'position', 'department'])
                ->where('department_id', $itDept->id)
                ->whereDoesntHave('user.roles', function ($r) {
                    $r->whereIn('name', ['Super Admin', 'Head of Department']);
                })
                ->first();
        }

        return Inertia::render('MasterKey/Print', [
            'requestData' => $masterKeyRequest,
            'hodHK' => $hodHK,
            'itStaff' => $itStaff,
        ]);
    }

    /**
     * Remove the specified request from storage.
     */
    public function destroy(MasterKeyRequest $masterKeyRequest)
    {
        if (!$this->canAccessMasterKey()) {
            abort(403, 'Akses Ditolak: Modul Housekeeping hanya dapat diakses oleh Departemen Housekeeping, HOD Housekeeping, Departemen IT, dan manajemen yang berwenang.');
        }

        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('Super Admin');
        $isHRD = $user->hasRole('HRD / Admin');
        $isGM = $user->hasRole('General Manager');
        $isHOD = $user->hasRole('Head of Department');
        $isHK = $user->employee?->department?->name === 'Housekeeping';
        $isIT = $user->employee?->department?->name === 'IT';
        $isOwner = ($user->employee && $masterKeyRequest->employee_id === $user->employee->id)
            || $masterKeyRequest->requested_by_user_id === $user->id;

        $canDelete = $isSuperAdmin || $isHRD || $isGM || ($isHOD && $isHK) || $isIT || ($isOwner && $masterKeyRequest->status === 'On Request');

        if (!$canDelete) {
            return back()->with('error', 'Akses Ditolak: Anda tidak memiliki wewenang untuk menghapus permohonan master key ini.');
        }

        try {
            $reqNumber = $masterKeyRequest->request_number;

            // Unlink any extensions pointing to this request
            MasterKeyRequest::where('previous_request_id', $masterKeyRequest->id)->update(['previous_request_id' => null]);

            // Clean audit logs
            AuditLog::where('model_type', MasterKeyRequest::class)
                ->where('model_id', $masterKeyRequest->id)
                ->delete();

            $masterKeyRequest->delete();

            AuditLog::log([
                'action' => 'DELETE_MASTER_KEY_REQUEST',
                'model_type' => MasterKeyRequest::class,
                'model_id' => $masterKeyRequest->id,
                'description' => "Permohonan master key {$reqNumber} telah dihapus oleh {$user->name}.",
            ]);

            return back()->with('success', "Permohonan master key {$reqNumber} berhasil dihapus.");
        } catch (\Throwable $e) {
            \Log::error('Failed to delete master key request: ' . $e->getMessage());
            return back()->with('error', 'Gagal menghapus permohonan master key: ' . $e->getMessage());
        }
    }

    /**
     * Helper to notify approvers when a new request is submitted.
     * Approvals are strictly received/handled by HOD Housekeeping (Executive Housekeeper) and Super Admin.
     */
    protected function notifyApprovers(MasterKeyRequest $request): void
    {
        try {
            $hkDept = Department::where('name', 'Housekeeping')->first();

            $approvers = User::where(function ($q) use ($hkDept) {
                $q->where(function ($sub) use ($hkDept) {
                    $sub->whereHas('roles', fn ($r) => $r->where('name', 'Head of Department'))
                        ->whereHas('employee', fn ($e) => $e->where('department_id', $hkDept?->id));
                })->orWhereHas('roles', fn ($r) => $r->where('name', 'Super Admin'));
            })->get();

            foreach ($approvers as $approver) {
                $approver->notify(new MasterKeyStatusNotification($request, 'NEW_REQUEST'));
            }
        } catch (\Throwable $e) {
            // Silently continue
        }
    }

    /**
     * Helper to notify Department IT staff when a request is approved by HOD HK.
     */
    protected function notifyITDept(MasterKeyRequest $request): void
    {
        try {
            $itDept = Department::where('name', 'IT')->orWhere('name', 'like', '%Information Technology%')->first();

            $itStaffUsers = User::where(function ($q) use ($itDept) {
                $q->whereHas('employee', fn ($e) => $e->where('department_id', $itDept?->id))
                  ->orWhereHas('roles', fn ($r) => $r->where('name', 'Super Admin'));
            })->get();

            foreach ($itStaffUsers as $itUser) {
                $itUser->notify(new MasterKeyStatusNotification($request, 'HOD_APPROVED'));
            }
        } catch (\Throwable $e) {
            // Silently continue
        }
    }
}
