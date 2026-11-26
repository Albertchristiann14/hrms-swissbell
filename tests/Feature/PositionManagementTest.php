<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Database\Seeders\PositionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PositionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'HRD / Admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'General Manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'Staff / Employee', 'guard_name' => 'web']);
    }

    private function createUserWithRole(string $role): User
    {
        $user = User::factory()->create([
            'status' => 'approved',
        ]);
        $user->assignRole($role);
        return $user;
    }

    public function test_unauthorized_user_cannot_access_position_management(): void
    {
        $staff = $this->createUserWithRole('Staff / Employee');
        $dept = Department::create(['name' => 'IT']);

        $this->actingAs($staff)->get(route('positions.index'))->assertStatus(403);
        $this->actingAs($staff)->post(route('positions.store'), [
            'department_id' => $dept->id,
            'name' => 'IT Support',
        ])->assertStatus(403);
    }

    public function test_admin_can_create_positions_under_different_departments_and_prevent_duplicates_within_same_department(): void
    {
        $admin = $this->createUserWithRole('HRD / Admin');
        $hr = Department::create(['name' => 'Human Resources']);
        $it = Department::create(['name' => 'IT']);

        // Create in HR
        $this->actingAs($admin)->post(route('positions.store'), [
            'department_id' => $hr->id,
            'name' => 'Manager',
            'code' => 'HR-MGR',
            'is_active' => true,
        ])->assertSessionHasNoErrors();

        // Same name in different department (IT) is allowed
        $this->actingAs($admin)->post(route('positions.store'), [
            'department_id' => $it->id,
            'name' => 'Manager',
            'code' => 'IT-MGR',
            'is_active' => true,
        ])->assertSessionHasNoErrors();

        // Duplicate name in same department (HR) is rejected
        $this->actingAs($admin)->post(route('positions.store'), [
            'department_id' => $hr->id,
            'name' => 'Manager',
        ])->assertSessionHasErrors(['name']);

        $this->assertSame(2, Position::whereIn('department_id', [$hr->id, $it->id])->count());
    }

    public function test_admin_can_edit_and_toggle_status_and_cannot_delete_assigned_position(): void
    {
        $admin = $this->createUserWithRole('Super Admin');
        $dept = Department::create(['name' => 'Housekeeping']);
        $pos = Position::create([
            'department_id' => $dept->id,
            'name' => 'Room Attendant',
            'is_active' => true,
        ]);

        // Edit
        $this->actingAs($admin)->put(route('positions.update', $pos->id), [
            'department_id' => $dept->id,
            'name' => 'Senior Room Attendant',
            'code' => 'HK-SRA',
            'description' => 'Handles VIP suites',
            'is_active' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame('Senior Room Attendant', $pos->fresh()->name);

        // Assign to an employee
        $empUser = $this->createUserWithRole('Staff / Employee');
        Employee::create([
            'user_id' => $empUser->id,
            'employee_number' => 'SBH-901',
            'department_id' => $dept->id,
            'position_id' => $pos->id,
            'employment_status' => 'Active',
        ]);

        // Deleting assigned position must fail
        $this->actingAs($admin)->delete(route('positions.destroy', $pos->id))
            ->assertSessionHas('error');
        $this->assertDatabaseHas('positions', ['id' => $pos->id]);

        // Deactivating instead of deleting succeeds
        $this->actingAs($admin)->patch(route('positions.toggle-status', $pos->id))
            ->assertSessionHas('success');
        $this->assertFalse($pos->fresh()->is_active);
    }

    public function test_employee_assignment_enforces_same_department_and_active_position_while_preserving_historical(): void
    {
        $admin = $this->createUserWithRole('Super Admin');
        $it = Department::create(['name' => 'IT']);
        $hr = Department::create(['name' => 'HR']);

        $itActive = Position::create(['department_id' => $it->id, 'name' => 'IT Staff', 'is_active' => true]);
        $itInactive = Position::create(['department_id' => $it->id, 'name' => 'Legacy Operator', 'is_active' => false]);
        $hrActive = Position::create(['department_id' => $hr->id, 'name' => 'HR Officer', 'is_active' => true]);

        // Reject mismatched department-position
        $this->actingAs($admin)->post(route('employees.store'), [
            'name' => 'Mismatch User',
            'email' => 'mismatch@swissbelhotel.com',
            'password' => 'password123',
            'employee_number' => 'SBH-701',
            'department_id' => $it->id,
            'position_id' => $hrActive->id,
            'employment_status' => 'Active',
            'role' => 'Staff / Employee',
        ])->assertSessionHasErrors(['position_id']);

        // Reject inactive position for new employee
        $this->actingAs($admin)->post(route('employees.store'), [
            'name' => 'Inactive Pos User',
            'email' => 'inactivepos@swissbelhotel.com',
            'password' => 'password123',
            'employee_number' => 'SBH-702',
            'department_id' => $it->id,
            'position_id' => $itInactive->id,
            'employment_status' => 'Active',
            'role' => 'Staff / Employee',
        ])->assertSessionHasErrors(['position_id']);

        // Valid active position in matching department succeeds
        $this->actingAs($admin)->post(route('employees.store'), [
            'name' => 'Valid IT User',
            'email' => 'validit@swissbelhotel.com',
            'password' => 'password123',
            'employee_number' => 'SBH-703',
            'department_id' => $it->id,
            'position_id' => $itActive->id,
            'employment_status' => 'Active',
            'role' => 'Staff / Employee',
        ])->assertSessionHasNoErrors();

        $employee = Employee::where('employee_number', 'SBH-703')->firstOrFail();

        // Deactivate the position after employee already has it
        $itActive->update(['is_active' => false]);

        // Updating employee's other fields preserves historical inactive position
        $this->actingAs($admin)->put(route('employees.update', $employee->id), [
            'name' => 'Valid IT User Updated',
            'email' => 'validit@swissbelhotel.com',
            'employee_number' => 'SBH-703',
            'department_id' => $it->id,
            'position_id' => $itActive->id,
            'employment_status' => 'Active',
            'role' => 'Staff / Employee',
        ])->assertSessionHasNoErrors();

        $this->assertSame($itActive->id, $employee->fresh()->position_id);
    }

    public function test_position_seeder_is_idempotent_and_maps_departments_correctly(): void
    {
        $this->seed(PositionSeeder::class);
        $this->assertSame(13, Department::count());
        $this->assertSame(33, Position::count());

        // Re-running must not duplicate anything
        $this->seed(PositionSeeder::class);
        $this->assertSame(13, Department::count());
        $this->assertSame(33, Position::count());

        $accounting = Department::where('name', 'Accounting')->firstOrFail();
        $this->assertTrue(Position::where('department_id', $accounting->id)->where('name', 'Finance Manager')->exists());
    }
}
