<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\TaskAssignmentHistory;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskAcknowledgementReminder extends Notification
{
    use Queueable;

    public function __construct(
        public Task $task,
        public TaskAssignmentHistory $assignment,
        public int $minutes,
        public string $recipientType = 'creator',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $employeeName = $this->assignment->employee_name ?: 'Assigned employee';

        if ($this->recipientType === 'assignee') {
            return [
                'task_id' => $this->task->id,
                'assignment_history_id' => $this->assignment->id,
                'title' => 'Task Pending Acknowledgement',
                'status_type' => 'acknowledgement_reminder',
                'employee_name' => $employeeName,
                'minutes_waiting' => $this->minutes,
                'message' => "You have not acknowledged the task '{$this->task->title}' assigned to you for {$this->minutes} minutes. Please acknowledge or decline it.",
                'action_url' => $this->task->project_id
                    ? route('projects.show', ['project' => $this->task->project_id, 'task_id' => $this->task->id])
                    : route('tasks.kanban', ['task_id' => $this->task->id]),
            ];
        }

        return [
            'task_id' => $this->task->id,
            'assignment_history_id' => $this->assignment->id,
            'title' => 'Unacknowledged Task Assignment',
            'status_type' => 'acknowledgement_reminder',
            'employee_name' => $employeeName,
            'minutes_waiting' => $this->minutes,
            'message' => "Task '{$this->task->title}' assigned to {$employeeName} has not been acknowledged for {$this->minutes} minutes.",
            'action_url' => $this->task->project_id
                ? route('projects.show', ['project' => $this->task->project_id, 'task_id' => $this->task->id])
                : route('tasks.kanban', ['task_id' => $this->task->id]),
        ];
    }
}
