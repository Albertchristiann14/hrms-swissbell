<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeDepartmentPositionTest extends TestCase
{
    use RefreshDatabase;

    public function test_management_department_has_general_manager_position_after_migration(): void
    {
        $management = Department::where('name', 'Management')->firstOrFail();

        $this->assertTrue(Position::where('department_id', $management->id)
            ->where('name', 'General Manager')->exists());
    }

    public function test_position_must_belong_to_the_selected_department_on_employee_update(): void
    {
        Role::findOrCreate('Super Admin');
        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');

        $accounting = Department::create(['name' => 'Accounting']);
        $management = Department::where('name', 'Management')->firstOrFail();
        $position = Position::create(['name' => 'Accounting Staff', 'department_id' => $accounting->id]);
        $user = User::factory()->create();
        $employee = Employee::create([
            'user_id' => $user->id,
            'employee_number' => 'SBH-999',
            'department_id' => $management->id,
            'employment_status' => 'Active',
        ]);

        $payload = [
            'name' => $user->name,
            'email' => $user->email,
            'employee_number' => $employee->employee_number,
            'department_id' => $management->id,
            'position_id' => $position->id,
            'employment_status' => 'Active',
            'role' => 'Super Admin',
        ];

        $this->actingAs($admin)->put(route('employees.update', $employee), $payload)
            ->assertSessionHasErrors('position_id');
        $this->assertNull($employee->fresh()->position_id);

        $payload['position_id'] = Position::where('department_id', $management->id)
            ->where('name', 'General Manager')->firstOrFail()->id;

        $this->actingAs($admin)->put(route('employees.update', $employee), $payload)
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('employees.index'));
        $this->assertSame($payload['position_id'], $employee->fresh()->position_id);
    }
}
