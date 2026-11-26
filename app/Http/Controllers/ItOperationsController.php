<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\ItAsset;
use App\Models\ItTicket;
use App\Models\ItTicketUpdate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ItOperationsController extends Controller
{
    protected function isItManager($user): bool
    {
        if (!$user) {
            return false;
        }

        // Super Admin & General Manager have executive oversight
        if ($user->hasRole(['Super Admin', 'General Manager'])) {
            return true;
        }

        // IT Department staff
        return $user->employee && $user->employee->department && strtolower($user->employee->department->name) === 'it';
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $isItManager = $this->isItManager($user);
        
        // Non-IT users are STRICTLY locked to the helpdesk tickets tab
        $requestedTab = $request->query('tab', $isItManager ? 'overview' : 'tickets');
        $tab = $isItManager ? $requestedTab : 'tickets';

        $search = $request->query('search', '');
        $statusFilter = $request->query('status', 'all');
        $categoryFilter = $request->query('category', 'all');

        // Assets query (ONLY queried if IT Manager/Admin)
        if ($isItManager) {
            $assetsQuery = ItAsset::with(['assignedEmployee.department', 'assignedEmployee.user'])
                ->latest();

            if ($search) {
                $assetsQuery->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('asset_code', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%")
                        ->orWhere('brand', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhere('ups', 'like', "%{$search}%");
                });
            }

            if ($statusFilter !== 'all') {
                $assetsQuery->where('status', $statusFilter);
            }

            if ($categoryFilter !== 'all') {
                $assetsQuery->where('category', $categoryFilter);
            }

            $assets = $assetsQuery->paginate(15)->withQueryString();

            $rawAssetStats = ItAsset::selectRaw("
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'In Use' THEN 1 END) as in_use,
                COUNT(CASE WHEN status = 'Available' THEN 1 END) as available,
                COUNT(CASE WHEN status = 'Maintenance' THEN 1 END) as maintenance,
                COUNT(CASE WHEN status = 'Disposed' THEN 1 END) as disposed
            ")->first();

            $assetStats = [
                'total' => (int) ($rawAssetStats?->total ?? 0),
                'in_use' => (int) ($rawAssetStats?->in_use ?? 0),
                'available' => (int) ($rawAssetStats?->available ?? 0),
                'maintenance' => (int) ($rawAssetStats?->maintenance ?? 0),
                'disposed' => (int) ($rawAssetStats?->disposed ?? 0),
            ];

            $rawTicketStats = ItTicket::selectRaw("
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'Open' THEN 1 END) as open,
                COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed
            ")->first();

            $ticketStats = [
                'open' => (int) ($rawTicketStats?->open ?? 0),
                'in_progress' => (int) ($rawTicketStats?->in_progress ?? 0),
                'resolved' => (int) ($rawTicketStats?->resolved ?? 0),
                'closed' => (int) ($rawTicketStats?->closed ?? 0),
                'total' => (int) ($rawTicketStats?->total ?? 0),
            ];

            $employees = Employee::with(['user:id,name', 'department:id,name'])
                ->get(['id', 'user_id', 'department_id', 'employee_number'])
                ->map(function ($emp) {
                    return [
                        'id' => $emp->id,
                        'name' => $emp->user ? $emp->user->name : "Employee #{$emp->employee_number}",
                        'department' => $emp->department ? $emp->department->name : '-',
                        'code' => $emp->employee_number,
                    ];
                });

            $assetsList = ItAsset::select('id', 'asset_code', 'name', 'category', 'location')
                ->orderBy('asset_code')
                ->get();
        } else {
            // For regular employees: empty paginator for assets, and personal-only ticket stats
            $assets = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 15);

            $assetStats = [
                'total' => 0,
                'in_use' => 0,
                'available' => 0,
                'maintenance' => 0,
                'disposed' => 0,
            ];

            $currentEmployeeId = $user->employee ? $user->employee->id : 0;
            $rawTicketStats = ItTicket::where('reported_by_employee_id', $currentEmployeeId)
                ->selectRaw("
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'Open' THEN 1 END) as open,
                    COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
                    COUNT(CASE WHEN status = 'Resolved' THEN 1 END) as resolved,
                    COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed
                ")->first();

            $ticketStats = [
                'open' => (int) ($rawTicketStats?->open ?? 0),
                'in_progress' => (int) ($rawTicketStats?->in_progress ?? 0),
                'resolved' => (int) ($rawTicketStats?->resolved ?? 0),
                'closed' => (int) ($rawTicketStats?->closed ?? 0),
                'total' => (int) ($rawTicketStats?->total ?? 0),
            ];

            $employees = [];

            // Only show hardware relevant to employee's workspace
            $deptName = $user->employee?->department?->name;
            $assetsList = ItAsset::where(function ($q) use ($currentEmployeeId, $deptName) {
                if ($currentEmployeeId) {
                    $q->where('assigned_to_employee_id', $currentEmployeeId);
                }
                if ($deptName) {
                    $q->orWhere('location', 'like', "%{$deptName}%");
                }
            })->select('id', 'asset_code', 'name', 'category', 'location')->orderBy('asset_code')->get();
        }

        $ticketsQuery = ItTicket::with([
            'reporter.user:id,name',
            'reporter.department:id,name',
            'assignedUser:id,name,email',
            'assignedUsers:id,name,email',
            'asset:id,asset_code,name',
            'updates.user:id,name',
        ])->latest();

        // If not IT staff / admin, STRICTLY filter to tickets reported by this employee
        if (!$isItManager) {
            $currentEmployeeId = $user->employee ? $user->employee->id : 0;
            $ticketsQuery->where('reported_by_employee_id', $currentEmployeeId);
        }

        $ticketSearch = $request->query('ticket_search', $search);
        if ($ticketSearch) {
            $ticketsQuery->where(function ($q) use ($ticketSearch) {
                $q->where('ticket_number', 'like', "%{$ticketSearch}%")
                    ->orWhere('title', 'like', "%{$ticketSearch}%")
                    ->orWhere('description', 'like', "%{$ticketSearch}%")
                    ->orWhere('location', 'like', "%{$ticketSearch}%");
            });
        }

        $ticketStatus = $request->query('ticket_status', 'all');
        if ($ticketStatus !== 'all') {
            $ticketsQuery->where('status', $ticketStatus);
        }

        $ticketPriority = $request->query('ticket_priority', 'all');
        if ($ticketPriority !== 'all') {
            $ticketsQuery->where('priority', $ticketPriority);
        }

        $tickets = $ticketsQuery->paginate(15)->withQueryString();

        // IT Technicians list for ticket assignment
        $itStaffUsers = User::whereHas('employee.department', function ($q) {
            $q->where('name', 'IT');
        })->orWhereHas('roles', function ($q) {
            $q->whereIn('name', ['Super Admin', 'HRD / Admin', 'General Manager']);
        })->select('id', 'name', 'email')->get();

        return Inertia::render('IT/Index', [
            'activeTab' => $tab,
            'isItManager' => $isItManager,
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'employee_id' => $user->employee?->id,
                'department' => $user->employee?->department?->name ?? 'General',
            ],
            'assets' => $assets,
            'tickets' => $tickets,
            'assetStats' => $assetStats,
            'ticketStats' => $ticketStats,
            'itStaffUsers' => $itStaffUsers,
            'employees' => $employees,
            'assetsList' => $assetsList,
            'filters' => [
                'tab' => $tab,
                'search' => $search,
                'status' => $statusFilter,
                'category' => $categoryFilter,
                'ticket_search' => $ticketSearch,
                'ticket_status' => $ticketStatus,
                'ticket_priority' => $ticketPriority,
            ],
        ]);
    }

    public function storeAsset(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if (!$this->isItManager($user)) {
            abort(403, 'Akses terbatas untuk Staff IT atau Administrator.');
        }

        $validated = $request->validate([
            'asset_code' => 'required|string|max:50|unique:it_assets,asset_code',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'specifications' => 'nullable|string',
            'status' => 'required|string|in:Available,In Use,Maintenance,Disposed',
            'assigned_to_employee_id' => 'nullable|exists:employees,id',
            'location' => 'nullable|string|max:100',
            'ip_address' => 'nullable|string|max:50',
            'ups' => 'nullable|string|max:150',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('it-assets', 'public');
            $validated['photo'] = $photoPath;
        }

        try {
            ItAsset::create($validated);
        } catch (\Throwable $e) {
            if ($photoPath && Storage::disk('public')->exists($photoPath)) {
                Storage::disk('public')->delete($photoPath);
            }
            throw $e;
        }

        return back()->with('success', 'Asset IT ' . $validated['asset_code'] . ' berhasil ditambahkan.');
    }

    public function updateAsset(Request $request, ItAsset $asset): RedirectResponse
    {
        $user = Auth::user();
        if (!$this->isItManager($user)) {
            abort(403, 'Akses terbatas untuk Staff IT atau Administrator.');
        }

        $validated = $request->validate([
            'asset_code' => 'required|string|max:50|unique:it_assets,asset_code,' . $asset->id,
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'specifications' => 'nullable|string',
            'status' => 'required|string|in:Available,In Use,Maintenance,Disposed',
            'assigned_to_employee_id' => 'nullable|exists:employees,id',
            'location' => 'nullable|string|max:100',
            'ip_address' => 'nullable|string|max:50',
            'ups' => 'nullable|string|max:150',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'remove_photo' => 'nullable|boolean',
            'purchase_date' => 'nullable|date',
            'warranty_expiry' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $oldPhoto = $asset->photo;
        $newPhoto = null;

        if ($request->boolean('remove_photo')) {
            $validated['photo'] = null;
        } elseif ($request->hasFile('photo')) {
            $newPhoto = $request->file('photo')->store('it-assets', 'public');
            $validated['photo'] = $newPhoto;
        } else {
            unset($validated['photo']);
        }

        unset($validated['remove_photo']);

        try {
            $asset->update($validated);

            // Delete old photo only after database update succeeds
            if ($oldPhoto && ($request->boolean('remove_photo') || $newPhoto)) {
                if (Storage::disk('public')->exists($oldPhoto)) {
                    Storage::disk('public')->delete($oldPhoto);
                }
            }
        } catch (\Throwable $e) {
            // Remove newly uploaded photo if update fails
            if ($newPhoto && Storage::disk('public')->exists($newPhoto)) {
                Storage::disk('public')->delete($newPhoto);
            }
            throw $e;
        }

        return back()->with('success', 'Asset IT ' . $asset->asset_code . ' berhasil diperbarui.');
    }

    public function destroyAsset(ItAsset $asset): RedirectResponse
    {
        $user = Auth::user();
        if (!$this->isItManager($user)) {
            abort(403, 'Akses terbatas untuk Staff IT atau Administrator.');
        }

        if ($asset->photo && Storage::disk('public')->exists($asset->photo)) {
            Storage::disk('public')->delete($asset->photo);
        }

        $code = $asset->asset_code;
        $asset->delete();

        return back()->with('success', 'Asset IT ' . $code . ' berhasil dihapus.');
    }

    public function storeTicket(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $isItManager = $this->isItManager($user);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|string|max:100',
            'priority' => 'required|string|in:Low,Medium,High,Urgent',
            'it_asset_id' => 'nullable|exists:it_assets,id',
            'location' => 'nullable|string|max:100',
            'reported_by_employee_id' => 'nullable|exists:employees,id',
        ]);

        // Determine reporter employee
        $reporterEmployeeId = null;
        if ($isItManager && !empty($validated['reported_by_employee_id'])) {
            $reporterEmployeeId = $validated['reported_by_employee_id'];
        } elseif ($user->employee) {
            $reporterEmployeeId = $user->employee->id;
        } else {
            // Fallback to first employee or create a minimal association
            $firstEmp = Employee::first();
            $reporterEmployeeId = $firstEmp ? $firstEmp->id : null;
        }

        if (!$reporterEmployeeId) {
            return back()->with('error', 'Profil karyawan tidak ditemukan untuk membuat tiket.');
        }

        // Generate unique ticket number: TCK-YYYYMMDD-XXXX
        $datePrefix = Carbon::now()->format('Ymd');
        $countToday = ItTicket::whereDate('created_at', Carbon::today())->count() + 1;
        $ticketNumber = sprintf('TCK-%s-%04d', $datePrefix, $countToday);

        $ticket = ItTicket::create([
            'ticket_number' => $ticketNumber,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'category' => $validated['category'],
            'priority' => $validated['priority'],
            'status' => 'Open',
            'reported_by_employee_id' => $reporterEmployeeId,
            'it_asset_id' => $validated['it_asset_id'] ?? null,
            'location' => $validated['location'] ?? ($user->employee?->department?->name ?? 'Front Office'),
        ]);

        // Create initial update log
        ItTicketUpdate::create([
            'it_ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'status_from' => null,
            'status_to' => 'Open',
            'message' => 'Tiket kendala IT dilaporkan oleh ' . $user->name,
        ]);

        return back()->with('success', "Tiket kendala IT ({$ticketNumber}) berhasil dibuat.");
    }

    public function showTicket(ItTicket $ticket): Response
    {
        $user = Auth::user();
        $isItManager = $this->isItManager($user);

        // Regular employee can only view their own reported tickets
        if (!$isItManager && $user->employee && $ticket->reported_by_employee_id !== $user->employee->id) {
            abort(403, 'Anda tidak memiliki hak untuk melihat tiket ini.');
        }

        $ticket->load([
            'reporter.user',
            'reporter.department',
            'assignedUser',
            'assignedUsers:id,name,email',
            'asset',
            'updates.user',
        ]);

        $itStaffUsers = User::whereHas('employee.department', function ($q) {
            $q->where('name', 'IT');
        })->orWhereHas('roles', function ($q) {
            $q->whereIn('name', ['Super Admin', 'HRD / Admin', 'General Manager']);
        })->select('id', 'name', 'email')->get();

        return Inertia::render('IT/Tickets/Show', [
            'ticket' => $ticket,
            'isItManager' => $isItManager,
            'itStaffUsers' => $itStaffUsers,
        ]);
    }

    public function updateTicketStatus(Request $request, ItTicket $ticket): RedirectResponse
    {
        $user = Auth::user();
        $isItManager = $this->isItManager($user);

        // Either IT manager or the reporter (can only close if resolved)
        if (!$isItManager) {
            if (!$user->employee || $ticket->reported_by_employee_id !== $user->employee->id) {
                abort(403, 'Akses ditolak.');
            }
        }

        $validated = $request->validate([
            'status' => 'required|string|in:Open,In Progress,Pending Parts,Resolved,Closed',
            'assigned_user_ids' => 'nullable|array',
            'assigned_user_ids.*' => 'exists:users,id',
            'assigned_to_user_id' => 'nullable|exists:users,id',
            'resolution_notes' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if (!$isItManager) {
            if ($validated['status'] !== 'Closed' || $ticket->status !== 'Resolved') {
                abort(403, 'Akses ditolak: Pelapor hanya dapat menutup tiket yang telah berstatus Resolved.');
            }
        }

        $oldStatus = $ticket->status;
        $newStatus = $validated['status'];

        $ticket->status = $newStatus;

        if ($isItManager) {
            if (array_key_exists('assigned_user_ids', $validated)) {
                $assignedUserIds = array_values(array_filter(array_map('intval', (array) ($validated['assigned_user_ids'] ?? []))));
                $ticket->assignedUsers()->sync($assignedUserIds);
                $ticket->assigned_to_user_id = !empty($assignedUserIds) ? $assignedUserIds[0] : null;
            } elseif (array_key_exists('assigned_to_user_id', $validated)) {
                $singleId = $validated['assigned_to_user_id'] ? (int) $validated['assigned_to_user_id'] : null;
                $ticket->assigned_to_user_id = $singleId;
                $ticket->assignedUsers()->sync($singleId ? [$singleId] : []);
            }
        }

        if (!empty($validated['resolution_notes'])) {
            $ticket->resolution_notes = $validated['resolution_notes'];
        }

        if (in_array($newStatus, ['Resolved', 'Closed']) && !$ticket->resolved_at) {
            $ticket->resolved_at = Carbon::now();
        } elseif (!in_array($newStatus, ['Resolved', 'Closed'])) {
            $ticket->resolved_at = null;
        }

        $ticket->save();

        // Create ticket update entry
        $statusMsg = $validated['notes'] ?? "Status tiket diubah dari {$oldStatus} ke {$newStatus}";
        ItTicketUpdate::create([
            'it_ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'status_from' => $oldStatus,
            'status_to' => $newStatus,
            'message' => $statusMsg,
        ]);

        return back()->with('success', "Status tiket {$ticket->ticket_number} berhasil diperbarui menjadi {$newStatus}.");
    }

    public function addTicketUpdate(Request $request, ItTicket $ticket): RedirectResponse
    {
        $user = Auth::user();
        $isItManager = $this->isItManager($user);

        if (!$isItManager && (!$user->employee || $ticket->reported_by_employee_id !== $user->employee->id)) {
            abort(403, 'Akses ditolak.');
        }

        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        ItTicketUpdate::create([
            'it_ticket_id' => $ticket->id,
            'user_id' => $user->id,
            'status_from' => $ticket->status,
            'status_to' => $ticket->status,
            'message' => $validated['message'],
        ]);

        return back()->with('success', 'Tanggapan berhasil dikirim.');
    }

    public function destroyTicket(ItTicket $ticket): RedirectResponse
    {
        $user = Auth::user();
        if (!$this->isItManager($user)) {
            abort(403, 'Akses terbatas untuk Staff IT atau Administrator.');
        }

        $number = $ticket->ticket_number;
        $ticket->delete();

        return redirect()->route('it.index', ['tab' => 'tickets'])->with('success', "Tiket {$number} berhasil dihapus.");
    }
}
