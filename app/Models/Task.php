<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Observers\TaskObserver;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[ObservedBy([TaskObserver::class])]
class Task extends Model
{
    protected $fillable = [
        'title',
        'description',
        'project_id',
        'created_by',
        'priority',
        'deadline',
        'status',
        'start_date',
        'estimated_duration',
    ];

    protected $casts = [
        'status' => TaskStatus::class,
        'priority' => TaskPriority::class,
        'deadline' => 'date',
        'start_date' => 'date',
    ];

    protected static function booted(): void
    {
        static::saved(function (Task $task) {
            if ($task->project_id) {
                $task->project?->recalculateProgress();
            }

            if ($task->wasChanged('project_id') && ($oldProjectId = $task->getOriginal('project_id'))) {
                Project::find($oldProjectId)?->recalculateProgress();
            }
        });

        static::deleted(function (Task $task) {
            if ($task->project_id) {
                $task->project?->recalculateProgress();
            }
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'task_assignees', 'task_id', 'employee_id')
            ->withPivot('acknowledged_at')
            ->withTimestamps();
    }

    public function assignmentHistories(): HasMany
    {
        return $this->hasMany(TaskAssignmentHistory::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    public function checklists(): HasMany
    {
        return $this->hasMany(TaskChecklist::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(TaskActivity::class)->latest();
    }

    public function latestActivity(): HasOne
    {
        return $this->hasOne(TaskActivity::class)->latestOfMany();
    }
}
