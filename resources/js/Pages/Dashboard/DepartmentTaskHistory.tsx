import React, { FormEvent, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import TaskDetailModal from '@/Pages/Projects/TaskDetailModal';
import { Head, Link, router } from '@inertiajs/react';

type Assignment = {
    id: number;
    employee_name: string;
    employee_number: string | null;
    department_name: string | null;
    assigned_by: string | null;
    assigned_at: string;
    acknowledged_at: string | null;
    unassigned_at: string | null;
    source: string;
};

type TaskRow = {
    id: number;
    title: string;
    status: string;
    priority: string | null;
    deadline: string | null;
    is_overdue: boolean;
    created_at: string;
    creator: string | null;
    project: string | null;
    latest_activity: { description: string; created_at: string } | null;
    assignments: Assignment[];
    detail: any;
};

type Filters = {
    status?: string;
    employee_id?: string;
    from?: string;
    to?: string;
    search?: string;
};

type Props = {
    auth: { user: any };
    department: { id: number; name: string } | null;
    departments: { id: number; name: string }[];
    summary: Record<string, number> | null;
    tasks: { data: TaskRow[]; current_page: number; last_page: number; total: number; prev_page_url: string | null; next_page_url: string | null } | null;
    employees: { employee_id: number; employee_name: string | null; employee_number: string | null }[];
    statuses: string[];
    filters: Filters;
};

const statusStyles: Record<string, string> = {
    'To Do': 'bg-slate-100 text-slate-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Done: 'bg-amber-100 text-amber-800',
    Approved: 'bg-emerald-100 text-emerald-700',
    Review: 'bg-violet-100 text-violet-700',
    Blocked: 'bg-red-100 text-red-700',
    Cancelled: 'bg-gray-100 text-gray-600',
};

const priorityStyles: Record<string, string> = {
    Urgent: 'bg-rose-100 text-rose-700',
    High: 'bg-orange-100 text-orange-700',
    Normal: 'bg-sky-50 text-sky-700',
    Low: 'bg-slate-100 text-slate-500',
};

function dateTime(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function shortDate(value: string | null): string {
    if (!value) return '—';
    // A date-only value must be rendered locally without an accidental UTC timezone shift.
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
}

export default function DepartmentTaskHistory({ auth, department, departments, summary, tasks, employees, statuses, filters }: Props) {
    const [form, setForm] = useState<Filters>({
        search: filters.search || '',
        status: filters.status || '',
        employee_id: String(filters.employee_id || ''),
        from: filters.from || '',
        to: filters.to || '',
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(Boolean(filters.employee_id || filters.from || filters.to));
    const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);

    const href = department
        ? route('dashboard.departments.tasks.history', { department: department.id })
        : route('dashboard.departments.tasks.index');

    const navigateWithFilters = (next: Filters) => {
        setSelectedTask(null);
        router.get(href, Object.fromEntries(Object.entries(next).filter(([, value]) => value)), {
            replace: true,
            preserveState: false,
            preserveScroll: true,
        });
    };

    const chooseDepartment = (departmentId: string) => {
        setSelectedTask(null);
        router.get(departmentId
            ? route('dashboard.departments.tasks.history', { department: departmentId })
            : route('dashboard.departments.tasks.index'), {}, { preserveState: false });
    };

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        navigateWithFilters(form);
    };

    const resetFilters = () => {
        setForm({ search: '', status: '', employee_id: '', from: '', to: '' });
        setShowAdvancedFilters(false);
        navigateWithFilters({});
    };

    const selectStatus = (status: string) => {
        const next = { ...form, status };
        setForm(next);
        navigateWithFilters(next);
    };

    const statCards = [
        { label: 'Total Tasks', value: summary?.total, color: 'text-slate-900' },
        { label: 'Open / Active', value: summary?.active, color: 'text-blue-700' },
        { label: 'Waiting Approval', value: summary?.pending_approval, color: 'text-amber-700' },
        { label: 'Approved', value: summary?.approved, color: 'text-emerald-700' },
        { label: 'Unacknowledged', value: summary?.pending_ack, color: 'text-violet-700' },
        { label: 'Overdue', value: summary?.overdue, color: 'text-red-700' },
    ];

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">General Manager / Department Monitoring</p>
                    <h2 className="text-xl font-bold text-slate-900">Department Tasks{department ? ` · ${department.name}` : ''}</h2>
                </div>
                <Link href={route('dashboard', { view: 'tasks' })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">← Task Summary</Link>
            </div>}
        >
            <Head title="Department Tasks" />

            <div className="w-full space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <label htmlFor="tracked-department" className="shrink-0 text-sm font-semibold text-slate-700">Recipient Department</label>
                    <select
                        id="tracked-department"
                        value={department?.id ?? ''}
                        onChange={(event) => chooseDepartment(event.target.value)}
                        className="min-w-48 max-w-sm flex-1 rounded-lg border-slate-200 bg-white py-1.5 text-sm text-slate-900 focus:border-[#E31B23] focus:ring-[#E31B23]"
                    >
                        <option value="">— Select Department —</option>
                        {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                </div>

                {department && tasks ? <>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                        {statCards.map((card) => (
                            <div key={card.label} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm xl:block">
                                <div className={`text-2xl font-bold leading-none ${card.color}`}>{card.value ?? 0}</div>
                                <div className="text-[11px] font-medium leading-tight text-slate-500 xl:mt-1.5">{card.label}</div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={applyFilters} className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                aria-label="Search task or creator"
                                type="search"
                                value={form.search || ''}
                                onChange={(e) => setForm({ ...form, search: e.target.value })}
                                placeholder="Search task / creator..."
                                className="min-w-48 flex-1 rounded-lg border-slate-200 py-1.5 text-sm sm:max-w-xs"
                            />
                            <button type="submit" className="rounded-lg bg-[#E31B23] px-3 py-2 text-xs font-semibold text-white hover:bg-[#c4141b]">Search</button>
                            <button type="button" onClick={() => setShowAdvancedFilters((v) => !v)} aria-expanded={showAdvancedFilters} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                {showAdvancedFilters ? 'Hide Filters ▲' : 'More Filters ▼'}
                            </button>
                            {Object.values(form).some(Boolean) && <button type="button" onClick={resetFilters} className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600">Clear</button>}
                        </div>
                        {showAdvancedFilters && (
                            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
                                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                                    Recipient (historical)
                                    <select value={form.employee_id || ''} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="rounded-lg border-slate-200 py-1.5 text-sm">
                                        <option value="">All recipients</option>
                                        {employees.map((employee) => <option key={employee.employee_id} value={employee.employee_id}>{employee.employee_name || employee.employee_number || `#${employee.employee_id}`}</option>)}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Assigned from
                                    <input type="date" value={form.from || ''} onChange={(e) => setForm({ ...form, from: e.target.value })} className="rounded-lg border-slate-200 py-1.5 text-sm" />
                                </label>
                                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">Assigned until
                                    <input type="date" min={form.from || undefined} value={form.to || ''} onChange={(e) => setForm({ ...form, to: e.target.value })} className="rounded-lg border-slate-200 py-1.5 text-sm" />
                                </label>
                                <div className="sm:col-span-3"><button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Apply Filters</button></div>
                            </div>
                        )}
                    </form>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Task Monitor</h3>
                                <p className="text-[11px] text-slate-500">{tasks.total} unique tasks · sorted by status and priority</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5" aria-label="Filter by task status">
                                {['', ...statuses].map((status) => (
                                    <button
                                        key={status || 'all'}
                                        type="button"
                                        onClick={() => selectStatus(status)}
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${(form.status || '') === status ? 'bg-[#E31B23] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >{status || 'All'}</button>
                                ))}
                            </div>
                        </div>

                        {tasks.data.length === 0 ? (
                            <div className="px-6 py-10 text-center text-sm text-slate-500">No tasks match the selected filters.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px] text-left text-xs">
                                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2.5">Task / Project</th>
                                            <th className="px-3 py-2.5">Status</th>
                                            <th className="px-3 py-2.5">Priority</th>
                                            <th className="px-3 py-2.5">Recipient History</th>
                                            <th className="px-3 py-2.5">Deadline</th>
                                            <th className="px-3 py-2.5">Acknowledge</th>
                                            <th className="px-3 py-2.5">Last Activity</th>
                                            <th className="px-3 py-2.5 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {tasks.data.map((task) => {
                                            const activeAssignments = task.assignments.filter((assignment) => !assignment.unassigned_at);
                                            const pending = activeAssignments.filter((assignment) => !assignment.acknowledged_at).length;
                                            const recipientNames = Array.from(new Set(task.assignments.map((assignment) => assignment.employee_name)));
                                            return <tr key={task.id} className="hover:bg-slate-50/80">
                                                <td className="max-w-[230px] px-3 py-3 align-top">
                                                    <button type="button" onClick={() => setSelectedTask(task)} className="text-left font-semibold text-slate-900 hover:text-[#E31B23] hover:underline">{task.title}</button>
                                                    <div className="mt-1 truncate text-[11px] text-slate-500" title={`${task.project || 'General Task'} · ${task.creator || 'Unknown'}`}>{task.project || 'General Task'} · {task.creator || 'Unknown'}</div>
                                                </td>
                                                <td className="px-3 py-3 align-top"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 font-semibold ${statusStyles[task.status] || 'bg-slate-100 text-slate-700'}`}>{task.status}</span></td>
                                                <td className="px-3 py-3 align-top"><span className={`inline-block rounded-full px-2 py-1 font-semibold ${priorityStyles[task.priority || ''] || 'bg-slate-100 text-slate-500'}`}>{task.priority || '—'}</span></td>
                                                <td className="max-w-[175px] px-3 py-3 align-top text-slate-600" title={recipientNames.join(', ')}>
                                                    <span className="line-clamp-2">{recipientNames.slice(0, 2).join(', ')}</span>
                                                    {recipientNames.length > 2 && <span className="text-[11px] text-slate-400">+{recipientNames.length - 2} more</span>}
                                                    <div className="mt-0.5 text-[10px] text-slate-400">{task.assignments.length} assignment record(s)</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 align-top"><span className={task.is_overdue ? 'font-bold text-red-600' : 'text-slate-600'}>{shortDate(task.deadline)}</span>{task.is_overdue && <div className="mt-0.5 text-[10px] text-red-600">Overdue</div>}</td>
                                                <td className="px-3 py-3 align-top">
                                                    {activeAssignments.length === 0 ? <span className="text-slate-400">No active assignee</span> : pending > 0 ? <span className="font-semibold text-amber-700">{pending} pending / {activeAssignments.length}</span> : <span className="font-semibold text-emerald-700">✓ All acknowledged</span>}
                                                </td>
                                                <td className="max-w-[175px] px-3 py-3 align-top text-slate-500" title={task.latest_activity?.description || ''}>
                                                    <span className="line-clamp-2">{task.latest_activity?.description || '—'}</span>
                                                    {task.latest_activity && <div className="mt-0.5 text-[10px] text-slate-400">{dateTime(task.latest_activity.created_at)}</div>}
                                                </td>
                                                <td className="px-3 py-3 text-right align-top"><button type="button" onClick={() => setSelectedTask(task)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 font-semibold text-[#E31B23] hover:bg-red-100">View</button></td>
                                            </tr>;
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5 text-xs text-slate-600">
                            <span>Page {tasks.current_page} of {tasks.last_page}</span>
                            <div className="flex gap-2">
                                {tasks.prev_page_url && <Link href={tasks.prev_page_url} preserveScroll className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold hover:bg-slate-50">Previous</Link>}
                                {tasks.next_page_url && <Link href={tasks.next_page_url} preserveScroll className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold hover:bg-slate-50">Next</Link>}
                            </div>
                        </div>
                    </div>
                </> : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
                        <h3 className="text-sm font-semibold text-slate-800">Select a recipient department to begin</h3>
                        <p className="mt-1 text-xs text-slate-500">Department performance, tasks, and permanent assignment history will appear here.</p>
                    </div>
                )}
            </div>

            {selectedTask && (
                <TaskDetailModal
                    key={selectedTask.id}
                    task={selectedTask.detail}
                    currentUser={auth.user}
                    onClose={() => setSelectedTask(null)}
                    readOnly
                    assignmentHistory={selectedTask.assignments}
                />
            )}
        </AuthenticatedLayout>
    );
}
