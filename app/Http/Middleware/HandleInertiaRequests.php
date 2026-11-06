<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => fn () => $request->user() ? $request->user()->load(['roles', 'employee.department', 'employee.position']) : null,
                'canViewDepartmentTasks' => fn () => $request->user()?->hasAnyRole(['Super Admin', 'General Manager']) ?? false,
                'notifications' => function () use ($request) {
                    if (! $request->user()) {
                        return [];
                    }
                    \App\Services\TaskDeadlineService::checkAndNotifyForUser($request->user());
                    \App\Services\TaskAcknowledgementReminderService::checkAndNotifyForUser($request->user());
                    return $request->user()->unreadNotifications()->latest()->take(10)->get();
                },
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'info' => fn () => $request->session()->get('info'),
            ],
        ];
    }
}
