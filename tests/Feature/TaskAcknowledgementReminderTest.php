<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Task;
use App\Models\TaskAssignmentHistory;
use App\Models\User;
use App\Notifications\TaskAcknowledgementReminder;
use App\Services\TaskAssignmentHistoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class TaskAcknowledgementReminderTest extends TestCase
{
    use RefreshDatabase;

    private function makeAssignment(): array
    {
        $creator = User::factory()->create();
        $department = Department::firstOrCreate(['name' => 'Engineering']);
        $assignee = Employee::create([
            'user_id' => User::factory()->create()->id,
            'department_id' => $department->id,
            'employee_number' => 'ENG-' . uniqid(),
            'employment_status' => 'Active',
        ]);
        $task = Task::create([
            'title' => 'Inspect AC on Floor 3',
            'created_by' => $creator->id,
            'status' => 'To Do',
            'priority' => 'Normal',
        ]);

        app(TaskAssignmentHistoryService::class)->sync($task, [$assignee->id], $creator->id);

        return [$creator, $assignee, $task];
    }

    public function test_creator_receives_one_reminder_only_after_fifteen_minutes(): void
    {
        Notification::fake();
        config()->set('tasks.acknowledgement_reminder_minutes', 15);
        $this->travelTo(now()->startOfMinute());
        [$creator] = $this->makeAssignment();

        $this->travel(14)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertNothingSent();

        $this->travel(2)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Artisan::call('tasks:remind-unacknowledged');

        Notification::assertCount(1);
        Notification::assertSentTo($creator, TaskAcknowledgementReminder::class);
        $this->assertNotNull(TaskAssignmentHistory::firstOrFail()->reminder_sent_at);
    }

    public function test_no_reminder_is_sent_after_acknowledgement_or_unassignment(): void
    {
        Notification::fake();
        $this->travelTo(now()->startOfMinute());
        [$creator, $employee, $task] = $this->makeAssignment();

        app(TaskAssignmentHistoryService::class)->acknowledge($task, $employee);
        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertNothingSent();

        // The next assignment is removed before the reminder threshold.
        app(TaskAssignmentHistoryService::class)->sync($task, [], $creator->id);
        app(TaskAssignmentHistoryService::class)->sync($task, [$employee->id], $creator->id);
        app(TaskAssignmentHistoryService::class)->sync($task, [], $creator->id);
        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertNothingSent();
    }

    public function test_reminder_is_saved_as_an_in_app_notification_for_the_creator(): void
    {
        $this->travelTo(now()->startOfMinute());
        [$creator, , $task] = $this->makeAssignment();

        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');

        $notification = $creator->fresh()->notifications()->firstOrFail();
        $this->assertSame('acknowledgement_reminder', $notification->data['status_type']);
        $this->assertSame($task->id, $notification->data['task_id']);
        $this->assertStringContainsString('Inspect AC on Floor 3', $notification->data['message']);
    }

    public function test_reassignment_creates_a_fresh_reminder_window(): void
    {
        Notification::fake();
        $this->travelTo(now()->startOfMinute());
        [$creator, $employee, $task] = $this->makeAssignment();

        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertCount(1);

        app(TaskAssignmentHistoryService::class)->sync($task, [], $creator->id);
        app(TaskAssignmentHistoryService::class)->sync($task, [$employee->id], $creator->id);
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertCount(1);

        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertCount(2);
    }

    public function test_older_existing_assignments_can_be_suppressed_on_rollout(): void
    {
        Notification::fake();
        [$creator] = $this->makeAssignment();
        TaskAssignmentHistory::query()->update([
            'assigned_at' => now()->subDay(),
            'reminder_sent_at' => now(),
        ]);

        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertNothingSent();
    }
}
