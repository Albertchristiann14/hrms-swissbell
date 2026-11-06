<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => false,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        \Log::info('Profile Update Request:', [
            'hasFile' => $request->hasFile('photo'),
            'file' => $request->file('photo'),
            'error' => $request->file('photo') ? $request->file('photo')->getError() : null,
            'all' => $request->all()
        ]);
        
        $validated = $request->validated();
        $request->user()->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if (isset($validated['phone_number'])) {
            $request->user()->phone_number = $validated['phone_number'];
        }

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        if ($request->hasFile('photo')) {
            if ($request->user()->profile_photo_path) {
                Storage::disk('public')->delete($request->user()->profile_photo_path);
            }

            $file = $request->file('photo');
            $saved = false;

            if (extension_loaded('gd')) {
                try {
                    $source = @imagecreatefromstring(file_get_contents($file->getRealPath()));
                    if ($source !== false) {
                        $origW = imagesx($source);
                        $origH = imagesy($source);
                        $targetSize = 360;

                        // Crop center square
                        $minEdge = min($origW, $origH);
                        $srcX = (int) (($origW - $minEdge) / 2);
                        $srcY = (int) (($origH - $minEdge) / 2);

                        $dst = imagecreatetruecolor($targetSize, $targetSize);
                        imagecopyresampled($dst, $source, 0, 0, $srcX, $srcY, $targetSize, $targetSize, $minEdge, $minEdge);

                        $filename = Str::random(40) . '.webp';
                        $path = 'profile-photos/' . $filename;

                        ob_start();
                        imagewebp($dst, null, 85);
                        $optimized = ob_get_clean();

                        imagedestroy($source);
                        imagedestroy($dst);

                        Storage::disk('public')->put($path, $optimized);
                        $request->user()->profile_photo_path = $path;
                        $saved = true;
                    }
                } catch (\Throwable $e) {
                    \Log::warning('Profile photo optimization failed, falling back to default upload: ' . $e->getMessage());
                }
            }

            if (!$saved) {
                $path = $file->store('profile-photos', 'public');
                $request->user()->profile_photo_path = $path;
            }
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
