<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\MasterKeyRequest;
use App\Models\Position;
use Spatie\Permission\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterKeyWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed roles
        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Head of Department', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Supervisor', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Staff / Employee', 'guard_name' => 'web']);
    }

    private function createEmployee(string $deptName, string $roleName, string $positionName = 'Staff'): array
    {
        $dept = Department::firstOrCreate(['name' => $deptName]);
        $pos = Position::firstOrCreate(['name' => $positionName, 'department_id' => $dept->id]);
        $user = User::factory()->create();
        $user->assignRole($roleName);

        $emp = Employee::create([
            'user_id' => $user->id,
            'department_id' => $dept->id,
            'position_id' => $pos->id,
            'employee_number' => 'EMP-' . uniqid(),
            'employment_status' => 'Active',
        ]);

        return [$user, $emp];
    }

    public function test_hk_staff_can_request_master_key(): void
    {
        [$hkStaff, $hkEmp] = $this->createEmployee('Housekeeping', 'Staff / Employee', 'Room Attendant');

        $response = $this->actingAs($hkStaff)->post('/master-keys', [
            'request_type' => 'create_new',
            'employee_id' => $hkEmp->id,
            'request_by' => 'Yuni Rahayu',
            'key_number' => 'MK-301',
            'key_type' => 'Floor Key',
            'room_range_access' => 'Lantai 3 (Kamar 301 - 318)',
            'valid_from' => now()->toDateString(),
            'valid_until' => now()->addMonths(3)->toDateString(),
            'renewal_cycle_months' => 3,
            'remark' => 'Daily cleaning assignment for 3rd floor',
        ]);

        $response->assertRedirect('/master-keys');
        $this->assertDatabaseHas('master_key_requests', [
            'key_number' => 'MK-301',
            'status' => 'On Request',
            'request_by' => 'Yuni Rahayu',
        ]);
    }

    public function test_master_key_details_include_full_extension_history_and_last_request(): void
    {
        [$hkStaff, $employee] = $this->createEmployee('Housekeeping', 'Staff / Employee', 'Room Attendant');

        $first = MasterKeyRequest::create([
            'request_number' => 'MKR-HISTORY-001',
            'request_type' => 'create_new',
            'employee_id' => $employee->id,
            'department_id' => $employee->department_id,
            'key_number' => 'MK-HK-HISTORY',
            'key_type' => 'Floor Key',
            'room_range_access' => 'Floor 3',
            'valid_from' => now()->subMonths(6)->toDateString(),
            'valid_until' => now()->subMonths(3)->toDateString(),
            'requested_at' => now()->subMonths(6),
        ]);

        MasterKeyRequest::create([
            'request_number' => 'MKR-HISTORY-002',
            'request_type' => 'extension',
            'employee_id' => $employee->id,
            'department_id' => $employee->department_id,
            'key_number' => 'MK-HK-HISTORY',
            'key_type' => 'Floor Key',
            'room_range_access' => 'Floor 3',
            'valid_from' => now()->subMonths(3)->toDateString(),
            'valid_until' => now()->toDateString(),
            'previous_request_id' => $first->id,
            'requested_at' => now()->subMonths(3),
        ]);

        $this->actingAs($hkStaff)->get(route('master-keys.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MasterKey/Index')
                ->has('renewalHistories.MK-HK-HISTORY', 2)
                ->where('renewalHistories.MK-HK-HISTORY.0.request_number', 'MKR-HISTORY-002')
                ->where('renewalHistories.MK-HK-HISTORY.1.request_number', 'MKR-HISTORY-001')
                ->etc());
    }

    public function test_regular_staff_only_receive_their_own_master_key_history(): void
    {
        [$staff, $employee] = $this->createEmployee('Housekeeping', 'Staff / Employee', 'Room Attendant');
        [, $otherEmployee] = $this->createEmployee('Housekeeping', 'Staff / Employee', 'Room Attendant');

        foreach ([$employee, $otherEmployee] as $index => $requester) {
            MasterKeyRequest::create([
                'request_number' => 'MKR-SCOPE-' . ($index + 1),
                'request_type' => 'extension',
                'employee_id' => $requester->id,
                'department_id' => $requester->department_id,
                'key_number' => 'MK-SHARED-01',
                'key_type' => 'Floor Key',
                'room_range_access' => 'Floor 3',
                'valid_from' => now()->toDateString(),
                'valid_until' => now()->addMonths(3)->toDateString(),
                'requested_at' => now(),
            ]);
        }

        $this->actingAs($staff)->get(route('master-keys.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('MasterKey/Index')
                ->has('renewalHistories.MK-SHARED-01', 1)
                ->where('renewalHistories.MK-SHARED-01.0.request_number', 'MKR-SCOPE-1')
                ->etc());
    }

    public function test_only_hod_housekeeping_or_it_can_update_status_and_others_are_denied(): void
    {
        [$hkStaff, $hkEmp] = $this->createEmployee('Housekeeping', 'Staff / Employee', 'Room Attendant');
        [$hkHod] = $this->createEmployee('Housekeeping', 'Head of Department', 'Executive Housekeeper');
        [$itStaff] = $this->createEmployee('IT', 'Staff / Employee', 'IT Support Staff');
        [$foStaff] = $this->createEmployee('Front Office', 'Staff / Employee', 'Receptionist');
        [$foHod] = $this->createEmployee('Front Office', 'Head of Department', 'Front Office Manager');

        $req = MasterKeyRequest::create([
            'request_number' => 'MKR-TEST-001',
            'request_type' => 'create_new',
            'employee_id' => $hkEmp->id,
            'department_id' => $hkEmp->department_id,
            'key_number' => 'MK-101',
            'key_type' => 'Grand Master Key',
            'room_range_access' => 'All HK Guest Rooms',
            'valid_from' => now()->toDateString(),
            'valid_until' => now()->addMonths(3)->toDateString(),
            'renewal_cycle_months' => 3,
            'remark' => 'Master key testing',
            'status' => 'On Request',
            'requested_by_user_id' => $hkStaff->id,
            'requested_by_username' => $hkStaff->name,
            'requested_at' => now(),
        ]);

        // Front Office staff cannot update status
        $response = $this->actingAs($foStaff)->patch("/master-keys/{$req->id}/status", [
            'status' => 'Done',
            'done_notes' => 'Attempt by FO staff',
        ]);
        $response->assertSessionHas('error');
        $this->assertEquals('On Request', $req->fresh()->status);

        // Front Office HOD cannot approve Housekeeping master key
        $response = $this->actingAs($foHod)->patch("/master-keys/{$req->id}/status", [
            'status' => 'Done',
            'done_notes' => 'Attempt by FO HOD',
        ]);
        $response->assertSessionHas('error');
        $this->assertEquals('On Request', $req->fresh()->status);

        // IT Department CAN process and issue the key (Done)
        $response = $this->actingAs($itStaff)->patch("/master-keys/{$req->id}/status", [
            'status' => 'Done',
            'done_notes' => 'Key programmed & issued by IT Department',
        ]);
        $response->assertSessionHas('success');
        $this->assertEquals('Done', $req->fresh()->status);
        $this->assertEquals($itStaff->name, $req->fresh()->done_by_username);
    }

    public function test_print_endpoint_renders_with_hod_hk_and_it_staff(): void
    {
        [$hkStaff, $hkEmp] = $this->createEmployee('Housekeeping', 'Staff / Employee', 'Room Attendant');
        [$hkHod] = $this->createEmployee('Housekeeping', 'Head of Department', 'Executive Housekeeper');
        [$itStaff] = $this->createEmployee('IT', 'Staff / Employee', 'IT Support Staff');

        $req = MasterKeyRequest::create([
            'request_number' => 'MKR-TEST-002',
            'request_type' => 'create_new',
            'employee_id' => $hkEmp->id,
            'department_id' => $hkEmp->department_id,
            'key_number' => 'MK-202',
            'key_type' => 'Master Key',
            'room_range_access' => 'Floor 2',
            'valid_from' => now()->toDateString(),
            'valid_until' => now()->addMonths(3)->toDateString(),
            'renewal_cycle_months' => 3,
            'remark' => 'Floor 2 master key',
            'status' => 'Done',
            'requested_by_user_id' => $hkStaff->id,
            'requested_by_username' => $hkStaff->name,
            'done_by_user_id' => $itStaff->id,
            'done_by_username' => $itStaff->name,
            'done_at' => now(),
        ]);

        $response = $this->actingAs($hkHod)->get("/master-keys/{$req->id}/print");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('MasterKey/Print')
            ->has('requestData')
            ->has('hodHK')
            ->has('itStaff')
            ->where('hodHK.user.name', $hkHod->name)
            ->where('itStaff.user.name', $itStaff->name)
        );
    }
}
