<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class TaskCommentController extends Controller
{
    /**
     * Check if user is authorized to interact with the task.
     */
    protected function canAccessTask($user, Task $task): bool
    {
        if ($user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager'])) {
            return true;
        }

        if ($task->created_by === $user->id) {
            return true;
        }

        $employee = $user->employee;
        if (! $employee) {
            return false;
        }

        if ($task->assignees()->where('employee_id', $employee->id)->exists()) {
            return true;
        }

        if ($task->project && ($task->project->created_by === $user->id || ($task->project->owner_id && $task->project->owner_id === $employee->id))) {
            return true;
        }

        if ($employee->department_id) {
            if ($task->assignees()->where('department_id', $employee->department_id)->exists()) {
                return true;
            }
            if ($task->project && $task->project->department_id === $employee->department_id) {
                return true;
            }
        }

        // Open/unassigned tasks with no restricted assignees or creator can be accessed by any active employee
        if (is_null($task->created_by) && ! $task->assignees()->exists()) {
            return true;
        }

        return false;
    }

    public function store(Request $request, Task $task)
    {
        $user = Auth::user();
        if (! $this->canAccessTask($user, $task)) {
            abort(403, 'You do not have permission to comment on this task.');
        }

        $validated = $request->validate([
            'content' => 'nullable|string|max:5000',
            'tagged_user_ids' => 'nullable|array',
            'tagged_user_ids.*' => 'integer|exists:users,id',
            'file' => 'nullable|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,webp,zip,csv,txt',
        ]);

        $content = trim($validated['content'] ?? '');
        $hasFile = $request->hasFile('file');

        if (empty($content) && !$hasFile) {
            return back()->withErrors(['content' => 'Please provide a comment message or attach a file.']);
        }

        $employee = $user->employee;
        if (! $employee) {
            return back()->with('error', 'Only employees can comment on tasks.');
        }

        $taggedUserIds = collect($validated['tagged_user_ids'] ?? [])
            ->map(fn($id) => (int)$id)
            ->all();

        // Auto-detect any @Name or @username mentioned in the text using regex
        if (!empty($content) && str_contains($content, '@')) {
            preg_match_all('/@([a-zA-Z0-9_.\-]+(?:\s+[a-zA-Z0-9_.\-]+)?)/u', $content, $matches);
            $rawCandidates = array_unique(array_filter(array_map('trim', $matches[1] ?? [])));
            if (!empty($rawCandidates)) {
                $matchedUserIds = \App\Models\User::query()
                    ->where(function ($query) use ($rawCandidates) {
                        foreach ($rawCandidates as $cand) {
                            $query->orWhereRaw('LOWER(name) = ?', [mb_strtolower($cand)])
                                  ->orWhereRaw('LOWER(username) = ?', [mb_strtolower($cand)]);
                        }
                    })
                    ->pluck('id')
                    ->all();
                foreach ($matchedUserIds as $uId) {
                    $taggedUserIds[] = (int) $uId;
                }
            }
        }

        // Deduplicate and filter out author so they don't notify themselves
        $currentUserId = (int)Auth::id();
        $taggedUserIds = array_values(array_unique(array_filter($taggedUserIds, fn($id) => $id !== $currentUserId)));

        $commentData = [
            'employee_id' => $employee->id,
            'content' => $content,
        ];

        if ($hasFile) {
            $file = $request->file('file');
            $path = $file->store('task_comment_attachments', 'public');
            if (\Illuminate\Support\Facades\Schema::hasColumn('task_comments', 'file_path')) {
                $commentData['file_path'] = $path;
                $commentData['file_name'] = $file->getClientOriginalName();
                $commentData['file_size'] = $file->getSize();
                $commentData['file_type'] = $file->getMimeType();
            }
        }

        // Guard against databases where migration has not run yet
        if (\Illuminate\Support\Facades\Schema::hasColumn('task_comments', 'tagged_user_ids')) {
            $commentData['tagged_user_ids'] = $taggedUserIds;
        }

        $comment = $task->comments()->create($commentData);

        // Send notification to tagged users and prepare activity name string
        $taggedNames = null;
        if (!empty($taggedUserIds)) {
            $usersToNotify = \App\Models\User::whereIn('id', $taggedUserIds)->get();
            if ($usersToNotify->isNotEmpty()) {
                try {
                    \Illuminate\Support\Facades\Notification::send(
                        $usersToNotify,
                        new \App\Notifications\CommentMentioned($task, $comment, Auth::user())
                    );
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Failed to dispatch comment mention notification: ' . $e->getMessage());
                }
                $taggedNames = $usersToNotify->pluck('name')->implode(', ');
            }
        }

        $descContent = !empty($content) ? '"' . \Illuminate\Support\Str::limit($content, 40) . '"' : '';
        $fileInfo = $hasFile ? '(Attached: ' . $commentData['file_name'] . ')' : '';
        $activityDesc = 'Added comment ' . trim($descContent . ' ' . $fileInfo);
        if ($taggedNames) {
            $activityDesc .= ' (Mentioned: ' . $taggedNames . ')';
        }

        $task->activities()->create([
            'employee_id' => $employee->id,
            'action' => 'comment_added',
            'description' => trim($activityDesc),
        ]);

        return back()->with('success', 'Comment added.');
    }

    public function destroy(TaskComment $comment)
    {
        $user = Auth::user();
        $isOwner = $user->employee && $user->employee->id === $comment->employee_id;
        $isPrivileged = $user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager']);

        if (! $isOwner && ! $isPrivileged) {
            abort(403, 'You do not have permission to delete this comment.');
        }

        $task = $comment->task;
        $employeeId = $user->employee?->id;

        if ($comment->file_path) {
            Storage::disk('public')->delete($comment->file_path);
        }

        $comment->delete();

        if ($task) {
            $task->activities()->create([
                'employee_id' => $employeeId,
                'action' => 'comment_deleted',
                'description' => 'Deleted comment',
            ]);
        }

        return back()->with('success', 'Comment deleted.');
    }
}
