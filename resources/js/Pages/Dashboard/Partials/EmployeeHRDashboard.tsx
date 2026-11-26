import React, { useState } from 'react';
import { Link } from '@inertiajs/react';

interface EmployeeHRDashboardProps {
    data: {
        attendanceToday?: any;
        monthlyAttendance?: {
            present: number;
            late: number;
            absent: number;
            total: number;
        };
        leaveStats?: {
            pending: number;
            approved: number;
        };
        recentLeaves?: any[];
        recentOvertime?: any[];
        pendingOvertime?: number;
        latestPayslip?: any;
        supervisorData?: any;
        announcements?: any[];
        role?: string;
        user?: any;
    };
}

export default function EmployeeHRDashboard({ data }: EmployeeHRDashboardProps) {
    const user = data?.user || {};
    const employee = user?.employee || {};
    const role = data?.role || 'Staff / Employee';
    const isSupervisor = ['Supervisor', 'Head of Department'].includes(role);
    const supervisorData = data?.supervisorData;
    const teamAttendance = supervisorData?.teamAttendanceSummary || { total: 0, present: 0, late: 0, absent: 0 };
    const teamPendingLeaves = supervisorData?.pendingLeaves ?? 0;

    const attendanceToday = data?.attendanceToday;
    const monthlyAttendance = data?.monthlyAttendance || { present: 0, late: 0, absent: 0, total: 0 };
    const leaveStats = data?.leaveStats || { pending: 0, approved: 0 };
    const recentLeaves = data?.recentLeaves || [];
    const recentOvertime = data?.recentOvertime || [];
    const latestPayslip = data?.latestPayslip;
    const announcements = data?.announcements || [];

    const [showSalary, setShowSalary] = useState(false);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'Pending':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Rejected':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Announcements Banner */}
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
                                    Company Notice
                                </span>
                                <span className="text-xs text-slate-400">
                                    {announcements[0].creator?.name} · {new Date(announcements[0].published_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <h4 className="font-semibold text-base text-white leading-snug">{announcements[0].title}</h4>
                            <p className="mt-1 text-xs sm:text-sm text-slate-300 line-clamp-2">{announcements[0].message || announcements[0].content}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile & Employee Header Card */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center text-white text-lg font-bold shrink-0">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'E'}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-slate-900 leading-tight">{user.name}</h3>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100/70 text-[#E31B23]">
                                    {role}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {employee.position?.name || 'Staff'} • {employee.department?.name || 'Hotel Operations'}
                                {employee.nip ? ` • NIP: ${employee.nip}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                        <Link
                            href={route('leave.index')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#E31B23] hover:bg-[#c4141b] shadow-xs shadow-red-500/20 transition-all hover:scale-102"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Ajukan Cuti</span>
                        </Link>
                        <Link
                            href={route('overtime.index')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/60 transition-all hover:scale-102"
                        >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Ajukan SPKL</span>
                        </Link>
                        <Link
                            href={route('directory.index')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-all"
                            title="Buka direktori nomor kontak & staf"
                        >
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Direktori Staf</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Supervisor / HOD Team Oversight (Only visible if role is Supervisor or HOD) */}
            {isSupervisor && supervisorData && (
                <div className="bg-gradient-to-r from-purple-50/80 via-indigo-50/50 to-blue-50/50 border border-purple-200/70 rounded-2xl p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-purple-600 text-white shadow-2xs">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Team HR Management ({role})</h3>
                        </div>
                        <span className="text-xs font-semibold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                            {teamAttendance.total} Team Members
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white/90 p-3.5 rounded-xl border border-purple-100">
                            <span className="text-[11px] font-medium text-slate-500">Hadir Hari Ini</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-xl font-bold text-emerald-600">{teamAttendance.present}</span>
                                <span className="text-[10px] text-slate-400">/ {teamAttendance.total}</span>
                            </div>
                        </div>
                        <div className="bg-white/90 p-3.5 rounded-xl border border-purple-100">
                            <span className="text-[11px] font-medium text-slate-500">Terlambat (Late)</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-xl font-bold text-amber-600">{teamAttendance.late}</span>
                            </div>
                        </div>
                        <Link href={route('leave.index')} className="bg-white/90 p-3.5 rounded-xl border border-purple-100 hover:border-purple-300 transition-colors group">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-slate-500">Pengajuan Cuti Tim</span>
                                <span className="text-xs text-purple-600 group-hover:translate-x-0.5 transition-transform">→</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-xl font-bold text-indigo-600">{teamPendingLeaves}</span>
                                <span className="text-[10px] text-amber-600 font-semibold">Menunggu Review</span>
                            </div>
                        </Link>
                        <Link href={route('overtime.index')} className="bg-white/90 p-3.5 rounded-xl border border-purple-100 hover:border-purple-300 transition-colors group">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-slate-500">SPKL Lembur Tim</span>
                                <span className="text-xs text-purple-600 group-hover:translate-x-0.5 transition-transform">→</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-xl font-bold text-rose-600">{data?.pendingOvertime || 0}</span>
                                <span className="text-[10px] text-amber-600 font-semibold">Menunggu Review</span>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Service Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Link
                    href={route('attendance.my')}
                    className="group p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-200 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                            🕒
                        </div>
                        <span className="text-xs text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Buka →
                        </span>
                    </div>
                    <div className="mt-3">
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                            Presensi Saya
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {attendanceToday ? (attendanceToday.clock_in ? `Masuk: ${attendanceToday.clock_in}` : 'Belum Absen') : 'Riwayat & Jam Kerja'}
                        </p>
                    </div>
                </Link>

                <Link
                    href={route('leave.index')}
                    className="group p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-sky-200 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                            🏖️
                        </div>
                        {leaveStats.pending > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white">
                                {leaveStats.pending} Pending
                            </span>
                        )}
                    </div>
                    <div className="mt-3">
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                            Permohonan Cuti
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {leaveStats.approved} Cuti disetujui tahun ini
                        </p>
                    </div>
                </Link>

                <Link
                    href={route('overtime.index')}
                    className="group p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-200 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                            ⚡
                        </div>
                        {(data?.pendingOvertime || 0) > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                                {data?.pendingOvertime} Aktif
                            </span>
                        )}
                    </div>
                    <div className="mt-3">
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-rose-700 transition-colors">
                            Lembur (SPKL)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Form & tracking surat perintah lembur
                        </p>
                    </div>
                </Link>

                <Link
                    href={route('payroll.my')}
                    className="group p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-200 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
                >
                    <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                            💵
                        </div>
                        <span className="text-xs text-teal-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Slip Gaji →
                        </span>
                    </div>
                    <div className="mt-3">
                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                            Slip Gaji Digital
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {latestPayslip?.period?.name || 'Rincian gaji & tunjangan'}
                        </p>
                    </div>
                </Link>
            </div>

            {/* Attendance & Monthly Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Status */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Kehadiran Hari Ini
                            </h3>
                            <span className="text-xs text-slate-400">
                                {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                        </div>

                        {attendanceToday ? (
                            <div className="space-y-3">
                                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Status Presensi</span>
                                        <p className="text-base font-bold text-emerald-900 mt-0.5">{attendanceToday.status}</p>
                                    </div>
                                    <span className="text-2xl">✅</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 text-[10px] block">Clock In</span>
                                        <span className="font-bold text-slate-800 text-sm">{attendanceToday.clock_in || '-'}</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                        <span className="text-slate-400 text-[10px] block">Clock Out</span>
                                        <span className="font-bold text-slate-800 text-sm">{attendanceToday.clock_out || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                                <div className="text-3xl">⏳</div>
                                <p className="text-xs text-slate-600 font-medium">Belum ada catatan presensi hari ini</p>
                                <p className="text-[11px] text-slate-400">Presensi akan tersinkronisasi otomatis dengan mesin fingerprint hotel.</p>
                            </div>
                        )}
                    </div>

                    <Link
                        href={route('attendance.my')}
                        className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                        <span>Lihat Riwayat Presensi Lengkap</span>
                        <span>→</span>
                    </Link>
                </div>

                {/* Monthly Attendance Ring & Stats */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 text-sm">
                                Rekap Kehadiran Bulan Ini ({new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})
                            </h3>
                            <span className="text-xs text-slate-500 font-medium">
                                Total: {monthlyAttendance.total} Hari Tercatat
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/80 text-center">
                                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{monthlyAttendance.present}</div>
                                <div className="text-xs font-semibold text-emerald-800 mt-1">Hadir (Tepat Waktu)</div>
                                <span className="text-[10px] text-emerald-600/80">Sesuai jam kerja</span>
                            </div>

                            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/80 text-center">
                                <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">{monthlyAttendance.late}</div>
                                <div className="text-xs font-semibold text-amber-800 mt-1">Terlambat (Late)</div>
                                <span className="text-[10px] text-amber-600/80">Lewat jam toleransi</span>
                            </div>

                            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100/80 text-center">
                                <div className="text-2xl sm:text-3xl font-extrabold text-rose-700">{monthlyAttendance.absent}</div>
                                <div className="text-xs font-semibold text-rose-800 mt-1">Tidak Hadir (Alpa)</div>
                                <span className="text-[10px] text-rose-600/80">Tanpa keterangan cuti</span>
                            </div>
                        </div>

                        {/* Informational Tip */}
                        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                            <span className="text-base shrink-0">💡</span>
                            <p className="text-xs text-slate-600 leading-snug">
                                Jika ada ketidaksesuaian data presensi mesin, silakan hubungi bagian HRD atau buat pengajuan klarifikasi kehadiran melalui supervisor departemen Anda.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Leaves & Overtime Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Leave Requests */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-base">🏖️</span>
                            <h3 className="font-bold text-slate-900 text-sm">Permohonan Cuti Terbaru</h3>
                        </div>
                        <Link href={route('leave.index')} className="text-xs font-semibold text-[#E31B23] hover:underline">
                            Lihat Semua →
                        </Link>
                    </div>

                    {recentLeaves.length > 0 ? (
                        <div className="space-y-2.5">
                            {recentLeaves.map((leave: any) => (
                                <div key={leave.id} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100 flex items-center justify-between gap-3 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-800">{leave.type || 'Annual Leave'}</span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getStatusBadge(leave.status)}`}>
                                                {leave.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                            {leave.reason || 'Tidak ada alasan khusus'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-medium text-slate-700 block">
                                            {new Date(leave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            {leave.end_date && leave.end_date !== leave.start_date ? ` - ${new Date(leave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : ''}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-xs text-slate-400">
                            Belum ada riwayat permohonan cuti.
                        </div>
                    )}
                </div>

                {/* Recent Overtime Requests */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-base">⚡</span>
                            <h3 className="font-bold text-slate-900 text-sm">Surat Perintah Kerja Lembur (SPKL)</h3>
                        </div>
                        <Link href={route('overtime.index')} className="text-xs font-semibold text-[#E31B23] hover:underline">
                            Lihat Semua →
                        </Link>
                    </div>

                    {recentOvertime.length > 0 ? (
                        <div className="space-y-2.5">
                            {recentOvertime.map((ot: any) => (
                                <div key={ot.id} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-100 flex items-center justify-between gap-3 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-800">
                                                {new Date(ot.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getStatusBadge(ot.status)}`}>
                                                {ot.status}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                            {ot.reason || 'Pekerjaan operasional'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                                            {ot.start_time?.slice(0, 5)} - {ot.end_time?.slice(0, 5)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-xs text-slate-400">
                            Belum ada riwayat pengajuan lembur SPKL.
                        </div>
                    )}
                </div>
            </div>

            {/* Compensation & Latest Payslip Card */}
            {latestPayslip && (
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                                Slip Gaji Terakhir
                            </span>
                            <h3 className="text-lg sm:text-xl font-extrabold">
                                Periode: {latestPayslip.period?.name || 'Bulan Berjalan'}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                    {showSalary ? formatCurrency(latestPayslip.net_salary || 0) : 'Rp ••••••••'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowSalary(!showSalary)}
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors text-xs"
                                    title={showSalary ? 'Sembunyikan nominal' : 'Tampilkan nominal'}
                                >
                                    {showSalary ? '🙈 Sembunyikan' : '👁️ Lihat'}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Link
                                href={route('payroll.show', latestPayslip.id)}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs"
                            >
                                Buka Rincian Slip Gaji
                            </Link>
                            <Link
                                href={route('payroll.my')}
                                className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700/60 hover:bg-emerald-700 text-white border border-white/20 transition-colors"
                            >
                                Semua Arsip Slip
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
