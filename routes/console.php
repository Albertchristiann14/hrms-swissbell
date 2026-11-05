<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('master-keys:check-expiring')->dailyAt('08:00');

Schedule::command('tasks:remind-unacknowledged')->everyMinute()->withoutOverlapping(10);
