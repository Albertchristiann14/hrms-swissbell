<?php

namespace Tests\Feature;

use App\Enums\TaskStatus;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Task;
use App\Models\TaskAssignmentHistory;
use App\Models\User;
use App\Services\TaskAssignmentHistoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DepartmentTaskHistoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::findOrCreate('General Manager');
        Role::findOrCreate('Super Admin');
        Role::findOrCreate('Staff / Employee');
    }

    private function employee(Department $department, string $number): Employee
    {
        $user = User::factory()->create();

        return Employee::create([
            'user_id' => $user->id,
            'employee_number' => $number,
            'department_id' => $department->id,
            'employment_status' => 'Active',
        ]);
    }

    private function task(User $creator): Task
    {
        return Task::create([
            'title' => 'Cross Department Inspection',
            'created_by' => $creator->id,
            'status' => TaskStatus::ToDo->value,
            'priority' => 'Normal',
        ]);
    }

    public function test_gm_can_open_department_selector_before_choosing_a_department(): void
    {
        Department::create(['name' => 'Front Office']);
        Department::create(['name' => 'Housekeeping']);
        $gm = User::factory()->create();
        $gm->assignRole('General Manager');

        $this->actingAs($gm)->get(route('dashboard.departments.tasks.index'))
            ->assertOk()
            ->assertInertia(
                fn(AssertableInertia $page) => $page
                    ->component('Dashboard/DepartmentTaskHistory')
                    ->where('auth.canViewDepartmentTasks', true)
                    ->where('department', null)
                    ->where('tasks', null)
                    ->has('departments', 3) // Includes Management, created by the General Manager position migration.
            );
    }

    public function test_gm_sees_a_task_once_per_recipient_department_even_with_multiple_recipients(): void
    {
        $frontOffice = Department::create(['name' => 'Front Office']);
        $housekeeping = Department::create(['name' => 'Housekeeping']);
        $a = $this->employee($frontOffice, 'FO-001');
        $b = $this->employee($frontOffice, 'FO-002');
        $c = $this->employee($housekeeping, 'HK-001');

        $gm = User::factory()->create();
        $gm->assignRole('General Manager');
        $task = $this->task($gm);

        app(TaskAssignmentHistoryService::class)->sync($task, [$a->id, $b->id, $c->id], $gm->id);

        $this->assertDatabaseCount('task_assignment_histories', 3);

        $this->actingAs($gm)->get(route('dashboard.departments.tasks.history', $frontOffice))
            ->assertOk()
            ->assertInertia(
                fn(AssertableInertia $page) => $page
                    ->component('Dashboard/DepartmentTaskHistory')
                    ->where('summary.total', 1)
                    ->where('summary.active', 1)
                    ->has('tasks.data', 1)
                    ->has('tasks.data.0.detail.checklists')
                    ->has('tasks.data.0.detail.comments')
                    ->has('tasks.data.0.detail.activities')
                    ->has('tasks.data.0.detail.assignees')
                    ->has('tasks.data.0.assignments', 2)
            );

        $this->actingAs($gm)->get(route('dashboard.departments.tasks.history', $housekeeping))
            ->assertOk()
            ->assertInertia(
                fn(AssertableInertia $page) => $page
                    ->component('Dashboard/DepartmentTaskHistory')
                    ->where('summary.total', 1)
                    ->has('tasks.data', 1)
                    ->has('tasks.data.0.assignments', 1)
            );

        $task->update(['status' => TaskStatus::Approved->value]);

        $this->actingAs($gm)->get(route('dashboard.departments.tasks.history', $frontOffice))
            ->assertInertia(
                fn(AssertableInertia $page) => $page
                    ->where('summary.total', 1)
                    ->where('summary.active', 0)
                    ->where('summary.approved', 1)
            );

        $this->actingAs($gm)->get('/dashboard?view=overview')
            ->assertInertia(
                fn(AssertableInertia $page) => $page
                    ->where('managerData.departmentPerformance', function ($departments) use ($frontOffice, $housekeeping) {
                        $byId = collect($departments)->keyBy('id');

                        return (int) data_get(
                            $byId->get($frontOffice->id),
                            'total_completed_tasks'
                        ) === 1
                            && (int) data_get(
                                $byId->get($housekeeping->id),
                                'total_completed_tasks'
                            ) === 1;
                    })
            );
    }

    public function test_historical_department_is_preserved_after_transfer_unassignment_and_reassignment(): void
    {
        $frontOffice = Department::create(['name' => 'Front Office']);
        $housekeeping = Department::create(['name' => 'Housekeeping']);
        $employee = $this->employee($frontOffice, 'TR-001');
        $creator = User::factory()->create();
        $task = $this->task($creator);
        $service = app(TaskAssignmentHistoryService::class);

        $service->sync($task, [$employee->id], $creator->id);
        $employee->update(['department_id' => $housekeeping->id]);
        $service->sync($task, [], $creator->id);

        $first = TaskAssignmentHistory::firstOrFail();
        $this->assertSame($frontOffice->id, $first->department_id);
        $this->assertSame('Front Office', $first->department_name);
        $this->assertNotNull($first->unassigned_at);

        $service->sync($task, [$employee->id], $creator->id);
        $history = TaskAssignmentHistory::orderBy('id')->get();
        $this->assertCount(2, $history);
        $this->assertSame($frontOffice->id, $history[0]->department_id);
        $this->assertSame($housekeeping->id, $history[1]->department_id);
        $this->assertNull($history[1]->unassigned_at);

        $gm = User::factory()->create();
        $gm->assignRole('General Manager');
        $this->actingAs($gm)->get(route('dashboard.departments.tasks.history', $frontOffice))
            ->assertInertia(fn(AssertableInertia $page) => $page->where('summary.total', 1));
        $this->actingAs($gm)->get(route('dashboard.departments.tasks.history', $housekeeping))
            ->assertInertia(fn(AssertableInertia $page) => $page->where('summary.total', 1));
    }

    public function test_only_gm_and_super_admin_can_open_department_history(): void
    {
        $department = Department::create(['name' => 'Engineering']);
        $staff = User::factory()->create();
        $staff->assignRole('Staff / Employee');
        $this->actingAs($staff)->get(route('dashboard.departments.tasks.history', $department))->assertForbidden();
        $this->actingAs($staff)->get(route('dashboard.departments.tasks.index'))->assertForbidden();

        $admin = User::factory()->create();
        $admin->assignRole('Super Admin');
        $this->actingAs($admin)->get(route('dashboard.departments.tasks.history', $department))->assertOk();
    }

    public function test_acknowledgement_is_authorized_and_recorded_only_once(): void
    {
        $department = Department::create(['name' => 'IT']);
        $employee = $this->employee($department, 'IT-001');
        $other = $this->employee($department, 'IT-002');
        $creator = User::factory()->create();
        $task = $this->task($creator);
        app(TaskAssignmentHistoryService::class)->sync($task, [$employee->id], $creator->id);

        $this->actingAs($other->user)->post(route('tasks.acknowledge', $task))->assertForbidden();
        $this->actingAs($employee->user)->post(route('tasks.acknowledge', $task))->assertRedirect();

        $firstAck = TaskAssignmentHistory::firstOrFail()->acknowledged_at;
        $this->assertNotNull($firstAck);

        $this->actingAs($employee->user)->post(route('tasks.acknowledge', $task))->assertRedirect();
        $this->assertEquals($firstAck, TaskAssignmentHistory::firstOrFail()->acknowledged_at);
        $this->assertSame(1, $task->activities()->where('action', 'task_acknowledged')->count());
    }
}
