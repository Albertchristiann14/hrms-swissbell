<?php

namespace App\Console\Commands;

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\TaskAssignmentHistory;
use App\Notifications\TaskAcknowledgementReminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RemindUnacknowledgedTasks extends Command
{
    protected $signature = 'tasks:remind-unacknowledged';

    protected $description = 'Notify task creators once when an active assignment remains unacknowledged';

    public function handle(): int
    {
        $minutes = max(10, min(20, (int) config('tasks.acknowledgement_reminder_minutes', 15)));
        $cutoff = now()->subMinutes($minutes);
        $notified = 0;

        TaskAssignmentHistory::query()
            ->whereNull('acknowledged_at')
            ->whereNull('unassigned_at')
            ->whereNull('reminder_sent_at')
            ->whereNotNull('employee_id')
            ->where('assigned_at', '<=', $cutoff)
            ->chunkById(100, function ($assignments) use ($cutoff, $minutes, &$notified): void {
                foreach ($assignments as $candidate) {
                    try {
                        $notified += (int) DB::transaction(function () use ($candidate, $cutoff, $minutes): bool {
                            // Use the same lock order as assignment / acknowledgement:
                            // task first, then history. This avoids racing an acknowledgement.
                            $task = Task::query()->whereKey($candidate->task_id)->lockForUpdate()->first();
                            if (! $task) return false;

                            // Row lock + notification write in the same transaction prevent
                            // multiple scheduler workers from sending duplicate reminders.
                            $assignment = TaskAssignmentHistory::query()
                                ->whereKey($candidate->id)
                                ->whereNull('acknowledged_at')
                                ->whereNull('unassigned_at')
                                ->whereNull('reminder_sent_at')
                                ->where('assigned_at', '<=', $cutoff)
                                ->lockForUpdate()
                                ->first();

                            if (! $assignment) return false;

                            // The current pivot is authoritative: a removed or acknowledged
                            // assignee must never cause a stale reminder.
                            $stillUnacknowledged = DB::table('task_assignees')
                                ->where('task_id', $assignment->task_id)
                                ->where('employee_id', $assignment->employee_id)
                                ->whereNull('acknowledged_at')
                                ->exists();

                            $task->load('creator');
                            $isClosed = in_array($task->status, [TaskStatus::Approved, TaskStatus::Cancelled], true);

                            if (! $stillUnacknowledged || ! $task->creator || $isClosed) {
                                $assignment->update(['reminder_sent_at' => now()]);
                                return false;
                            }

                            $task->creator->notify(new TaskAcknowledgementReminder($task, $assignment, $minutes));
                            $assignment->update(['reminder_sent_at' => now()]);

                            return true;
                        });
                    } catch (\Throwable $exception) {
                        Log::error('Task acknowledgement reminder failed', [
                            'assignment_history_id' => $candidate->id,
                            'error' => $exception->getMessage(),
                        ]);
                    }
                }
            });

        $this->info("Sent {$notified} acknowledgement reminder(s).");

        return self::SUCCESS;
    }
}
