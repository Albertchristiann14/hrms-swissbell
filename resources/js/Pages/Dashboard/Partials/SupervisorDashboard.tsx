import React from 'react';
import { Link } from '@inertiajs/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatCard from '@/Components/StatCard';

export default function SupervisorDashboard({ data }: { data: any }) {
    const stats = {
        activeProjects: data?.activeProjects ?? 0,
        totalTasks: data?.totalTasks ?? 0,
        completedTasks: data?.completedTasks ?? 0,
        overdueTasks: data?.overdueTasks ?? 0,
        pendingReview: data?.pendingReview ?? 0,
    };
    const teamWorkload = data?.teamWorkload || [];
    const announcements = data?.announcements || [];
    const teamAttendance = data?.teamAttendanceSummary || { total: 0, present: 0, late: 0, absent: 0 };
    const pendingLeaves = data?.pendingLeaves ?? 0;
    const projectProgress = data?.projectProgress || [];

    const statItems = [
        { 
            label: 'Active Projects', 
            value: stats.activeProjects, 
            status: 'info' as const,
            href: route('projects.index', { status: 'Active' }),
            hint: 'View active projects',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> 
        },
        { 
            label: 'Total Tasks', 
            value: stats.totalTasks, 
            status: 'neutral' as const,
            href: route('tasks.index'),
            hint: 'View all tasks',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> 
        },
        { 
            label: 'Completed', 
            value: stats.completedTasks, 
            status: 'success' as const,
            href: route('tasks.index', { filter: 'completed' }),
            hint: 'View completed tasks',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
        },
        { 
            label: 'Overdue', 
            value: stats.overdueTasks, 
            status: (stats.overdueTasks > 0 ? 'danger' : 'neutral') as 'danger' | 'neutral',
            href: route('tasks.index', { filter: 'overdue' }),
            hint: 'View overdue tasks',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg> 
        },
        { 
            label: 'Pending Review', 
            value: stats.pendingReview, 
            status: (stats.pendingReview > 0 ? 'warning' : 'neutral') as 'warning' | 'neutral',
            href: route('tasks.index', { status: 'Review' }),
            hint: 'View tasks pending review',
            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> 
        },
    ];

    const chartData = teamWorkload.map((emp: any) => ({
        name: emp.user?.name || 'Unknown',
        tasks: emp.active_tasks_count || 0
    }));

    const statusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-emerald-100 text-emerald-700';
            case 'Planning': return 'bg-sky-100 text-sky-700';
            case 'On Hold': return 'bg-amber-100 text-amber-700';
            case 'Completed': return 'bg-slate-100 text-slate-600';
            case 'Cancelled': return 'bg-rose-100 text-rose-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

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

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {statItems.map((stat, idx) => (
                    <StatCard
                        key={idx}
                        label={stat.label}
                        value={stat.value}
                        status={stat.status}
                        href={stat.href}
                        actionLabel={stat.hint}
                        icon={stat.icon}
                    />
                ))}
            </div>

            {/* Team Attendance + Pending Approvals Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team Attendance Today */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Team Attendance Today
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-3 rounded-lg bg-gray-50">
                            <div className="text-xl font-bold text-gray-700">{teamAttendance.total}</div>
                            <div className="text-[10px] font-semibold text-gray-500 uppercase">Total</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-emerald-50">
                            <div className="text-xl font-bold text-emerald-700">{teamAttendance.present}</div>
                            <div className="text-[10px] font-semibold text-emerald-600 uppercase">Present</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-amber-50">
                            <div className="text-xl font-bold text-amber-700">{teamAttendance.late}</div>
                            <div className="text-[10px] font-semibold text-amber-600 uppercase">Late</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-red-50">
                            <div className="text-xl font-bold text-red-700">{teamAttendance.absent}</div>
                            <div className="text-[10px] font-semibold text-red-600 uppercase">Absent</div>
                        </div>
                    </div>
                    {teamAttendance.total > 0 && (
                        <div className="mt-4">
                            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-gray-100">
                                {teamAttendance.present - teamAttendance.late > 0 && (
                                    <div className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" style={{ width: `${((teamAttendance.present - teamAttendance.late) / teamAttendance.total) * 100}%` }} />
                                )}
                                {teamAttendance.late > 0 && (
                                    <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(teamAttendance.late / teamAttendance.total) * 100}%` }} />
                                )}
                                {teamAttendance.absent > 0 && (
                                    <div className="h-full bg-red-400 rounded-r-full transition-all duration-500" style={{ width: `${(teamAttendance.absent / teamAttendance.total) * 100}%` }} />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Pending Approvals */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Pending Approvals
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-amber-700">{pendingLeaves}</div>
                                    <div className="text-xs font-medium text-amber-600">Leave Requests</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-100">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-indigo-700">{stats.pendingReview}</div>
                                    <div className="text-xs font-medium text-indigo-600">Task Reviews</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <Link href={route('leave.index')} className="mt-4 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        View All Requests →
                    </Link>
                </div>
            </div>

            {/* Project Progress + Team Workload Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Progress */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Project Progress
                        </h3>
                        <span className="text-xs text-gray-400">{projectProgress.length} projects</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {projectProgress.length > 0 ? projectProgress.slice(0, 5).map((project: any) => {
                            const progressColor = project.progress >= 75 ? 'bg-emerald-500' : project.progress >= 40 ? 'bg-blue-500' : project.progress >= 20 ? 'bg-amber-500' : 'bg-gray-400';
                            return (
                                <div key={project.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <h4 className="text-sm font-semibold text-gray-800 truncate">{project.name}</h4>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 ${statusColor(project.status)}`}>
                                                {project.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                            <span className="text-xs text-gray-400">{project.completed_tasks}/{project.total_tasks}</span>
                                            <span className="text-sm font-bold text-gray-700">{project.progress}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div className={`h-full rounded-full ${progressColor} transition-all duration-700`} style={{ width: `${project.progress}%` }} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="px-5 py-8 text-center">
                                <p className="text-sm text-gray-400">No active projects</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Workload Chart */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Team Workload (Active Tasks)
                        </h3>
                        <span className="text-xs text-gray-400">{teamWorkload.length} members</span>
                    </div>
                    <div className="p-5 h-80">
                        {teamWorkload.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                                    <Bar dataKey="tasks" radius={[0, 4, 4, 0]}>
                                        {chartData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.tasks > 10 ? '#ef4444' : entry.tasks > 6 ? '#f59e0b' : '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">No team members found.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
