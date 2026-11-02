import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';

interface Department {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
}

interface Employee {
    id: number;
    user_id: number;
    department_id: number;
    designation: string;
    employee_number: string;
    user: User;
    department?: Department;
}

interface Shift {
    id: number;
    name: string;
    code: string;
    start_time: string;
    end_time: string;
    color: string;
    is_overnight?: boolean;
    is_active?: boolean;
}

interface WorkScheduleItem {
    id: number;
    employee_id: number;
    shift_id: number;
    date: string; // 'YYYY-MM-DD'
    shift: Shift;
    employee?: Employee;
}

interface Props {
    schedules: WorkScheduleItem[];
    employees: Employee[];
    shifts: Shift[];
    departments: Department[];
    selectedDepartmentId?: number | null;
    startDate: string;
    endDate: string;
}

export default function ScheduleIndex({
    schedules = [],
    employees = [],
    shifts: rawShifts = [],
    departments = [],
    selectedDepartmentId = null,
    startDate,
    endDate,
}: Props) {
    const { flash, errors: pageErrors } = usePage().props as any;

    const shifts: Shift[] = Array.isArray(rawShifts)
        ? rawShifts
        : (rawShifts && typeof rawShifts === 'object' && Array.isArray((rawShifts as any).data)
            ? (rawShifts as any).data
            : Object.values(rawShifts || {}).filter((s: any) => s && typeof s === 'object' && 'id' in s) as Shift[]);

    const deptList = Array.isArray(departments) 
        ? departments 
        : (departments && typeof departments === 'object' && Array.isArray((departments as any).data) 
            ? (departments as any).data 
            : Object.values(departments || {}).filter((d: any) => d && typeof d === 'object' && 'id' in d));

    // Filter and search state
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDeptFilter, setActiveDeptFilter] = useState<string>(
        selectedDepartmentId ? String(selectedDepartmentId) : ''
    );

    // Modal states
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');

    // Bulk modal state
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkSelectedShiftId, setBulkSelectedShiftId] = useState<string>('');
    const [bulkSelectedEmployeeIds, setBulkSelectedEmployeeIds] = useState<number[]>([]);
    const [bulkSelectedDates, setBulkSelectedDates] = useState<string[]>([]);
    const [bulkOverwrite, setBulkOverwrite] = useState<boolean>(true);
    const [bulkEmployeeSearch, setBulkEmployeeSearch] = useState<string>('');
    const [bulkDeptFilter, setBulkDeptFilter] = useState<string>('');
    const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);

    // Copy previous week modal state
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [copyDeptId, setCopyDeptId] = useState<string>(
        selectedDepartmentId ? String(selectedDepartmentId) : ''
    );
    const [copyOverwrite, setCopyOverwrite] = useState<boolean>(false);
    const [copyProcessing, setCopyProcessing] = useState<boolean>(false);

    // Clear week modal state
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [clearTargetEmployee, setClearTargetEmployee] = useState<Employee | null>(null);
    const [clearProcessing, setClearProcessing] = useState<boolean>(false);

    // Single assignment form
    const {
        data: singleData,
        setData: setSingleData,
        post: postSingle,
        processing: singleProcessing,
        errors: singleErrors,
        reset: resetSingle,
    } = useForm({
        employee_id: '',
        shift_id: '',
        date: '',
    });

    // Timezone-safe date parsing (YYYY-MM-DD)
    const parseDateSafe = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const formatDateSafe = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Generate dates array for current week (Mon-Sun)
    const weekDates: Date[] = useMemo(() => {
        const dates: Date[] = [];
        const start = parseDateSafe(startDate);
        const end = parseDateSafe(endDate);
        const curr = new Date(start);

        while (curr <= end) {
            dates.push(new Date(curr));
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }, [startDate, endDate]);

    const todayStr = useMemo(() => formatDateSafe(new Date()), []);

    // Format helpers
    const getDayName = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    const getDisplayDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const getScheduleForCell = (employeeId: number, dateStr: string) => {
        return schedules.find((s) => s.employee_id === employeeId && s.date === dateStr);
    };

    // Navigation
    const changeWeek = (offsetDays: number) => {
        const currStart = parseDateSafe(startDate);
        currStart.setDate(currStart.getDate() + offsetDays);
        router.get(
            route('schedules.index'),
            {
                start_date: formatDateSafe(currStart),
                department_id: activeDeptFilter || undefined,
            },
            { preserveState: true }
        );
    };

    const goToCurrentWeek = () => {
        router.get(
            route('schedules.index'),
            {
                department_id: activeDeptFilter || undefined,
            },
            { preserveState: true }
        );
    };

    const handleDepartmentChange = (deptId: string) => {
        setActiveDeptFilter(deptId);
        router.get(
            route('schedules.index'),
            {
                start_date: startDate,
                department_id: deptId || undefined,
            },
            { preserveState: true }
        );
    };

    // Filter employees in the view
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const matchesSearch =
                !searchQuery ||
                emp.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                emp.employee_number?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [employees, searchQuery]);

    // Single modal handlers
    const openAssignModal = (employee: Employee, date: Date) => {
        const dateStr = formatDateSafe(date);
        setSelectedEmployee(employee);
        setSelectedDate(dateStr);

        const existing = getScheduleForCell(employee.id, dateStr);

        setSingleData({
            employee_id: String(employee.id),
            date: dateStr,
            shift_id: existing ? String(existing.shift_id) : '',
        });

        setIsSingleModalOpen(true);
    };

    const closeSingleModal = () => {
        setIsSingleModalOpen(false);
        resetSingle();
    };

    const submitSingle = (e: React.FormEvent) => {
        e.preventDefault();
        postSingle(route('schedules.store'), {
            preserveScroll: true,
            onSuccess: () => closeSingleModal(),
        });
    };

    const deleteSingleSchedule = (scheduleId: number) => {
        router.delete(route('schedules.destroy', scheduleId), {
            preserveScroll: true,
            onSuccess: () => closeSingleModal(),
        });
    };

    // Quick delete directly from cell
    const handleQuickDeleteCell = (e: React.MouseEvent, scheduleId: number) => {
        e.stopPropagation();
        if (confirm('Delete this shift schedule?')) {
            router.delete(route('schedules.destroy', scheduleId), {
                preserveScroll: true,
            });
        }
    };

    // Bulk modal handlers
    const openBulkModal = (preselectedEmpId?: number) => {
        const allDateStrs = weekDates.map((d) => formatDateSafe(d));
        setBulkSelectedDates(allDateStrs);
        setBulkSelectedShiftId(shifts[0] ? String(shifts[0].id) : '');
        setBulkOverwrite(true);
        setBulkDeptFilter(activeDeptFilter || '');
        setBulkEmployeeSearch('');

        if (preselectedEmpId) {
            setBulkSelectedEmployeeIds([preselectedEmpId]);
        } else {
            // Pre-select all currently visible employees
            setBulkSelectedEmployeeIds(filteredEmployees.map((e) => e.id));
        }

        setIsBulkModalOpen(true);
    };

    const closeBulkModal = () => {
        setIsBulkModalOpen(false);
        setBulkProcessing(false);
    };

    const handleBulkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bulkSelectedShiftId) {
            alert('Please select a shift first.');
            return;
        }
        if (bulkSelectedEmployeeIds.length === 0) {
            alert('Please select at least 1 employee.');
            return;
        }
        if (bulkSelectedDates.length === 0) {
            alert('Please select at least 1 working day.');
            return;
        }

        setBulkProcessing(true);
        router.post(
            route('schedules.bulk'),
            {
                employee_ids: bulkSelectedEmployeeIds,
                shift_id: Number(bulkSelectedShiftId),
                dates: bulkSelectedDates,
                overwrite: bulkOverwrite,
            },
            {
                preserveScroll: true,
                onSuccess: () => closeBulkModal(),
                onFinish: () => setBulkProcessing(false),
            }
        );
    };

    // Bulk employee filter within modal
    const bulkFilteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            const matchesDept =
                !bulkDeptFilter || String(emp.department_id) === bulkDeptFilter;
            const matchesSearch =
                !bulkEmployeeSearch ||
                emp.user?.name.toLowerCase().includes(bulkEmployeeSearch.toLowerCase()) ||
                emp.designation?.toLowerCase().includes(bulkEmployeeSearch.toLowerCase());
            return matchesDept && matchesSearch;
        });
    }, [employees, bulkDeptFilter, bulkEmployeeSearch]);

    const toggleSelectAllBulkEmployees = () => {
        const currentFilteredIds = bulkFilteredEmployees.map((e) => e.id);
        const allSelected = currentFilteredIds.every((id) =>
            bulkSelectedEmployeeIds.includes(id)
        );

        if (allSelected) {
            // Deselect filtered
            setBulkSelectedEmployeeIds((prev) =>
                prev.filter((id) => !currentFilteredIds.includes(id))
            );
        } else {
            // Select all filtered
            const combined = Array.from(
                new Set([...bulkSelectedEmployeeIds, ...currentFilteredIds])
            );
            setBulkSelectedEmployeeIds(combined);
        }
    };

    const toggleBulkDay = (dateStr: string) => {
        setBulkSelectedDates((prev) =>
            prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
        );
    };

    const setQuickDays = (type: 'all' | 'weekdays' | 'weekend') => {
        if (type === 'all') {
            setBulkSelectedDates(weekDates.map((d) => formatDateSafe(d)));
        } else if (type === 'weekdays') {
            // Mon - Fri (indices 0 to 4 in Monday-based week)
            setBulkSelectedDates(weekDates.slice(0, 5).map((d) => formatDateSafe(d)));
        } else if (type === 'weekend') {
            // Sat - Sun (indices 5 and 6)
            setBulkSelectedDates(weekDates.slice(5, 7).map((d) => formatDateSafe(d)));
        }
    };

    // Copy modal handlers
    const openCopyModal = () => {
        setCopyDeptId(activeDeptFilter || '');
        setCopyOverwrite(false);
        setIsCopyModalOpen(true);
    };

    const closeCopyModal = () => {
        setIsCopyModalOpen(false);
        setCopyProcessing(false);
    };

    const handleCopySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCopyProcessing(true);
        router.post(
            route('schedules.copyPreviousWeek'),
            {
                target_start_date: startDate,
                department_id: copyDeptId ? Number(copyDeptId) : null,
                overwrite: copyOverwrite,
            },
            {
                preserveScroll: true,
                onSuccess: () => closeCopyModal(),
                onFinish: () => setCopyProcessing(false),
            }
        );
    };

    // Clear week handlers
    const openClearModal = (emp?: Employee) => {
        setClearTargetEmployee(emp || null);
        setIsClearModalOpen(true);
    };

    const closeClearModal = () => {
        setIsClearModalOpen(false);
        setClearProcessing(false);
        setClearTargetEmployee(null);
    };

    const handleClearSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setClearProcessing(true);
        router.post(
            route('schedules.clearWeek'),
            {
                start_date: startDate,
                end_date: endDate,
                employee_id: clearTargetEmployee ? clearTargetEmployee.id : null,
                department_id: !clearTargetEmployee && activeDeptFilter ? Number(activeDeptFilter) : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => closeClearModal(),
                onFinish: () => setClearProcessing(false),
            }
        );
    };

    // Shift counts calculation for current week
    const shiftStats = useMemo(() => {
        const stats: Record<number, number> = {};
        schedules.forEach((s) => {
            stats[s.shift_id] = (stats[s.shift_id] || 0) + 1;
        });
        return stats;
    }, [schedules]);

    // Previous week date labels for copy modal
    const prevWeekLabels = useMemo(() => {
        const prevStart = parseDateSafe(startDate);
        prevStart.setDate(prevStart.getDate() - 7);
        const prevEnd = parseDateSafe(endDate);
        prevEnd.setDate(prevEnd.getDate() - 7);
        return {
            start: getDisplayDate(prevStart),
            end: getDisplayDate(prevEnd),
        };
    }, [startDate, endDate]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="font-bold text-xl text-slate-900 leading-tight">
                                Weekly Shift Roster
                            </h2>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-[#E31B23] border border-red-100">
                                Swiss-Belinn SKA Pekanbaru
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Manage and schedule weekly employee work shifts quickly, in bulk, or copy from the previous week.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Copy Previous Week */}
                        <SecondaryButton
                            type="button"
                            onClick={openCopyModal}
                            className="text-xs py-2 px-3.5 bg-white hover:bg-slate-50 shadow-2xs border-slate-200"
                        >
                            <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            Copy Previous Week
                        </SecondaryButton>

                        {/* Bulk Assign Button */}
                        <PrimaryButton
                            type="button"
                            onClick={() => openBulkModal()}
                            className="text-xs py-2 px-3.5 shadow-sm"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Bulk Assignment
                        </PrimaryButton>

                        {/* Manage Shifts */}
                        <SecondaryButton
                            type="button"
                            onClick={() => router.get(route('shifts.index'))}
                            className="text-xs py-2 px-3 shadow-2xs"
                        >
                            <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                            Manage Shifts
                        </SecondaryButton>
                    </div>
                </div>
            }
        >
            <Head title="Weekly Shift Roster" />

            <div className="space-y-5">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}

                {(flash?.error || pageErrors?.message) && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{flash?.error || pageErrors?.message}</span>
                        </div>
                    </div>
                )}

                {/* Toolbar: Navigation, Department Filter & Quick Actions */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                        {/* Week Navigator */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => changeWeek(-7)}
                                    className="px-3 py-1.5 hover:bg-white hover:shadow-2xs rounded-lg text-slate-700 font-semibold text-xs transition-all flex items-center gap-1"
                                    title="Previous Week"
                                >
                                    &larr; <span className="hidden sm:inline">Previous Week</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={goToCurrentWeek}
                                    className="px-3 py-1.5 hover:bg-white hover:shadow-2xs rounded-lg text-slate-700 font-semibold text-xs transition-all"
                                >
                                    This Week
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeWeek(7)}
                                    className="px-3 py-1.5 hover:bg-white hover:shadow-2xs rounded-lg text-slate-700 font-semibold text-xs transition-all flex items-center gap-1"
                                    title="Next Week"
                                >
                                    <span className="hidden sm:inline">Next Week</span> &rarr;
                                </button>
                            </div>

                            <div className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold tracking-wide shadow-2xs flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>
                                    {getDisplayDate(weekDates[0])} — {getDisplayDate(weekDates[weekDates.length - 1])}
                                </span>
                            </div>
                        </div>

                        {/* Filters: Department & Search */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {/* Department Dropdown */}
                            <div className="w-full sm:w-56">
                                <select
                                    value={activeDeptFilter}
                                    onChange={(e) => handleDepartmentChange(e.target.value)}
                                    className="w-full rounded-xl border-slate-300 text-xs text-slate-900 shadow-2xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2 px-3 font-medium"
                                >
                                    <option value="">All Departments ({deptList.length})</option>
                                    {deptList.map((dept: any) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* In-table Search */}
                            <div className="relative w-full sm:w-52">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search employee / designation..."
                                    className="w-full rounded-xl border-slate-300 text-xs text-slate-900 pl-8 pr-3 py-2 shadow-2xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                />
                                <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>

                            {/* Clear Week Schedule */}
                            <button
                                type="button"
                                onClick={() => openClearModal()}
                                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200"
                                title="Clear all schedules for this week"
                            >
                                Clear Week Schedule
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Roster Grid */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left table-fixed border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                                    {/* Sticky Employee column header */}
                                    <th className="px-4 py-3.5 w-64 border-r border-slate-200 sticky left-0 bg-slate-50 z-20 text-xs uppercase tracking-wider text-slate-500">
                                        <div className="flex items-center justify-between">
                                            <span>Employees ({filteredEmployees.length})</span>
                                            <span className="text-[10px] lowercase font-normal text-slate-400">click row for actions</span>
                                        </div>
                                    </th>

                                    {/* 7 Days columns */}
                                    {weekDates.map((date, i) => {
                                        const dateStr = formatDateSafe(date);
                                        const isToday = dateStr === todayStr;
                                        const isWeekend = i === 5 || i === 6;
                                        const scheduledCount = schedules.filter((s) => s.date === dateStr).length;

                                        return (
                                            <th
                                                key={i}
                                                className={`px-2 py-3 text-center border-r border-slate-200 min-w-[110px] transition-colors ${
                                                    isToday
                                                        ? 'bg-red-50/40 text-slate-900 border-b-2 border-b-[#E31B23]'
                                                        : isWeekend
                                                        ? 'bg-slate-50/40 text-slate-600'
                                                        : ''
                                                }`}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`font-bold text-xs ${isToday ? 'text-[#E31B23]' : 'text-slate-800'}`}>
                                                            {getDayName(date)}
                                                        </span>
                                                        {isToday && (
                                                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#E31B23] text-white">
                                                                Today
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        {getDisplayDate(date)}
                                                    </div>
                                                    <div className="mt-1 text-[10px] font-medium text-slate-400">
                                                        {scheduledCount} shift{scheduledCount === 1 ? '' : 's'}
                                                    </div>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200">
                                {filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            <p className="font-semibold text-slate-600">No employees found matching the filters.</p>
                                            <p className="text-xs text-slate-400 mt-1">Try selecting a different department or adjusting your search keyword.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEmployees.map((employee) => (
                                        <tr key={employee.id} className="hover:bg-slate-50/60 transition-colors group">
                                            {/* Employee info + row quick actions */}
                                            <td className="px-4 py-2.5 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] z-10 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0 pr-2">
                                                        <div className="font-bold text-xs text-slate-900 truncate">
                                                            {employee.user?.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                                            {employee.designation || 'Staff'}
                                                        </div>
                                                        {employee.department && (
                                                            <div className="mt-1">
                                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 truncate max-w-[150px]">
                                                                    {employee.department.name}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Row-level quick action buttons */}
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => openBulkModal(employee.id)}
                                                            className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-[#E31B23] rounded-lg transition-colors"
                                                            title="Bulk schedule week for this employee"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openClearModal(employee)}
                                                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            title="Clear weekly schedule for this employee"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Daily Schedule Cells */}
                                            {weekDates.map((date, i) => {
                                                const dateStr = formatDateSafe(date);
                                                const schedule = getScheduleForCell(employee.id, dateStr);
                                                const isToday = dateStr === todayStr;

                                                return (
                                                    <td
                                                        key={i}
                                                        className={`p-1 border-r border-slate-200 relative group/cell h-16 min-w-[110px] cursor-pointer transition-colors ${
                                                            isToday ? 'bg-red-50/20' : ''
                                                        } hover:bg-red-50/40`}
                                                        onClick={() => openAssignModal(employee, date)}
                                                    >
                                                        {schedule ? (
                                                            <div
                                                                className="h-full rounded-xl flex flex-col justify-center items-center p-1.5 text-center shadow-2xs relative overflow-hidden transition-all group-hover/cell:shadow-sm"
                                                                style={{
                                                                    backgroundColor: `${schedule.shift.color}15`,
                                                                    border: `1px solid ${schedule.shift.color}45`,
                                                                }}
                                                            >
                                                                {/* Shift Name and Code */}
                                                                <div
                                                                    className="font-bold text-xs truncate w-full flex items-center justify-center gap-1"
                                                                    style={{ color: schedule.shift.color }}
                                                                >
                                                                    <span>{schedule.shift.code || schedule.shift.name}</span>
                                                                    {schedule.shift.is_overnight && (
                                                                        <span title="Overnight Shift">🌙</span>
                                                                    )}
                                                                </div>

                                                                {/* Time range */}
                                                                <div className="text-[10px] font-medium text-slate-600 truncate w-full mt-0.5">
                                                                    {schedule.shift.start_time.substring(0, 5)} - {schedule.shift.end_time.substring(0, 5)}
                                                                </div>

                                                                {/* Quick delete 'X' on hover */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleQuickDeleteCell(e, schedule.id)}
                                                                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/80 hover:bg-rose-600 hover:text-white text-slate-400 text-[10px] flex items-center justify-center shadow-xs opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                                                    title="Delete this schedule"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center w-full h-full text-transparent group-hover/cell:text-red-400 font-bold text-xl rounded-lg group-hover/cell:bg-white/60 border border-transparent group-hover/cell:border-dashed group-hover/cell:border-red-300 transition-all">
                                                                +
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Shifts Legend & Stats Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                        <div>
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Weekly Shift Legend & Summary
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Total {schedules.length} scheduled shift slot{schedules.length === 1 ? '' : 's'} for {filteredEmployees.length} active employee{filteredEmployees.length === 1 ? '' : 's'}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Tip:</span>
                            <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                                Use <strong>Bulk Assignment</strong> or <strong>Copy Previous Week</strong> to populate shifts rapidly.
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {shifts.map((shift) => {
                            const count = shiftStats[shift.id] || 0;
                            return (
                                <div
                                    key={shift.id}
                                    className="p-3 rounded-xl border border-slate-200 flex flex-col justify-between hover:shadow-2xs transition-shadow"
                                    style={{ borderLeftColor: shift.color, borderLeftWidth: '4px' }}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs text-slate-900 truncate">
                                            {shift.name}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: shift.color }}>
                                            {shift.code}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1">
                                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                    </div>
                                    <div className="text-xs font-bold text-slate-700 mt-2 flex items-center justify-between pt-1.5 border-t border-slate-100">
                                        <span className="text-[10px] font-normal text-slate-400">Used:</span>
                                        <span>{count} time{count === 1 ? '' : 's'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* MODAL 1: Single Assign / Edit Modal */}
            <Modal show={isSingleModalOpen} onClose={closeSingleModal} maxWidth="md">
                <form onSubmit={submitSingle} className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-base font-bold text-slate-900">Assign Employee Shift</h2>
                        <button
                            type="button"
                            onClick={closeSingleModal}
                            className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-5">
                        <div className="font-bold text-sm text-slate-900">{selectedEmployee?.user?.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {selectedEmployee?.designation} &bull; {selectedEmployee?.department?.name}
                        </div>
                        <div className="text-xs font-semibold text-[#E31B23] mt-1">
                            Date: {selectedDate}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="single_shift_id" value="Select Work Shift" />
                            {shifts.length > 0 ? (
                                <>
                                    {/* Quick shift selection chips */}
                                    <div className="grid grid-cols-2 gap-2 mt-2 mb-3">
                                        {shifts.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => setSingleData('shift_id', String(s.id))}
                                                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                                                    String(singleData.shift_id) === String(s.id)
                                                        ? 'border-[#E31B23] bg-red-50/50 shadow-xs ring-1 ring-[#E31B23]'
                                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-900">{s.name}</span>
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: s.color }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-1">
                                                    {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <select
                                        id="single_shift_id"
                                        className="mt-1 block w-full rounded-xl border-slate-300 text-xs text-slate-900 shadow-2xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2 px-3"
                                        value={singleData.shift_id}
                                        onChange={(e) => setSingleData('shift_id', e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>-- Or Select from Dropdown --</option>
                                        {shifts.map((shift) => (
                                            <option key={shift.id} value={shift.id}>
                                                {shift.name} ({shift.code}) &bull; {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            ) : (
                                <div className="mt-1.5 p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-xs">
                                    No active shifts available. Please create shifts in Manage Shifts first.
                                </div>
                            )}
                            <InputError message={singleErrors.shift_id} className="mt-1.5" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100">
                        {selectedEmployee && getScheduleForCell(selectedEmployee.id, selectedDate) ? (
                            <button
                                type="button"
                                className="text-rose-600 hover:text-rose-700 text-xs font-semibold hover:underline flex items-center gap-1"
                                onClick={() => {
                                    const sched = getScheduleForCell(selectedEmployee.id, selectedDate);
                                    if (sched) {
                                        deleteSingleSchedule(sched.id);
                                    }
                                }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Shift
                            </button>
                        ) : (
                            <SecondaryButton type="button" onClick={closeSingleModal} className="text-xs py-2 px-3">
                                Cancel
                            </SecondaryButton>
                        )}

                        <PrimaryButton disabled={singleProcessing || shifts.length === 0} className="text-xs py-2 px-4">
                            {singleProcessing ? 'Saving...' : 'Save Schedule'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 2: Bulk Assign Modal (Penugasan Massal) */}
            <Modal show={isBulkModalOpen} onClose={closeBulkModal} maxWidth="3xl">
                <form onSubmit={handleBulkSubmit} className="p-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <span className="p-1 rounded-lg bg-red-50 text-[#E31B23]">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </span>
                                Bulk Shift Scheduling
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                Schedule shifts for multiple employees and working days at once with a single click.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeBulkModal}
                            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                        >
                            &times;
                        </button>
                    </div>

                    <div className="mt-5 space-y-6 max-h-[68vh] overflow-y-auto px-1">
                        {/* Step 1: Select Shift */}
                        <div>
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 block">
                                1. Select Work Shift
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                {shifts.map((shift) => (
                                    <button
                                        key={shift.id}
                                        type="button"
                                        onClick={() => setBulkSelectedShiftId(String(shift.id))}
                                        className={`p-3 rounded-xl border text-left transition-all ${
                                            bulkSelectedShiftId === String(shift.id)
                                                ? 'border-[#E31B23] bg-red-50/50 shadow-xs ring-2 ring-[#E31B23]'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-xs text-slate-900 truncate">
                                                {shift.name}
                                            </span>
                                            <span
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: shift.color }}
                                            />
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-1">
                                            {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                        </div>
                                        {shift.is_overnight && (
                                            <span className="inline-block mt-1 text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                                Overnight 🌙
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Step 2: Select Working Days */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    2. Select Working Days ({bulkSelectedDates.length} Selected)
                                </label>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setQuickDays('all')}
                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                                    >
                                        All 7 Days
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQuickDays('weekdays')}
                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                                    >
                                        Mon - Fri
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setQuickDays('weekend')}
                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                                    >
                                        Sat - Sun
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                                {weekDates.map((date, idx) => {
                                    const dateStr = formatDateSafe(date);
                                    const isSelected = bulkSelectedDates.includes(dateStr);
                                    const isToday = dateStr === todayStr;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => toggleBulkDay(dateStr)}
                                            className={`p-2.5 rounded-xl border text-center transition-all ${
                                                isSelected
                                                    ? 'border-[#E31B23] bg-red-50 text-[#E31B23] font-bold shadow-2xs ring-1 ring-[#E31B23]'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                                            }`}
                                        >
                                            <div className="text-xs flex items-center justify-center gap-1">
                                                <span>{getDayName(date)}</span>
                                                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#E31B23]"></span>}
                                            </div>
                                            <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                                                {getDisplayDate(date)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step 3: Select Employees */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    3. Select Employees ({bulkSelectedEmployeeIds.length} Selected)
                                </label>

                                <div className="flex items-center gap-2">
                                    {/* Department filter inside modal */}
                                    <select
                                        value={bulkDeptFilter}
                                        onChange={(e) => setBulkDeptFilter(e.target.value)}
                                        className="rounded-lg border-slate-300 text-xs py-1 px-2.5 font-medium shadow-2xs"
                                    >
                                        <option value="">All Departments</option>
                                        {deptList.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>

                                    {/* Search input inside modal */}
                                    <input
                                        type="text"
                                        placeholder="Search name..."
                                        value={bulkEmployeeSearch}
                                        onChange={(e) => setBulkEmployeeSearch(e.target.value)}
                                        className="rounded-lg border-slate-300 text-xs py-1 px-2.5 w-32 sm:w-40 shadow-2xs"
                                    />

                                    {/* Select all toggle */}
                                    <button
                                        type="button"
                                        onClick={toggleSelectAllBulkEmployees}
                                        className="text-xs font-semibold text-[#E31B23] hover:underline whitespace-nowrap"
                                    >
                                        Select All ({bulkFilteredEmployees.length})
                                    </button>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-2 max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                                {bulkFilteredEmployees.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        No employees found matching the current filters.
                                    </div>
                                ) : (
                                    bulkFilteredEmployees.map((emp) => {
                                        const isChecked = bulkSelectedEmployeeIds.includes(emp.id);

                                        return (
                                            <label
                                                key={emp.id}
                                                className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setBulkSelectedEmployeeIds((prev) => [...prev, emp.id]);
                                                            } else {
                                                                setBulkSelectedEmployeeIds((prev) => prev.filter((id) => id !== emp.id));
                                                            }
                                                        }}
                                                    />
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-900">
                                                            {emp.user?.name}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 ml-2">
                                                            {emp.designation}
                                                        </span>
                                                    </div>
                                                </div>

                                                {emp.department && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                                                        {emp.department.name}
                                                    </span>
                                                )}
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Step 4: Overwrite options */}
                        <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <Checkbox
                                    checked={bulkOverwrite}
                                    onChange={(e) => setBulkOverwrite(e.target.checked)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <span className="text-xs font-bold text-amber-900">
                                        Overwrite existing schedules
                                    </span>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        If checked, shifts on selected days will be updated directly. If unchecked, only empty days will be scheduled.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-600">
                            Summary:{' '}
                            <strong className="text-slate-900">{bulkSelectedEmployeeIds.length}</strong> employees &times;{' '}
                            <strong className="text-slate-900">{bulkSelectedDates.length}</strong> days ={' '}
                            <span className="text-[#E31B23] font-bold">
                                {bulkSelectedEmployeeIds.length * bulkSelectedDates.length} shift slots
                            </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <SecondaryButton type="button" onClick={closeBulkModal} className="text-xs py-2 px-3">
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton
                                disabled={
                                    bulkProcessing ||
                                    bulkSelectedEmployeeIds.length === 0 ||
                                    bulkSelectedDates.length === 0 ||
                                    !bulkSelectedShiftId
                                }
                                className="text-xs py-2 px-4"
                            >
                                {bulkProcessing ? 'Applying...' : 'Apply Bulk Schedule'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* MODAL 3: Copy from Previous Week */}
            <Modal show={isCopyModalOpen} onClose={closeCopyModal} maxWidth="lg">
                <form onSubmit={handleCopySubmit} className="p-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                                <svg className="w-5 h-5 text-[#E31B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Copy Schedule from Previous Week</h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Duplicate the entire work shift pattern from the preceding week.
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={closeCopyModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
                            &times;
                        </button>
                    </div>

                    <div className="mt-5 space-y-4">
                        {/* Info comparison box */}
                        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    Source (Previous Week)
                                </span>
                                <span className="text-xs font-bold text-slate-700 mt-1 block">
                                    {prevWeekLabels.start} — {prevWeekLabels.end}
                                </span>
                            </div>
                            <div className="border-l border-slate-200 pl-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E31B23] block">
                                    Target (Current Week)
                                </span>
                                <span className="text-xs font-bold text-slate-900 mt-1 block">
                                    {getDisplayDate(weekDates[0])} — {getDisplayDate(weekDates[weekDates.length - 1])}
                                </span>
                            </div>
                        </div>

                        {/* Department Scope */}
                        <div>
                            <InputLabel htmlFor="copy_department_id" value="Department Scope" />
                            <select
                                id="copy_department_id"
                                value={copyDeptId}
                                onChange={(e) => setCopyDeptId(e.target.value)}
                                className="mt-1 block w-full rounded-xl border-slate-300 text-xs text-slate-900 shadow-2xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2.5 px-3"
                            >
                                <option value="">All Departments ({deptList.length})</option>
                                {deptList.map((dept: any) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1">
                                You can duplicate for all hotel staff or filter by a specific department.
                            </p>
                        </div>

                        {/* Overwrite option */}
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                                <Checkbox
                                    checked={copyOverwrite}
                                    onChange={(e) => setCopyOverwrite(e.target.checked)}
                                    className="mt-0.5"
                                />
                                <div>
                                    <span className="text-xs font-bold text-amber-900">
                                        Overwrite existing schedules in target week
                                    </span>
                                    <p className="text-[11px] text-amber-700 mt-0.5">
                                        If unchecked, previously populated shifts in this target week will be preserved.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                        <SecondaryButton type="button" onClick={closeCopyModal} className="text-xs py-2 px-3">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={copyProcessing} className="text-xs py-2 px-4">
                            {copyProcessing ? 'Copying Schedule...' : 'Copy Schedule Now'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 4: Clear Week Schedule Modal */}
            <Modal show={isClearModalOpen} onClose={closeClearModal} maxWidth="md">
                <form onSubmit={handleClearSubmit} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Clear Roster Schedule</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                This action will remove all shift assignments within the selected week range.
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-5">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Time Range:</span>
                            <span className="font-bold text-slate-800">{startDate} to {endDate}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Target Scope:</span>
                            <span className="font-bold text-slate-900">
                                {clearTargetEmployee
                                    ? `Employee: ${clearTargetEmployee.user?.name}`
                                    : activeDeptFilter
                                    ? `Selected Department`
                                    : 'All Employees (All Departments)'}
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-rose-600 font-semibold mb-6">
                        Warning: Deleted shift schedules cannot be automatically restored.
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <SecondaryButton type="button" onClick={closeClearModal} className="text-xs py-2 px-3">
                            Cancel
                        </SecondaryButton>
                        <DangerButton disabled={clearProcessing} className="text-xs py-2 px-4">
                            {clearProcessing ? 'Deleting...' : 'Yes, Delete Schedule'}
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
