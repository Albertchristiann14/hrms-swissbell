<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssigned extends Notification
{
    use Queueable;

    public $task;

    /**
     * Create a new notification instance.
     */
    public function __construct(Task $task)
    {
        $this->task = $task;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $url = $this->task->project_id
            ? route('projects.show', $this->task->project_id)
            : route('tasks.index');

        return (new MailMessage)
                    ->subject('New Task: ' . $this->task->title)
                    ->greeting('Hello ' . ($notifiable->name ?? 'Team Member') . ',')
                    ->line('You have been assigned to a new task.')
                    ->line('**Task Title:** ' . $this->task->title)
                    ->line('**Project:** ' . ($this->task->project->name ?? 'Standalone Task (No Project)'))
                    ->line('**Priority:** ' . ($this->task->priority->value ?? $this->task->priority))
                    ->action('View Task Details', $url)
                    ->line('Thank you for using our HRMS system!');
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'title' => $this->task->title,
            'project_name' => $this->task->project->name ?? 'No Project',
            'message' => 'You have been assigned to a new task: ' . $this->task->title,
            'action_url' => $this->task->project_id ? route('projects.show', $this->task->project_id) : route('tasks.index'),
        ];
    }
}
