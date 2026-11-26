import React from 'react';
import { Link } from '@inertiajs/react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate } from '@/Utils/date';
import StatCard from '@/Components/StatCard';
import { Card, CardHeader, CardBody } from '@/Components/Card';

export default function HRDashboard({ data }: { data: any }) {
    const stats = {
        employeeCount: data?.employeeCount ?? 0,
        departmentCount: data?.departmentCount ?? 0,
    };
    const employeeWorkload = data?.employeeWorkload || [];
    const departmentDistribution = data?.departmentDistribution || [];
    const announcements = data?.announcements || [];
    const attendanceToday = data?.attendanceTodaySummary || { total: 0, present: 0, late: 0, absent: 0 };
    const pendingLeaves = data?.pendingLeaves ?? 0;
    const pendingOvertime = data?.pendingOvertime ?? 0;
    const recentHires = data?.recentHires || [];

    const hasAttendanceRecords = attendanceToday?.has_records !== undefined 
        ? Boolean(attendanceToday.has_records) 
        : (attendanceToday.present > 0 || attendanceToday.late > 0);

    const attendanceRate = attendanceToday.total > 0 && hasAttendanceRecords
        ? Math.round((attendanceToday.present / attendanceToday.total) * 100)
        : 0;

    const statItems = [
        { label: 'Total Employees', value: stats.employeeCount, status: 'info' as const, href: route('employees.index'), actionLabel: 'View Employees', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        { label: 'Departments', value: stats.departmentCount, status: 'success' as const, href: route('departments.index'), actionLabel: 'View Departments', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
        { label: 'Pending Leaves', value: pendingLeaves, status: (pendingLeaves > 0 ? 'warning' : 'neutral') as 'warning' | 'neutral', href: route('leave.index'), actionLabel: 'Review Leaves', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { label: 'Pending Overtime', value: pendingOvertime, status: (pendingOvertime > 0 ? 'warning' : 'neutral') as 'warning' | 'neutral', href: route('overtime.index'), actionLabel: 'Review Overtime', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    ];

    const maxWorkload = Math.max(...employeeWorkload.map((e: any) => e.active_tasks_count || 0), 1);

    const COLORS = ['#0F172A', '#0284C7', '#059669', '#D97706', '#E31B23', '#64748B'];

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statItems.map((stat, idx) => (
                    <StatCard
                        key={idx}
                        label={stat.label}
                        value={stat.value}
                        status={stat.status}
                        href={stat.href}
                        actionLabel={stat.actionLabel}
                        icon={stat.icon}
                    />
                ))}
            </div>

            {/* Attendance Today + Recent Hires Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Today */}
                <Card>
                    <CardHeader
                        title="Today's Attendance"
                        action={
                            <Link href={route('attendance.index')} className="text-xs text-[#E31B23] hover:text-[#c4141b] font-semibold">
                                View All →
                            </Link>
                        }
                    />
                    <CardBody>
                    {/* Attendance Content */}
                    {!hasAttendanceRecords ? (
                        <div className="py-6 px-4 text-center rounded-xl bg-slate-50 border border-slate-100">
                            <svg className="mx-auto w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-semibold text-slate-700">Belum ada data absensi hari ini</p>
                            <p className="text-xs text-slate-400 mt-0.5">Catatan kehadiran staff untuk hari ini belum tercatat pada sistem.</p>
                            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-200/60 text-center">
                                <div className="p-2 rounded-lg bg-white border border-slate-100">
                                    <div className="text-sm font-bold text-slate-400">–</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase">Present</div>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-slate-100">
                                    <div className="text-sm font-bold text-slate-400">–</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase">Late</div>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-slate-100">
                                    <div className="text-sm font-bold text-slate-400">–</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase">Absent</div>
                                </div>
                                <div className="p-2 rounded-lg bg-white border border-slate-100">
                                    <div className="text-sm font-bold text-slate-700">{attendanceToday.total}</div>
                                    <div className="text-[10px] text-slate-500 font-medium uppercase">Total</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-6">
                            {/* Ring chart */}
                            <div className="relative flex-shrink-0">
                                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="48" fill="none" stroke="#f3f4f6" strokeWidth="14" />
                                    <circle cx="60" cy="60" r="48" fill="none"
                                        stroke="#10b981"
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
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <div className="text-center p-3 rounded-lg bg-emerald-50">
                                    <div className="text-xl font-bold text-emerald-700">{attendanceToday.present}</div>
                                    <div className="text-[10px] font-semibold text-emerald-600 uppercase">Present</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-amber-50">
                                    <div className="text-xl font-bold text-amber-700">{attendanceToday.late}</div>
                                    <div className="text-[10px] font-semibold text-amber-600 uppercase">Late</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-red-50">
                                    <div className="text-xl font-bold text-red-700">{attendanceToday.absent}</div>
                                    <div className="text-[10px] font-semibold text-red-600 uppercase">Absent</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <div className="text-xl font-bold text-slate-700">{attendanceToday.total}</div>
                                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Total</div>
                                </div>
                            </div>
                        </div>
                    )}
                    </CardBody>
                </Card>

                {/* Recent Hires */}
                <Card>
                    <CardHeader
                        title="Recent Hires"
                        action={
                            <Link href={route('employees.index')} className="text-xs text-[#E31B23] hover:text-[#c4141b] font-semibold">
                                View All →
                            </Link>
                        }
                    />
                    <div className="divide-y divide-slate-100">
                        {recentHires.length > 0 ? recentHires.map((emp: any) => {
                            const pos = emp.position?.name;
                            const dept = emp.department?.name;
                            let subLabel = 'Belum diatur';
                            if (pos && dept) {
                                subLabel = `${pos} · ${dept}`;
                            } else if (pos) {
                                subLabel = pos;
                            } else if (dept) {
                                subLabel = dept;
                            }

                            return (
                                <div key={emp.id} className="px-5 py-3.5 hover:bg-slate-50/70 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {emp.user?.name?.charAt(0) || '?'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">{emp.user?.name}</p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {subLabel}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-slate-500 font-medium">
                                                {emp.join_date ? formatDate(emp.join_date) : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="px-5 py-8 text-center">
                                <p className="text-sm text-slate-400">No recent hires</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Distribution */}
                <Card>
                    <CardHeader title="Employee Distribution" />
                    <div className="p-6 flex justify-center items-center h-80">
                        {departmentDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={departmentDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="employees_count"
                                        nameKey="name"
                                    >
                                        {departmentDistribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} employees`, 'Count']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-sm text-slate-400 text-center">No department data available.</p>
                        )}
                    </div>
                </Card>

                {/* Top Employee Workload */}
                <Card>
                    <CardHeader
                        title="Top Employee Workload"
                        action={
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70">
                                Top {employeeWorkload.length}
                            </span>
                        }
                    />
                    <div className="p-5 space-y-3">
                        {employeeWorkload.length > 0 ? employeeWorkload.map((employee: any, idx: number) => {
                            const count = employee.active_tasks_count || 0;
                            const percentage = Math.round((count / maxWorkload) * 100);
                            const barColor = count > 10 ? 'bg-rose-500' : count > 6 ? 'bg-amber-500' : 'bg-emerald-500';
                            
                            return (
                                <div key={employee.id} className="flex items-center gap-4">
                                    <span className="text-xs font-semibold text-slate-400 w-5 text-right tabular-nums">{idx + 1}</span>
                                    <div className="flex items-center gap-3 w-40 flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                                            {employee.user?.name?.charAt(0) || '?'}
                                        </div>
                                        <p className="text-sm font-medium text-slate-800 truncate">{employee.user?.name}</p>
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className={`h-full rounded-full ${barColor} transition-all duration-300`} style={{ width: `${percentage}%` }} />
                                        </div>
                                    </div>
                                    <span className={`text-xs font-semibold w-14 text-right tabular-nums ${count > 10 ? 'text-rose-600' : count > 6 ? 'text-amber-600' : 'text-slate-700'}`}>
                                        {count} tasks
                                    </span>
                                </div>
                            );
                        }) : (
                            <p className="text-sm text-slate-400 text-center py-6">No workload data available.</p>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
