<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Employee;
use App\Models\Task;
use App\Models\TaskAssignmentHistory;
use App\Models\User;
use App\Notifications\TaskAcknowledgementReminder;
use App\Notifications\TaskAssignmentDeclined;
use App\Services\TaskAcknowledgementReminderService;
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
        $assigneeUser = User::factory()->create(['status' => 'active', 'approved_at' => now()]);
        $assignee = Employee::create([
            'user_id' => $assigneeUser->id,
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

    public function test_creator_and_assignee_receive_one_reminder_only_after_threshold(): void
    {
        Notification::fake();
        config()->set('tasks.acknowledgement_reminder_minutes', 15);
        $this->travelTo(now()->startOfMinute());
        [$creator, $assignee] = $this->makeAssignment();

        $this->travel(14)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertNothingSent();

        $this->travel(2)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Artisan::call('tasks:remind-unacknowledged');

        Notification::assertCount(2);
        Notification::assertSentTo($creator, TaskAcknowledgementReminder::class);
        Notification::assertSentTo($assignee->user, TaskAcknowledgementReminder::class);
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

    public function test_reminder_is_saved_as_an_in_app_notification_in_english(): void
    {
        $this->travelTo(now()->startOfMinute());
        [$creator, $assignee, $task] = $this->makeAssignment();

        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');

        // Creator notification check
        $creatorNotif = $creator->fresh()->notifications()->firstOrFail();
        $this->assertSame('acknowledgement_reminder', $creatorNotif->data['status_type']);
        $this->assertSame($task->id, $creatorNotif->data['task_id']);
        $this->assertStringContainsString('Inspect AC on Floor 3', $creatorNotif->data['message']);

        // Assignee notification check
        $assigneeNotif = $assignee->user->fresh()->notifications()->firstOrFail();
        $this->assertSame('acknowledgement_reminder', $assigneeNotif->data['status_type']);
        $this->assertSame($task->id, $assigneeNotif->data['task_id']);
        $this->assertStringContainsString('You have not acknowledged the task', $assigneeNotif->data['message']);
    }

    public function test_page_visit_triggers_reminder_for_user_via_service(): void
    {
        $this->travelTo(now()->startOfMinute());
        [, $assignee, $task] = $this->makeAssignment();

        $this->travel(16)->minutes();
        TaskAcknowledgementReminderService::checkAndNotifyForUser($assignee->user);

        $assigneeNotif = $assignee->user->fresh()->notifications()->first();
        $this->assertNotNull($assigneeNotif);
        $this->assertSame($task->id, $assigneeNotif->data['task_id']);
    }

    public function test_reassignment_creates_a_fresh_reminder_window(): void
    {
        Notification::fake();
        $this->travelTo(now()->startOfMinute());
        [$creator, $employee, $task] = $this->makeAssignment();

        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertCount(2);

        app(TaskAssignmentHistoryService::class)->sync($task, [], $creator->id);
        app(TaskAssignmentHistoryService::class)->sync($task, [$employee->id], $creator->id);
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertCount(2);

        $this->travel(16)->minutes();
        Artisan::call('tasks:remind-unacknowledged');
        Notification::assertCount(4);
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

    public function test_employee_can_decline_task_with_mandatory_reason(): void
    {
        Notification::fake();
        [$creator, $assignee, $task] = $this->makeAssignment();

        $response = $this->actingAs($assignee->user)->post(route('tasks.decline', $task), [
            'reason' => 'Schedule conflict with morning shift and pending audit.',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Assignee is detached from task
        $this->assertFalse($task->assignees()->where('employee_id', $assignee->id)->exists());

        // History updated with decline reason and timestamp
        $history = TaskAssignmentHistory::where('task_id', $task->id)->where('employee_id', $assignee->id)->firstOrFail();
        $this->assertNotNull($history->unassigned_at);
        $this->assertNotNull($history->declined_at);
        $this->assertSame('Schedule conflict with morning shift and pending audit.', $history->decline_reason);

        // Activity and comment logged
        $this->assertSame(1, $task->activities()->where('action', 'task_declined')->count());
        $this->assertTrue($task->comments()->where('content', 'like', '%Schedule conflict%')->exists());

        // Creator notified
        Notification::assertSentTo($creator, TaskAssignmentDeclined::class);
    }

    public function test_employee_cannot_decline_without_reason(): void
    {
        [$creator, $assignee, $task] = $this->makeAssignment();

        $response = $this->actingAs($assignee->user)->post(route('tasks.decline', $task), [
            'reason' => '',
        ]);

        $response->assertSessionHasErrors('reason');
        $this->assertTrue($task->assignees()->where('employee_id', $assignee->id)->exists());
    }

    public function test_unassigned_employee_cannot_decline_task(): void
    {
        $department = Department::firstOrCreate(['name' => 'Engineering']);
        $otherUser = User::factory()->create(['status' => 'active', 'approved_at' => now()]);
        Employee::create([
            'user_id' => $otherUser->id,
            'department_id' => $department->id,
            'employee_number' => 'ENG-OTHER',
            'employment_status' => 'Active',
        ]);
        [, , $task] = $this->makeAssignment();

        $response = $this->actingAs($otherUser)->post(route('tasks.decline', $task), [
            'reason' => 'I was not assigned to this.',
        ]);

        $response->assertForbidden();
    }

    public function test_already_acknowledged_task_cannot_be_declined(): void
    {
        [, $assignee, $task] = $this->makeAssignment();
        app(TaskAssignmentHistoryService::class)->acknowledge($task, $assignee);

        $response = $this->actingAs($assignee->user)->post(route('tasks.decline', $task), [
            'reason' => 'Changed my mind.',
        ]);

        $response->assertSessionHas('error');
    }
}
