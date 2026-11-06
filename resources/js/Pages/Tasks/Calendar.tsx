import React, { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import TaskDetailModal from '../Projects/TaskDetailModal';
import CreateTaskModal from '@/Components/CreateTaskModal';
import TaskViewSwitcher from '@/Components/TaskViewSwitcher';
import PageHeader from '@/Components/PageHeader';

interface CalendarProps {
    auth: any;
    tasks: any[];
    employees: any[];
    projects: any[];
    statuses: any[];
    priorities: any[];
    filters?: { project_id?: string; employee_id?: string };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const THEMES = [
    { card: 'bg-emerald-50 border-emerald-200 hover:border-emerald-300', accent: 'bg-emerald-400', time: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
    { card: 'bg-amber-50 border-amber-200 hover:border-amber-300', accent: 'bg-amber-400', time: 'text-amber-700', chip: 'bg-amber-50 text-amber-900 border-amber-200' },
    { card: 'bg-sky-50 border-sky-200 hover:border-sky-300', accent: 'bg-sky-400', time: 'text-sky-700', chip: 'bg-sky-50 text-sky-900 border-sky-200' },
    { card: 'bg-violet-50 border-violet-200 hover:border-violet-300', accent: 'bg-violet-400', time: 'text-violet-700', chip: 'bg-violet-50 text-violet-900 border-violet-200' },
    { card: 'bg-rose-50 border-rose-200 hover:border-rose-300', accent: 'bg-rose-400', time: 'text-rose-700', chip: 'bg-rose-50 text-rose-900 border-rose-200' },
    { card: 'bg-teal-50 border-teal-200 hover:border-teal-300', accent: 'bg-teal-400', time: 'text-teal-700', chip: 'bg-teal-50 text-teal-900 border-teal-200' },
];

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500', 'bg-rose-500', 'bg-violet-500', 'bg-teal-500'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS = 3;

// Same project => same color, so the month reads at a glance
const themeFor = (task: any) => THEMES[Math.abs(task.project_id ?? task.id ?? 0) % THEMES.length];
const avatarColor = (id: number) => AVATAR_COLORS[Math.abs(id || 0) % AVATAR_COLORS.length];

const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getTaskDateRange = (t: any): { start: string | null; end: string | null; isMultiDay: boolean; daysCount: number } => {
    const rawStart = t.start_date ? String(t.start_date).split('T')[0] : null;
    const rawEnd = t.deadline ? String(t.deadline).split('T')[0] : null;

    if (!rawStart && !rawEnd) {
        return { start: null, end: null, isMultiDay: false, daysCount: 0 };
    }

    const start = rawStart || rawEnd;
    const end = rawEnd || rawStart;

    if (start && end && start !== end) {
        const [earlier, later] = start <= end ? [start, end] : [end, start];
        const [y1, m1, d1] = earlier.split('-').map(Number);
        const [y2, m2, d2] = later.split('-').map(Number);
        const dt1 = new Date(y1, m1 - 1, d1);
        const dt2 = new Date(y2, m2 - 1, d2);
        const days = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return {
            start: earlier,
            end: later,
            isMultiDay: days > 1,
            daysCount: Math.max(1, days),
        };
    }

    return {
        start,
        end,
        isMultiDay: false,
        daysCount: 1,
    };
};

const formatDateShort = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length < 3) return dStr;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const formatRange = (startStr: string | null, endStr: string | null) => {
    if (!startStr && !endStr) return '';
    if (!startStr) return formatDateShort(endStr!);
    if (!endStr || startStr === endStr) return formatDateShort(startStr);

    const [y1, m1, d1] = startStr.split('-').map(Number);
    const [y2, m2, d2] = endStr.split('-').map(Number);

    const date1 = new Date(y1, m1 - 1, d1);
    const date2 = new Date(y2, m2 - 1, d2);

    const m1Name = date1.toLocaleDateString('id-ID', { month: 'short' });
    const m2Name = date2.toLocaleDateString('id-ID', { month: 'short' });

    if (y1 === y2 && m1 === m2) {
        return `${d1} - ${d2} ${m1Name}`;
    }
    return `${d1} ${m1Name} - ${d2} ${m2Name}`;
};

const taskDateStr = (t: any): string => {
    const range = getTaskDateRange(t);
    return range.start || '';
};

const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
};

const startOfWeek = (d: Date) => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    const day = r.getDay();
    r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
    return r;
};

// Full Mon–Sun weeks covering the month of `d`
const monthGridDates = (d: Date) => {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const start = startOfWeek(first);
    const end = addDays(startOfWeek(last), 6);
    const dates: Date[] = [];
    for (let x = start; x <= end; x = addDays(x, 1)) dates.push(x);
    return dates;
};

const isSameDay = (a: Date, b: Date) => toDateStr(a) === toDateStr(b);
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

const formatDuration = (minutes?: number | null) => {
    const total = minutes && minutes > 0 ? minutes : 60;
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const formatTotal = (tasks: any[]) => {
    if (tasks.length === 0) return '—';
    const total = tasks.reduce((acc, t) => acc + (t.estimated_duration || 60), 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const initials = (name?: string) =>
    (name || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase())
        .join('');

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Calendar({
    auth,
    tasks: initialTasks,
    employees = [],
    projects = [],
    statuses = [],
    priorities = [],
}: CalendarProps) {
    const [tasks, setTasks] = useState<any[]>(initialTasks || []);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [dayPanel, setDayPanel] = useState<Date | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createDefaultDate, setCreateDefaultDate] = useState('');
    const [createDefaultAssignees, setCreateDefaultAssignees] = useState<number[]>([]);

    const [month, setMonth] = useState<Date>(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [mobileDate, setMobileDate] = useState<Date>(() => new Date());

    const [search, setSearch] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState<number | 'all'>('all');
    const [projectFilter, setProjectFilter] = useState<number | 'all'>('all');
    const [showWaitingList, setShowWaitingList] = useState(true);
    const [waitingSearch, setWaitingSearch] = useState('');

    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverCell, setDragOverCell] = useState<string | null>(null);

    useEffect(() => setTasks(initialTasks || []), [initialTasks]);

    useEffect(() => {
        if (selectedTask) {
            const updated = tasks.find(t => t.id === selectedTask.id);
            if (updated) setSelectedTask(updated);
        }
    }, [tasks]);

    // Open task from ?task_id= (e.g. from a notification)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('task_id') || params.get('taskId');
        if (id) {
            const found = (initialTasks || []).find(t => String(t.id) === String(id));
            if (found) setSelectedTask(found);
        }
    }, []);

    /* ---------------- Navigation ---------------- */

    const dates = useMemo(() => monthGridDates(month), [month]);
    const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const today = new Date();

    const shiftMonth = (dir: 1 | -1) => {
        const next = new Date(month.getFullYear(), month.getMonth() + dir, 1);
        setMonth(next);
        setMobileDate(next);
    };

    const goToday = () => {
        const d = new Date();
        setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        setMobileDate(d);
    };

    /* ---------------- Filtering ---------------- */

    const filteredTasks = useMemo(() => {
        const q = search.trim().toLowerCase();
        return tasks.filter(t => {
            if (q) {
                const hay = `${t.title ?? ''} ${t.description ?? ''} ${t.project?.name ?? ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (projectFilter !== 'all' && t.project_id !== projectFilter) return false;
            if (employeeFilter !== 'all' && !t.assignees?.some((a: any) => a.id === employeeFilter)) return false;
            return true;
        });
    }, [tasks, search, projectFilter, employeeFilter]);

    const scheduledTasks = useMemo(() => filteredTasks.filter(t => getTaskDateRange(t).start !== null), [filteredTasks]);
    const waitingTasks = useMemo(() => filteredTasks.filter(t => getTaskDateRange(t).start === null), [filteredTasks]);

    // Group by date once instead of filtering per cell - for multi-day tasks, populate every date in range
    const tasksByDate = useMemo(() => {
        const map: Record<string, any[]> = {};
        const weight: Record<string, number> = { Urgent: 1, High: 2, Normal: 3, Low: 4 };

        scheduledTasks.forEach(t => {
            const range = getTaskDateRange(t);
            if (!range.start || !range.end) return;

            if (!range.isMultiDay) {
                (map[range.start] ||= []).push(t);
            } else {
                const [y1, m1, d1] = range.start.split('-').map(Number);
                const [y2, m2, d2] = range.end.split('-').map(Number);
                let curr = new Date(y1, m1 - 1, d1);
                const endDate = new Date(y2, m2 - 1, d2);
                let safety = 0;
                while (curr <= endDate && safety < 365) {
                    const ds = toDateStr(curr);
                    (map[ds] ||= []).push(t);
                    curr = addDays(curr, 1);
                    safety++;
                }
            }
        });

        Object.values(map).forEach(list =>
            list.sort((a, b) => {
                const doneDiff = Number(a.status === 'Done') - Number(b.status === 'Done');
                return doneDiff || (weight[a.priority] ?? 9) - (weight[b.priority] ?? 9);
            })
        );
        return map;
    }, [scheduledTasks]);

    const tasksOn = (d: Date) => tasksByDate[toDateStr(d)] || [];

    const monthStats = useMemo(() => {
        const inMonth = scheduledTasks.filter(t => {
            const range = getTaskDateRange(t);
            const mStr = toDateStr(month).slice(0, 7);
            return (range.start && range.start.slice(0, 7) === mStr) || (range.end && range.end.slice(0, 7) === mStr);
        });
        const todayStr = toDateStr(today);
        return {
            total: inMonth.length,
            done: inMonth.filter(t => t.status === 'Done').length,
            overdue: inMonth.filter(t => t.status !== 'Done' && (getTaskDateRange(t).end || '') < todayStr).length,
            hours: formatTotal(inMonth),
        };
    }, [scheduledTasks, month]);

    const displayedWaiting = useMemo(() => {
        const q = waitingSearch.trim().toLowerCase();
        if (!q) return waitingTasks;
        return waitingTasks.filter(t => `${t.title ?? ''} ${t.project?.name ?? ''}`.toLowerCase().includes(q));
    }, [waitingTasks, waitingSearch]);

    /* ---------------- Drag & drop ---------------- */

    const onDragStart = (e: React.DragEvent, task: any) => {
        setDraggedTaskId(task.id);
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, cellId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverCell !== cellId) setDragOverCell(cellId);
    };

    const endDrag = () => {
        setDraggedTaskId(null);
        setDragOverCell(null);
    };

    // Ensure drag state is cleared if drag ends anywhere on window
    useEffect(() => {
        const handleDragClean = () => {
            endDrag();
        };
        window.addEventListener('dragend', handleDragClean);
        window.addEventListener('drop', handleDragClean);
        return () => {
            window.removeEventListener('dragend', handleDragClean);
            window.removeEventListener('drop', handleDragClean);
        };
    }, []);

    const reschedule = (task: any, dateStr: string | null) => {
        if (!dateStr) {
            setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, deadline: null, start_date: null } : t)));
            router.put(
                route('tasks.update', task.id),
                { deadline: null, start_date: null },
                { preserveScroll: true, preserveState: true, onError: () => setTasks(initialTasks || []) }
            );
            return;
        }

        const range = getTaskDateRange(task);
        let newStart = dateStr;
        let newEnd = dateStr;

        if (range.isMultiDay && range.daysCount > 1) {
            const [y, m, d] = dateStr.split('-').map(Number);
            const targetStart = new Date(y, m - 1, d);
            const targetEnd = addDays(targetStart, range.daysCount - 1);
            newStart = toDateStr(targetStart);
            newEnd = toDateStr(targetEnd);
        }

        setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, deadline: newEnd, start_date: newStart } : t)));
        router.put(
            route('tasks.update', task.id),
            { deadline: newEnd, start_date: newStart },
            { preserveScroll: true, preserveState: true, onError: () => setTasks(initialTasks || []) }
        );
    };

    const dropOnDate = (dateStr: string) => {
        const task = tasks.find(t => t.id === draggedTaskId);
        endDrag();
        if (!task) return;
        const range = getTaskDateRange(task);
        if (range.start === dateStr) return;
        reschedule(task, dateStr);
    };

    const dropOnWaitingList = () => {
        const task = tasks.find(t => t.id === draggedTaskId);
        endDrag();
        if (!task || !getTaskDateRange(task).start) return;
        reschedule(task, null);
    };

    const openCreate = (dateStr?: string) => {
        setCreateDefaultDate(dateStr ?? '');
        setCreateDefaultAssignees(employeeFilter !== 'all' ? [employeeFilter] : []);
        setShowCreateModal(true);
    };

    /* ---------------- Render ---------------- */

    const selectCls =
        'py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-700 rounded-xl border-slate-200 bg-slate-50 focus:border-[#E31B23] focus:ring-[#E31B23] cursor-pointer max-w-[170px]';

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    breadcrumbs={[
                        { label: 'Main Menu', href: route('dashboard') },
                        { label: 'Task Management', href: route('dashboard', { view: 'tasks' }) },
                        { label: 'Team Calendar' },
                    ]}
                    title="Team Calendar"
                    subtitle="Monthly schedule of team assignments and deadlines"
                    actions={
                        <div className="flex items-center gap-2.5">
                            <TaskViewSwitcher current="calendar" />
                            <button
                                onClick={() => openCreate(toDateStr(new Date()))}
                                className="inline-flex items-center gap-1.5 bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white font-semibold py-2 px-3.5 rounded-xl text-xs sm:text-sm shadow-xs transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                <span>Create Task</span>
                            </button>
                        </div>
                    }
                />
            }
        >
            <Head title="Team Calendar" />

            {/* ============================ MOBILE ============================ */}
            <MobileView
                month={month}
                dates={dates}
                mobileDate={mobileDate}
                setMobileDate={setMobileDate}
                shiftMonth={shiftMonth}
                goToday={goToday}
                tasksOn={tasksOn}
                onSelect={setSelectedTask}
                onCreate={openCreate}
            />

            {/* ============================ DESKTOP ============================ */}
            <div className="hidden lg:block space-y-4">
                {/* Toolbar */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex items-center rounded-xl border border-gray-200 overflow-hidden">
                            <button onClick={() => shiftMonth(-1)} title="Previous month" className="p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={goToday} className="px-3 py-1.5 text-xs font-semibold text-gray-700 border-x border-gray-200 hover:bg-gray-50 transition-colors">
                                Today
                            </button>
                            <button onClick={() => shiftMonth(1)} title="Next month" className="p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                        <span className="text-lg font-bold text-gray-900 whitespace-nowrap">{monthLabel}</span>
                    </div>

                    {/* Month summary */}
                    <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold">
                        <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">{monthStats.total} {monthStats.total === 1 ? 'task' : 'tasks'}</span>
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">{monthStats.done} completed</span>
                        {monthStats.overdue > 0 && <span className="px-2 py-1 rounded-lg bg-red-50 text-red-700">{monthStats.overdue} overdue</span>}
                        <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700">{monthStats.hours}</span>
                    </div>

                    <div className="flex-1" />

                    <div className="relative">
                        <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search tasks..."
                            className="w-44 pl-8 pr-3 py-1.5 text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E31B23] focus:ring-[#E31B23]"
                        />
                    </div>

                    {projects.length > 0 && (
                        <select value={projectFilter} onChange={e => setProjectFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className={selectCls}>
                            <option value="all">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}

                    <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className={selectCls}>
                        <option value="all">All Members</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employee_number}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowWaitingList(v => !v)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                            showWaitingList ? 'bg-red-50 text-[#E31B23] border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        Waiting list
                        <span className={`min-w-[18px] px-1.5 rounded-full text-[10px] font-bold ${showWaitingList ? 'bg-red-100 text-[#E31B23]' : 'bg-slate-100 text-slate-600'}`}>
                            {waitingTasks.length}
                        </span>
                    </button>
                </div>

                <div className="flex gap-4 items-start">
                    {/* Month grid */}
                    <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                            {WEEKDAYS.map((d, i) => (
                                <div
                                    key={d}
                                    className={`py-2.5 text-center text-[11px] font-bold uppercase tracking-wider border-r border-gray-200 last:border-r-0 ${
                                        i >= 5 ? 'text-gray-400' : 'text-gray-500'
                                    }`}
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7">
                            {dates.map((date, i) => {
                                const ds = toDateStr(date);
                                const items = tasksOn(date);
                                const inMonth = date.getMonth() === month.getMonth();
                                const isToday = isSameDay(date, today);
                                const isOver = dragOverCell === ds;
                                const lastCol = (i + 1) % 7 === 0;
                                const lastRow = i >= dates.length - 7;

                                return (
                                    <div
                                        key={ds}
                                        onDragOver={e => onDragOver(e, ds)}
                                        onDragLeave={() => setDragOverCell(null)}
                                        onDrop={() => dropOnDate(ds)}
                                        onDoubleClick={() => openCreate(ds)}
                                        className={`group min-h-[128px] p-1.5 flex flex-col gap-1 border-slate-100 transition-colors ${lastCol ? '' : 'border-r'} ${lastRow ? '' : 'border-b'} ${
                                            isOver
                                                ? 'bg-red-50 ring-2 ring-inset ring-red-300'
                                                : !inMonth
                                                ? 'bg-slate-50/80'
                                                : isWeekend(date)
                                                ? 'bg-slate-50/40'
                                                : 'bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between px-0.5">
                                            <button
                                                onClick={() => items.length > 0 && setDayPanel(date)}
                                                className={`inline-flex items-center justify-center h-6 min-w-[24px] px-1 rounded-full text-xs font-bold transition-colors ${
                                                    isToday
                                                        ? 'bg-[#E31B23] text-white'
                                                        : inMonth
                                                        ? 'text-slate-800 hover:bg-slate-100'
                                                        : 'text-slate-300'
                                                }`}
                                            >
                                                {date.getDate()}
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {items.length > 0 && (
                                                    <span className="text-[10px] font-medium text-gray-400 group-hover:hidden">{formatTotal(items)}</span>
                                                )}
                                                <button
                                                    onClick={() => openCreate(ds)}
                                                    title="Add task"
                                                    className="hidden group-hover:inline-flex items-center justify-center h-5 w-5 rounded-md text-slate-400 hover:text-[#E31B23] hover:bg-red-50 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {items.slice(0, MAX_CHIPS).map(task => (
                                            <TaskChip
                                                key={task.id}
                                                task={task}
                                                currentDate={date}
                                                dragging={draggedTaskId === task.id}
                                                onSelect={() => setSelectedTask(task)}
                                                onDragStart={e => onDragStart(e, task)}
                                                onDragEnd={endDrag}
                                            />
                                        ))}

                                        {items.length > MAX_CHIPS && (
                                            <button
                                                onClick={() => setDayPanel(date)}
                                                className="text-left px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 hover:text-[#E31B23] hover:bg-red-50"
                                            >
                                                +{items.length - MAX_CHIPS} more
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Waiting list */}
                    {showWaitingList && (
                        <aside
                            onDragOver={e => onDragOver(e, 'waiting-list')}
                            onDragLeave={() => setDragOverCell(null)}
                            onDrop={dropOnWaitingList}
                            className={`w-72 shrink-0 sticky top-0 bg-white rounded-2xl border shadow-xs flex flex-col max-h-[calc(100vh-15rem)] transition-colors ${
                                dragOverCell === 'waiting-list' ? 'border-red-300 ring-2 ring-red-200 bg-red-50/30' : 'border-slate-200'
                            }`}
                        >
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-bold text-slate-900">Waiting list</h3>
                                    <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 rounded-full">{displayedWaiting.length}</span>
                                </div>
                                <div className="flex items-center">
                                    <button onClick={() => openCreate()} title="Add to waiting list" className="p-1.5 text-slate-400 hover:text-[#E31B23] hover:bg-slate-100 rounded-lg transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    </button>
                                    <button onClick={() => setShowWaitingList(false)} title="Close" className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="px-3 pt-3">
                                <div className="relative">
                                    <svg className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <input
                                        type="text"
                                        value={waitingSearch}
                                        onChange={e => setWaitingSearch(e.target.value)}
                                        placeholder="Search backlog..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#E31B23] focus:ring-[#E31B23]"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-400 mt-2 px-0.5">Drag cards to a date to schedule, or drag here to unschedule.</p>
                            </div>

                            <div className="p-3 space-y-2 overflow-y-auto flex-1">
                                {displayedWaiting.length === 0 ? (
                                    <div className="py-10 text-center text-xs text-gray-400">No unscheduled tasks</div>
                                ) : (
                                    displayedWaiting.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            dragging={draggedTaskId === task.id}
                                            onSelect={() => setSelectedTask(task)}
                                            onDragStart={e => onDragStart(e, task)}
                                            onDragEnd={endDrag}
                                        />
                                    ))
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </div>

            {/* Day detail panel (from "+N lainnya" / clicking a date number) */}
            {dayPanel && (
                <DayPanel
                    date={dayPanel}
                    tasks={tasksOn(dayPanel)}
                    onClose={() => setDayPanel(null)}
                    onSelect={task => {
                        setDayPanel(null);
                        setSelectedTask(task);
                    }}
                    onCreate={() => {
                        const ds = toDateStr(dayPanel);
                        setDayPanel(null);
                        openCreate(ds);
                    }}
                />
            )}

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    currentUser={auth.user}
                    project={selectedTask.project}
                    employees={employees}
                    statuses={statuses}
                    priorities={priorities}
                />
            )}

            <CreateTaskModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                employees={employees}
                statuses={statuses}
                priorities={priorities}
                projects={projects}
                defaultDeadline={createDefaultDate}
                defaultAssignees={createDefaultAssignees}
            />
        </AuthenticatedLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Sub components                                                      */
/* ------------------------------------------------------------------ */

function Avatar({ name, photo, id }: { name?: string; photo?: string; id: number }) {
    const cls = 'h-5 w-5 text-[9px]';
    if (photo) {
        return <img src={photo} alt={name} title={name} className={`${cls} rounded-full object-cover border-2 border-white shrink-0`} />;
    }
    return (
        <div title={name} className={`${cls} ${avatarColor(id)} rounded-full text-white font-bold flex items-center justify-center border-2 border-white shrink-0`}>
            {initials(name)}
        </div>
    );
}

/** Compact one-line task used inside month cells */
function TaskChip({
    task,
    dragging,
    currentDate,
    onSelect,
    onDragStart,
    onDragEnd,
}: {
    task: any;
    dragging: boolean;
    currentDate?: Date;
    onSelect: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
}) {
    const theme = themeFor(task);
    const isDone = task.status === 'Done';
    const assignee = task.assignees?.[0];
    const range = getTaskDateRange(task);
    const currStr = currentDate ? toDateStr(currentDate) : null;
    const isStartDay = currStr && currStr === range.start;
    const isEndDay = currStr && currStr === range.end;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onSelect}
            title={`${task.title}${task.project ? ` · ${task.project.name}` : ''}${range.isMultiDay ? ` (${formatRange(range.start, range.end)})` : ''}`}
            className={`group/chip flex flex-col gap-0.5 pl-1.5 pr-1.5 py-1 rounded-lg border text-[11px] font-medium cursor-grab active:cursor-grabbing select-none hover:shadow-md transition-all ${theme.chip} ${
                dragging ? 'opacity-40' : ''
            } ${isDone ? 'opacity-60' : ''} ${range.isMultiDay ? 'border-l-4 border-l-indigo-500 bg-indigo-50/50 shadow-2xs' : ''}`}
        >
            <div className="flex items-center gap-1.5 w-full">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${task.priority === 'Urgent' && !isDone ? 'bg-red-500' : theme.accent}`} />
                <span className={`truncate flex-1 font-semibold ${isDone ? 'line-through text-slate-400' : ''}`}>{task.title}</span>
                {assignee && <Avatar id={assignee.id} name={assignee.user?.name} photo={assignee.user?.profile_photo_url} />}
            </div>
            {range.isMultiDay && (
                <div className="flex items-center justify-between gap-1 text-[9px] font-semibold text-indigo-700 bg-white/90 px-1.5 py-0.5 rounded border border-indigo-200/70">
                    <span className="flex items-center gap-1 truncate">
                        <svg className="w-2.5 h-2.5 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{formatRange(range.start, range.end)}</span>
                    </span>
                    <span className="shrink-0 text-[8px] bg-indigo-100 text-indigo-800 px-1 rounded font-bold">
                        {isStartDay ? 'Start' : isEndDay ? 'Deadline' : `${range.daysCount} hr`}
                    </span>
                </div>
            )}
        </div>
    );
}

/** Full card used in the waiting list, day panel and mobile list */
function TaskCard({
    task,
    dragging = false,
    onSelect,
    onDragStart,
    onDragEnd,
}: {
    task: any;
    dragging?: boolean;
    onSelect: () => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: () => void;
}) {
    const theme = themeFor(task);
    const done = task.checklists?.filter((c: any) => c.is_completed).length || 0;
    const total = task.checklists?.length || 0;
    const comments = task.comments?.length || 0;
    const assignees: any[] = task.assignees || [];
    const isDone = task.status === 'Done';
    const showFooter = total > 0 || comments > 0 || assignees.length > 0;

    return (
        <div
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onSelect}
            className={`relative overflow-hidden rounded-xl border pl-3.5 pr-2.5 py-2.5 select-none transition-all hover:shadow-md ${onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${theme.card} ${
                dragging ? 'opacity-40' : ''
            } ${isDone ? 'opacity-60' : ''}`}
        >
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${theme.accent}`} />

            <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-[11px] font-bold ${theme.time}`}>{formatDuration(task.estimated_duration)}</span>
                {isDone ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/80 text-emerald-700">Done</span>
                ) : task.priority === 'Urgent' ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">ASAP</span>
                ) : task.priority === 'High' ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">High</span>
                ) : null}
            </div>

            <h5 className={`text-xs font-semibold text-gray-900 leading-snug line-clamp-2 ${isDone ? 'line-through' : ''}`} title={task.title}>
                {task.title}
            </h5>

            {task.project && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{task.project.name}</p>}

            {(() => {
                const range = getTaskDateRange(task);
                if (range.isMultiDay) {
                    return (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-1 rounded-lg my-1.5">
                            <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Period: {formatRange(range.start, range.end)} ({range.daysCount} {range.daysCount === 1 ? 'day' : 'days'})</span>
                        </div>
                    );
                }
                if (range.end) {
                    return (
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium my-1">
                            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Deadline: {formatDateShort(range.end)}</span>
                        </div>
                    );
                }
                return null;
            })()}

            {showFooter && (
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5">
                    <div className="flex items-center gap-2.5 text-[10px] font-semibold text-gray-500">
                        {total > 0 && (
                            <span className="inline-flex items-center gap-0.5" title="Checklist">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                {done}/{total}
                            </span>
                        )}
                        {comments > 0 && (
                            <span className="inline-flex items-center gap-0.5" title="Comments">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.83L3 20l1.4-3.72A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                {comments}
                            </span>
                        )}
                    </div>
                    {assignees.length > 0 && (
                        <div className="flex -space-x-1.5">
                            {assignees.slice(0, 3).map(a => (
                                <Avatar key={a.id} id={a.id} name={a.user?.name} photo={a.user?.profile_photo_url} />
                            ))}
                            {assignees.length > 3 && (
                                <div className="h-5 w-5 rounded-full bg-gray-200 text-gray-600 text-[8px] font-bold flex items-center justify-center border-2 border-white">
                                    +{assignees.length - 3}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DayPanel({
    date,
    tasks,
    onClose,
    onSelect,
    onCreate,
}: {
    date: Date;
    tasks: any[];
    onClose: () => void;
    onSelect: (task: any) => void;
    onCreate: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[80vh]">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">
                            {date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-xs text-gray-500">{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} · {formatTotal(tasks)}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 space-y-2 overflow-y-auto">
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} onSelect={() => onSelect(task)} />
                    ))}
                </div>
                <div className="px-4 py-3 border-t border-slate-100">
                    <button onClick={onCreate} className="w-full py-2 rounded-xl border border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:text-[#E31B23] hover:border-red-300 hover:bg-red-50/40 transition-colors">
                        + Add task to this date
                    </button>
                </div>
            </div>
        </div>
    );
}

function MobileView({
    month,
    dates,
    mobileDate,
    setMobileDate,
    shiftMonth,
    goToday,
    tasksOn,
    onSelect,
    onCreate,
}: {
    month: Date;
    dates: Date[];
    mobileDate: Date;
    setMobileDate: (d: Date) => void;
    shiftMonth: (dir: 1 | -1) => void;
    goToday: () => void;
    tasksOn: (d: Date) => any[];
    onSelect: (task: any) => void;
    onCreate: (dateStr?: string) => void;
}) {
    const today = new Date();
    const dayTasks = tasksOn(mobileDate);

    return (
        <div className="lg:hidden space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={goToday} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700">Today</button>
                        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map(d => (
                        <div key={d} className="text-center text-[10px] font-semibold uppercase text-slate-400 py-1">{d.charAt(0)}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-1">
                    {dates.map(d => {
                        const selected = isSameDay(d, mobileDate);
                        const isToday = isSameDay(d, today);
                        const inMonth = d.getMonth() === month.getMonth();
                        const count = tasksOn(d).length;
                        return (
                            <button
                                key={toDateStr(d)}
                                onClick={() => setMobileDate(d)}
                                className={`mx-auto flex flex-col items-center justify-center h-10 w-10 rounded-xl text-sm font-semibold transition-colors ${
                                    selected
                                        ? 'bg-[#E31B23] text-white shadow-xs'
                                        : isToday
                                        ? 'bg-red-50 text-[#E31B23]'
                                        : inMonth
                                        ? 'text-slate-700 hover:bg-slate-50'
                                        : 'text-slate-300'
                                }`}
                            >
                                {d.getDate()}
                                <span className={`h-1 w-1 rounded-full mt-0.5 ${count > 0 ? (selected ? 'bg-white' : 'bg-[#E31B23]') : 'bg-transparent'}`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between px-1">
                <div>
                    <h3 className="font-bold text-sm text-slate-900">
                        {mobileDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </h3>
                    <span className="text-xs text-slate-500">{dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'} · {formatTotal(dayTasks)}</span>
                </div>
                <button onClick={() => onCreate(toDateStr(mobileDate))} className="px-3 py-1.5 text-xs font-semibold bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white rounded-xl shadow-xs transition-colors">
                    + Add
                </button>
            </div>

            <div className="space-y-2.5">
                {dayTasks.length === 0 ? (
                    <div className="py-10 text-center bg-white rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                        No tasks scheduled for this day
                    </div>
                ) : (
                    dayTasks.map(task => <TaskCard key={task.id} task={task} onSelect={() => onSelect(task)} />)
                )}
            </div>
        </div>
    );
}
