<?php

namespace App\Console\Commands;

use App\Services\TaskAcknowledgementReminderService;
use Illuminate\Console\Command;

class RemindUnacknowledgedTasks extends Command
{
    protected $signature = 'tasks:remind-unacknowledged';

    protected $description = 'Notify assigned employees and creators when an active assignment remains unacknowledged';

    public function handle(): int
    {
        $notified = TaskAcknowledgementReminderService::remindAll();

        $this->info("Sent {$notified} acknowledgement reminder(s).");

        return self::SUCCESS;
    }
}
