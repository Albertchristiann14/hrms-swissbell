<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Position;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PositionController extends Controller
{
    /**
     * Display a listing of positions with department and search filters.
     */
    public function index(Request $request)
    {
        $query = Position::with('department:id,name')->withCount('employees');

        if ($departmentId = $request->input('department_id')) {
            $query->where('department_id', $departmentId);
        }

        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        if ($search = trim((string) $request->input('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $positions = $query
            ->orderBy('department_id')
            ->orderBy('name')
            ->get();

        return Inertia::render('Organization/Positions', [
            'positions' => $positions,
            'departments' => Department::getCachedList(),
            'filters' => $request->only(['department_id', 'status', 'search']),
        ]);
    }

    /**
     * Store a newly created position in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('positions', 'name')->where('department_id', $request->input('department_id')),
            ],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
        ], [
            'name.unique' => 'This position name already exists in the selected department.',
        ]);

        Position::create([
            'department_id' => $validated['department_id'],
            'name' => trim($validated['name']),
            'code' => isset($validated['code']) && trim($validated['code']) !== '' ? trim($validated['code']) : null,
            'description' => isset($validated['description']) && trim($validated['description']) !== '' ? trim($validated['description']) : null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()->back()->with('success', 'Position created successfully.');
    }

    /**
     * Update the specified position in storage.
     */
    public function update(Request $request, Position $position)
    {
        $validated = $request->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('positions', 'name')
                    ->where('department_id', $request->input('department_id'))
                    ->ignore($position->id),
            ],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['boolean'],
        ], [
            'name.unique' => 'This position name already exists in the selected department.',
        ]);

        if ((int) $validated['department_id'] !== (int) $position->department_id && $position->employees()->exists()) {
            return redirect()->back()->withErrors([
                'department_id' => 'Cannot change the department of a position currently assigned to employees.',
            ]);
        }

        $position->update([
            'department_id' => $validated['department_id'],
            'name' => trim($validated['name']),
            'code' => isset($validated['code']) && trim($validated['code']) !== '' ? trim($validated['code']) : null,
            'description' => isset($validated['description']) && trim($validated['description']) !== '' ? trim($validated['description']) : null,
            'is_active' => $validated['is_active'] ?? $position->is_active,
        ]);

        return redirect()->back()->with('success', 'Position updated successfully.');
    }

    /**
     * Toggle active status of a position.
     */
    public function toggleStatus(Position $position)
    {
        $position->update([
            'is_active' => ! $position->is_active,
        ]);

        $statusLabel = $position->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Position {$statusLabel} successfully.");
    }

    /**
     * Remove the specified position from storage when safe.
     */
    public function destroy(Position $position)
    {
        if ($position->employees()->exists()) {
            return redirect()->back()->with('error', 'Cannot delete a position currently assigned to employees. Deactivate it instead.');
        }

        $position->delete();

        return redirect()->back()->with('success', 'Position deleted successfully.');
    }
}
