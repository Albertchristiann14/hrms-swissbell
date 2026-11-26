<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DocumentController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $query = Document::with(['uploader', 'department'])->orderBy('created_at', 'desc');

        // Non-privileged users can only see company-wide documents (department_id is null)
        // or documents belonging to their own department.
        if (! $user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager'])) {
            $employee = $user->employee;
            if (! $employee) {
                $documents = collect();
                return Inertia::render('Document/Index', ['documents' => $documents]);
            }

            $query->where(function ($q) use ($employee) {
                $q->whereNull('department_id');
                if ($employee->department_id) {
                    $q->orWhere('department_id', $employee->department_id);
                }
            });
        }

        $documents = $query->get();

        return Inertia::render('Document/Index', [
            'documents' => $documents,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        if (! $user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager'])) {
            abort(403, 'Akses terbatas untuk Administrator dan HRD.');
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'department_id' => 'nullable|exists:departments,id',
            'file' => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,webp,zip,csv,txt',
        ]);

        $file = $request->file('file');
        // Store in private disk 'local'
        $path = $file->store('documents', 'local');

        try {
            DB::transaction(function () use ($request, $path, $user) {
                Document::create([
                    'title' => $request->title,
                    'file_path' => $path,
                    'type' => $request->type,
                    'department_id' => $request->department_id,
                    'uploaded_by' => $user->id,
                ]);
            });
        } catch (\Throwable $e) {
            if ($path && Storage::disk('local')->exists($path)) {
                Storage::disk('local')->delete($path);
            }
            throw $e;
        }

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    public function download($id)
    {
        $document = Document::findOrFail($id);
        $user = Auth::user();

        if (! $user->hasAnyRole(['Super Admin', 'HRD / Admin', 'General Manager'])) {
            $employee = $user->employee;
            if (! $employee) {
                abort(403, 'Akses terbatas untuk karyawan aktif.');
            }

            // Department isolation: if document has department_id, employee must belong to that department
            if ($document->department_id && $employee->department_id !== $document->department_id) {
                abort(403, 'You do not have permission to access documents belonging to other departments.');
            }
        }

        // Verify file existence on private disk (with fallback to public for pre-migration files)
        $disk = 'local';
        if (! Storage::disk('local')->exists($document->file_path)) {
            if (Storage::disk('public')->exists($document->file_path)) {
                $disk = 'public';
            } else {
                abort(404, 'File dokumen tidak ditemukan di server penyimpanan.');
            }
        }

        // Sanitize download filename (never return raw internal filesystem path)
        $cleanTitle = basename($document->title);
        $sanitizedTitle = preg_replace('/[^A-Za-z0-9_\-\. ]/', '_', $cleanTitle);
        $sanitizedTitle = trim(preg_replace('/\s+/', ' ', $sanitizedTitle));
        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
        $downloadName = $sanitizedTitle ?: 'document';

        if ($extension && ! str_ends_with(strtolower($downloadName), '.' . strtolower($extension))) {
            $downloadName .= '.' . $extension;
        }

        return Storage::disk($disk)->download($document->file_path, $downloadName);
    }
}
