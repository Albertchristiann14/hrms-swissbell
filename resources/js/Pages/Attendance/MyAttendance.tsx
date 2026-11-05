import React, { useState, useEffect, useCallback } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import Badge from '@/Components/Badge';

interface AttendanceItem {
    id: number;
    date: string;
    clock_in: string | null;
    clock_out: string | null;
    status: string;
    late_duration_minutes: number;
    overtime_minutes: number;
    clock_in_distance?: number | null;
    source?: string;
    notes?: string | null;
    shift?: {
        id: number;
        name: string;
        code?: string;
        start_time: string;
        end_time: string;
        color?: string;
    } | null;
}

interface LocationConfig {
    name: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    min_accuracy_meters: number;
    is_active: boolean;
}

interface ShiftContext {
    shift: {
        id: number;
        name: string;
        code?: string;
        start_time: string;
        end_time: string;
        is_overnight?: boolean;
        late_tolerance_minutes?: number;
    } | null;
    work_date: string;
    can_clock_in: boolean;
    can_clock_out: boolean;
    clock_in_window_start: string | null;
    clock_in_window_end: string | null;
    clock_out_window_start: string | null;
    clock_out_window_end: string | null;
    reason: string | null;
}

interface Props {
    attendances: AttendanceItem[];
    selectedMonth: string;
    todayAttendance: AttendanceItem | null;
    serverTime: string;
    serverTimeString: string;
    location: LocationConfig;
    shiftContext: ShiftContext;
    errors?: any;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function MyAttendance({
    attendances,
    selectedMonth,
    todayAttendance,
    serverTime,
    serverTimeString,
    location,
    shiftContext,
}: Props) {
    const openedFromHr = new URLSearchParams(usePage().url.split('?')[1] || '').get('source') === 'hr';

    // Live Server Clock: run only while this browser tab is visible.
    // On return, calculate elapsed real time to avoid losing seconds while paused.
    const [currentTime, setCurrentTime] = useState<Date>(new Date(serverTime || Date.now()));

    useEffect(() => {
        const initialTimestamp = new Date(serverTime || Date.now()).getTime();
        const startedAt = Date.now();
        let timer: ReturnType<typeof setInterval> | undefined;

        const updateClock = () => setCurrentTime(new Date(initialTimestamp + Date.now() - startedAt));
        const syncVisibility = () => {
            if (timer !== undefined) {
                clearInterval(timer);
                timer = undefined;
            }
            if (document.visibilityState === 'visible') {
                updateClock();
                timer = setInterval(updateClock, 1000);
            }
        };

        syncVisibility();
        document.addEventListener('visibilitychange', syncVisibility);

        return () => {
            if (timer !== undefined) clearInterval(timer);
            document.removeEventListener('visibilitychange', syncVisibility);
        };
    }, [serverTime]);

    // Geolocation state
    const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
    const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
    const [geoError, setGeoError] = useState<string | null>(null);
    const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

    // Form submission for Clock-in / Clock-out
    const { data, setData, post, processing, errors, reset } = useForm({
        latitude: '' as string | number,
        longitude: '' as string | number,
        accuracy: '' as string | number,
        notes: '',
    });

    // Haversine calculation for client preview
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // meters
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 100) / 100;
    };

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setGeoStatus('error');
            setGeoError('Geolocation is not supported by your browser.');
            return;
        }

        setGeoStatus('requesting');
        setGeoError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const acc = Math.round(pos.coords.accuracy * 10) / 10;

                setCoords({ latitude: lat, longitude: lon, accuracy: acc });
                setGeoStatus('granted');

                const dist = calculateDistance(lat, lon, location.latitude, location.longitude);
                setDistanceMeters(dist);

                setData({
                    ...data,
                    latitude: lat,
                    longitude: lon,
                    accuracy: acc,
                });
            },
            (err) => {
                setGeoStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
                let message = 'Failed to retrieve GPS location.';
                if (err.code === err.PERMISSION_DENIED) {
                    message = 'Location permission was denied. Please allow location access in your browser settings to perform attendance.';
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    message = 'GPS position is currently unavailable. Please verify GPS is enabled on your device.';
                } else if (err.code === err.TIMEOUT) {
                    message = 'Location request timed out. Please try again.';
                }
                setGeoError(message);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }, [location.latitude, location.longitude]);

    // Request GPS once the attendance page is visible, not in a background tab.
    useEffect(() => {
        let hasRequested = false;
        const requestWhenVisible = () => {
            if (!hasRequested && document.visibilityState === 'visible') {
                hasRequested = true;
                requestLocation();
            }
        };

        requestWhenVisible();
        document.addEventListener('visibilitychange', requestWhenVisible);

        return () => document.removeEventListener('visibilitychange', requestWhenVisible);
    }, [requestLocation]);

    // Validation helpers
    const isInsideGeofence = distanceMeters !== null && distanceMeters <= location.radius_meters;
    const isAccuracyAcceptable = coords !== null && (location.min_accuracy_meters === 0 || coords.accuracy <= location.min_accuracy_meters);
    const isLocationReady = geoStatus === 'granted' && coords !== null && isInsideGeofence && isAccuracyAcceptable;

    const handleClockIn = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLocationReady) return;

        post(route('attendance.clockIn'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('notes');
            },
        });
    };

    const handleClockOut = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLocationReady) return;

        post(route('attendance.clockOut'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('notes');
            },
        });
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.get(route('attendance.my'), { month: e.target.value }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Present':
                return <Badge variant="success" dot>Present</Badge>;
            case 'Late':
                return <Badge variant="warning" dot>Late</Badge>;
            case 'Absent':
                return <Badge variant="danger" dot>Absent</Badge>;
            case 'Leave':
                return <Badge variant="info" dot>Leave</Badge>;
            default:
                return <Badge variant="neutral" dot>{status}</Badge>;
        }
    };

    const formatTimeDisplay = (date: Date) => {
        return date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <nav className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500" aria-label="Breadcrumb">
                            <Link href={route('dashboard', { view: openedFromHr ? 'hr' : 'overview' })} className="hover:text-[#E31B23]">
                                {openedFromHr ? 'Human Resources' : 'My Workspace'}
                            </Link>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-800">My Attendance</span>
                        </nav>
                        <h2 className="font-bold text-xl text-slate-900 tracking-tight">My Attendance & Geofencing</h2>
                        <p className="text-xs text-slate-500">Live GPS hotel check-in and shift attendance tracking.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-xl shadow-xs text-xs font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{formatTimeDisplay(currentTime)} WIB</span>
                    </div>
                </div>
            }
        >
            <Head title="My Attendance" />

            <div className="w-full">
                <div className="w-full space-y-4">

                    {/* Server Error / Success Alerts */}
                    {(errors as any)?.message && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-sm text-rose-800 animate-in fade-in">
                            <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <span className="font-semibold block">Attendance Verification Notice:</span>
                                <span>{(errors as any).message}</span>
                            </div>
                        </div>
                    )}

                    {/* TOP GRID: Shift Context & Live Geofencing Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Card 1: Shift & Time Windows */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                                            {shiftContext.shift?.code || 'SH'}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                {shiftContext.shift?.name || 'Standard Hotel Shift'}
                                            </h3>
                                            <span className="text-[11px] text-slate-500">
                                                Work Date: {shiftContext.work_date}
                                            </span>
                                        </div>
                                    </div>
                                    {shiftContext.shift?.is_overnight && (
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold rounded-full">
                                            Overnight Shift
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Shift Hours</span>
                                        <span className="font-mono font-bold text-slate-900 text-sm">
                                            {shiftContext.shift?.start_time ? shiftContext.shift.start_time.substring(0, 5) : '08:00'} - {shiftContext.shift?.end_time ? shiftContext.shift.end_time.substring(0, 5) : '17:00'} WIB
                                        </span>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Grace Period</span>
                                        <span className="font-semibold text-slate-700">
                                            {shiftContext.shift?.late_tolerance_minutes || 0} Minutes Tolerance
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                                        <span className="font-medium">Clock-In Window:</span>
                                        <span className="font-mono font-bold">
                                            {shiftContext.clock_in_window_start || '07:00'} - {shiftContext.clock_in_window_end || '09:00'} WIB
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-900">
                                        <span className="font-medium">Clock-Out Window:</span>
                                        <span className="font-mono font-bold">
                                            {shiftContext.clock_out_window_start || '16:30'} - {shiftContext.clock_out_window_end || '20:00'} WIB
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Today's Record Summary */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Today's Punctuality:</span>
                                {todayAttendance ? (
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(todayAttendance.status)}
                                        {todayAttendance.late_duration_minutes > 0 && (
                                            <span className="text-[11px] text-rose-600 font-semibold">
                                                (+{todayAttendance.late_duration_minutes}m)
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic">Not Clocked In</span>
                                )}
                            </div>
                        </div>

                        {/* Card 2: GPS Geofencing Status */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">{location.name}</h3>
                                        <p className="text-[11px] text-slate-500">
                                            Target: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={requestLocation}
                                        disabled={geoStatus === 'requesting'}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                                    >
                                        <svg className={`w-3.5 h-3.5 ${geoStatus === 'requesting' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Refresh GPS
                                    </button>
                                </div>

                                {geoStatus === 'requesting' && (
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center text-xs text-blue-700">
                                        <div className="inline-block animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mb-1"></div>
                                        <div>Contacting device GPS satellites for high-accuracy location...</div>
                                    </div>
                                )}

                                {geoError && (
                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 mb-3">
                                        {geoError}
                                    </div>
                                )}

                                {coords && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Your Distance</span>
                                                <span className={`font-mono font-bold text-sm ${isInsideGeofence ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {distanceMeters !== null ? `${distanceMeters} meters` : '-'}
                                                </span>
                                            </div>
                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-slate-400 block text-[10px] uppercase font-semibold">GPS Accuracy</span>
                                                <span className={`font-mono font-bold text-sm ${isAccuracyAcceptable ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                    ±{coords.accuracy} meters
                                                </span>
                                            </div>
                                        </div>

                                        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                                            isInsideGeofence
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                : 'bg-rose-50 border-rose-200 text-rose-800'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${isInsideGeofence ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                <span className="font-semibold">
                                                    {isInsideGeofence ? 'Inside Hotel Perimeter' : 'Outside Hotel Perimeter'}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-mono">
                                                Radius: {location.radius_meters}m
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Geofence notice */}
                            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                                Attendance buttons activate automatically when inside the {location.radius_meters}m hotel geofence.
                            </div>
                        </div>
                    </div>

                    {/* ATTENDANCE ACTION PANEL: CLOCK IN / CLOCK OUT */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Attendance Action</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Record your check-in or check-out for today's work shift.
                                </p>
                            </div>

                            {/* Status Indicators */}
                            <div className="flex items-center gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clock In</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {todayAttendance?.clock_in ? todayAttendance.clock_in.substring(0, 5) : '--:--'}
                                    </span>
                                </div>
                                <div className="w-px h-8 bg-slate-200"></div>
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clock Out</span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {todayAttendance?.clock_out ? todayAttendance.clock_out.substring(0, 5) : '--:--'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Clock In / Out Buttons */}
                        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
                            {/* Action Form */}
                            {(!todayAttendance || !todayAttendance.clock_in) ? (
                                <form onSubmit={handleClockIn} className="w-full flex flex-col sm:flex-row items-center gap-4">
                                    <input
                                        type="text"
                                        placeholder="Optional check-in notes (e.g. morning briefing)..."
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        className="w-full text-xs rounded-xl border-slate-200 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                        disabled={processing}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!isLocationReady || processing || !shiftContext.can_clock_in}
                                        className={`w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white shadow-xs transition-all ${
                                            isLocationReady && shiftContext.can_clock_in && !processing
                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 cursor-pointer shadow-emerald-200'
                                                : 'bg-slate-300 cursor-not-allowed text-slate-500'
                                        }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        {processing ? 'Recording Clock In...' : 'Clock In Now'}
                                    </button>
                                </form>
                            ) : (!todayAttendance.clock_out) ? (
                                <form onSubmit={handleClockOut} className="w-full flex flex-col sm:flex-row items-center gap-4">
                                    <input
                                        type="text"
                                        placeholder="Optional check-out handover notes..."
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        className="w-full text-xs rounded-xl border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        disabled={processing}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!isLocationReady || processing || !shiftContext.can_clock_out}
                                        className={`w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white shadow-xs transition-all ${
                                            isLocationReady && shiftContext.can_clock_out && !processing
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 cursor-pointer shadow-blue-200'
                                                : 'bg-slate-300 cursor-not-allowed text-slate-500'
                                        }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        {processing ? 'Recording Clock Out...' : 'Clock Out Now'}
                                    </button>
                                </form>
                            ) : (
                                <div className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-semibold">Shift Completed! Both Clock In and Clock Out are recorded for today.</span>
                                    </div>
                                    <span className="font-mono font-bold">
                                        {todayAttendance.clock_in?.substring(0, 5)} - {todayAttendance.clock_out?.substring(0, 5)} WIB
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Helper validation messages */}
                        {!isLocationReady && (
                            <div className="mt-3 text-[11px] text-amber-600 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    {!coords
                                        ? 'Please allow GPS location access to enable attendance buttons.'
                                        : !isInsideGeofence
                                        ? `You are currently ${distanceMeters}m away. Move within ${location.radius_meters}m of Swiss-Belinn SKA Pekanbaru to check in.`
                                        : `GPS accuracy (±${coords.accuracy}m) is lower than required (±${location.min_accuracy_meters}m). Please move near a window or outdoors.`}
                                </span>
                            </div>
                        )}
                        {isLocationReady && (!shiftContext.can_clock_in && !todayAttendance?.clock_in) && (
                            <div className="mt-3 text-[11px] text-amber-600 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    {shiftContext.reason === 'clock_in_too_early'
                                        ? `Clock-in window opens at ${shiftContext.clock_in_window_start} WIB.`
                                        : shiftContext.reason === 'clock_in_window_passed'
                                        ? `Clock-in window expired at ${shiftContext.clock_in_window_end} WIB. Please consult HRD.`
                                        : 'Currently outside the permitted check-in window.'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* MONTHLY ATTENDANCE HISTORY TABLE */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Attendance History</h3>
                                <p className="text-xs text-slate-500">Your verified check-in records and punctuality log.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-semibold text-slate-700">Month:</label>
                                <input
                                    type="month"
                                    className="rounded-xl border-slate-200 text-xs shadow-2xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                    value={selectedMonth}
                                    onChange={handleMonthChange}
                                />
                            </div>
                        </div>

                        {attendances && attendances.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3">Work Date</th>
                                            <th className="px-5 py-3">Shift</th>
                                            <th className="px-5 py-3 text-center">Clock In</th>
                                            <th className="px-5 py-3 text-center">Clock Out</th>
                                            <th className="px-5 py-3 text-center">Status</th>
                                            <th className="px-5 py-3 text-center">Late / OT</th>
                                            <th className="px-5 py-3">GPS Distance</th>
                                            <th className="px-5 py-3">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {attendances.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                                    {new Date(item.date).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                                                    {item.shift ? (
                                                        <span className="font-semibold text-slate-800">
                                                            {item.shift.name} {item.shift.code ? `(${item.shift.code})` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Regular</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-center font-mono font-bold text-slate-800">
                                                    {item.clock_in ? item.clock_in.substring(0, 5) : '-'}
                                                </td>
                                                <td className="px-5 py-3 text-center font-mono font-bold text-slate-800">
                                                    {item.clock_out ? item.clock_out.substring(0, 5) : '-'}
                                                </td>
                                                <td className="px-5 py-3 text-center whitespace-nowrap">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="px-5 py-3 text-center tabular-nums">
                                                    {item.late_duration_minutes > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                                                            {item.late_duration_minutes}m late
                                                        </span>
                                                    ) : item.overtime_minutes > 0 ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                            {item.overtime_minutes}m OT
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                                    {item.clock_in_distance !== undefined && item.clock_in_distance !== null
                                                        ? `${item.clock_in_distance}m from Hotel`
                                                        : (item.source || '-')}
                                                </td>
                                                <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
                                                    {item.notes || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs">
                                No attendance records found for {selectedMonth}.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
