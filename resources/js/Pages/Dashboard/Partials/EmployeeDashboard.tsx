import React from 'react';
import { Link } from '@inertiajs/react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';



const priorityColors: Record<string, string> = {
    Urgent: 'bg-red-100 text-red-700 border-red-200',
    High: 'bg-orange-100 text-orange-700 border-orange-200',
    Normal: 'bg-blue-100 text-blue-700 border-blue-200',
    Low: 'bg-gray-100 text-gray-600 border-gray-200',
};

const activityIcons: Record<string, { bg: string; icon: JSX.Element }> = {
    created: {
        bg: 'bg-emerald-100 text-emerald-600',
        icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    },
    updated: {
        bg: 'bg-blue-100 text-blue-600',
        icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    },
    commented: {
        bg: 'bg-purple-100 text-purple-600',
        icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    },
    status_changed: {
        bg: 'bg-amber-100 text-amber-600',
        icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    },
};

export default function EmployeeDashboard({ data }: { data: any }) {
    const summary = data?.tasksSummary || { todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 };
    const upcomingTasks = data?.upcomingTasks || [];
    const announcements = data?.announcements || [];
    const leaveStats = data?.leaveStats || { pending: 0, approved: 0 };
    const recentActivities = data?.recentActivities || [];
    const myServiceRequests = data?.myServiceRequests || [];

    const statCards = [
        { key: 'todo', label: 'To Do', gradient: 'from-slate-500 to-slate-600', href: route('tasks.index', { status: 'To Do' }), hint: 'View To Do tasks', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
        { key: 'in_progress', label: 'In Progress', gradient: 'from-blue-500 to-blue-600', href: route('tasks.index', { status: 'In Progress' }), hint: 'View In Progress tasks', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
        { key: 'review', label: 'Review', gradient: 'from-amber-500 to-amber-600', href: route('tasks.index', { status: 'Review' }), hint: 'View tasks under review', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
        { key: 'done', label: 'Completed', gradient: 'from-emerald-500 to-emerald-600', href: route('tasks.index', { filter: 'completed' }), hint: 'View completed tasks', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { key: 'overdue', label: 'Overdue', gradient: 'from-red-500 to-rose-600', href: route('tasks.index', { filter: 'overdue' }), hint: 'View overdue tasks', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg> },
    ];

    return (
        <div className="space-y-6">
            {/* Announcement Banner */}
            {announcements.length > 0 && (
                <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 text-white shadow-xs">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 rounded-lg bg-[#E31B23]/20 border border-[#E31B23]/30 p-2.5 text-[#f87171]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-slate-200 px-2 py-0.5 rounded">
                                    Announcement
                                </span>
                                <span className="text-xs text-slate-400">
                                    {announcements[0].creator?.name} · {new Date(announcements[0].published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <h4 className="font-semibold text-base text-white leading-snug">{announcements[0].title}</h4>
                            <p className="mt-1 text-xs sm:text-sm text-slate-300 line-clamp-2">{announcements[0].message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Actions & Leave Status Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Quick Actions */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-2xs border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
                        <svg className="w-4 h-4 text-[#E31B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Link href={route('leave.index')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-red-50/60 border border-slate-200/70 hover:border-red-200 rounded-xl transition-colors group">
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs text-[#E31B23]">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <span className="mt-2.5 text-xs font-semibold text-slate-800 group-hover:text-[#E31B23]">Leave Request</span>
                        </Link>
                        <Link href={route('overtime.index')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-sky-50/60 border border-slate-200/70 hover:border-sky-200 rounded-xl transition-colors group">
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs text-sky-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <span className="mt-2.5 text-xs font-semibold text-slate-800 group-hover:text-sky-700">Overtime</span>
                        </Link>
                        <Link href={route('payroll.my')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/70 hover:border-emerald-200 rounded-xl transition-colors group">
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs text-emerald-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <span className="mt-2.5 text-xs font-semibold text-slate-800 group-hover:text-emerald-700">My Payslips</span>
                        </Link>
                        <Link href={route('tasks.index')} className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-amber-50/60 border border-slate-200/70 hover:border-amber-200 rounded-xl transition-colors group">
                            <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs text-amber-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            </div>
                            <span className="mt-2.5 text-xs font-semibold text-slate-800 group-hover:text-amber-700">List Task</span>
                        </Link>
                    </div>
                </div>

                {/* Leave Status */}
                <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-5">
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4">
                        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Leave Status
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-amber-700">{leaveStats.pending}</div>
                                    <div className="text-xs font-medium text-amber-600">Pending</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-emerald-700">{leaveStats.approved}</div>
                                    <div className="text-xs font-medium text-emerald-600">Approved (Year)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Link href={route('leave.index')} className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        View Leave Requests →
                    </Link>
                </div>
            </div>

            {/* My Active Service Requests (Unified Services Hub) */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/80 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-red-50 text-[#E31B23]">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">My Active Service Requests</h3>
                            <p className="text-xs text-gray-500">Track all your active requests across IT, Keys, Facilities, and HR</p>
                        </div>
                    </div>
                    {myServiceRequests.length > 0 && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {myServiceRequests.length} Active
                        </span>
                    )}
                </div>

                {myServiceRequests.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {myServiceRequests.map((req: any, index: number) => (
                            <Link
                                key={`${req.type}-${req.id}-${index}`}
                                href={req.url}
                                className="group flex flex-col justify-between p-4 rounded-xl border border-gray-100 hover:border-red-200 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-200"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            req.badge_color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                                            req.badge_color === 'rose' ? 'bg-rose-100 text-rose-800' :
                                            req.badge_color === 'amber' ? 'bg-amber-100 text-amber-800' :
                                            req.badge_color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                            {req.type}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white border border-gray-200 text-gray-700 shadow-2xs">
                                            {req.status}
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-gray-800 group-hover:text-[#E31B23] transition-colors line-clamp-1">
                                        {req.title}
                                    </h4>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                                    <span>{new Date(req.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span className="text-[#E31B23] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                        View Details →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 px-4 text-center rounded-xl bg-gray-50/50 border border-dashed border-gray-200">
                        <p className="text-xs font-medium text-gray-500">No active service requests pending right now.</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Need a room key, IT help, leave, or overtime? Submit a request using Quick Actions or the module menus.</p>
                    </div>
                )}
            </div>

            {/* Task Overview */}
            <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Task Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {statCards.map(card => (
                        <Link
                            key={card.key}
                            href={card.href}
                            title={card.hint}
                            className="group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-gray-100/80 p-5 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1.5 block cursor-pointer"
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${card.gradient} opacity-5 rounded-bl-full group-hover:opacity-15 transition-opacity`} />
                            <div className="flex items-center justify-between mb-4">
                                <div className={`inline-flex rounded-xl bg-gradient-to-br ${card.gradient} p-2.5 text-white shadow-sm`}>
                                    {card.icon}
                                </div>
                                <span className="text-[11px] font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Open →
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{(summary as any)[card.key]}</div>
                            <div className="text-xs font-medium text-gray-500 mt-0.5">{card.label}</div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Three-column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Deadlines */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/80 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50/50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Upcoming Deadlines
                        </h3>
                        <Link href={route('tasks.index')} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View All →</Link>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {upcomingTasks.length > 0 ? upcomingTasks.map((task: any) => {
                            const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'Done';
                            const daysLeft = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={task.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${priorityColors[task.priority] || 'bg-gray-100 text-gray-600'}`}>
                                                    {task.priority}
                                                </span>
                                                <span className="text-xs text-gray-400">{task.status}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className={`text-xs font-bold ${isOverdue ? 'text-red-600' : daysLeft <= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                                                {new Date(task.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                            </p>
                                            <p className={`text-[10px] mt-0.5 font-medium ${isOverdue ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="px-5 py-8 text-center">
                                <svg className="mx-auto w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="mt-2 text-sm text-gray-400">No upcoming deadlines 🎉</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance Card */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/80 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50/50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            My Performance
                        </h3>
                    </div>
                    {data?.latestPerformanceScore ? (
                        <div className="p-6 flex flex-col items-center">
                            <div className="relative">
                                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f4f6" strokeWidth="12" />
                                    <circle cx="60" cy="60" r="52" fill="none" 
                                        stroke={data.latestPerformanceScore.final_epi >= 80 ? '#6366f1' : data.latestPerformanceScore.final_epi >= 60 ? '#f59e0b' : '#ef4444'} 
                                        strokeWidth="12" strokeLinecap="round"
                                        strokeDasharray={`${(data.latestPerformanceScore.final_epi / 100) * 327} 327`}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-gray-800">{data.latestPerformanceScore.final_epi}</span>
                                    <span className="text-[10px] text-gray-400 font-medium uppercase">EPI Score</span>
                                </div>
                            </div>
                            <span className={`mt-4 px-4 py-1.5 text-sm font-semibold rounded-full ${
                                data.latestPerformanceScore.category === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                                data.latestPerformanceScore.category === 'Very Good' ? 'bg-blue-100 text-blue-700' :
                                data.latestPerformanceScore.category === 'Good' ? 'bg-amber-100 text-amber-700' :
                                data.latestPerformanceScore.category === 'Needs Improvement' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {data.latestPerformanceScore.category}
                            </span>
                            <Link 
                                href={route('performance.show', [data.latestPerformanceScore.employee_id, data.latestPerformanceScore.performance_period_id])} 
                                className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                View Details →
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 px-6">
                            <div className="rounded-full bg-gray-100 p-4">
                                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <p className="mt-3 text-sm text-gray-400 text-center">No performance data available yet</p>
                        </div>
                    )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/80 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50/50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Recent Activity
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentActivities.length > 0 ? recentActivities.map((activity: any) => {
                            const actIcon = activityIcons[activity.action] || activityIcons.updated;
                            return (
                                <div key={activity.id} className="px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className={`flex-shrink-0 rounded-full p-1.5 mt-0.5 ${actIcon.bg}`}>
                                            {actIcon.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-gray-700">
                                                <span className="font-medium capitalize">{activity.action.replace('_', ' ')}</span>
                                                {activity.task && (
                                                    <span className="text-gray-500"> on <span className="font-medium text-gray-700">{activity.task.title}</span></span>
                                                )}
                                            </p>
                                            {activity.description && (
                                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{activity.description}</p>
                                            )}
                                            <p className="text-[10px] text-gray-300 mt-1">
                                                {new Date(activity.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} · {new Date(activity.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="px-5 py-8 text-center">
                                <svg className="mx-auto w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                <p className="mt-2 text-sm text-gray-400">No recent activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Task Distribution Chart */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/80 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50/50">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                        Task Distribution
                    </h3>
                </div>
                <div className="p-6 flex justify-center items-center h-64">
                    {((summary.todo || 0) + (summary.in_progress || 0) + (summary.review || 0) + (summary.done || 0)) > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'To Do', value: summary.todo, color: '#64748b' },
                                        { name: 'In Progress', value: summary.in_progress, color: '#3b82f6' },
                                        { name: 'Review', value: summary.review, color: '#f59e0b' },
                                        { name: 'Completed', value: summary.done, color: '#10b981' },
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {
                                        [
                                            { name: 'To Do', value: summary.todo, color: '#64748b' },
                                            { name: 'In Progress', value: summary.in_progress, color: '#3b82f6' },
                                            { name: 'Review', value: summary.review, color: '#f59e0b' },
                                            { name: 'Completed', value: summary.done, color: '#10b981' },
                                        ].filter(d => d.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))
                                    }
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} tasks`, 'Count']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-sm text-gray-400">No task data available.</p>
                            <p className="text-xs text-gray-300 mt-1">Tasks assigned to you will be charted here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
