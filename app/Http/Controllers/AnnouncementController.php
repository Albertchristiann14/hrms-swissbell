<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    public function index()
    {
        // Announcements addressed to HOD/Supervisors must not be disclosed to
        // regular employees. The frontend filters only the records received here.
        /** @var \App\Models\User $viewer */
        $viewer = Auth::user();
        $canViewRestrictedAnnouncements = $viewer->hasAnyRole([
            'Super Admin',
            'HRD / Admin',
            'General Manager',
            'Head of Department',
            'Supervisor',
        ]);

        $announcements = Announcement::with('creator')
            ->when(! $canViewRestrictedAnnouncements, function ($query) {
                $query->where('target_audience', 'All');
            })
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->get();

        return Inertia::render('Announcement/Index', [
            'announcements' => $announcements,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'target_audience' => 'required|string',
        ]);

        Announcement::create([
            'title' => $request->title,
            'message' => $request->message,
            'target_audience' => $request->target_audience,
            'created_by' => Auth::id(),
            'published_at' => now(),
        ]);

        return redirect()->back()->with('success', 'Announcement posted successfully.');
    }
}
