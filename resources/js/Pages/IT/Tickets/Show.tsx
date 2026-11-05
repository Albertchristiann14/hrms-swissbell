import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import Modal from '@/Components/Modal';

interface TicketUpdate {
    id: number;
    user_id: number;
    user?: { name: string; email: string };
    status_from?: string;
    status_to?: string;
    message: string;
    created_at: string;
}

interface Ticket {
    id: number;
    ticket_number: string;
    title: string;
    description: string;
    category: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'Pending Parts' | 'Resolved' | 'Closed';
    reported_by_employee_id: number;
    reporter?: {
        id: number;
        employee_number?: string;
        department?: { name: string };
        user?: { name: string; email: string };
    };
    assigned_to_user_id?: number;
    assigned_user?: { id: number; name: string; email: string };
    assigned_users?: { id: number; name: string; email: string }[];
    it_asset_id?: number;
    asset?: {
        id: number;
        asset_code: string;
        name: string;
        category: string;
        brand?: string;
        model?: string;
        specifications?: string;
        ip_address?: string;
        location?: string;
        ups?: string;
        photo_url?: string;
    };
    location?: string;
    resolved_at?: string;
    resolution_notes?: string;
    created_at: string;
    updates?: TicketUpdate[];
}

interface PageProps {
    ticket: Ticket;
    isItManager: boolean;
    itStaffUsers: { id: number; name: string; email: string }[];
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function TicketShow({ ticket, isItManager, itStaffUsers, flash }: PageProps) {
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Reply Form
    const replyForm = useForm({
        message: '',
    });

    const submitReply = (e: React.FormEvent) => {
        e.preventDefault();
        replyForm.post(route('it.tickets.updates', ticket.id), {
            onSuccess: () => replyForm.reset(),
        });
    };

    // Status Update Form
    const getInitialAssignedUserIds = (): number[] => {
        if (ticket.assigned_users && ticket.assigned_users.length > 0) {
            return ticket.assigned_users.map((u) => u.id);
        }
        return ticket.assigned_to_user_id ? [ticket.assigned_to_user_id] : [];
    };

    const statusForm = useForm<{
        status: Ticket['status'];
        assigned_user_ids: number[];
        resolution_notes: string;
        notes: string;
    }>({
        status: ticket.status,
        assigned_user_ids: getInitialAssignedUserIds(),
        resolution_notes: ticket.resolution_notes || '',
        notes: '',
    });

    const openStatusModal = () => {
        statusForm.setData({
            status: ticket.status,
            assigned_user_ids: getInitialAssignedUserIds(),
            resolution_notes: ticket.resolution_notes || '',
            notes: '',
        });
        setIsStatusModalOpen(true);
    };

    const submitStatusUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        statusForm.patch(route('it.tickets.status', ticket.id), {
            onSuccess: () => {
                setIsStatusModalOpen(false);
                statusForm.reset('notes');
            },
        });
    };

    const confirmDeleteTicket = () => {
        router.delete(route('it.tickets.destroy', ticket.id));
    };

    // Styling helpers
    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'Urgent':
                return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
            case 'High':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Medium':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Low':
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Open':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'In Progress':
                return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'Pending Parts':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Resolved':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Closed':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('it.index', { tab: 'tickets' })}
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0 hover:scale-105 active:scale-95 transition-all"
                            title="Back to IT Helpdesk Tickets"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                    Swiss-Belinn IT & Systems
                                </span>
                                <span className="font-mono text-xs font-bold text-red-700 px-2 py-0.5 rounded-md bg-red-50 border border-red-200">
                                    {ticket.ticket_number}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(ticket.status)}`}>
                                    {ticket.status}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(ticket.priority)}`}>
                                    Priority: {ticket.priority}
                                </span>
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight mt-0.5">
                                {ticket.title}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {isItManager && (
                            <button
                                onClick={openStatusModal}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-sm shadow-red-600/25 transition-all hover:scale-102 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Update Status / Assignment</span>
                            </button>
                        )}

                        {!isItManager && ticket.status === 'Resolved' && (
                            <button
                                onClick={() => {
                                    if (confirm('Confirm that your IT issue has been resolved and this ticket is ready to close?')) {
                                        router.patch(route('it.tickets.status', ticket.id), {
                                            status: 'Closed',
                                            notes: 'Reporter confirmed the issue was resolved and closed the ticket.',
                                        });
                                    }
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all hover:scale-102 cursor-pointer"
                            >
                                <span>✅</span>
                                <span>Close Ticket (Issue Resolved)</span>
                            </button>
                        )}

                        <Link
                            href={route('it.index', { tab: 'tickets' })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all hover:scale-102 cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>Back to Helpdesk</span>
                        </Link>

                        {isItManager && (
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                                title="Delete Ticket"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`${ticket.ticket_number} - ${ticket.title} - IT Helpdesk`} />

            <div className="w-full space-y-4">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-2xs">
                        <span>✅</span>
                        <span>{flash.success}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT 2 COLS: Issue Details, Resolution & Timeline Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Issue Details Card */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100 text-xs text-gray-500">
                                <span>Category: <strong className="text-gray-800">{ticket.category}</strong></span>
                                <span>
                                    Reported on {new Date(ticket.created_at).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Issue Details / Description
                                </h3>
                                <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                                    {ticket.description}
                                </div>
                            </div>

                            {/* Resolution Notes (if resolved) */}
                            {ticket.resolution_notes && (
                                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                        <span>✅</span>
                                        <span>Resolution Notes:</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-emerald-950 whitespace-pre-wrap">
                                        {ticket.resolution_notes}
                                    </p>
                                    {ticket.resolved_at && (
                                        <p className="text-[11px] text-emerald-700 mt-1">
                                            Resolved at: {new Date(ticket.resolved_at).toLocaleString('en-US')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Interactive Timeline & Discussion */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                        Activity History & Discussion
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Activity log, status updates, and team communication
                                    </p>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                    {ticket.updates?.length || 0} Activities
                                </span>
                            </div>

                            {/* Timeline stream */}
                            <div className="space-y-4">
                                {ticket.updates && ticket.updates.length > 0 ? (
                                    ticket.updates.map((upd, idx) => (
                                        <div key={upd.id} className="flex items-start gap-3 relative">
                                            {/* Vertical connector line */}
                                            {idx < (ticket.updates?.length || 0) - 1 && (
                                                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200 -mb-4"></div>
                                            )}

                                            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10 shadow-2xs">
                                                {upd.user?.name ? upd.user.name.charAt(0) : 'U'}
                                            </div>

                                            <div className="flex-1 bg-gray-50 rounded-2xl p-3.5 border border-gray-200/80 text-xs sm:text-sm">
                                                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <strong className="text-gray-900 font-semibold">
                                                            {upd.user?.name || 'System'}
                                                        </strong>
                                                        {upd.status_to && upd.status_from !== upd.status_to && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                                                                Status: {upd.status_to}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-gray-400">
                                                        {new Date(upd.created_at).toLocaleDateString('en-US', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>

                                                <p className="text-gray-800 whitespace-pre-wrap mt-1">
                                                    {upd.message}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-6 text-center text-gray-400 text-xs">
                                        No activity history yet.
                                    </div>
                                )}
                            </div>

                            {/* Reply Input Box */}
                            <form onSubmit={submitReply} className="pt-4 border-t border-gray-100 space-y-2">
                                <label className="block text-xs font-bold text-gray-700">
                                    Write a Reply / Progress Update:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Write a message or progress update here..."
                                    value={replyForm.data.message}
                                    onChange={(e) => replyForm.setData('message', e.target.value)}
                                    className="w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    required
                                />
                                <div className="flex justify-end">
                                    <PrimaryButton disabled={replyForm.processing} className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-sm shadow-red-600/25 text-xs">
                                        {replyForm.processing ? 'Sending...' : 'Send Reply'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT 1 COL: Meta Cards, Reporter Info, Asset Details */}
                    <div className="space-y-6">
                        {/* Reporter & Location Card */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-4">
                            <h3 className="font-bold text-gray-900 text-sm pb-2 border-b border-gray-100">
                                Reporter Information
                            </h3>

                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
                                    {(ticket.reporter?.user?.name || 'P').charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-gray-900 text-sm truncate">
                                        {ticket.reporter?.user?.name || (ticket.reporter ? `Emp #${ticket.reporter.employee_number}` : 'Hotel Employee')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {ticket.reporter?.department?.name || 'Department'}
                                    </div>
                                    {ticket.reporter?.user?.email && (
                                        <div className="text-[11px] text-gray-400 truncate">
                                            {ticket.reporter.user.email}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
                                <div className="flex items-center justify-between text-gray-600">
                                    <span>Issue Location:</span>
                                    <strong className="text-gray-900">{ticket.location || 'Hotel Area'}</strong>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between text-gray-600 mb-1">
                                        <span>Assigned Technicians:</span>
                                        <span className="font-semibold text-gray-700">
                                            {ticket.assigned_users && ticket.assigned_users.length > 0
                                                ? `${ticket.assigned_users.length} Orang`
                                                : ticket.assigned_user ? '1 Orang' : 'Unassigned'}
                                        </span>
                                    </div>
                                    {ticket.assigned_users && ticket.assigned_users.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {ticket.assigned_users.map((u) => (
                                                <div
                                                    key={u.id}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold"
                                                >
                                                    <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold">
                                                        {u.name.charAt(0)}
                                                    </span>
                                                    <span>{u.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : ticket.assigned_user ? (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                                            <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold">
                                                {ticket.assigned_user.name.charAt(0)}
                                            </span>
                                            <span>{ticket.assigned_user.name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Unassigned</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Associated IT Asset Card (If linked) */}
                        {ticket.asset ? (
                            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                    <h3 className="font-bold text-gray-900 text-sm">
                                        Associated Device
                                    </h3>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold">
                                        {ticket.asset.asset_code}
                                    </span>
                                </div>

                                {/* Asset Photo Preview (if available) */}
                                {ticket.asset.photo_url && (
                                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-900 aspect-video max-h-48 flex items-center justify-center">
                                        <img
                                            src={ticket.asset.photo_url}
                                            alt={ticket.asset.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                <div>
                                    <div className="font-bold text-gray-900 text-sm">
                                        {ticket.asset.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {ticket.asset.brand || ''} {ticket.asset.model || ''} • {ticket.asset.category}
                                    </div>
                                </div>

                                {ticket.asset.specifications && (
                                    <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-mono">
                                        {ticket.asset.specifications}
                                    </div>
                                )}

                                <div className="space-y-1.5 pt-1 text-xs">
                                    {ticket.asset.location && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Placement:</span>
                                            <span className="font-medium text-gray-800">
                                                📍 {ticket.asset.location}
                                            </span>
                                        </div>
                                    )}

                                    {ticket.asset.ip_address && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">IP Address:</span>
                                            <span className="font-mono text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                {ticket.asset.ip_address}
                                            </span>
                                        </div>
                                    )}

                                    {ticket.asset.ups && ticket.asset.ups.toLowerCase() !== 'none' && ticket.asset.ups.toLowerCase() !== 'tidak ada' && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">UPS Protection:</span>
                                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                <span className="text-amber-600 font-bold">⚡</span>
                                                <span>{ticket.asset.ups}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 text-center text-xs text-gray-400">
                                <span className="text-2xl block mb-1">💻</span>
                                No physical device is linked to this ticket.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL: UPDATE STATUS & ASSIGNMENT */}
            <Modal show={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} maxWidth="lg">
                <form onSubmit={submitStatusUpdate} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-red-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200 shrink-0">
                                ⚡
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                                    {ticket.ticket_number}
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                    Update Status & Technician
                                </h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsStatusModalOpen(false)}
                            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm">
                        <div>
                            <InputLabel htmlFor="status_select" value="Ticket Status *" />
                            <select
                                id="status_select"
                                className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                value={statusForm.data.status}
                                onChange={(e) => statusForm.setData('status', e.target.value as any)}
                                required
                            >
                                <option value="Open">Open - New Ticket</option>
                                <option value="In Progress">In Progress - Working on it</option>
                                <option value="Pending Parts">Pending Parts - Awaiting Parts/Vendor</option>
                                <option value="Resolved">Resolved - Issue Fixed</option>
                                <option value="Closed">Closed - Ticket Closed</option>
                            </select>
                        </div>

                        {isItManager && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <InputLabel value="Assign to IT Technician (Bisa Lebih dari 1 Orang)" />
                                    <span className="text-[11px] text-gray-500 font-medium">
                                        {statusForm.data.assigned_user_ids.length > 0
                                            ? `${statusForm.data.assigned_user_ids.length} teknisi dipilih`
                                            : 'Belum ada teknisi'}
                                    </span>
                                </div>

                                {/* Selected Technicians Badges */}
                                <div className="min-h-[44px] p-2 bg-gray-50/90 rounded-xl border border-gray-200">
                                    {statusForm.data.assigned_user_ids.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {statusForm.data.assigned_user_ids.map((id) => {
                                                const st = itStaffUsers.find((u) => u.id === id);
                                                if (!st) return null;
                                                return (
                                                    <span
                                                        key={st.id}
                                                        className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs px-2.5 py-1 rounded-lg font-medium border border-red-200"
                                                    >
                                                        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold">
                                                            {st.name.charAt(0)}
                                                        </span>
                                                        <span>{st.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                statusForm.setData(
                                                                    'assigned_user_ids',
                                                                    statusForm.data.assigned_user_ids.filter((uid) => uid !== st.id)
                                                                );
                                                            }}
                                                            className="ml-1 text-red-400 hover:text-red-700 hover:bg-red-100 rounded-full p-0.5"
                                                            title="Hapus teknisi"
                                                        >
                                                            ✕
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 italic py-1 px-1">
                                            -- Belum ada teknisi yang ditugaskan (Unassigned) --
                                        </div>
                                    )}
                                </div>

                                {/* Dropdown to select/add IT technician */}
                                <div className="flex items-center gap-2">
                                    <select
                                        id="technician_select"
                                        className="block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500 cursor-pointer"
                                        value=""
                                        onChange={(e) => {
                                            const selectedId = parseInt(e.target.value);
                                            if (selectedId && !statusForm.data.assigned_user_ids.includes(selectedId)) {
                                                statusForm.setData('assigned_user_ids', [
                                                    ...statusForm.data.assigned_user_ids,
                                                    selectedId,
                                                ]);
                                            }
                                        }}
                                    >
                                        <option value="" disabled>
                                            + Pilih / Tambah Teknisi IT...
                                        </option>
                                        {itStaffUsers
                                            .filter((st) => !statusForm.data.assigned_user_ids.includes(st.id))
                                            .map((st) => (
                                                <option key={st.id} value={st.id}>
                                                    {st.name} ({st.email})
                                                </option>
                                            ))}
                                    </select>
                                    {statusForm.data.assigned_user_ids.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => statusForm.setData('assigned_user_ids', [])}
                                            className="shrink-0 text-xs text-gray-500 hover:text-red-600 font-semibold px-2.5 py-2 rounded-lg border border-gray-200 hover:border-red-200 bg-white"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-400">
                                    Pilih satu atau lebih teknisi IT untuk ditugaskan pada tiket ini.
                                </p>
                            </div>
                        )}

                        {['Resolved', 'Closed'].includes(statusForm.data.status) && (
                            <div>
                                <InputLabel htmlFor="res_notes" value="Resolution / Solution Notes *" />
                                <textarea
                                    id="res_notes"
                                    rows={3}
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    placeholder="Explain the technical steps taken to resolve the issue..."
                                    value={statusForm.data.resolution_notes}
                                    onChange={(e) => statusForm.setData('resolution_notes', e.target.value)}
                                    required={['Resolved', 'Closed'].includes(statusForm.data.status)}
                                />
                            </div>
                        )}

                        <div>
                            <InputLabel htmlFor="notes_input" value="Additional Note for Timeline (Optional)" />
                            <TextInput
                                id="notes_input"
                                type="text"
                                className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                placeholder="e.g. Waiting for replacement cable from vendor..."
                                value={statusForm.data.notes}
                                onChange={(e) => statusForm.setData('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setIsStatusModalOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={statusForm.processing} className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-sm shadow-red-600/25">
                            {statusForm.processing ? 'Saving...' : 'Save Status'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL: DELETE CONFIRMATION */}
            <Modal show={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900">
                        Delete IT Ticket?
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Are you sure you want to delete ticket <strong className="text-gray-800">{ticket.ticket_number}</strong> and all its activity history? This action cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={() => setIsDeleteModalOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={confirmDeleteTicket}>
                            Yes, Delete Ticket
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
