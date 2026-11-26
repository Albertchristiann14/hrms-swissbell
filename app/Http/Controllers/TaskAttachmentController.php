<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskAttachment;
use App\Services\TaskAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TaskAttachmentController extends Controller
{
    public function store(Request $request, Task $task)
    {
        $user = Auth::user();
        if (! TaskAccessService::canAccessTask($user, $task)) {
            abort(403, 'You do not have permission to attach files to this task.');
        }

        $request->validate([
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,webp,zip,csv,txt',
        ]);

        $employee = $user->employee;
        if (! $employee) {
            return back()->with('error', 'Only employees can upload attachments.');
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $fileSize = $file->getSize();

        // Store to private disk 'local'
        $path = $file->store('task_attachments', 'local');

        try {
            DB::transaction(function () use ($task, $employee, $path, $originalName, $fileSize) {
                $task->attachments()->create([
                    'employee_id' => $employee->id,
                    'file_name' => $originalName,
                    'file_path' => $path,
                    'file_size' => $fileSize,
                ]);

                $task->activities()->create([
                    'employee_id' => $employee->id,
                    'action' => 'attachment_uploaded',
                    'description' => "Uploaded attachment: {$originalName}",
                ]);
            });
        } catch (\Throwable $e) {
            if ($path && Storage::disk('local')->exists($path)) {
                Storage::disk('local')->delete($path);
            }
            throw $e;
        }

        return back()->with('success', 'Attachment uploaded.');
    }

    public function download(Request $request, TaskAttachment $attachment)
    {
        $task = $attachment->task;
        if (! $task || ! TaskAccessService::canAccessTask(Auth::user(), $task)) {
            abort(403, 'You do not have permission to access this attachment.');
        }

        $disk = 'local';
        if (! Storage::disk('local')->exists($attachment->file_path)) {
            if (Storage::disk('public')->exists($attachment->file_path)) {
                $disk = 'public';
            } else {
                abort(404, 'File lampiran tidak ditemukan di server penyimpanan.');
            }
        }

        $cleanName = basename($attachment->file_name ?: 'attachment');
        $safeName = preg_replace('/[^A-Za-z0-9_\-\. ]/', '_', $cleanName);
        $safeName = trim(preg_replace('/\s+/', ' ', $safeName)) ?: 'attachment';

        $extension = pathinfo($attachment->file_path, PATHINFO_EXTENSION);
        if ($extension && ! str_ends_with(strtolower($safeName), '.' . strtolower($extension))) {
            $safeName .= '.' . $extension;
        }

        $mime = Storage::disk($disk)->mimeType($attachment->file_path) ?: $attachment->file_type;
        $isImage = ($mime && str_starts_with($mime, 'image/')) ||
                   in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'], true);

        if ($request->boolean('download') || ! $isImage) {
            return Storage::disk($disk)->download($attachment->file_path, $safeName);
        }

        return Storage::disk($disk)->response($attachment->file_path, $safeName, [
            'Content-Type' => $mime ?: 'application/octet-stream',
        ], 'inline');
    }

    public function destroy(TaskAttachment $attachment)
    {
        $user = Auth::user();
        $isOwner = $user->employee && $user->employee->id === $attachment->employee_id;
        $isPrivileged = $user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager']);

        if (! $isOwner && ! $isPrivileged) {
            abort(403, 'You do not have permission to delete this attachment.');
        }

        $task = $attachment->task;
        $fileName = $attachment->file_name;
        $filePath = $attachment->file_path;
        $employeeId = $user->employee?->id;

        if ($filePath) {
            if (Storage::disk('local')->exists($filePath)) {
                Storage::disk('local')->delete($filePath);
            }
            if (Storage::disk('public')->exists($filePath)) {
                Storage::disk('public')->delete($filePath);
            }
        }

        $attachment->delete();

        if ($task) {
            $task->activities()->create([
                'employee_id' => $employeeId,
                'action' => 'attachment_deleted',
                'description' => "Deleted attachment: {$fileName}",
            ]);
        }

        return back()->with('success', 'Attachment deleted.');
    }
}
