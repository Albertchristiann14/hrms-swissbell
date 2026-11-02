import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import OverviewTab from './Partials/OverviewTab';
import AttendanceDataTab from './Partials/AttendanceDataTab';
import ReportsTab from './Partials/ReportsTab';
import SettingsTab from './Partials/SettingsTab';
import AttendanceDetailModal from './Partials/AttendanceDetailModal';
import ManualCorrectionModal from './Partials/ManualCorrectionModal';

interface Props {
    attendances: any[];
    activeTab?: 'overview' | 'data' | 'reports' | 'settings';
    selectedDate: string;
    startDate: string;
    endDate: string;
    filters: {
        department_id?: string;
        employee_id?: string;
        shift_id?: string;
        status?: string;
        search?: string;
        tab?: string;
    };
    summary: {
        total_scheduled: number;
        total_clocked_in: number;
        total_on_time?: number;
        total_late: number;
        total_unclosed: number;
        total_missing_in?: number;
        total_needs_review?: number;
    };
    recentEvents?: any[];
    departmentStats?: any[];
    departments: Array<{ id: number; name: string }>;
    shifts: Array<{ id: number; name: string; code?: string; start_time: string; end_time: string; color?: string }>;
    employees: Array<{ id: number; user_id: number; employee_number: string; designation?: string; user?: { id: number; name: string } }>;
    location: any;
}

export default function AttendanceIndex({
    attendances,
    activeTab = 'data',
    selectedDate,
    startDate,
    endDate,
    filters = {} as any,
    summary,
    recentEvents = [],
    departmentStats = [],
    departments: rawDepartments = [],
    shifts: rawShifts = [],
    employees = [],
    location,
}: Props) {
    const departments = Array.isArray(rawDepartments)
        ? rawDepartments
        : (rawDepartments && typeof rawDepartments === 'object' && Array.isArray((rawDepartments as any).data)
            ? (rawDepartments as any).data
            : Object.values(rawDepartments || {}).filter((d: any) => d && typeof d === 'object' && 'id' in d));

    const shifts = Array.isArray(rawShifts)
        ? rawShifts
        : (rawShifts && typeof rawShifts === 'object' && Array.isArray((rawShifts as any).data)
            ? (rawShifts as any).data
            : Object.values(rawShifts || {}).filter((s: any) => s && typeof s === 'object' && 'id' in s));
    const [currentTab, setCurrentTab] = useState<'overview' | 'data' | 'reports' | 'settings'>(
        (filters?.tab as any) || activeTab || 'data'
    );
    const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<any | null>(null);
    const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<any | null>(null);

    const handleTabChange = (tab: 'overview' | 'data' | 'reports' | 'settings') => {
        setCurrentTab(tab);
        router.get(
            route('attendance.index'),
            {
                ...filters,
                tab,
                start_date: startDate,
                end_date: endDate,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleFilterChange = (newFilters: any) => {
        router.get(
            route('attendance.index'),
            {
                ...filters,
                ...newFilters,
                tab: currentTab,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleFilterByStatusFromOverview = (status: string) => {
        setCurrentTab('data');
        router.get(
            route('attendance.index'),
            {
                ...filters,
                status,
                tab: 'data',
                start_date: startDate,
                end_date: endDate,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleExportCsv = () => {
        const queryParams = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            ...(filters.department_id ? { department_id: filters.department_id } : {}),
            ...(filters.status ? { status: filters.status } : {}),
        });
        window.location.href = `${route('attendance.export')}?${queryParams.toString()}`;
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E31B23]"></span>
                            <h2 className="font-bold text-xl text-slate-900 tracking-tight">Time Management</h2>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-red-50 text-[#E31B23] border border-red-100">
                                HR Suite
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Swiss-Belinn SKA Pekanbaru &bull; Centralized Attendance Monitoring, GPS Geofencing & Work Scheduling
                        </p>
                    </div>

                    {/* Roster & Shift Master Quick Shortcuts */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => router.get(route('schedules.index'))}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Shift Roster</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => router.get(route('shifts.index'))}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Manage Shifts</span>
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Time Management - Attendance & Geofencing" />

            <div className="space-y-6">
                {/* Modern HRIS Suite Tab Navigation Bar (Mekari Talenta Style) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-1.5 flex flex-wrap items-center gap-1">
                    <button
                        type="button"
                        onClick={() => handleTabChange('overview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            currentTab === 'overview'
                                ? 'bg-[#E31B23] text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Overview</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('data')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            currentTab === 'data'
                                ? 'bg-[#E31B23] text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span>Attendance Data</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            currentTab === 'data' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {attendances.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('reports')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            currentTab === 'reports'
                                ? 'bg-[#E31B23] text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Reports & Analytics</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('settings')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            currentTab === 'settings'
                                ? 'bg-[#E31B23] text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Hotel Geofence Settings</span>
                    </button>
                </div>

                {/* Tab Content Display */}
                {currentTab === 'overview' && (
                    <OverviewTab
                        summary={summary as any}
                        startDate={startDate}
                        endDate={endDate}
                        filters={filters}
                        departments={departments}
                        departmentStats={departmentStats}
                        recentEvents={recentEvents}
                        shifts={shifts}
                        onFilterByStatus={handleFilterByStatusFromOverview}
                        onDateChange={(start, end) => handleFilterChange({ start_date: start, end_date: end })}
                        onDepartmentChange={(deptId) => handleFilterChange({ department_id: deptId })}
                    />
                )}

                {currentTab === 'data' && (
                    <AttendanceDataTab
                        attendances={attendances}
                        startDate={startDate}
                        endDate={endDate}
                        filters={filters}
                        summary={summary}
                        departments={departments}
                        shifts={shifts}
                        hotelLocation={location}
                        onFilterChange={handleFilterChange}
                        onOpenDetail={(record) => setSelectedRecordForDetail(record)}
                        onOpenCorrection={(record) => setSelectedRecordForCorrection(record)}
                        onExportCsv={handleExportCsv}
                    />
                )}

                {currentTab === 'reports' && (
                    <ReportsTab
                        startDate={startDate}
                        endDate={endDate}
                        filters={filters}
                        summary={summary}
                        departments={departments}
                        departmentStats={departmentStats}
                        shifts={shifts}
                        onFilterChange={handleFilterChange}
                        onExportCsv={handleExportCsv}
                    />
                )}

                {currentTab === 'settings' && (
                    <SettingsTab location={location} />
                )}
            </div>

            {/* Attendance Detail & Dual GPS Location Audit Modal */}
            <AttendanceDetailModal
                show={!!selectedRecordForDetail}
                onClose={() => setSelectedRecordForDetail(null)}
                record={selectedRecordForDetail}
                hotelLocation={location}
                onOpenCorrection={(record) => setSelectedRecordForCorrection(record)}
            />

            {/* HR Manual Administrative Correction Modal */}
            <ManualCorrectionModal
                show={!!selectedRecordForCorrection}
                onClose={() => setSelectedRecordForCorrection(null)}
                record={selectedRecordForCorrection}
            />
        </AuthenticatedLayout>
    );
}
