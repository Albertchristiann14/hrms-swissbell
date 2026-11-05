import React, { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import InputLabel from '@/Components/InputLabel';

interface UserRegistration {
    id: number;
    name: string;
    username: string;
    email: string;
    phone_number?: string;
    status: 'pending' | 'pending_approval' | 'approved' | 'active' | 'rejected' | 'disabled';
    approved_by?: number;
    approved_at?: string;
    rejection_reason?: string;
    created_at: string;
    approver?: {
        id: number;
        name: string;
        email: string;
    };
    employee?: {
        id: number;
        employee_number: string;
        department?: { id: number; name: string };
        position?: { id: number; name: string };
    };
    roles?: { id: number; name: string }[];
}

interface PageProps {
    registrations: {
        data: UserRegistration[];
        links: { url: string | null; label: string; active: boolean }[];
        total: number;
        current_page: number;
        last_page: number;
    };
    filters: {
        status: string;
        search: string;
    };
    stats: {
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function Registrations({ registrations, filters, stats }: PageProps) {
    const page = usePage();
    const flash = (page.props as Record<string, any>).flash as { success?: string; error?: string } | undefined;

    const [search, setSearch] = useState(filters.search || '');
    const [selectedUser, setSelectedUser] = useState<UserRegistration | null>(null);
    const [approvingUser, setApprovingUser] = useState<UserRegistration | null>(null);
    const [rejectingUser, setRejectingUser] = useState<UserRegistration | null>(null);

    const { data: rejectData, setData: setRejectData, post: postReject, processing: rejectProcessing, reset: resetReject } = useForm({
        reason: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('it.registrations.index'), {
            status: filters.status,
            search,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleTabChange = (newStatus: string) => {
        router.get(route('it.registrations.index'), {
            status: newStatus,
            search,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleApprove = (user: UserRegistration) => {
        router.post(route('it.registrations.approve', user.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setApprovingUser(null);
                if (selectedUser?.id === user.id) setSelectedUser(null);
            },
        });
    };

    const submitReject = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingUser) return;

        postReject(route('it.registrations.reject', rejectingUser.id), {
            preserveScroll: true,
            onSuccess: () => {
                setRejectingUser(null);
                resetReject();
                if (selectedUser?.id === rejectingUser.id) setSelectedUser(null);
            },
        });
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: string) => {
        if (status === 'pending' || status === 'pending_approval') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Pending IT Approval
                </span>
            );
        }
        if (status === 'approved' || status === 'active') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Approved
                </span>
            );
        }
        if (status === 'rejected') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Rejected
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {status}
            </span>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                    Swiss-Belinn IT & Systems
                                </span>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    Account Verification
                                </span>
                                {stats.pending > 0 && (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E31B23] text-white">
                                        {stats.pending} pending
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                IT Registration Approvals
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href={route('it.index')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all hover:scale-102 cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>IT Workspace</span>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Registration Approvals - IT Operations - SIPU Management" />

            <div className="w-full space-y-4">
                {/* Description Info Banner */}
                <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E31B23] flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                Staff Account Verification & Onboarding
                            </h3>
                            <p className="text-xs text-gray-500">
                                Review, verify contact details, and approve or reject staff account registration requests.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
                            Total: {stats.total} Requests
                        </span>
                        {stats.pending > 0 && (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                                {stats.pending} Need Verification
                            </span>
                        )}
                    </div>
                </div>

                {/* Flash Success/Error Message */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}

                {/* Metrics / Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        type="button"
                        onClick={() => handleTabChange('pending')}
                        className={`text-left p-4 rounded-2xl border transition-all duration-150 ${filters.status === 'pending'
                                ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-amber-900">Pending Review</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        </div>
                        <div className="text-2xl font-bold text-amber-900 mt-2">{stats.pending}</div>
                        <span className="text-[11px] text-amber-700/80">Requires IT verification</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('approved')}
                        className={`text-left p-4 rounded-2xl border transition-all duration-150 ${filters.status === 'approved'
                                ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-400/40 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-emerald-900">Approved Accounts</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        </div>
                        <div className="text-2xl font-bold text-emerald-900 mt-2">{stats.approved}</div>
                        <span className="text-[11px] text-emerald-700/80">Active system access</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('rejected')}
                        className={`text-left p-4 rounded-2xl border transition-all duration-150 ${filters.status === 'rejected'
                                ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-400/40 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-rose-900">Rejected Requests</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        </div>
                        <div className="text-2xl font-bold text-rose-900 mt-2">{stats.rejected}</div>
                        <span className="text-[11px] text-rose-700/80">Declined registrations</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('all')}
                        className={`text-left p-4 rounded-2xl border transition-all duration-150 ${filters.status === 'all'
                                ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/30 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                            }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700">All Registrations</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
                        <span className="text-[11px] text-slate-500">Total accounts recorded</span>
                    </button>
                </div>

                {/* Filter Tabs & Search Filter */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Tab Buttons */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto max-w-full">
                            <button
                                type="button"
                                onClick={() => handleTabChange('pending')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${filters.status === 'pending'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Pending Review ({stats.pending})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('approved')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${filters.status === 'approved'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Approved ({stats.approved})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('rejected')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${filters.status === 'rejected'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                Rejected ({stats.rejected})
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTabChange('all')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${filters.status === 'all'
                                        ? 'bg-white text-slate-900 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                All Records ({stats.total})
                            </button>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search name, phone, email..."
                                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearch('');
                                            router.get(route('it.registrations.index'), { status: filters.status, search: '' });
                                        }}
                                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="px-3 py-2 bg-[#E31B23] hover:bg-[#c4141b] text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors"
                            >
                                Search
                            </button>
                        </form>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-4">User Details</th>
                                    <th className="py-3 px-4">Phone Number</th>
                                    <th className="py-3 px-4">Role / Department</th>
                                    <th className="py-3 px-4">Registered Date</th>
                                    <th className="py-3 px-4">Approval Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {registrations.data.length > 0 ? (
                                    registrations.data.map((user) => {
                                        const isPending = user.status === 'pending' || user.status === 'pending_approval';

                                        return (
                                            <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                                                {/* User Details */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900 text-sm">{user.name}</div>
                                                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                                                <span>@{user.username}</span>
                                                                <span>·</span>
                                                                <span>{user.email}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Phone Number */}
                                                <td className="py-3.5 px-4">
                                                    {user.phone_number ? (
                                                        <div className="flex items-center gap-2">
                                                            <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                            </svg>
                                                            <a
                                                                href={`tel:${user.phone_number}`}
                                                                className="font-mono text-xs font-medium text-slate-800 hover:text-[#E31B23] transition-colors"
                                                            >
                                                                {user.phone_number}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Not provided</span>
                                                    )}
                                                </td>

                                                {/* Role / Department */}
                                                <td className="py-3.5 px-4">
                                                    <div className="text-slate-800 font-medium">
                                                        {user.employee?.department?.name || 'Unassigned'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {user.roles && user.roles.length > 0 ? user.roles[0].name : 'Staff / Employee'}
                                                    </div>
                                                </td>

                                                {/* Registered Date */}
                                                <td className="py-3.5 px-4">
                                                    <div className="text-slate-700">{formatDate(user.created_at)}</div>
                                                </td>

                                                {/* Approval Status */}
                                                <td className="py-3.5 px-4">
                                                    <div>{getStatusBadge(user.status)}</div>
                                                    {user.approver && user.approved_at && (
                                                        <div className="text-[10px] text-slate-400 mt-1">
                                                            {user.status === 'rejected' ? 'Rejected by' : 'Approved by'} {user.approver.name}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedUser(user)}
                                                            className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium text-xs transition-colors"
                                                            title="View Registration Details"
                                                        >
                                                            Details
                                                        </button>

                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setApprovingUser(user)}
                                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition-colors"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setRejectingUser(user);
                                                                        resetReject();
                                                                    }}
                                                                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div className="font-semibold text-slate-700 text-sm">No registrations found</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {filters.status === 'pending'
                                                    ? 'There are currently no staff registrations awaiting IT approval.'
                                                    : 'No records match the selected status filter and search query.'}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {registrations.links && registrations.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                                Showing page {registrations.current_page} of {registrations.last_page} ({registrations.total} total registrations)
                            </span>
                            <div className="flex items-center gap-1">
                                {registrations.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${link.active
                                                ? 'bg-[#E31B23] text-white font-semibold'
                                                : link.url
                                                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    : 'text-slate-300 cursor-not-allowed'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* View Registration Details Modal */}
            <Modal show={!!selectedUser} onClose={() => setSelectedUser(null)} maxWidth="md">
                {selectedUser && (
                    <div className="p-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-900">
                                Registration Details
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-4 space-y-4 text-xs">
                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <span className="text-slate-500 font-medium">Status</span>
                                <div>{getStatusBadge(selectedUser.status)}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Full Name</span>
                                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">{selectedUser.name}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Username</span>
                                    <span className="text-sm font-mono text-slate-800 mt-0.5 block">@{selectedUser.username}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Email Address</span>
                                    <a href={`mailto:${selectedUser.email}`} className="text-xs text-blue-600 hover:underline mt-0.5 block truncate">
                                        {selectedUser.email}
                                    </a>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                                    <span className="text-xs font-mono font-semibold text-emerald-800 mt-0.5 block">
                                        {selectedUser.phone_number || '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Registered At</span>
                                    <span className="text-xs text-slate-700 mt-0.5 block">{formatDate(selectedUser.created_at)}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Assigned Role</span>
                                    <span className="text-xs text-slate-700 mt-0.5 block">
                                        {selectedUser.roles?.[0]?.name || 'Staff / Employee'}
                                    </span>
                                </div>
                            </div>

                            {selectedUser.employee && (
                                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                        Employee Record
                                    </span>
                                    <div className="flex items-center justify-between text-xs text-slate-700">
                                        <span>Employee Number: <strong className="font-mono">{selectedUser.employee.employee_number}</strong></span>
                                        <span>Dept: <strong>{selectedUser.employee.department?.name || 'Unassigned'}</strong></span>
                                    </div>
                                </div>
                            )}

                            {selectedUser.approver && (
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                        Review History
                                    </span>
                                    <div className="text-xs text-slate-700 space-y-1">
                                        <div>Decision by: <strong>{selectedUser.approver.name}</strong></div>
                                        <div>Timestamp: <strong>{formatDate(selectedUser.approved_at)}</strong></div>
                                        {selectedUser.rejection_reason && (
                                            <div className="mt-2 text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                                                <span className="font-semibold block text-[11px]">Rejection Reason:</span>
                                                {selectedUser.rejection_reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                            <SecondaryButton onClick={() => setSelectedUser(null)}>
                                Close
                            </SecondaryButton>

                            {(selectedUser.status === 'pending' || selectedUser.status === 'pending_approval') && (
                                <>
                                    <DangerButton
                                        onClick={() => {
                                            setRejectingUser(selectedUser);
                                            resetReject();
                                        }}
                                    >
                                        Reject
                                    </DangerButton>
                                    <PrimaryButton
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => setApprovingUser(selectedUser)}
                                    >
                                        Approve Registration
                                    </PrimaryButton>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Approve Confirmation Modal */}
            <Modal show={!!approvingUser} onClose={() => setApprovingUser(null)} maxWidth="sm">
                {approvingUser && (
                    <div className="p-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 text-center">
                            Approve Registration?
                        </h3>

                        <p className="mt-2 text-xs text-slate-600 text-center leading-relaxed">
                            Are you sure you want to approve <strong className="text-slate-900">{approvingUser.name}</strong> ({approvingUser.email})?
                            <br />
                            Once approved, this user will immediately be permitted to log in to SIPU Management.
                        </p>

                        <div className="mt-6 flex items-center justify-center gap-3">
                            <SecondaryButton onClick={() => setApprovingUser(null)}>
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleApprove(approvingUser)}
                            >
                                Confirm Approval
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Reject Confirmation Modal with Optional Reason */}
            <Modal show={!!rejectingUser} onClose={() => setRejectingUser(null)} maxWidth="md">
                {rejectingUser && (
                    <form onSubmit={submitReject} className="p-6">
                        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 text-center">
                            Reject Registration
                        </h3>

                        <p className="mt-2 text-xs text-slate-600 text-center leading-relaxed">
                            You are rejecting account access for <strong className="text-slate-900">{rejectingUser.name}</strong>.
                            The user will be informed that their registration has not been approved.
                        </p>

                        <div className="mt-4">
                            <InputLabel htmlFor="reject_reason" value="Rejection Reason (Optional)" />
                            <textarea
                                id="reject_reason"
                                value={rejectData.reason}
                                onChange={(e) => setRejectData('reason', e.target.value)}
                                rows={3}
                                placeholder="e.g. Identity could not be verified by hotel management, invalid phone number, etc."
                                className="mt-1.5 w-full text-xs rounded-xl border-slate-300 shadow-2xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                                This note will be recorded in the audit log and reviewer history.
                            </p>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2">
                            <SecondaryButton onClick={() => setRejectingUser(null)} disabled={rejectProcessing}>
                                Cancel
                            </SecondaryButton>
                            <DangerButton disabled={rejectProcessing}>
                                {rejectProcessing ? 'Rejecting...' : 'Reject Registration'}
                            </DangerButton>
                        </div>
                    </form>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
