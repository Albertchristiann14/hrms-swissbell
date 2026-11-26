<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskComment extends Model
{
    protected $fillable = [
        'task_id', 
        'employee_id', 
        'content', 
        'tagged_user_ids',
        'file_path',
        'file_name',
        'file_size',
        'file_type',
    ];

    protected $casts = [
        'tagged_user_ids' => 'array',
    ];

    protected $appends = ['file_url', 'is_image'];

    public function getFileUrlAttribute(): ?string
    {
        return $this->file_path && $this->id ? route('tasks.comments.attachments.download', $this->id) : null;
    }

    public function getIsImageAttribute(): bool
    {
        if (!$this->file_path) {
            return false;
        }

        $mime = $this->file_type ?? '';
        if (str_starts_with($mime, 'image/')) {
            return true;
        }

        $ext = strtolower(pathinfo($this->file_name ?? $this->file_path, PATHINFO_EXTENSION));
        return in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
