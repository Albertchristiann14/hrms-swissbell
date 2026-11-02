<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'start_time',
        'end_time',
        'clock_in_window_start',
        'clock_in_window_end',
        'clock_out_window_start',
        'clock_out_window_end',
        'is_overnight',
        'late_tolerance_minutes',
        'is_active',
        'color',
    ];

    protected $casts = [
        'is_overnight' => 'boolean',
        'is_active' => 'boolean',
        'late_tolerance_minutes' => 'integer',
    ];

    public function workSchedules()
    {
        return $this->hasMany(WorkSchedule::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Check if this shift runs overnight (crosses midnight).
     */
    public function isOvernightShift(): bool
    {
        if ($this->is_overnight) {
            return true;
        }

        if ($this->start_time && $this->end_time) {
            return $this->end_time < $this->start_time;
        }

        return false;
    }

    public static function getCachedActiveList()
    {
        return static::where('is_active', true)
            ->select('id', 'name', 'code', 'start_time', 'end_time', 'color', 'is_overnight')
            ->get();
    }

    public static function clearCache(): void
    {
        \Illuminate\Support\Facades\Cache::forget('shifts_cached_active_list');
    }

    protected static function booted(): void
    {
        static::saved(fn () => static::clearCache());
        static::deleted(fn () => static::clearCache());
    }
}
