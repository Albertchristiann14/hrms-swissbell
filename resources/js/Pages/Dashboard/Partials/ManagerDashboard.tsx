import React from 'react';
import { Link } from '@inertiajs/react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';


export default function ManagerDashboard({ data }: { data: any }) {
    const stats = {
        activeProjects: data?.activeProjects ?? 0,
        activeTasks: data?.activeTasks ?? 0,
        completedThisMonth: data?.completedThisMonth ?? 0,
        overdueTasks: data?.overdueTasks ?? 0,
    };
    const projectProgress = data?.projectProgress || [];
    const taskStatusDistribution = data?.taskStatusDistribution || [];
    const announcements = data?.announcements || [];
    const attendanceRate = data?.attendanceRate ?? 0;
    const totalEmployees = data?.totalEmployees ?? 0;
    const pendingLeaves = data?.pendingLeaves ?? 0;
    const pendingOvertime = data?.pendingOvertime ?? 0;
    const departmentPerformance = data?.departmentPerformance || [];

    const statItems = [
        {
            label: 'Active Projects',
            value: stats.activeProjects,
            gradient: 'from-indigo-500 to-indigo-600',
            href: route('projects.index', { status: 'Active' }),
            hint: 'View active projects',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        },
        {
            label: 'Active Tasks',
            value: stats.activeTasks,
            gradient: 'from-blue-500 to-blue-600',
            href: route('tasks.index', { filter: 'active' }),
            hint: 'View active tasks',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        },
        {
            label: 'Completed (Month)',
            value: stats.completedThisMonth,
            gradient: 'from-emerald-500 to-emerald-600',
            href: route('tasks.index', { filter: 'completed' }),
            hint: 'View tasks completed this month',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        },
        {
            label: 'Overdue Tasks',
            value: stats.overdueTasks,
            gradient: 'from-red-500 to-rose-600',
            href: route('tasks.index', { filter: 'overdue' }),
            hint: 'View overdue tasks',
            icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        },
    ];

    const statusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-emerald-100 text-emerald-700';
            case 'Planning': return 'bg-blue-100 text-blue-700';
            case 'On Hold': return 'bg-amber-100 text-amber-700';
            case 'Completed': return 'bg-gray-100 text-gray-600';
            case 'Cancelled': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const taskColors: Record<string, string> = {
        'To Do': '#64748b',
        'In Progress': '#3b82f6',
        'Review': '#f59e0b',
        'Done': '#f59e0b',
        'Approved': '#10b981',
        'Cancelled': '#9ca3af',
    };

    return (
        <div className="space-y-6">


            {/* Announcement Banner */}
            {announcements.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E31B23] via-[#c4141b] to-[#991b1b] p-6 text-white shadow-lg">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-40" />
                    <div className="relative flex items-start gap-4">
                        <div className="flex-shrink-0 rounded-lg bg-white/10 p-2.5 backdrop-blur-sm">
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-lg leading-tight">{announcements[0].title}</h4>
                            <p className="mt-1 text-sm text-indigo-100 line-clamp-2">{announcements[0].message}</p>
                            <p className="mt-2 text-xs text-indigo-200">
                                {announcements[0].creator?.name} · {new Date(announcements[0].published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Executive Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statItems.map((stat, idx) => (
                    <Link
                        key={idx}
                        href={stat.href}
                        className="group relative overflow-hidden rounded-xl bg-white border border-gray-100 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-200 hover:-translate-y-1 block cursor-pointer"
                        title={stat.hint}
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${stat.gradient} opacity-5 rounded-bl-full group-hover:opacity-15 transition-opacity`} />
                        <div className="flex items-center justify-between mb-3">
                            <div className={`inline-flex rounded-lg bg-gradient-to-br ${stat.gradient} p-2 text-white shadow-sm`}>
                                {stat.icon}
                            </div>
                            <span className="text-xs font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                Open →
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{stat.value}</div>
                        <div className="text-xs font-medium text-gray-500 mt-0.5">{stat.label}</div>
                    </Link>
                ))}
            </div>

            {/* Attendance Rate + Pending Approvals Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance Rate */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Monthly Attendance
                    </h3>
                    <div className="flex items-center gap-5">
                        <div className="relative flex-shrink-0">
                            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="48" fill="none" stroke="#f3f4f6" strokeWidth="14" />
                                <circle cx="60" cy="60" r="48" fill="none"
                                    stroke={attendanceRate >= 90 ? '#10b981' : attendanceRate >= 75 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="14" strokeLinecap="round"
                                    strokeDasharray={`${(attendanceRate / 100) * 301.6} 301.6`}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-gray-800">{attendanceRate}%</span>
                                <span className="text-[9px] text-gray-400 font-semibold uppercase">Rate</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Total employees</div>
                            <div className="text-2xl font-bold text-gray-800">{totalEmployees}</div>
                        </div>
                    </div>
                </div>

                {/* Pending Leave */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Pending Leaves
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 flex-1 text-center">
                            <div className="text-4xl font-bold text-amber-700">{pendingLeaves}</div>
                            <div className="text-xs font-medium text-amber-600 mt-1">Requests Waiting</div>
                        </div>
                    </div>
                    <Link href={route('leave.index')} className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        Review Requests →
                    </Link>
                </div>

                {/* Pending Overtime */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Pending Overtime
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 flex-1 text-center">
                            <div className="text-4xl font-bold text-purple-700">{pendingOvertime}</div>
                            <div className="text-xs font-medium text-purple-600 mt-1">Requests Waiting</div>
                        </div>
                    </div>
                    <Link href={route('overtime.index')} className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                        Review Requests →
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Progress */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            Project Progress Overview
                        </h3>
                        <span className="text-xs text-gray-400">{projectProgress.length} projects</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {projectProgress.length > 0 ? projectProgress.map((project: any) => {
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
                                            <span className="text-xs text-gray-400">{project.completed_tasks}/{project.total_tasks} tasks</span>
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
                                <p className="text-sm text-gray-400">No projects found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Overall Task Status Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                            Overall Task Distribution
                        </h3>
                    </div>
                    <div className="p-6 flex justify-center items-center h-80">
                        {taskStatusDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={taskStatusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="count"
                                        nameKey="status"
                                    >
                                        {taskStatusDistribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={taskColors[entry.status] || '#9ca3af'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} tasks`, 'Count']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-gray-400 text-center">No task data available.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Department Performance */}
            {departmentPerformance.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            Department Task History
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Department</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Employees</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Active Tasks</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Approved</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Completion Rate</th>
                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {departmentPerformance.map((dept: any) => {
                                    const totalTasks = (dept.total_active_tasks || 0) + (dept.total_completed_tasks || 0);
                                    const completionRate = totalTasks > 0 ? Math.round((dept.total_completed_tasks / totalTasks) * 100) : 0;
                                    return (
                                        <tr key={dept.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {dept.name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="font-medium text-gray-800">{dept.name}</span>
                                                </div>
                                            </td>
                                            <td className="text-center px-4 py-3.5 font-semibold text-gray-700">{dept.employees_count}</td>
                                            <td className="text-center px-4 py-3.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">{dept.total_active_tasks || 0}</span>
                                            </td>
                                            <td className="text-center px-4 py-3.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">{dept.total_completed_tasks || 0}</span>
                                            </td>
                                            <td className="text-center px-4 py-3.5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${completionRate >= 75 ? 'bg-emerald-500' : completionRate >= 50 ? 'bg-blue-500' : completionRate >= 25 ? 'bg-amber-500' : 'bg-gray-400'}`} style={{ width: `${completionRate}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-600">{completionRate}%</span>
                                                </div>
                                            </td>
                                            <td className="text-center px-4 py-3.5">
                                                <Link
                                                    href={route('dashboard.departments.tasks.history', { department: dept.id })}
                                                    className="inline-flex items-center rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                                >
                                                    View History →
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
