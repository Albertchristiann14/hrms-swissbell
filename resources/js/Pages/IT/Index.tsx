import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import PageHeader from '@/Components/PageHeader';
import StatCard from '@/Components/StatCard';
import TextLink from '@/Components/TextLink';

interface Asset {
    id: number;
    asset_code: string;
    name: string;
    category: string;
    brand?: string;
    model?: string;
    serial_number?: string;
    specifications?: string;
    status: 'Available' | 'In Use' | 'Maintenance' | 'Disposed';
    assigned_to_employee_id?: number;
    assigned_employee?: {
        id: number;
        employee_number?: string;
        department?: { name: string };
        user?: { name: string; email: string };
    };
    location?: string;
    ip_address?: string;
    ups?: string;
    photo?: string;
    photo_url?: string;
    purchase_date?: string;
    warranty_expiry?: string;
    purchase_cost?: number;
    notes?: string;
}

interface TicketUpdate {
    id: number;
    user_id: number;
    user?: { name: string };
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
    asset?: { id: number; asset_code: string; name: string };
    location?: string;
    resolved_at?: string;
    resolution_notes?: string;
    created_at: string;
    updates?: TicketUpdate[];
}

interface PageProps {
    activeTab: 'overview' | 'assets' | 'tickets';
    isItManager: boolean;
    currentUser: {
        id: number;
        name: string;
        employee_id?: number;
        department: string;
    };
    assets: {
        data: Asset[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    tickets: {
        data: Ticket[];
        links: any[];
        total: number;
        current_page: number;
        last_page: number;
    };
    assetStats: {
        total: number;
        in_use: number;
        available: number;
        maintenance: number;
        disposed: number;
    };
    ticketStats: {
        open: number;
        in_progress: number;
        resolved: number;
        closed: number;
        total: number;
    };
    itStaffUsers: { id: number; name: string; email: string }[];
    employees: { id: number; name: string; department: string; code?: string }[];
    assetsList: { id: number; asset_code: string; name: string; category: string; location?: string }[];
    filters: {
        tab: string;
        search?: string;
        status?: string;
        category?: string;
        ticket_search?: string;
        ticket_status?: string;
        ticket_priority?: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function ItIndex({
    activeTab = 'overview',
    isItManager,
    currentUser,
    assets,
    tickets,
    assetStats,
    ticketStats,
    itStaffUsers,
    employees,
    assetsList,
    filters,
    flash,
}: PageProps) {
    const [tab, setTab] = useState<'overview' | 'assets' | 'tickets'>(() => {
        if (!isItManager) return 'tickets';
        return activeTab || 'overview';
    });

    useEffect(() => {
        if (!isItManager) {
            setTab('tickets');
        } else if (activeTab) {
            setTab(activeTab);
        }
    }, [activeTab, isItManager]);

    const switchTab = (newTab: 'overview' | 'assets' | 'tickets') => {
        setTab(newTab);
        router.get(
            route('it.index'),
            { tab: newTab },
            { preserveState: true }
        );
    };

    // Modals state
    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const [isCreateAssetOpen, setIsCreateAssetOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
    const [quickStatusTicket, setQuickStatusTicket] = useState<Ticket | null>(null);
    const [previewingAssetPhoto, setPreviewingAssetPhoto] = useState<Asset | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Filter states
    const [assetSearch, setAssetSearch] = useState(filters.search || '');
    const [assetCategory, setAssetCategory] = useState(filters.category || 'all');
    const [assetStatus, setAssetStatus] = useState(filters.status || 'all');

    const [ticketSearch, setTicketSearch] = useState(filters.ticket_search || '');
    const [ticketStatus, setTicketStatus] = useState(filters.ticket_status || 'all');
    const [ticketPriority, setTicketPriority] = useState(filters.ticket_priority || 'all');

    const navigateToTicketStatus = (status: string) => {
        setTab('tickets');
        setTicketStatus(status);
        router.get(
            route('it.index'),
            {
                tab: 'tickets',
                ticket_status: status,
                ticket_search: ticketSearch,
                ticket_priority: ticketPriority,
            },
            { preserveState: true }
        );
    };

    const navigateToTickets = () => {
        setTab('tickets');
        router.get(
            route('it.index'),
            {
                tab: 'tickets',
            },
            { preserveState: true }
        );
    };

    const navigateToAssets = () => {
        setTab('assets');
        router.get(
            route('it.index'),
            {
                tab: 'assets',
            },
            { preserveState: true }
        );
    };

    // Ticket Form
    const ticketForm = useForm({
        title: '',
        description: '',
        category: 'Hardware',
        priority: 'Medium',
        it_asset_id: '',
        location: '',
        reported_by_employee_id: '',
    });

    const submitTicket = (e: React.FormEvent) => {
        e.preventDefault();
        ticketForm.post(route('it.tickets.store'), {
            onSuccess: () => {
                ticketForm.reset();
                setIsCreateTicketOpen(false);
            },
        });
    };

    // Asset Form
    const assetForm = useForm<{
        asset_code: string;
        name: string;
        category: string;
        brand: string;
        model: string;
        serial_number: string;
        specifications: string;
        status: string;
        assigned_to_employee_id: string;
        location: string;
        ip_address: string;
        ups: string;
        photo: File | null;
        remove_photo: boolean;
        purchase_date: string;
        warranty_expiry: string;
        purchase_cost: string;
        notes: string;
        _method?: string;
    }>({
        asset_code: '',
        name: '',
        category: 'Desktop / PC',
        brand: '',
        model: '',
        serial_number: '',
        specifications: '',
        status: 'Available',
        assigned_to_employee_id: '',
        location: '',
        ip_address: '',
        ups: '',
        photo: null,
        remove_photo: false,
        purchase_date: '',
        warranty_expiry: '',
        purchase_cost: '',
        notes: '',
    });

    const openCreateAsset = () => {
        assetForm.reset();
        setEditingAsset(null);
        setPhotoPreview(null);
        setIsCreateAssetOpen(true);
    };

    const openEditAsset = (asset: Asset) => {
        setEditingAsset(asset);
        setPhotoPreview(asset.photo_url || null);
        assetForm.setData({
            asset_code: asset.asset_code,
            name: asset.name,
            category: asset.category,
            brand: asset.brand || '',
            model: asset.model || '',
            serial_number: asset.serial_number || '',
            specifications: asset.specifications || '',
            status: asset.status,
            assigned_to_employee_id: asset.assigned_to_employee_id ? String(asset.assigned_to_employee_id) : '',
            location: asset.location || '',
            ip_address: asset.ip_address || '',
            ups: asset.ups || '',
            photo: null,
            remove_photo: false,
            purchase_date: asset.purchase_date || '',
            warranty_expiry: asset.warranty_expiry || '',
            purchase_cost: asset.purchase_cost ? String(asset.purchase_cost) : '',
            notes: asset.notes || '',
        });
        setIsCreateAssetOpen(true);
    };

    const submitAsset = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAsset) {
            assetForm.transform((data) => ({
                ...data,
                _method: 'PUT',
            }));
            assetForm.post(route('it.assets.update', editingAsset.id), {
                forceFormData: true,
                onSuccess: () => {
                    setIsCreateAssetOpen(false);
                    setEditingAsset(null);
                    setPhotoPreview(null);
                },
            });
        } else {
            assetForm.transform((data) => ({
                ...data,
                _method: undefined,
            }));
            assetForm.post(route('it.assets.store'), {
                forceFormData: true,
                onSuccess: () => {
                    setIsCreateAssetOpen(false);
                    assetForm.reset();
                    setPhotoPreview(null);
                },
            });
        }
    };

    const confirmDeleteAsset = () => {
        if (!deletingAsset) return;
        router.delete(route('it.assets.destroy', deletingAsset.id), {
            onSuccess: () => setDeletingAsset(null),
        });
    };

    // Quick Status Update Form
    const statusForm = useForm<{
        status: string;
        assigned_user_ids: number[];
        resolution_notes: string;
        notes: string;
    }>({
        status: 'Open',
        assigned_user_ids: [],
        resolution_notes: '',
        notes: '',
    });

    const openQuickStatus = (t: Ticket) => {
        setQuickStatusTicket(t);
        const assignedIds = t.assigned_users && t.assigned_users.length > 0
            ? t.assigned_users.map((u) => u.id)
            : (t.assigned_to_user_id ? [t.assigned_to_user_id] : []);
        statusForm.setData({
            status: t.status,
            assigned_user_ids: assignedIds,
            resolution_notes: t.resolution_notes || '',
            notes: '',
        });
    };

    const submitQuickStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickStatusTicket) return;
        statusForm.patch(route('it.tickets.status', quickStatusTicket.id), {
            onSuccess: () => {
                setQuickStatusTicket(null);
            },
        });
    };

    // Filter handling
    const applyAssetFilter = () => {
        router.get(
            route('it.index'),
            {
                tab: 'assets',
                search: assetSearch,
                category: assetCategory,
                status: assetStatus,
            },
            { preserveState: true }
        );
    };

    const applyTicketFilter = () => {
        router.get(
            route('it.index'),
            {
                tab: 'tickets',
                ticket_search: ticketSearch,
                ticket_status: ticketStatus,
                ticket_priority: ticketPriority,
            },
            { preserveState: true }
        );
    };

    // Badge styling helpers
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

    const getAssetStatusBadge = (status: string) => {
        switch (status) {
            case 'In Use':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Available':
                return 'bg-sky-100 text-sky-800 border-sky-200';
            case 'Maintenance':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Disposed':
                return 'bg-gray-100 text-gray-600 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    breadcrumbs={[
                        { label: 'Main Menu', href: route('dashboard') },
                        { label: 'IT Operations', href: route('it.index') },
                        { label: isItManager ? 'Operations & Helpdesk' : 'Helpdesk Support' },
                    ]}
                    title={isItManager ? 'IT Operations & Helpdesk' : 'IT Helpdesk & Support'}
                    subtitle="Sistem manajemen aset teknologi informasi dan tiket bantuan teknis hotel"
                    primaryAction={{
                        label: 'Report IT Issue',
                        onClick: () => {
                            ticketForm.reset();
                            setIsCreateTicketOpen(true);
                        },
                        icon: (
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        ),
                    }}
                    secondaryAction={
                        isItManager
                            ? {
                                  label: 'Add IT Asset',
                                  onClick: openCreateAsset,
                                  icon: (
                                      <svg className="w-4 h-4 mr-1.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                  ),
                              }
                            : undefined
                    }
                    moreActions={
                        isItManager
                            ? [
                                  { label: 'Registration Approvals', href: route('it.registrations.index') },
                                  { label: 'PowerPro ID Requests', href: route('power-pro.index') },
                                  { label: 'Master Key Programming', href: route('master-keys.index') },
                              ]
                            : undefined
                    }
                />
            }
        >
            <Head title={isItManager ? "IT Operations & Helpdesk - Swiss-Belinn" : "IT Helpdesk - Swiss-Belinn"} />

            <div className="w-full space-y-4">
                {/* Notification Banner */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center justify-between shadow-2xs animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span>✅</span>
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between shadow-2xs animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <span>⚠️</span>
                            <span>{flash.error}</span>
                        </div>
                    </div>
                )}

                {/* Non-IT Banner */}
                {!isItManager && (
                    <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center text-lg shrink-0">
                                🎫
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                    My IT Support Tickets
                                </h3>
                                <p className="text-xs text-gray-500">
                                    List of IT technical assistance requests submitted by you
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200">
                                Total: {tickets.total} Tickets
                            </span>
                            {(ticketStats.open + ticketStats.in_progress) > 0 && (
                                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                                    {ticketStats.open + ticketStats.in_progress} In Progress
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Sub-navigation Pills for IT Managers / Admins */}
                {isItManager && (
                    <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit max-w-full overflow-x-auto border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => switchTab('overview')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                tab === 'overview'
                                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            📊 Overview & Metrics
                        </button>
                        <button
                            type="button"
                            onClick={() => switchTab('tickets')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                tab === 'tickets'
                                    ? 'bg-white text-[#E31B23] shadow-xs ring-1 ring-slate-200/80 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            🎫 Helpdesk Tickets
                            {tickets?.total > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'tickets' ? 'bg-red-100 text-[#E31B23]' : 'bg-slate-200 text-slate-700'}`}>
                                    {tickets.total}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => switchTab('assets')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                tab === 'assets'
                                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/80 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            🖥️ Asset Inventory
                            {assetStats?.total > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === 'assets' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                                    {assetStats.total}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* TAB 1: OVERVIEW & STATS (IT Staff / Admin only) */}
                {tab === 'overview' && isItManager && (
                    <div className="space-y-6">
                        {/* High-level Metric Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                label="New Tickets (Open)"
                                value={ticketStats.open}
                                description="Awaiting IT technician response"
                                variant="warning"
                                icon={
                                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                                action={{
                                    label: 'View Open Tickets',
                                    onClick: () => navigateToTicketStatus('Open'),
                                }}
                            />

                            <StatCard
                                label="In Progress"
                                value={ticketStats.in_progress}
                                description="Under investigation / repair"
                                variant="info"
                                icon={
                                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                }
                                action={{
                                    label: 'View In-Progress Tickets',
                                    onClick: () => navigateToTicketStatus('In Progress'),
                                }}
                            />

                            <StatCard
                                label="Resolved Tickets"
                                value={ticketStats.resolved + ticketStats.closed}
                                description="Tickets successfully resolved"
                                variant="success"
                                icon={
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                }
                                action={{
                                    label: 'View Resolved Tickets',
                                    onClick: () => navigateToTicketStatus('Resolved'),
                                }}
                            />

                            <StatCard
                                label="Total IT Assets"
                                value={assetStats.total}
                                description={`${assetStats.in_use} In Use • ${assetStats.maintenance} In Service`}
                                variant="neutral"
                                icon={
                                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                }
                                action={{
                                    label: 'Open Asset Inventory',
                                    onClick: navigateToAssets,
                                }}
                            />
                        </div>

                        {/* 2-Column Split: Recent Active Tickets & Asset Status Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Recent Tickets (2 Cols) */}
                            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                            Recent IT Support Tickets
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            {isItManager ? 'Issue queue across all hotel departments' : 'Tickets reported by you'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={navigateToTickets}
                                        className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
                                    >
                                        View All ({ticketStats.total}) →
                                    </button>
                                </div>

                                <div className="mt-4 divide-y divide-gray-100">
                                    {tickets.data.slice(0, 5).map((t) => (
                                        <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-gray-50/50 rounded-xl px-2 transition-colors">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center text-sm shrink-0 mt-0.5">
                                                    {t.category === 'Hardware' ? '🖥️' : t.category === 'Network & Internet' ? '📶' : t.category === 'Printer & Scanner' ? '🖨️' : '⚙️'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-mono font-bold text-red-700">
                                                            {t.ticket_number}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(t.status)}`}>
                                                            {t.status}
                                                        </span>
                                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(t.priority)}`}>
                                                            {t.priority}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-semibold text-gray-900 mt-1 truncate">
                                                        {t.title}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                        Reporter: <strong className="text-gray-700">{t.reporter?.user?.name || (t.reporter ? `Emp #${t.reporter.employee_number}` : 'Staff')}</strong> ({t.reporter?.department?.name || t.location || 'Hotel'})
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 sm:self-center shrink-0">
                                                <Link
                                                    href={route('it.tickets.show', t.id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                                >
                                                    Ticket Details
                                                </Link>
                                                {isItManager && (
                                                    <button
                                                        onClick={() => openQuickStatus(t)}
                                                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors"
                                                        title="Quick Status Update"
                                                    >
                                                        ⚡ Update
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {tickets.data.length === 0 && (
                                        <div className="py-10 text-center text-gray-400">
                                            <span className="text-3xl block mb-2">🎉</span>
                                            <p className="text-sm font-medium">No active IT support issues.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Asset Health & Quick Stats (1 Col) */}
                            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 flex flex-col justify-between">
                                <div>
                                    <div className="pb-3 border-b border-gray-100">
                                        <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                            Hotel IT Asset Status
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Device operational condition distribution
                                        </p>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                <span className="font-semibold text-emerald-900">In Use (Active)</span>
                                            </div>
                                            <span className="font-bold text-emerald-800">{assetStats.in_use} Units</span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-sky-50/70 border border-sky-100">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                <span className="font-semibold text-sky-900">Available (Ready)</span>
                                            </div>
                                            <span className="font-bold text-sky-800">{assetStats.available} Units</span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                <span className="font-semibold text-amber-900">Maintenance</span>
                                            </div>
                                            <span className="font-bold text-amber-800">{assetStats.maintenance} Units</span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                <span className="font-semibold text-gray-700">Disposed</span>
                                            </div>
                                            <span className="font-bold text-gray-700">{assetStats.disposed} Units</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={navigateToAssets}
                                        className="w-full py-2.5 rounded-xl text-xs font-bold text-center text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                    >
                                        Open Full Inventory Data →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: HELPDESK TICKETS */}
                {(tab === 'tickets' || (!isItManager && tab === 'overview')) && (
                    <div className="space-y-4">
                        {/* Filter & Search Bar */}
                        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search ticket no, issue title, or location..."
                                        value={ticketSearch}
                                        onChange={(e) => setTicketSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && applyTicketFilter()}
                                        className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500"
                                    />
                                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <button
                                    onClick={applyTicketFilter}
                                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                                >
                                    Search
                                </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <select
                                    value={ticketStatus}
                                    onChange={(e) => {
                                        setTicketStatus(e.target.value);
                                        router.get(
                                            route('it.index'),
                                            {
                                                tab: 'tickets',
                                                ticket_search: ticketSearch,
                                                ticket_status: e.target.value,
                                                ticket_priority: ticketPriority,
                                            },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="text-xs rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500 py-2"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="Open">Open</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Pending Parts">Pending Parts</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Closed">Closed</option>
                                </select>

                                <select
                                    value={ticketPriority}
                                    onChange={(e) => {
                                        setTicketPriority(e.target.value);
                                        router.get(
                                            route('it.index'),
                                            {
                                                tab: 'tickets',
                                                ticket_search: ticketSearch,
                                                ticket_status: ticketStatus,
                                                ticket_priority: e.target.value,
                                            },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="text-xs rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500 py-2"
                                >
                                    <option value="all">All Priorities</option>
                                    <option value="Urgent">Urgent</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Tickets Table / List */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="py-3 px-4">Ticket No & Date</th>
                                            <th className="py-3 px-4">Issue / Problem</th>
                                            <th className="py-3 px-4">Reporter & Location</th>
                                            <th className="py-3 px-4">Priority</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">IT Technician</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-800">
                                        {tickets.data.map((t) => (
                                            <tr key={t.id} className="hover:bg-red-50/20 transition-colors">
                                                <td className="py-3.5 px-4 font-mono">
                                                    <span className="font-bold text-red-700 block">
                                                        {t.ticket_number}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400">
                                                        {new Date(t.created_at).toLocaleDateString('en-US', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                                                    <div className="font-semibold text-gray-900">
                                                        {t.title}
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                        {t.description}
                                                    </p>
                                                    {t.asset && (
                                                        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 font-mono">
                                                            <span>💻</span>
                                                            <span>{t.asset.asset_code} - {t.asset.name}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-gray-900">
                                                        {t.reporter?.user?.name || (t.reporter ? `Emp #${t.reporter.employee_number}` : '-')}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {t.reporter?.department?.name || '-'} • <span className="font-medium text-gray-700">{t.location || 'Hotel Area'}</span>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getPriorityBadge(t.priority)}`}>
                                                        {t.priority}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(t.status)}`}>
                                                        {t.status}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    {t.assigned_users && t.assigned_users.length > 0 ? (
                                                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                                                            {t.assigned_users.map((u) => (
                                                                <span
                                                                    key={u.id}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200"
                                                                >
                                                                    <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold">
                                                                        {u.name.charAt(0)}
                                                                    </span>
                                                                    <span>{u.name}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : t.assigned_user ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-6 h-6 rounded-full bg-red-700 text-white flex items-center justify-center text-[10px] font-bold">
                                                                {t.assigned_user.name.charAt(0)}
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-800">
                                                                {t.assigned_user.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <Link
                                                            href={route('it.tickets.show', t.id)}
                                                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                                        >
                                                            Open Ticket
                                                        </Link>
                                                        {isItManager && (
                                                            <button
                                                                onClick={() => openQuickStatus(t)}
                                                                className="px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors"
                                                                title="Update Status"
                                                            >
                                                                ⚡
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {tickets.data.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-gray-400">
                                                    <span className="text-3xl block mb-2">🔍</span>
                                                    <p className="text-sm font-medium">No support tickets match the selected filters.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {tickets.last_page > 1 && (
                                <div className="p-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>Showing page {tickets.current_page} of {tickets.last_page}</span>
                                    <div className="flex items-center gap-1">
                                        {tickets.links.map((link, idx) => (
                                            <button
                                                key={idx}
                                                disabled={!link.url}
                                                onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                                                    link.active
                                                        ? 'bg-red-600 text-white border-red-600'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: ASSET INVENTORY (IT Staff / Admin only) */}
                {tab === 'assets' && isItManager && (
                    <div className="space-y-4">
                        {/* Filter Bar */}
                        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Search asset code, device name, brand, serial number, or location..."
                                        value={assetSearch}
                                        onChange={(e) => setAssetSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && applyAssetFilter()}
                                        className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500"
                                    />
                                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <button
                                    onClick={applyAssetFilter}
                                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                                >
                                    Search
                                </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <select
                                    value={assetCategory}
                                    onChange={(e) => {
                                        setAssetCategory(e.target.value);
                                        router.get(
                                            route('it.index'),
                                            {
                                                tab: 'assets',
                                                search: assetSearch,
                                                category: e.target.value,
                                                status: assetStatus,
                                            },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="text-xs rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500 py-2"
                                >
                                    <option value="all">All Categories</option>
                                    <option value="Desktop / PC">Desktop / PC</option>
                                    <option value="Laptop">Laptop</option>
                                    <option value="Printer / Scanner">Printer / Scanner</option>
                                    <option value="Network">Network (Switch/AP)</option>
                                    <option value="CCTV / Security">CCTV / Security</option>
                                    <option value="POS Terminal">POS Terminal</option>
                                    <option value="Server">Server</option>
                                    <option value="Other">Other</option>
                                </select>

                                <select
                                    value={assetStatus}
                                    onChange={(e) => {
                                        setAssetStatus(e.target.value);
                                        router.get(
                                            route('it.index'),
                                            {
                                                tab: 'assets',
                                                search: assetSearch,
                                                category: assetCategory,
                                                status: e.target.value,
                                            },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="text-xs rounded-xl border-gray-200 focus:border-red-500 focus:ring-red-500 py-2"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="In Use">In Use (Active)</option>
                                    <option value="Available">Available (Ready)</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Disposed">Disposed</option>
                                </select>
                            </div>
                        </div>

                        {/* Assets Table */}
                        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs sm:text-sm">
                                    <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="py-3 px-3 w-16 text-center">Foto</th>
                                            <th className="py-3 px-4">Asset Code</th>
                                            <th className="py-3 px-4">Device Name & Specs</th>
                                            <th className="py-3 px-4">Category & Brand</th>
                                            <th className="py-3 px-4">Location & IP / UPS</th>
                                            <th className="py-3 px-4">Assigned User</th>
                                            <th className="py-3 px-4">Status</th>
                                            {isItManager && <th className="py-3 px-4 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-800">
                                        {assets.data.map((a) => (
                                            <tr key={a.id} className="hover:bg-red-50/20 transition-colors">
                                                {/* Photo Thumbnail */}
                                                <td className="py-3 px-3 text-center">
                                                    {a.photo_url ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewingAssetPhoto(a)}
                                                            className="group relative inline-block w-12 h-12 rounded-xl overflow-hidden border border-gray-200 shadow-2xs hover:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all bg-gray-50"
                                                            title="Klik untuk melihat foto & lokasi penempatan barang"
                                                        >
                                                            <img
                                                                src={a.photo_url}
                                                                alt={a.name}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                                            />
                                                            <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                                                                🔍
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div
                                                            className="w-12 h-12 rounded-xl bg-gray-100/80 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 mx-auto"
                                                            title="Belum ada foto lokasi / fisik barang"
                                                        >
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            <span className="text-[8px] text-gray-400 font-medium leading-none mt-0.5">No Foto</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 font-mono font-bold text-red-700">
                                                    {a.asset_code}
                                                    {a.serial_number && (
                                                        <span className="block text-[10px] text-gray-400 font-normal">
                                                            SN: {a.serial_number}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                                                    <div className="font-semibold text-gray-900">
                                                        {a.name}
                                                    </div>
                                                    {a.specifications && (
                                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                            {a.specifications}
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span className="font-medium text-gray-800 block">
                                                        {a.category}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {a.brand || '-'} {a.model ? `(${a.model})` : ''}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-gray-900 flex items-center gap-1.5">
                                                        <span>📍</span>
                                                        <span>{a.location || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                                        {a.ip_address ? (
                                                            <span className="text-[11px] font-mono text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                                {a.ip_address}
                                                            </span>
                                                        ) : null}

                                                        {a.ups && a.ups.toLowerCase() !== 'none' && a.ups.toLowerCase() !== 'tidak ada' ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title={`Unit UPS: ${a.ups}`}>
                                                                <span className="text-amber-600 font-bold">⚡</span>
                                                                <span className="font-semibold">UPS:</span> {a.ups}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 italic">No UPS</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    {a.assigned_employee ? (
                                                        <div>
                                                            <div className="font-semibold text-gray-900">
                                                                {a.assigned_employee.user?.name || (a.assigned_employee.employee_number ? `Emp #${a.assigned_employee.employee_number}` : 'Staff')}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {a.assigned_employee.department?.name || '-'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">
                                                            General Equipment / Pool
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getAssetStatusBadge(a.status)}`}>
                                                        {a.status}
                                                    </span>
                                                </td>

                                                {isItManager && (
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="inline-flex items-center gap-1">
                                                            <button
                                                                onClick={() => openEditAsset(a)}
                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingAsset(a)}
                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}

                                        {assets.data.length === 0 && (
                                            <tr>
                                                <td colSpan={isItManager ? 8 : 7} className="py-12 text-center text-gray-400">
                                                    <span className="text-3xl block mb-2">🔍</span>
                                                    <p className="text-sm font-medium">No IT assets match the search criteria.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {assets.last_page > 1 && (
                                <div className="p-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                    <span>Showing page {assets.current_page} of {assets.last_page}</span>
                                    <div className="flex items-center gap-1">
                                        {assets.links.map((link, idx) => (
                                            <button
                                                key={idx}
                                                disabled={!link.url}
                                                onClick={() => link.url && router.visit(link.url, { preserveState: true })}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                                                    link.active
                                                        ? 'bg-red-600 text-white border-red-600'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                                } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL 1: LAPOR KENDALA IT (CREATE TICKET) */}
            <Modal show={isCreateTicketOpen} onClose={() => setIsCreateTicketOpen(false)} maxWidth="2xl">
                <form onSubmit={submitTicket} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-red-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200 shrink-0">
                                🛠️
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                                    IT Helpdesk Request
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                    IT Support Request Form
                                </h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreateTicketOpen(false)}
                            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm">
                        {/* Title */}
                        <div>
                            <InputLabel htmlFor="ticket_title" value="Issue Title / Problem Summary *" />
                            <TextInput
                                id="ticket_title"
                                type="text"
                                className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                placeholder="e.g., Restaurant Cashier Printer Paper Jam / Meeting Room WiFi Connection Failed"
                                value={ticketForm.data.title}
                                onChange={(e) => ticketForm.setData('title', e.target.value)}
                                required
                            />
                            <InputError message={ticketForm.errors.title} className="mt-1" />
                        </div>

                        {/* Category & Priority */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="ticket_category" value="Issue Category *" />
                                <select
                                    id="ticket_category"
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    value={ticketForm.data.category}
                                    onChange={(e) => ticketForm.setData('category', e.target.value)}
                                    required
                                >
                                    <option value="Hardware">Hardware (Computer, Monitor, Peripherals)</option>
                                    <option value="Network & Internet">Network & WiFi Internet</option>
                                    <option value="Printer & Scanner">Printer & Scanner</option>
                                    <option value="Software & OS">Software & Hotel Systems (PMS/POS)</option>
                                    <option value="Email & Account">Email & User Accounts</option>
                                    <option value="CCTV / Telepon">CCTV & Telephony (PABX)</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="ticket_priority" value="Urgency Level *" />
                                <select
                                    id="ticket_priority"
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    value={ticketForm.data.priority}
                                    onChange={(e) => ticketForm.setData('priority', e.target.value as any)}
                                    required
                                >
                                    <option value="Low">Low - Minor issue, no immediate operational impact</option>
                                    <option value="Medium">Medium - Normal issue, requires standard resolution</option>
                                    <option value="High">High - Impairs departmental workflow</option>
                                    <option value="Urgent">Urgent - Critical! Direct guest or operational stoppage</option>
                                </select>
                            </div>
                        </div>

                        {/* Location & Related Asset */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="ticket_location" value="Issue Location (Room / Outlet)" />
                                <TextInput
                                    id="ticket_location"
                                    type="text"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="e.g., Front Desk 1, Swiss-Cafe Restaurant, Siak Meeting Room 2nd Fl"
                                    value={ticketForm.data.location}
                                    onChange={(e) => ticketForm.setData('location', e.target.value)}
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="ticket_asset" value="Related IT Asset (Optional)" />
                                <select
                                    id="ticket_asset"
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    value={ticketForm.data.it_asset_id}
                                    onChange={(e) => ticketForm.setData('it_asset_id', e.target.value)}
                                >
                                    <option value="">-- Select Asset if Applicable --</option>
                                    {assetsList.map((ast) => (
                                        <option key={ast.id} value={ast.id}>
                                            {ast.asset_code} - {ast.name} ({ast.location || ast.category})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* If IT Manager: choose reporter */}
                        {isItManager && (
                            <div>
                                <InputLabel htmlFor="ticket_reporter" value="Reporting Employee" />
                                <select
                                    id="ticket_reporter"
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    value={ticketForm.data.reported_by_employee_id}
                                    onChange={(e) => ticketForm.setData('reported_by_employee_id', e.target.value)}
                                >
                                    <option value="">-- Self ({currentUser.name}) --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name} ({emp.department})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <InputLabel htmlFor="ticket_desc" value="Full Issue Description *" />
                            <textarea
                                id="ticket_desc"
                                rows={4}
                                className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                placeholder="Describe in detail what happened, any error messages displayed, or troubleshooting steps already attempted..."
                                value={ticketForm.data.description}
                                onChange={(e) => ticketForm.setData('description', e.target.value)}
                                required
                            />
                            <InputError message={ticketForm.errors.description} className="mt-1" />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setIsCreateTicketOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={ticketForm.processing} className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-sm shadow-red-600/25">
                            {ticketForm.processing ? 'Submitting...' : 'Submit IT Ticket'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 2: CREATE / EDIT ASSET (IT MANAGERS) */}
            <Modal show={isCreateAssetOpen} onClose={() => setIsCreateAssetOpen(false)} maxWidth="2xl">
                <form onSubmit={submitAsset} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-red-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200 shrink-0">
                                💻
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                                    IT Asset Inventory
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                    {editingAsset ? 'Edit IT Asset Details' : 'Add New IT Asset'}
                                </h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreateAssetOpen(false)}
                            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm max-h-[70vh] overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="asset_code" value="IT Asset Code *" />
                                <TextInput
                                    id="asset_code"
                                    type="text"
                                    className="mt-1 block w-full font-mono text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="e.g., IT-PC-FO-01, IT-NET-AP-02"
                                    value={assetForm.data.asset_code}
                                    onChange={(e) => assetForm.setData('asset_code', e.target.value)}
                                    required
                                />
                                <InputError message={assetForm.errors.asset_code} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="asset_name" value="Device Name *" />
                                <TextInput
                                    id="asset_name"
                                    type="text"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="e.g., HP ProOne 440 G9 All-in-One PC"
                                    value={assetForm.data.name}
                                    onChange={(e) => assetForm.setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={assetForm.errors.name} className="mt-1" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <InputLabel htmlFor="asset_category" value="Device Category *" />
                                <select
                                    id="asset_category"
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    value={assetForm.data.category}
                                    onChange={(e) => assetForm.setData('category', e.target.value)}
                                    required
                                >
                                    <option value="Desktop / PC">Desktop / PC</option>
                                    <option value="Laptop">Laptop</option>
                                    <option value="Printer / Scanner">Printer / Scanner</option>
                                    <option value="Network">Network (Switch/AP/Router)</option>
                                    <option value="CCTV / Security">CCTV / Security</option>
                                    <option value="POS Terminal">POS Terminal</option>
                                    <option value="Server">Server</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="asset_brand" value="Brand / Manufacturer" />
                                <TextInput
                                    id="asset_brand"
                                    type="text"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="HP, Lenovo, Cisco, Ubiquiti, Epson"
                                    value={assetForm.data.brand}
                                    onChange={(e) => assetForm.setData('brand', e.target.value)}
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="asset_model" value="Model / Type" />
                                <TextInput
                                    id="asset_model"
                                    type="text"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="ThinkPad E14, TM-T82X"
                                    value={assetForm.data.model}
                                    onChange={(e) => assetForm.setData('model', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <InputLabel htmlFor="asset_sn" value="Serial Number (S/N)" />
                                <TextInput
                                    id="asset_sn"
                                    type="text"
                                    className="mt-1 block w-full font-mono text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="S/N: PF-39XKL2"
                                    value={assetForm.data.serial_number}
                                    onChange={(e) => assetForm.setData('serial_number', e.target.value)}
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="asset_status" value="Condition Status *" />
                                <select
                                    id="asset_status"
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    value={assetForm.data.status}
                                    onChange={(e) => assetForm.setData('status', e.target.value)}
                                    required
                                >
                                    <option value="Available">Available (Ready / Standby)</option>
                                    <option value="In Use">In Use (Active)</option>
                                    <option value="Maintenance">Maintenance (Under Repair)</option>
                                    <option value="Disposed">Disposed (Decommissioned)</option>
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="asset_ip" value="IP Address" />
                                <TextInput
                                    id="asset_ip"
                                    type="text"
                                    className="mt-1 block w-full font-mono text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="192.168.10.25"
                                    value={assetForm.data.ip_address}
                                    onChange={(e) => assetForm.setData('ip_address', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="asset_location" value="Physical Location (Room / Outlet / Area) *" />
                                <TextInput
                                    id="asset_location"
                                    type="text"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="e.g., Front Office Reception Desk 2, Server Room 2nd Fl"
                                    value={assetForm.data.location}
                                    onChange={(e) => assetForm.setData('location', e.target.value)}
                                    required
                                />
                                <InputError message={assetForm.errors.location} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="asset_employee" value="Assigned Employee" />
                                <select
                                    id="asset_employee"
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    value={assetForm.data.assigned_to_employee_id}
                                    onChange={(e) => assetForm.setData('assigned_to_employee_id', e.target.value)}
                                >
                                    <option value="">-- Shared Device / General Pool --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.name} ({emp.department})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* UPS / Power Backup */}
                        <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/70">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">⚡</span>
                                    <InputLabel htmlFor="asset_ups" value="UPS / Power Backup Protection" className="font-semibold text-amber-950" />
                                </div>
                                <span className="text-[11px] text-amber-700/80">Proteksi listrik cadangan perangkat</span>
                            </div>
                            <div className="mt-1.5">
                                <TextInput
                                    id="asset_ups"
                                    type="text"
                                    className="block w-full text-xs sm:text-sm rounded-xl border-amber-300 bg-white focus:border-amber-500 focus:ring-amber-500"
                                    placeholder="e.g., APC Back-UPS 650VA, Prolink 1200VA, ICA 600VA, atau None"
                                    value={assetForm.data.ups}
                                    onChange={(e) => assetForm.setData('ups', e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <span className="text-[10px] text-amber-800/80 font-bold">Pilih Cepat:</span>
                                {['APC 650VA', 'APC 1000VA', 'Prolink 1200VA', 'ICA 600VA', 'None'].map((chip) => (
                                    <button
                                        key={chip}
                                        type="button"
                                        onClick={() => assetForm.setData('ups', chip)}
                                        className="text-[10px] px-2.5 py-0.5 rounded-lg bg-white hover:bg-amber-100 hover:text-amber-900 text-amber-900 border border-amber-200/80 transition-colors shadow-2xs font-semibold"
                                    >
                                        + {chip}
                                    </button>
                                ))}
                            </div>
                            <InputError message={assetForm.errors.ups} className="mt-1" />
                        </div>

                        {/* Photo / Visual Placement Upload */}
                        <div className="p-4 rounded-xl bg-gray-50/90 border border-gray-200 space-y-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm">📸</span>
                                        <InputLabel value="Foto Penempatan / Lokasi Fisik Barang" className="font-semibold text-gray-900" />
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Unggah foto fisik perangkat di tempatnya agar mudah dicari oleh teknisi atau staff di area hotel (Maks. 5MB, format JPG, PNG, WebP).
                                    </p>
                                </div>
                            </div>

                            {photoPreview ? (
                                <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200 shadow-2xs">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-100 relative">
                                        <img
                                            src={photoPreview}
                                            alt="Preview Foto Asset"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mb-1.5">
                                            ✓ Foto Dipilih
                                        </span>
                                        <p className="text-xs text-gray-500 truncate mb-2">
                                            {assetForm.data.photo ? assetForm.data.photo.name : 'Foto tersimpan'}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <label
                                                htmlFor="asset_photo_file"
                                                className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer border border-gray-200 transition-colors"
                                            >
                                                Ganti Foto
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPhotoPreview(null);
                                                    assetForm.setData({
                                                        ...assetForm.data,
                                                        photo: null,
                                                        remove_photo: true,
                                                    });
                                                }}
                                                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                                            >
                                                Hapus Foto
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label
                                        htmlFor="asset_photo_file"
                                        className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-300 hover:border-red-400 bg-white rounded-xl cursor-pointer hover:bg-red-50/20 transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                                            📷
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 group-hover:text-red-700">
                                            Pilih / Unggah Foto Lokasi Asset
                                        </span>
                                        <span className="text-[11px] text-gray-400 mt-0.5">
                                            Klik untuk mengambil atau memilih foto posisi perangkat di lokasi
                                        </span>
                                    </label>
                                </div>
                            )}

                            <input
                                id="asset_photo_file"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/jpg"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (file.size > 5 * 1024 * 1024) {
                                            alert('Ukuran foto terlalu besar! Maksimal 5MB.');
                                            return;
                                        }
                                        assetForm.setData({
                                            ...assetForm.data,
                                            photo: file,
                                            remove_photo: false,
                                        });
                                        setPhotoPreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                            <InputError message={assetForm.errors.photo} className="mt-1" />
                        </div>

                        {/* Specs */}
                        <div>
                            <InputLabel htmlFor="asset_specs" value="Technical Specifications (CPU, RAM, Storage, OS, etc.)" />
                            <textarea
                                id="asset_specs"
                                rows={2}
                                className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                placeholder="e.g., Intel Core i5-12500, 16GB RAM, 512GB NVMe, Win 11 Pro"
                                value={assetForm.data.specifications}
                                onChange={(e) => assetForm.setData('specifications', e.target.value)}
                            />
                        </div>

                        {/* Dates & Cost */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <InputLabel htmlFor="purchase_date" value="Purchase Date" />
                                <TextInput
                                    id="purchase_date"
                                    type="date"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    value={assetForm.data.purchase_date}
                                    onChange={(e) => assetForm.setData('purchase_date', e.target.value)}
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="warranty_expiry" value="Warranty Expiry Date" />
                                <TextInput
                                    id="warranty_expiry"
                                    type="date"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    value={assetForm.data.warranty_expiry}
                                    onChange={(e) => assetForm.setData('warranty_expiry', e.target.value)}
                                />
                            </div>

                            <div>
                                <InputLabel htmlFor="purchase_cost" value="Purchase Cost (IDR)" />
                                <TextInput
                                    id="purchase_cost"
                                    type="number"
                                    className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                    placeholder="Rp"
                                    value={assetForm.data.purchase_cost}
                                    onChange={(e) => assetForm.setData('purchase_cost', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <InputLabel htmlFor="asset_notes" value="Additional Notes" />
                            <textarea
                                id="asset_notes"
                                rows={2}
                                className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                placeholder="Software licenses, service vendor contacts, or maintenance history..."
                                value={assetForm.data.notes}
                                onChange={(e) => assetForm.setData('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setIsCreateAssetOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={assetForm.processing} className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-sm shadow-red-600/25">
                            {assetForm.processing ? 'Saving...' : (editingAsset ? 'Save Changes' : 'Add IT Asset')}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 3: DELETE CONFIRMATION ASSET */}
            <Modal show={!!deletingAsset} onClose={() => setDeletingAsset(null)} maxWidth="md">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900">
                        Delete IT Asset?
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Are you sure you want to delete IT asset <strong className="text-gray-800">{deletingAsset?.asset_code} ({deletingAsset?.name})</strong>? This action cannot be undone.
                    </p>
                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton onClick={() => setDeletingAsset(null)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton onClick={confirmDeleteAsset}>
                            Yes, Delete Asset
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            {/* MODAL 4: QUICK STATUS UPDATE (IT MANAGERS) */}
            <Modal show={!!quickStatusTicket} onClose={() => setQuickStatusTicket(null)} maxWidth="lg">
                <form onSubmit={submitQuickStatus} className="p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-red-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200 shrink-0">
                                ⚡
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                                    {quickStatusTicket?.ticket_number}
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                    Quick IT Ticket Status Update
                                </h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setQuickStatusTicket(null)}
                            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="space-y-4 text-xs sm:text-sm">
                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                            <div className="font-semibold text-gray-900">
                                {quickStatusTicket?.title}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Reporter: {quickStatusTicket?.reporter?.user?.name || (quickStatusTicket?.reporter ? `Emp #${quickStatusTicket.reporter.employee_number}` : '-')} ({quickStatusTicket?.location || '-'})
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="quick_status" value="Update Status *" />
                            <select
                                id="quick_status"
                                className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                value={statusForm.data.status}
                                onChange={(e) => statusForm.setData('status', e.target.value)}
                                required
                            >
                                <option value="Open">Open (New)</option>
                                <option value="In Progress">In Progress (Working on it)</option>
                                <option value="Pending Parts">Pending Parts (Awaiting Vendor / Parts)</option>
                                <option value="Resolved">Resolved (Issue Fixed)</option>
                                <option value="Closed">Closed (Resolved & Closed)</option>
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
                                        id="quick_assigned"
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
                                <InputLabel htmlFor="resolution_notes" value="Resolution / Solution Notes" />
                                <textarea
                                    id="resolution_notes"
                                    rows={2}
                                    className="mt-1 block w-full rounded-xl border-gray-300 text-xs sm:text-sm focus:border-red-500 focus:ring-red-500"
                                    placeholder="Describe the corrective action taken to resolve the issue..."
                                    value={statusForm.data.resolution_notes}
                                    onChange={(e) => statusForm.setData('resolution_notes', e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <InputLabel htmlFor="update_msg" value="Progress Message (Recorded on Timeline)" />
                            <TextInput
                                id="update_msg"
                                type="text"
                                className="mt-1 block w-full text-xs sm:text-sm rounded-xl border-gray-300 focus:border-red-500 focus:ring-red-500"
                                placeholder="e.g., Technician is inspecting network cable on-site..."
                                value={statusForm.data.notes}
                                onChange={(e) => statusForm.setData('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-2">
                        <SecondaryButton type="button" onClick={() => setQuickStatusTicket(null)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={statusForm.processing} className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-sm shadow-red-600/25">
                            {statusForm.processing ? 'Saving...' : 'Update Status'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* MODAL 5: PREVIEW ASSET PHOTO & PHYSICAL LOCATION */}
            <Modal show={!!previewingAssetPhoto} onClose={() => setPreviewingAssetPhoto(null)} maxWidth="2xl">
                {previewingAssetPhoto && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-red-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-200 shrink-0">
                                    📍
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider font-mono">
                                        {previewingAssetPhoto.asset_code}
                                    </span>
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                                        {previewingAssetPhoto.name}
                                    </h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewingAssetPhoto(null)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Photo Container */}
                        <div className="relative rounded-2xl overflow-hidden bg-gray-950 border border-gray-200 min-h-[220px] max-h-[380px] flex items-center justify-center">
                            {previewingAssetPhoto.photo_url ? (
                                <img
                                    src={previewingAssetPhoto.photo_url}
                                    alt={`Foto penempatan ${previewingAssetPhoto.name}`}
                                    className="w-full max-h-[380px] object-contain"
                                />
                            ) : (
                                <div className="text-center text-gray-400 p-8">
                                    <span className="text-4xl block mb-2">📷</span>
                                    <p className="text-sm font-medium">Belum ada foto penempatan untuk asset ini.</p>
                                </div>
                            )}
                        </div>

                        {/* Details Card */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50/90 p-4 rounded-xl border border-gray-200">
                            <div>
                                <span className="text-gray-500 block font-medium">Lokasi Penempatan:</span>
                                <strong className="text-gray-900 text-sm flex items-center gap-1.5 mt-0.5">
                                    <span>📍</span>
                                    <span>{previewingAssetPhoto.location || 'Belum dispesifikasi'}</span>
                                </strong>
                            </div>

                            <div>
                                <span className="text-gray-500 block font-medium">Proteksi Listrik (UPS):</span>
                                <strong className="text-amber-900 text-sm flex items-center gap-1.5 mt-0.5">
                                    <span>⚡</span>
                                    <span>{previewingAssetPhoto.ups || 'Tidak Ada UPS / None'}</span>
                                </strong>
                            </div>

                            <div>
                                <span className="text-gray-500 block font-medium">Kategori & Brand:</span>
                                <span className="text-gray-800 font-semibold mt-0.5 block">
                                    {previewingAssetPhoto.category} • {previewingAssetPhoto.brand || '-'} {previewingAssetPhoto.model ? `(${previewingAssetPhoto.model})` : ''}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500 block font-medium">IP Address:</span>
                                <span className="text-gray-800 font-mono font-semibold mt-0.5 block">
                                    {previewingAssetPhoto.ip_address || '-'}
                                </span>
                            </div>

                            {previewingAssetPhoto.assigned_employee && (
                                <div className="sm:col-span-2 pt-2 border-t border-gray-200">
                                    <span className="text-gray-500 block font-medium">User Penanggung Jawab:</span>
                                    <span className="text-gray-900 font-semibold mt-0.5 block">
                                        👤 {previewingAssetPhoto.assigned_employee.user?.name || `Emp #${previewingAssetPhoto.assigned_employee.employee_number}`} ({previewingAssetPhoto.assigned_employee.department?.name || '-'})
                                    </span>
                                </div>
                            )}

                            {previewingAssetPhoto.notes && (
                                <div className="sm:col-span-2 pt-2 border-t border-gray-200">
                                    <span className="text-gray-500 block font-medium">Catatan Lokasi & Penempatan:</span>
                                    <p className="text-gray-700 mt-0.5 italic">
                                        "{previewingAssetPhoto.notes}"
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            {previewingAssetPhoto.photo_url ? (
                                <a
                                    href={previewingAssetPhoto.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline inline-flex items-center gap-1"
                                >
                                    <span>↗️ Buka Gambar Asli</span>
                                </a>
                            ) : <span />}

                            <div className="flex items-center gap-2">
                                {isItManager && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const target = previewingAssetPhoto;
                                            setPreviewingAssetPhoto(null);
                                            openEditAsset(target);
                                        }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                    >
                                        ✏️ Edit Asset & Foto
                                    </button>
                                )}
                                <SecondaryButton type="button" onClick={() => setPreviewingAssetPhoto(null)}>
                                    Tutup
                                </SecondaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
