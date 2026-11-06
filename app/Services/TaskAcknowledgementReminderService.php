<?php

namespace App\Services;

use App\Enums\TaskStatus;
use App\Models\Employee;
use App\Models\Task;
use App\Models\TaskAssignmentHistory;
use App\Models\User;
use App\Notifications\TaskAcknowledgementReminder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TaskAcknowledgementReminderService
{
    /**
     * Send reminders for all eligible unacknowledged assignments.
     */
    public static function remindAll(): int
    {
        $minutes = max(1, min(60, (int) config('tasks.acknowledgement_reminder_minutes', 15)));
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
                        if (self::processCandidate($candidate, $cutoff, $minutes)) {
                            $notified++;
                        }
                    } catch (\Throwable $exception) {
                        Log::error('Task acknowledgement reminder failed', [
                            'assignment_history_id' => $candidate->id,
                            'error' => $exception->getMessage(),
                        ]);
                    }
                }
            });

        return $notified;
    }

    /**
     * Check and dispatch reminders for tasks associated with a specific user (on page load/request).
     * Throttled with cache to prevent redundant database roundtrips.
     */
    public static function checkAndNotifyForUser(?User $user): void
    {
        if (! $user) {
            return;
        }

        $cacheKey = "user_ack_reminder_check_{$user->id}";
        if (Cache::has($cacheKey)) {
            return;
        }

        try {
            $minutes = max(1, min(60, (int) config('tasks.acknowledgement_reminder_minutes', 15)));
            $cutoff = now()->subMinutes($minutes);
            $employeeId = $user->employee?->id;

            $candidates = TaskAssignmentHistory::query()
                ->whereNull('acknowledged_at')
                ->whereNull('unassigned_at')
                ->whereNull('reminder_sent_at')
                ->whereNotNull('employee_id')
                ->where('assigned_at', '<=', $cutoff)
                ->where(function ($query) use ($user, $employeeId) {
                    if ($employeeId) {
                        $query->where('employee_id', $employeeId);
                    }
                    $query->orWhereHas('task', fn ($tq) => $tq->where('created_by', $user->id));
                })
                ->limit(20)
                ->get();

            foreach ($candidates as $candidate) {
                self::processCandidate($candidate, $cutoff, $minutes);
            }

            Cache::put($cacheKey, true, now()->addMinutes(2));
        } catch (\Throwable $e) {
            Log::warning('TaskAcknowledgementReminderService user check failed: ' . $e->getMessage());
        }
    }

    /**
     * Process an individual assignment history candidate in a safe transaction with row locks.
     */
    public static function processCandidate(TaskAssignmentHistory $candidate, $cutoff, int $minutes): bool
    {
        return (bool) DB::transaction(function () use ($candidate, $cutoff, $minutes): bool {
            $task = Task::query()->whereKey($candidate->task_id)->lockForUpdate()->first();
            if (! $task) {
                return false;
            }

            $assignment = TaskAssignmentHistory::query()
                ->whereKey($candidate->id)
                ->whereNull('acknowledged_at')
                ->whereNull('unassigned_at')
                ->whereNull('reminder_sent_at')
                ->where('assigned_at', '<=', $cutoff)
                ->lockForUpdate()
                ->first();

            if (! $assignment) {
                return false;
            }

            $stillUnacknowledged = DB::table('task_assignees')
                ->where('task_id', $assignment->task_id)
                ->where('employee_id', $assignment->employee_id)
                ->whereNull('acknowledged_at')
                ->exists();

            $task->load('creator');
            $isClosed = in_array($task->status, [TaskStatus::Approved, TaskStatus::Cancelled], true);

            if (! $stillUnacknowledged || $isClosed) {
                $assignment->update(['reminder_sent_at' => now()]);
                return false;
            }

            // Load assigned employee user
            $employee = Employee::with('user')->find($assignment->employee_id);
            $hasNotified = false;

            // 1. Notify the assigned employee so they know they must acknowledge or decline
            if ($employee && $employee->user) {
                $employee->user->notify(new TaskAcknowledgementReminder($task, $assignment, $minutes, 'assignee'));
                $hasNotified = true;
            }

            // 2. Notify the creator (if different from assignee) so they are aware the assignee hasn't acknowledged
            if ($task->creator && (! $employee || $task->creator->id !== $employee->user_id)) {
                $task->creator->notify(new TaskAcknowledgementReminder($task, $assignment, $minutes, 'creator'));
                $hasNotified = true;
            }

            $assignment->update(['reminder_sent_at' => now()]);

            return $hasNotified;
        });
    }
}

