import React, { useState } from 'react';
import Badge from '@/Components/Badge';

interface AttendanceDataTabProps {
    attendances: any[];
    startDate: string;
    endDate: string;
    filters: any;
    summary: any;
    departments: Array<{ id: number; name: string }>;
    shifts: Array<{ id: number; name: string; code?: string; start_time: string; end_time: string; color?: string }>;
    hotelLocation: any;
    onFilterChange: (newFilters: any) => void;
    onOpenDetail: (record: any) => void;
    onOpenCorrection: (record: any) => void;
    onExportCsv: () => void;
}

export default function AttendanceDataTab({
    attendances,
    startDate,
    endDate,
    filters,
    summary,
    departments,
    shifts,
    hotelLocation,
    onFilterChange,
    onOpenDetail,
    onOpenCorrection,
    onExportCsv,
}: AttendanceDataTabProps) {
    const [search, setSearch] = useState(filters.search || '');
    const activeStatus = filters.status || '';

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFilterChange({ ...filters, search });
    };

    const handleStatusPillClick = (status: string) => {
        onFilterChange({ ...filters, status });
    };

    const handleClearFilters = () => {
        setSearch('');
        onFilterChange({
            department_id: '',
            shift_id: '',
            status: '',
            search: '',
        });
    };

    const deptList = Array.isArray(departments) 
        ? departments 
        : (departments && typeof departments === 'object' && Array.isArray((departments as any).data) 
            ? (departments as any).data 
            : Object.values(departments || {}).filter((d: any) => d && typeof d === 'object' && 'id' in d));

    const shiftList = Array.isArray(shifts)
        ? shifts
        : (shifts && typeof shifts === 'object' && Array.isArray((shifts as any).data)
            ? (shifts as any).data
            : Object.values(shifts || {}).filter((s: any) => s && typeof s === 'object' && 'id' in s));

    return (
        <div className="space-y-4">
            {/* Filter & Action Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Search Form */}
                    <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] max-w-md flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search employee name or NIP..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full text-xs rounded-xl border-slate-200 pl-9 pr-3 py-2 focus:ring-[#E31B23] focus:border-[#E31B23] shadow-2xs"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button
                            type="submit"
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors shrink-0"
                        >
                            Search
                        </button>
                    </form>

                    {/* Filter Selects & Export */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <select
                            value={filters.department_id || ''}
                            onChange={(e) => onFilterChange({ ...filters, department_id: e.target.value })}
                            className="text-xs rounded-xl border-slate-200 py-2 px-3 focus:ring-[#E31B23] focus:border-[#E31B23] text-slate-700 shadow-2xs"
                        >
                            <option value="">All Departments</option>
                            {deptList.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>

                        <select
                            value={filters.shift_id || ''}
                            onChange={(e) => onFilterChange({ ...filters, shift_id: e.target.value })}
                            className="text-xs rounded-xl border-slate-200 py-2 px-3 focus:ring-[#E31B23] focus:border-[#E31B23] text-slate-700 shadow-2xs"
                        >
                            <option value="">All Shifts</option>
                            {shiftList.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.code || s.start_time?.substring(0,5)})
                                </option>
                            ))}
                        </select>

                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2 py-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => onFilterChange({ ...filters, start_date: e.target.value })}
                                className="text-xs bg-transparent border-0 p-0 focus:ring-0 text-slate-800"
                            />
                            <span className="text-xs text-slate-400">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => onFilterChange({ ...filters, end_date: e.target.value })}
                                className="text-xs bg-transparent border-0 p-0 focus:ring-0 text-slate-800"
                            />
                        </div>

                        {(filters.department_id || filters.shift_id || filters.status || filters.search) && (
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 hover:underline"
                            >
                                Reset
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onExportCsv}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                            title="Export filtered records to CSV"
                        >
                            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Quick Status Filter Tabs / Chips */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleStatusPillClick('')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            activeStatus === ''
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        All Records ({attendances.length})
                    </button>

                    <button
                        type="button"
                        onClick={() => handleStatusPillClick('Present')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            activeStatus === 'Present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                    >
                        On Time ({summary.total_on_time ?? 0})
                    </button>

                    <button
                        type="button"
                        onClick={() => handleStatusPillClick('Late')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            activeStatus === 'Late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                    >
                        Late Arrivals ({summary.total_late ?? 0})
                    </button>

                    <button
                        type="button"
                        onClick={() => handleStatusPillClick('In Progress')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            activeStatus === 'In Progress'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                    >
                        Missing Clock-Out ({summary.total_unclosed ?? 0})
                    </button>

                    <button
                        type="button"
                        onClick={() => handleStatusPillClick('Needs Review')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            activeStatus === 'Needs Review'
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                    >
                        Needs Review ({summary.total_needs_review ?? 0})
                    </button>
                </div>
            </div>

            {/* Attendance Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3">Employee</th>
                                <th className="px-3 py-3">NIP</th>
                                <th className="px-3 py-3">Date</th>
                                <th className="px-3 py-3">Shift</th>
                                <th className="px-3 py-3">Schedule</th>
                                <th className="px-3 py-3 text-center">Clock In</th>
                                <th className="px-3 py-3 text-center">Clock Out</th>
                                <th className="px-3 py-3 text-center">Duration</th>
                                <th className="px-3 py-3">Status</th>
                                <th className="px-3 py-3">Location Verification</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {attendances.length > 0 ? (
                                attendances.map((item: any) => {
                                    const radiusLimit = hotelLocation?.radius_meters || 100;
                                    const clockInInRadius = item.clock_in_distance !== null && item.clock_in_distance !== undefined
                                        ? item.clock_in_distance <= radiusLimit
                                        : null;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                                            {/* Employee */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0">
                                                        {item.employee?.user?.name ? item.employee.user.name.charAt(0).toUpperCase() : 'E'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-900 truncate max-w-[170px]" title={item.employee?.user?.name}>
                                                            {item.employee?.user?.name || '-'}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 truncate max-w-[170px]">
                                                            {item.employee?.department?.name || 'Department -'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* NIP */}
                                            <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                                                {item.employee?.employee_number || '-'}
                                            </td>

                                            {/* Date */}
                                            <td className="px-3 py-3 whitespace-nowrap text-slate-800 font-medium">
                                                {item.date}
                                            </td>

                                            {/* Shift */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {item.shift ? (
                                                    <span
                                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-[11px]"
                                                        style={{
                                                            backgroundColor: item.shift.color ? `${item.shift.color}15` : '#f1f5f9',
                                                            color: item.shift.color || '#334155',
                                                            border: `1px solid ${item.shift.color ? `${item.shift.color}30` : '#e2e8f0'}`,
                                                        }}
                                                    >
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.shift.color || '#64748b' }} />
                                                        {item.shift.code || item.shift.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">Regular</span>
                                                )}
                                            </td>

                                            {/* Schedule In - Out */}
                                            <td className="px-3 py-3 whitespace-nowrap text-slate-500 tabular-nums">
                                                {item.shift ? `${item.shift.start_time.substring(0, 5)} - ${item.shift.end_time.substring(0, 5)}` : '-'}
                                            </td>

                                            {/* Actual Clock In */}
                                            <td className="px-3 py-3 whitespace-nowrap text-center tabular-nums">
                                                {item.clock_in ? (
                                                    <span className="font-bold text-slate-800">
                                                        {item.clock_in.substring(0, 5)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">--:--</span>
                                                )}
                                            </td>

                                            {/* Actual Clock Out */}
                                            <td className="px-3 py-3 whitespace-nowrap text-center tabular-nums">
                                                {item.clock_out ? (
                                                    <span className="font-bold text-slate-800">
                                                        {item.clock_out.substring(0, 5)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300">--:--</span>
                                                )}
                                            </td>

                                            {/* Worked Duration */}
                                            <td className="px-3 py-3 whitespace-nowrap text-center font-medium text-slate-700 tabular-nums">
                                                {item.worked_duration || '-'}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {item.is_late ? (
                                                    <Badge variant="warning">
                                                        Late ({item.late_duration_minutes}m)
                                                    </Badge>
                                                ) : item.status === 'Present' ? (
                                                    <Badge variant="success">
                                                        On Time
                                                    </Badge>
                                                ) : item.status === 'In Progress' ? (
                                                    <Badge variant="info">
                                                        In Progress
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="danger">
                                                        {item.status}
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Location Verification */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {item.clock_in_distance !== null && item.clock_in_distance !== undefined ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                clockInInRadius
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            }`}
                                                            title={`Clock-In Distance: ${item.clock_in_distance}m (Radius: ${radiusLimit}m)`}
                                                        >
                                                            {clockInInRadius ? '✓ Hotel' : '✗ Outside'} ({item.clock_in_distance}m)
                                                        </span>
                                                        {item.clock_in_accuracy && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                ±{item.clock_in_accuracy}m
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px]">-</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenDetail(item)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                        title="View Geofence & Audit Detail"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenCorrection(item)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                                        title="Manual Correction by HR"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={11} className="py-12 text-center text-slate-400">
                                        <div className="max-w-sm mx-auto space-y-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                </svg>
                                            </div>
                                            <p className="font-bold text-slate-700 text-xs">No attendance records found</p>
                                            <p className="text-[11px] text-slate-400">Try adjusting your date range, department, or status filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
