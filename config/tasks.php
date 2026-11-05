<?php

return [
    // Acknowledgement reminder window, adjustable between 10 and 20 minutes.
    'acknowledgement_reminder_minutes' => (int) env('TASK_ACKNOWLEDGEMENT_REMINDER_MINUTES', 15),
];
