<?php

namespace App\Notifications;

use App\Models\Employee;
use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskAssignmentDeclined extends Notification
{
    use Queueable;

    public function __construct(
        public Task $task,
        public Employee $employee,
        public string $reason,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $employeeName = $this->employee->user?->name ?: ($this->employee->employee_number ?: 'An employee');

        return [
            'task_id' => $this->task->id,
            'title' => 'Task Assignment Declined',
            'status_type' => 'task_declined',
            'employee_name' => $employeeName,
            'reason' => $this->reason,
            'message' => "{$employeeName} has declined the assignment for task '{$this->task->title}'. Reason: {$this->reason}",
            'action_url' => $this->task->project_id
                ? route('projects.show', ['project' => $this->task->project_id, 'task_id' => $this->task->id])
                : route('tasks.kanban', ['task_id' => $this->task->id]),
        ];
    }
}

