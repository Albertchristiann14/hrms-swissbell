<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmployeeSortingTest extends TestCase
{
    use RefreshDatabase;

    private function setupEmployees(): array
    {
        Role::findOrCreate('HRD / Admin');
        $hr = User::factory()->create();
        $hr->assignRole('HRD / Admin');

        $accounting = Department::create(['name' => 'Accounting']);
        $it = Department::create(['name' => 'IT']);
        $sales = Department::create(['name' => 'Sales & Marketing']);

        $accountingPosition = Position::create(['name' => 'Accounting Staff', 'department_id' => $accounting->id]);
        $itPosition = Position::create(['name' => 'IT Support', 'department_id' => $it->id]);
        $marketingPosition = Position::create(['name' => 'Marketing Staff', 'department_id' => $sales->id]);

        $records = [
            ['Zoe', 'SBH-020', $sales->id, $marketingPosition->id, 'Resigned', '2024-04-01', 3],
            ['Alice', 'SBH-030', $accounting->id, $accountingPosition->id, 'On Leave', '2026-09-01', 2],
            ['Bob', 'SBH-010', $it->id, $itPosition->id, 'Active', '2022-01-01', 1],
        ];

        $employees = [];
        foreach ($records as [$name, $number, $departmentId, $positionId, $status, $joinDate, $daysAgo]) {
            $user = User::factory()->create(['name' => $name]);
            $employee = Employee::create([
                'user_id' => $user->id,
                'employee_number' => $number,
                'department_id' => $departmentId,
                'position_id' => $positionId,
                'employment_status' => $status,
                'join_date' => $joinDate,
            ]);
            $employee->forceFill(['created_at' => now()->subDays($daysAgo)])->save();
            $employees[$name] = $employee;
        }

        return [$hr, $employees, $it];
    }

    public function test_all_six_columns_can_be_sorted_in_both_directions(): void
    {
        [$hr, $employees] = $this->setupEmployees();

        $expected = [
            'employee' => ['Alice', 'Zoe'],
            'id' => ['Bob', 'Alice'],
            'department' => ['Alice', 'Zoe'],
            'position' => ['Alice', 'Zoe'],
            'status' => ['Bob', 'Zoe'],
            'join_date' => ['Bob', 'Alice'],
        ];

        foreach ($expected as $column => [$firstAscending, $firstDescending]) {
            foreach (['asc' => $firstAscending, 'desc' => $firstDescending] as $direction => $name) {
                $this->actingAs($hr)->get(route('employees.index', ['sort' => $column, 'direction' => $direction]))
                    ->assertOk()
                    ->assertInertia(fn (AssertableInertia $page) => $page
                        ->component('Organization/Employees/Index')
                        ->where('employees.data.0.id', $employees[$name]->id)
                        ->where('filters.sort', $column)
                        ->where('filters.direction', $direction)
                        ->etc()
                    );
            }
        }
    }

    public function test_unset_or_invalid_sort_restores_default_order(): void
    {
        [$hr, $employees] = $this->setupEmployees();

        foreach (['', '?sort=unknown&direction=asc', '?sort=employee&direction=invalid'] as $query) {
            $this->actingAs($hr)->get('/employees'.$query)
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->where('employees.data.0.id', $employees['Bob']->id)
                    ->missing('filters.sort')
                    ->etc()
                );
        }
    }

    public function test_sort_and_department_filter_work_together(): void
    {
        [$hr, $employees, $it] = $this->setupEmployees();

        $this->actingAs($hr)->get(route('employees.index', [
            'department' => $it->id,
            'sort' => 'employee',
            'direction' => 'desc',
        ]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('employees.data', 1)
                ->where('employees.data.0.id', $employees['Bob']->id)
                ->where('filters.sort', 'employee')
                ->where('filters.direction', 'desc')
                ->etc()
            );
    }
}
