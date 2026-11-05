import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import React, { useState, useMemo, useEffect } from 'react';
import Badge from '@/Components/Badge';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import BorrowRoomModal from './Partials/BorrowRoomModal';
import ReturnRequestModal from './Partials/ReturnRequestModal';
import SecurityConfirmReturnModal from './Partials/SecurityConfirmReturnModal';
import RoomModal from './Partials/RoomModal';
import QrCodeModal from './Partials/QrCodeModal';
import PageHeader from '@/Components/PageHeader';
import StatCard from '@/Components/StatCard';

interface Room {
    id: number;
    room_number: string;
    name: string;
    location?: string;
    capacity?: number;
    description?: string;
    key_code?: string;
    status: 'AVAILABLE' | 'BORROWED' | 'PENDING_RETURN';
    is_active: boolean;
    transactions_count?: number;
    active_transaction?: {
        id: number;
        transaction_number: string;
        borrowed_at: string;
        expected_duration_hours?: number;
        expected_return_at?: string;
        purpose?: string;
        borrower?: {
            id: number;
            employee_number: string;
            user?: {
                id: number;
                name: string;
                email: string;
            };
            department?: {
                id: number;
                name: string;
            };
        };
    };
}

interface Transaction {
    id: number;
    transaction_number: string;
    room_id: number;
    borrower_employee_id: number;
    borrowed_at: string;
    expected_duration_hours?: number;
    expected_return_at?: string;
    purpose?: string;
    status: 'BORROWED' | 'PENDING_RETURN' | 'RETURNED' | 'CANCELLED';
    return_requested_at?: string;
    return_notes?: string;
    returned_at?: string;
    security_user_id?: number;
    security_notes?: string;
    room: {
        id: number;
        room_number: string;
        name: string;
        location?: string;
        key_code?: string;
    };
    borrower?: {
        id: number;
        employee_number: string;
        user?: {
            id: number;
            name: string;
            email: string;
        };
        department?: {
            id: number;
            name: string;
        };
        position?: {
            id: number;
            name: string;
        };
    };
    security_user?: {
        id: number;
        name: string;
    };
}

interface RoomBorrowingProps {
    rooms: Room[];
    stats: {
        total: number;
        available: number;
        borrowed: number;
        pending_return: number;
    };
    myActiveBorrowings: Transaction[];
    myHistory: Transaction[];
    pendingReturns: Transaction[];
    recentAuditTransactions: Transaction[];
    allRoomsForAdmin: Room[];
    filters: {
        search: string;
        status: string;
        tab: string;
    };
    permissions: {
        can_borrow: boolean;
        can_approve_return: boolean;
        can_manage_rooms: boolean;
        is_security: boolean;
        is_it_staff?: boolean;
    };
    qrUrl: string;
}

const PRESET_DURATIONS = [
    { label: '1 Hour', hours: 1, sub: 'Quick Session' },
    { label: '2 Hours', hours: 2, sub: 'Standard' },
    { label: '4 Hours', hours: 4, sub: 'Half Day' },
    { label: '8 Hours', hours: 8, sub: 'Full Shift' },
];

export default function Index({
    rooms = [],
    stats = { total: 0, available: 0, borrowed: 0, pending_return: 0 },
    myActiveBorrowings = [],
    myHistory = [],
    pendingReturns = [],
    recentAuditTransactions = [],
    allRoomsForAdmin = [],
    filters = { search: '', status: 'ALL', tab: 'borrow' },
    permissions,
    qrUrl,
}: RoomBorrowingProps) {
    const { flash, auth } = usePage().props as any;
    const currentUser = auth?.user;

    const isItStaff = Boolean(permissions?.is_it_staff);

    const [activeTab, setActiveTab] = useState<'borrow' | 'catalog' | 'my-borrowings' | 'pending-returns' | 'manage-rooms'>(() => {
        const tab = (filters.tab as any) || 'borrow';
        if (tab === 'catalog' && !isItStaff) return 'borrow';
        return tab;
    });

    useEffect(() => {
        if (filters.tab) {
            const tab = filters.tab as any;
            if (tab === 'catalog' && !isItStaff) {
                setActiveTab('borrow');
            } else {
                setActiveTab(tab);
            }
        }
    }, [filters.tab, isItStaff]);

    const TAB_PROPS_MAP: Record<string, string[]> = {
        'borrow': ['rooms', 'stats', 'filters'],
        'catalog': ['rooms', 'stats', 'filters'],
        'my-borrowings': ['myActiveBorrowings', 'myHistory', 'filters'],
        'pending-returns': ['pendingReturns', 'recentAuditTransactions', 'filters'],
        'manage-rooms': ['allRoomsForAdmin', 'filters'],
    };

    const switchTab = (tab: 'borrow' | 'catalog' | 'my-borrowings' | 'pending-returns' | 'manage-rooms') => {
        setActiveTab(tab);
        router.get(
            route('room-borrowing.index'),
            { tab },
            {
                only: TAB_PROPS_MAP[tab] || undefined,
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    // Unified Borrow Form State
    const firstAvailableRoom = useMemo(() => rooms.find((r) => r.status === 'AVAILABLE'), [rooms]);

    const {
        data: borrowData,
        setData: setBorrowData,
        post: postBorrow,
        processing: borrowProcessing,
        errors: borrowErrors,
        reset: resetBorrow,
        clearErrors: clearBorrowErrors,
    } = useForm({
        room_id: (firstAvailableRoom?.id) || (rooms[0]?.id || 0),
        expected_duration_hours: 2,
        purpose: '',
    });

    const [selectedDurationPreset, setSelectedDurationPreset] = useState<number | 'custom'>(2);
    const [roomPickerFilterAvailableOnly, setRoomPickerFilterAvailableOnly] = useState(false);
    const [roomPickerSearch, setRoomPickerSearch] = useState('');

    const handleSelectPresetDuration = (hours: number) => {
        setSelectedDurationPreset(hours);
        setBorrowData('expected_duration_hours', hours);
    };

    const handleSelectCustomDuration = () => {
        setSelectedDurationPreset('custom');
    };

    const projectedReturnTime = useMemo(() => {
        const hours = Number(borrowData.expected_duration_hours);
        if (!hours || isNaN(hours) || hours <= 0) return null;

        const date = new Date(Date.now() + hours * 60 * 60 * 1000);
        return date.toLocaleString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [borrowData.expected_duration_hours]);

    const selectedRoom = useMemo(() => {
        return rooms.find((r) => r.id === Number(borrowData.room_id)) || null;
    }, [rooms, borrowData.room_id]);

    const selectableRooms = useMemo(() => {
        return rooms.filter((r) => {
            const matchesSearch =
                !roomPickerSearch ||
                r.name.toLowerCase().includes(roomPickerSearch.toLowerCase()) ||
                r.room_number.toLowerCase().includes(roomPickerSearch.toLowerCase()) ||
                (r.location && r.location.toLowerCase().includes(roomPickerSearch.toLowerCase())) ||
                (r.key_code && r.key_code.toLowerCase().includes(roomPickerSearch.toLowerCase()));

            if (!matchesSearch) return false;
            if (roomPickerFilterAvailableOnly && r.status !== 'AVAILABLE') return false;
            return true;
        });
    }, [rooms, roomPickerSearch, roomPickerFilterAvailableOnly]);

    const handleBorrowSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom || selectedRoom.status !== 'AVAILABLE') return;
        postBorrow(route('room-borrowing.borrow'), {
            onSuccess: () => {
                resetBorrow();
                setSelectedDurationPreset(2);
            },
        });
    };

    const handleBorrowFromCatalog = (room: Room) => {
        setBorrowData('room_id', room.id);
        switchTab('borrow');
    };

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'ALL');

    // Modals state
    const [borrowModalOpen, setBorrowModalOpen] = useState(false);
    const [selectedRoomToBorrow, setSelectedRoomToBorrow] = useState<Room | null>(null);

    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [selectedTxToReturn, setSelectedTxToReturn] = useState<Transaction | null>(null);

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [selectedTxToConfirm, setSelectedTxToConfirm] = useState<Transaction | null>(null);

    const [roomModalOpen, setRoomModalOpen] = useState(false);
    const [selectedRoomToEdit, setSelectedRoomToEdit] = useState<Room | null>(null);

    const [qrModalOpen, setQrModalOpen] = useState(false);

    // Filtered rooms for catalog
    const filteredRooms = useMemo(() => {
        return rooms.filter((room) => {
            const matchesSearch =
                !searchQuery ||
                room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (room.location && room.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (room.key_code && room.key_code.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [rooms, searchQuery, statusFilter]);

    const handleOpenBorrow = (room: Room) => {
        setSelectedRoomToBorrow(room);
        setBorrowModalOpen(true);
    };

    const handleOpenReturn = (tx: Transaction) => {
        setSelectedTxToReturn(tx);
        setReturnModalOpen(true);
    };

    const handleOpenConfirm = (tx: Transaction) => {
        setSelectedTxToConfirm(tx);
        setConfirmModalOpen(true);
    };

    const handleOpenCreateRoom = () => {
        setSelectedRoomToEdit(null);
        setRoomModalOpen(true);
    };

    const handleOpenEditRoom = (room: Room) => {
        setSelectedRoomToEdit(room);
        setRoomModalOpen(true);
    };

    const handleToggleRoom = (room: Room) => {
        if (confirm(`Are you sure you want to ${room.is_active ? 'deactivate' : 'activate'} room "${room.name}"?`)) {
            router.patch(route('room-borrowing.rooms.toggle', room.id));
        }
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const calculateElapsedTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const diffMs = new Date().getTime() - new Date(dateStr).getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    breadcrumbs={[
                        { label: 'Main Menu', href: route('dashboard') },
                        { label: 'Room & Key Management' },
                        { label: activeTab === 'catalog' ? 'Room Catalog' : activeTab === 'my-borrowings' ? 'My Borrowings' : activeTab === 'pending-returns' ? 'Security Queue' : activeTab === 'manage-rooms' ? 'Manage Rooms' : 'Borrowing & Keys' },
                    ]}
                    title="Room Borrowing & Key Management"
                    subtitle="Katalog ketersediaan ruangan hotel, peminjaman kunci, dan verifikasi pos Security"
                    primaryAction={{
                        label: 'Security Post QR Code',
                        icon: (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                        ),
                        onClick: () => setQrModalOpen(true),
                    }}
                    secondaryAction={permissions.can_manage_rooms ? {
                        label: 'Add Room',
                        icon: (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        ),
                        onClick: handleOpenCreateRoom,
                    } : undefined}
                />
            }
        >
            <Head title="Room & Key Borrowing - SIPU Swiss-Belinn SKA" />

            <div className="w-full space-y-4">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs flex items-center justify-between text-emerald-800 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium">{flash.success}</span>
                        </div>
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 shadow-xs flex items-center justify-between text-rose-800 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium">{flash.error}</span>
                        </div>
                    </div>
                )}

                {/* Metrics Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Total Rooms"
                        value={stats.total}
                        description="Registered in hotel"
                        variant="neutral"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        }
                    />

                    <StatCard
                        label="Available"
                        value={stats.available}
                        description="Keys ready to loan"
                        variant="success"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />

                    <StatCard
                        label="Borrowed"
                        value={stats.borrowed}
                        description="Keys with staff"
                        variant="danger"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        }
                    />

                    <StatCard
                        label="Pending Return"
                        value={stats.pending_return}
                        description="Physical check at post"
                        variant="warning"
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                </div>

                {/* Sub-navigation Pills */}
                <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit max-w-full overflow-x-auto border border-slate-200/80">
                    <button
                        type="button"
                        onClick={() => switchTab('borrow')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                            activeTab === 'borrow'
                                ? 'bg-white text-[#E31B23] shadow-xs ring-1 ring-slate-200/80 font-bold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Borrow Form
                    </button>

                    <button
                        type="button"
                        onClick={() => switchTab('my-borrowings')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                            activeTab === 'my-borrowings'
                                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-bold'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        My Borrowings
                        {myActiveBorrowings.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-[#E31B23]">
                                {myActiveBorrowings.length}
                            </span>
                        )}
                    </button>

                    {isItStaff && (
                        <button
                            type="button"
                            onClick={() => switchTab('catalog')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                activeTab === 'catalog'
                                    ? 'bg-white text-purple-700 shadow-xs ring-1 ring-slate-200/80 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            Room Catalog
                        </button>
                    )}

                    {(permissions.can_approve_return || permissions.is_security) && (
                        <button
                            type="button"
                            onClick={() => switchTab('pending-returns')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                activeTab === 'pending-returns'
                                    ? 'bg-white text-amber-700 shadow-xs ring-1 ring-slate-200/80 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Security Return Queue
                            {stats.pending_return > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                                    {stats.pending_return}
                                </span>
                            )}
                        </button>
                    )}

                    {permissions.can_manage_rooms && (
                        <button
                            type="button"
                            onClick={() => switchTab('manage-rooms')}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                                activeTab === 'manage-rooms'
                                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Manage Rooms
                        </button>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════════
                    TAB 0: UNIFIED BORROWING FORM (1 Form Terintegrasi Langsung)
                ═══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'borrow' && (
                    <div className="space-y-6">
                        {/* Compact Hero Banner (<= 80px) */}
                        <div className="bg-gradient-to-r from-red-800 to-rose-700 rounded-2xl px-5 py-3.5 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-sm sm:text-base font-bold leading-tight">Room & Key Borrowing Form</h2>
                                    <p className="text-xs text-red-100">Pilih ruangan hotel, cek ketersediaan fisik kunci secara real-time, dan isi durasi peminjaman.</p>
                                </div>
                            </div>
                            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 text-white border border-white/20 whitespace-nowrap">
                                Verifikasi Pos Security
                            </span>
                        </div>

                        {/* 2-Column Responsive Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* Main Form (8 Cols) */}
                            <div className="lg:col-span-8 space-y-6">
                                <form onSubmit={handleBorrowSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-6">
                                    {/* STEP 1: Room Selection & Availability Details */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-6 h-6 rounded-full bg-[#E31B23] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                                    1
                                                </span>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                                        Select Room & Key Status
                                                    </h3>
                                                    <p className="text-xs text-slate-500">
                                                        Ensure the selected room is Available (key ready for pickup at Security Post).
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quick Filter Pill */}
                                            <button
                                                type="button"
                                                onClick={() => setRoomPickerFilterAvailableOnly(!roomPickerFilterAvailableOnly)}
                                                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                                                    roomPickerFilterAvailableOnly
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {roomPickerFilterAvailableOnly ? '✓ Available Only' : 'All Rooms'}
                                            </button>
                                        </div>

                                        {/* Search & Select Input */}
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </span>
                                                <input
                                                    type="text"
                                                    value={roomPickerSearch}
                                                    onChange={(e) => setRoomPickerSearch(e.target.value)}
                                                    placeholder="Type to filter room name, number, location..."
                                                    className="block w-full pl-9 pr-8 py-2 rounded-xl border-slate-200 text-xs sm:text-sm focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] placeholder:text-slate-400"
                                                />
                                                {roomPickerSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRoomPickerSearch('')}
                                                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Dropdown Select */}
                                            <div>
                                                <select
                                                    id="room_id"
                                                    value={borrowData.room_id}
                                                    onChange={(e) => setBorrowData('room_id', Number(e.target.value))}
                                                    className="block w-full rounded-xl border-slate-200 py-2.5 text-xs sm:text-sm font-semibold focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] bg-white text-slate-800"
                                                >
                                                    {selectableRooms.map((r) => {
                                                        const statusLabel =
                                                            r.status === 'AVAILABLE'
                                                                ? '✅ Available'
                                                                : r.status === 'BORROWED'
                                                                ? '🔴 Borrowed'
                                                                : '⏳ Awaiting Verification';
                                                        return (
                                                            <option key={r.id} value={r.id}>
                                                                #{r.room_number} - {r.name} [{statusLabel}] - {r.location || 'Hotel Area'}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <InputError message={borrowErrors.room_id} className="mt-1" />
                                            </div>

                                            {/* Quick Select Buttons Grid (Compact pills) */}
                                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                                                {selectableRooms.slice(0, 10).map((r) => {
                                                    const isSelected = Number(borrowData.room_id) === r.id;
                                                    const isAvail = r.status === 'AVAILABLE';
                                                    return (
                                                        <button
                                                            key={r.id}
                                                            type="button"
                                                            onClick={() => setBorrowData('room_id', r.id)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                                                                isSelected
                                                                    ? 'bg-[#E31B23] text-white border-[#E31B23] shadow-xs'
                                                                    : isAvail
                                                                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                                    : 'bg-rose-50/60 text-rose-700 border-rose-200 hover:bg-rose-100/60'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`w-2 h-2 rounded-full shrink-0 ${
                                                                    isSelected
                                                                        ? 'bg-white'
                                                                        : isAvail
                                                                        ? 'bg-emerald-500'
                                                                        : 'bg-rose-500'
                                                                }`}
                                                            />
                                                            <span>#{r.room_number}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* ROOM DETAILS & KEY STATUS CARD */}
                                        {selectedRoom && (
                                            <div
                                                className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                                                    selectedRoom.status === 'AVAILABLE'
                                                        ? 'bg-emerald-50/40 border-emerald-200/90'
                                                        : selectedRoom.status === 'BORROWED'
                                                        ? 'bg-rose-50/40 border-rose-200/90'
                                                        : 'bg-amber-50/40 border-amber-200/90'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 pb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm font-bold text-[#E31B23]">
                                                                #{selectedRoom.room_number}
                                                            </span>
                                                            <h4 className="text-base sm:text-lg font-bold text-slate-900">
                                                                {selectedRoom.name}
                                                            </h4>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {selectedRoom.location || 'Area Hotel Swiss-Belinn SKA'}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        {selectedRoom.status === 'AVAILABLE' && (
                                                            <Badge variant="success" dot size="md">
                                                                Available (Ready for Pickup)
                                                            </Badge>
                                                        )}
                                                        {selectedRoom.status === 'BORROWED' && (
                                                            <Badge variant="danger" dot size="md">
                                                                Currently Borrowed
                                                            </Badge>
                                                        )}
                                                        {selectedRoom.status === 'PENDING_RETURN' && (
                                                            <Badge variant="warning" dot size="md">
                                                                Awaiting Security Verification
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Room Specifications */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-700 py-3 border-b border-slate-200/60">
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px] font-medium">Location / Area:</span>
                                                        <span className="font-semibold text-slate-800">{selectedRoom.location || '-'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px] font-medium">Capacity:</span>
                                                        <span className="font-semibold text-slate-800 tabular-nums">
                                                            {selectedRoom.capacity ? `${selectedRoom.capacity} Pax` : 'Flexible'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px] font-medium">Physical Key Code:</span>
                                                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                                                            {selectedRoom.key_code || '-'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px] font-medium">Total Borrowings:</span>
                                                        <span className="font-semibold text-slate-800 tabular-nums">
                                                            {selectedRoom.transactions_count || 0} Time{selectedRoom.transactions_count === 1 ? '' : 's'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {selectedRoom.description && (
                                                    <div className="pt-2 text-xs text-slate-600">
                                                        <span className="text-slate-400 font-medium">Facilities / Description: </span>
                                                        <span>{selectedRoom.description}</span>
                                                    </div>
                                                )}

                                                {/* Occupancy & Availability Alert */}
                                                {selectedRoom.status === 'BORROWED' && (
                                                    <div className="mt-3.5 rounded-xl border border-rose-300 bg-white p-3.5 shadow-2xs space-y-2">
                                                        <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                                                            <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                            Physical Key Currently In Use
                                                        </div>

                                                        {selectedRoom.active_transaction ? (
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700 bg-rose-50/60 p-2.5 rounded-lg border border-rose-100">
                                                                <div>
                                                                    <span className="text-slate-400 block text-[11px]">Borrower:</span>
                                                                    <span className="font-bold text-slate-900">
                                                                        {selectedRoom.active_transaction.borrower?.user?.name || 'Hotel Staff'}
                                                                    </span>
                                                                    <span className="block text-[11px] text-slate-500">
                                                                        {selectedRoom.active_transaction.borrower?.department?.name || 'Dept'} • {selectedRoom.active_transaction.borrower?.employee_number}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-slate-400 block text-[11px]">Borrowed At:</span>
                                                                    <span className="font-semibold text-slate-800 tabular-nums">
                                                                        {formatDateTime(selectedRoom.active_transaction.borrowed_at)}
                                                                    </span>
                                                                    <span className="block text-[11px] text-rose-600 font-medium">
                                                                        ({calculateElapsedTime(selectedRoom.active_transaction.borrowed_at)})
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-slate-400 block text-[11px]">Due Return Time:</span>
                                                                    <span className="font-semibold text-slate-800 tabular-nums">
                                                                        {selectedRoom.active_transaction.expected_return_at ? formatDateTime(selectedRoom.active_transaction.expected_return_at) : '-'}
                                                                    </span>
                                                                    <span className="block text-[11px] text-slate-500">
                                                                        Duration: {selectedRoom.active_transaction.expected_duration_hours || 2} Hour(s)
                                                                    </span>
                                                                </div>
                                                                {selectedRoom.active_transaction.purpose && (
                                                                    <div className="sm:col-span-3 text-[11px] pt-1 border-t border-rose-200/50 text-slate-600">
                                                                        <span className="text-slate-400">Purpose: </span>
                                                                        <span className="italic">"{selectedRoom.active_transaction.purpose}"</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-rose-700">
                                                                This room key is currently recorded as borrowed by hotel staff and has not yet been returned to the Security Post.
                                                            </p>
                                                        )}

                                                        <div className="flex items-center justify-between pt-1">
                                                            <p className="text-xs text-rose-700">
                                                                You cannot borrow this room right now. Please select another available room.
                                                            </p>
                                                            {firstAvailableRoom && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setBorrowData('room_id', firstAvailableRoom.id)}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shrink-0"
                                                                >
                                                                    Select Available Room (#{firstAvailableRoom.room_number})
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedRoom.status === 'PENDING_RETURN' && (
                                                    <div className="mt-3.5 rounded-xl border border-amber-300 bg-white p-3.5 shadow-2xs space-y-1.5">
                                                        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                                                            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Return Verification in Progress at Security
                                                        </div>
                                                        <p className="text-xs text-amber-700 leading-relaxed">
                                                            The borrower has initiated key return. The physical key is being inspected by Security personnel. The room will become <strong>Available</strong> once verified.
                                                        </p>
                                                    </div>
                                                )}

                                                {selectedRoom.status === 'AVAILABLE' && (
                                                    <div className="mt-3.5 rounded-xl border border-emerald-300 bg-white p-3 shadow-2xs flex items-center gap-2.5 text-xs text-emerald-800">
                                                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <span className="font-bold">Physical Key Ready for Pickup!</span> The key is secured in the Security Key Cabinet and ready to be issued upon form submission.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* STEP 2: Estimated Borrowing Duration */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-full bg-[#E31B23] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                                2
                                            </span>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                                    Estimated Borrowing Duration
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    Select estimated duration to determine the key return deadline to Security Post.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Presets Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                            {PRESET_DURATIONS.map((preset) => {
                                                const isSelected = selectedDurationPreset === preset.hours;
                                                return (
                                                    <button
                                                        key={preset.hours}
                                                        type="button"
                                                        onClick={() => handleSelectPresetDuration(preset.hours)}
                                                        className={`p-3 rounded-2xl border text-left transition-all ${
                                                            isSelected
                                                                ? 'border-[#E31B23] bg-red-50/70 text-[#E31B23] ring-1 ring-[#E31B23] shadow-xs'
                                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                                                        }`}
                                                    >
                                                        <div className="font-bold text-sm">{preset.label}</div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">{preset.sub}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Custom Duration Toggle & Input */}
                                        <div className="pt-1 flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={handleSelectCustomDuration}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                                    selectedDurationPreset === 'custom'
                                                        ? 'border-[#E31B23] bg-red-50 text-[#E31B23] ring-1 ring-[#E31B23]'
                                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                Custom Hours (Manual)
                                            </button>

                                            {selectedDurationPreset === 'custom' && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="72"
                                                        value={borrowData.expected_duration_hours}
                                                        onChange={(e) => setBorrowData('expected_duration_hours', parseInt(e.target.value) || 1)}
                                                        className="w-20 rounded-xl border-slate-200 text-xs sm:text-sm font-semibold text-center focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                                    />
                                                    <span className="text-xs text-slate-600 font-medium">Hours</span>
                                                </div>
                                            )}
                                        </div>
                                        <InputError message={borrowErrors.expected_duration_hours} className="mt-1" />

                                        {/* Projected Return Time Display */}
                                        {projectedReturnTime && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-3 text-xs text-slate-700">
                                                <div className="w-7 h-7 rounded-lg bg-red-100 text-[#E31B23] flex items-center justify-center shrink-0">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[11px]">Key Return Deadline:</span>
                                                    <span className="font-bold text-slate-900">{projectedReturnTime} WIB</span>
                                                    <span className="text-slate-500 text-[11px] ml-1">
                                                        ({borrowData.expected_duration_hours} hours from now)
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* STEP 3: Keperluan / Agenda Penggunaan */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-full bg-[#E31B23] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                                3
                                            </span>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                                                    Purpose / Usage Agenda
                                                </h3>
                                                <p className="text-xs text-slate-500">
                                                    State room usage details for administrative records and Security verification.
                                                </p>
                                            </div>
                                        </div>

                                        <textarea
                                            id="purpose"
                                            rows={3}
                                            value={borrowData.purpose}
                                            onChange={(e) => setBorrowData('purpose', e.target.value)}
                                            placeholder="e.g. Front Office weekly coordination meeting, VIP client presentation, or staff training session..."
                                            className="block w-full rounded-2xl border-slate-200 text-xs sm:text-sm focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] placeholder:text-slate-400"
                                        />
                                        <InputError message={borrowErrors.purpose} className="mt-1" />
                                    </div>

                                    {/* Submit Section */}
                                    <div className="pt-4 border-t border-slate-100 space-y-3">
                                        {selectedRoom?.status !== 'AVAILABLE' ? (
                                            <div>
                                                <PrimaryButton
                                                    type="button"
                                                    disabled={true}
                                                    className="w-full justify-center bg-slate-300 text-slate-500 cursor-not-allowed py-3 text-sm font-bold"
                                                >
                                                    Room Unavailable (Currently Borrowed)
                                                </PrimaryButton>
                                                <p className="text-center text-xs text-rose-600 mt-2 font-medium">
                                                    Select an available room above to proceed with your request.
                                                </p>
                                            </div>
                                        ) : (
                                            <PrimaryButton
                                                type="submit"
                                                disabled={borrowProcessing || !permissions.can_borrow}
                                                className="w-full justify-center bg-[#E31B23] hover:bg-[#C4141B] py-3 text-sm font-bold shadow-md active:scale-[0.99] transition-all"
                                            >
                                                {borrowProcessing ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Processing Request...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                        </svg>
                                                        Confirm & Submit Key Loan Request
                                                    </span>
                                                )}
                                            </PrimaryButton>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Sidebar Information (4 Cols) */}
                            <div className="lg:col-span-4 space-y-6">
                                {/* Borrower Identity Card */}
                                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Borrower Identity
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                            Active Account
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-2xl overflow-hidden border border-slate-200 shadow-xs shrink-0">
                                            {currentUser?.profile_photo_url ? (
                                                <img
                                                    src={currentUser.profile_photo_url}
                                                    alt={currentUser?.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-red-100 text-[#E31B23] font-bold flex items-center justify-center text-base">
                                                    {currentUser?.name?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-sm font-bold text-slate-900 truncate">
                                                {currentUser?.name || 'Staff Member'}
                                            </h4>
                                            <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                                            <span className="inline-block mt-0.5 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                {currentUser?.employee?.department?.name || 'Hotel Staff'} • ID: {currentUser?.employee?.employee_number || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-200/60 bg-slate-50/70 p-3 text-xs text-slate-600 space-y-1">
                                        <div className="text-[11px] text-slate-400 font-medium">Automatic Notice:</div>
                                        <p className="text-[11px] leading-relaxed">
                                            This loan will be officially logged under your account. You hold full responsibility for the physical key security and room conduct until handed back to the Security Post.
                                        </p>
                                    </div>
                                </div>

                                {/* SOP Steps Card */}
                                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3.5">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#E31B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Key Borrowing Procedure
                                    </h4>
                                    <ol className="space-y-2.5 text-xs text-slate-600">
                                        <li className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-red-50 text-[#E31B23] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                                            <span>Select a room with <strong>Available</strong> status in the form.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-red-50 text-[#E31B23] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                                            <span>Specify duration & purpose, then click <strong>Submit Request</strong>.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-red-50 text-[#E31B23] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                                            <span>Proceed to the <strong>Security Post</strong> to pick up the physical key.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-4 h-4 rounded-full bg-red-50 text-[#E31B23] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                                            <span>Once completed, submit a <strong>Return Request</strong> in My Borrowings and return the key to Security.</span>
                                        </li>
                                    </ol>
                                </div>

                                {/* Hotel Key Stats Summary */}
                                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        Hotel Keys Summary
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50">
                                            <span className="text-slate-600">Total Registered Rooms</span>
                                            <span className="font-bold text-slate-900 tabular-nums">{stats.total}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-emerald-800">
                                            <span>Keys Available at Post</span>
                                            <span className="font-bold tabular-nums">{stats.available}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 text-rose-800">
                                            <span>Keys Currently Borrowed</span>
                                            <span className="font-bold tabular-nums">{stats.borrowed}</span>
                                        </div>
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 text-amber-800">
                                            <span>Awaiting Verification</span>
                                            <span className="font-bold tabular-nums">{stats.pending_return}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════
                    TAB 1: ROOM CATALOG (Khusus IT)
                ═══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'catalog' && isItStaff && (
                    <div className="space-y-4">
                        {/* IT Only Alert Banner */}
                        <div className="rounded-2xl border border-purple-200 bg-purple-50/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-purple-900">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider block">IT Department Exclusive View</span>
                                    <span className="text-xs text-purple-800">
                                        This directory catalog is exclusively for the IT Team. General staff members are routed directly to the <strong>Borrowing Form</strong>.
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => switchTab('borrow')}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors shrink-0"
                            >
                                Open Borrowing Form →
                            </button>
                        </div>

                        {/* Search & Status Filters */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                            <div className="relative flex-1 max-w-md">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search room name, number, location, key code..."
                                    className="block w-full pl-9 pr-8 py-2 rounded-xl border-slate-200 text-sm focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] placeholder:text-slate-400"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Buttons */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('ALL')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                                        statusFilter === 'ALL'
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    All ({rooms.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('AVAILABLE')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                                        statusFilter === 'AVAILABLE'
                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                >
                                    Available ({stats.available})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('BORROWED')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                                        statusFilter === 'BORROWED'
                                            ? 'bg-rose-600 text-white shadow-2xs'
                                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    }`}
                                >
                                    Borrowed ({stats.borrowed})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('PENDING_RETURN')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                                        statusFilter === 'PENDING_RETURN'
                                            ? 'bg-amber-600 text-white shadow-2xs'
                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    }`}
                                >
                                    Pending Return ({stats.pending_return})
                                </button>
                            </div>
                        </div>

                        {/* Room Catalog Grid */}
                        {filteredRooms.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-bold text-slate-800">No rooms found</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                    {searchQuery
                                        ? `No rooms matched the search keyword "${searchQuery}". Try another keyword.`
                                        : 'No rooms found under this status filter.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredRooms.map((room) => {
                                    const isAvailable = room.status === 'AVAILABLE';
                                    const isBorrowed = room.status === 'BORROWED';
                                    const isPendingReturn = room.status === 'PENDING_RETURN';
                                    const activeTx = room.active_transaction;

                                    return (
                                        <div
                                            key={room.id}
                                            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                                        >
                                            {/* Room Card Header */}
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                                    <div>
                                                        <span className="font-mono text-xs font-bold text-[#E31B23] tracking-wide block">
                                                            {room.room_number}
                                                        </span>
                                                        <h3 className="text-base font-bold text-slate-900 group-hover:text-[#E31B23] transition-colors leading-snug">
                                                            {room.name}
                                                        </h3>
                                                    </div>

                                                    <div>
                                                        {isAvailable && (
                                                            <Badge variant="success" dot size="sm">
                                                                Available
                                                            </Badge>
                                                        )}
                                                        {isBorrowed && (
                                                            <Badge variant="danger" dot size="sm">
                                                                Borrowed
                                                            </Badge>
                                                        )}
                                                        {isPendingReturn && (
                                                            <Badge variant="warning" dot size="sm">
                                                                Pending Return
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                                                    {room.description || 'Standard operational room facilities at Swiss-Belinn SKA.'}
                                                </p>

                                                {/* Meta Info */}
                                                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400">Location:</span>
                                                        <span className="font-semibold text-slate-800">{room.location || 'Hotel Area'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400">Capacity:</span>
                                                        <span className="font-semibold text-slate-800 tabular-nums">
                                                            {room.capacity ? `${room.capacity} Pax` : 'Flexible'}
                                                        </span>
                                                    </div>
                                                    {room.key_code && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-400">Key Tag:</span>
                                                            <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                                                                {room.key_code}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Borrower context when not available */}
                                                {(isBorrowed || isPendingReturn) && activeTx && (
                                                    <div className={`mt-3.5 p-3 rounded-xl border text-xs leading-tight ${
                                                        isPendingReturn
                                                            ? 'bg-amber-50/70 border-amber-200/70 text-amber-900'
                                                            : 'bg-rose-50/60 border-rose-200/60 text-rose-900'
                                                    }`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-semibold text-[11px] uppercase tracking-wider opacity-75">
                                                                {isPendingReturn ? 'Return in Progress' : 'Current Borrower'}
                                                            </span>
                                                            <span className="font-semibold tabular-nums text-[10px]">
                                                                {calculateElapsedTime(activeTx.borrowed_at)}
                                                            </span>
                                                        </div>
                                                        <div className="font-bold text-slate-900 truncate">
                                                            {activeTx.borrower?.user?.name || 'Hotel Employee'}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                                            {activeTx.borrower?.department?.name || 'Department'} • {activeTx.borrower?.employee_number}
                                                        </div>
                                                        {activeTx.purpose && (
                                                            <div className="mt-1 text-[11px] italic truncate text-slate-600">
                                                                "{activeTx.purpose}"
                                                            </div>
                                                        )}
                                                        {activeTx.expected_duration_hours && (
                                                            <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                                                <span className="font-medium text-slate-600">
                                                                    Duration: {activeTx.expected_duration_hours}h
                                                                </span>
                                                                {activeTx.expected_return_at && (
                                                                    <span className="font-semibold text-slate-800 tabular-nums">
                                                                        Due: {formatDateTime(activeTx.expected_return_at)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Room Card Footer / Action */}
                                            <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                                                <div className="text-[11px] text-slate-400 font-mono">
                                                    #{room.room_number}
                                                </div>

                                                {isAvailable ? (
                                                    <PrimaryButton
                                                        type="button"
                                                        onClick={() => handleBorrowFromCatalog(room)}
                                                        disabled={!permissions.can_borrow}
                                                        className="bg-[#E31B23] hover:bg-[#C4141B] px-3.5 py-1.5 text-xs shadow-xs"
                                                    >
                                                        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                        </svg>
                                                        Borrow in Form
                                                    </PrimaryButton>
                                                ) : isBorrowed ? (
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                                                        Key Borrowed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                                        Awaiting Security
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════
                    TAB 2: MY BORROWINGS
                ═══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'my-borrowings' && (
                    <div className="space-y-6">
                        {/* Active Borrowing Section */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Keys Currently in Your Possession</h2>
                                    <p className="text-xs text-slate-500">
                                        Your active key loan transactions. Please request return promptly after your schedule concludes.
                                    </p>
                                </div>
                                <span className="bg-red-50 text-[#E31B23] px-2.5 py-1 rounded-full text-xs font-bold border border-red-100 tabular-nums">
                                    {myActiveBorrowings.length} Active
                                </span>
                            </div>

                            {myActiveBorrowings.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">No active borrowings</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        You do not currently have any borrowed room keys.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {myActiveBorrowings.map((tx) => {
                                        const isBorrowed = tx.status === 'BORROWED';
                                        const isPending = tx.status === 'PENDING_RETURN';

                                        return (
                                            <div key={tx.id} className="p-5 sm:flex sm:items-center sm:justify-between gap-4">
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-mono text-xs font-bold text-[#E31B23]">
                                                            {tx.room.room_number}
                                                        </span>
                                                        <h3 className="text-base font-bold text-slate-900">{tx.room.name}</h3>
                                                        {isBorrowed ? (
                                                            <Badge variant="danger" dot size="sm">Borrowed</Badge>
                                                        ) : (
                                                            <Badge variant="warning" dot size="sm">Awaiting Security Confirmation</Badge>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-1">
                                                        <div>
                                                            <span className="text-slate-400 block">Borrowed At:</span>
                                                            <span className="font-semibold text-slate-800 tabular-nums">
                                                                {formatDateTime(tx.borrowed_at)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400 block">Duration / Due:</span>
                                                            <span className="font-semibold text-slate-800 tabular-nums">
                                                                {tx.expected_duration_hours ? `${tx.expected_duration_hours} Hour(s)` : '-'}
                                                                {tx.expected_return_at && (
                                                                    <span className="block text-[11px] text-slate-500 font-normal">
                                                                        Due: {formatDateTime(tx.expected_return_at)}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400 block">Transaction No:</span>
                                                            <span className="font-mono text-slate-700">{tx.transaction_number}</span>
                                                        </div>
                                                        {tx.room.key_code && (
                                                            <div>
                                                                <span className="text-slate-400 block">Key Tag:</span>
                                                                <span className="font-mono font-bold text-slate-800">{tx.room.key_code}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {tx.purpose && (
                                                        <div className="text-xs text-slate-600 pt-1">
                                                            <span className="text-slate-400">Purpose: </span>
                                                            <span className="italic">"{tx.purpose}"</span>
                                                        </div>
                                                    )}

                                                    {isPending && (
                                                        <div className="mt-2 text-xs bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200/70 flex items-center gap-2">
                                                            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>
                                                                Return request submitted at{' '}
                                                                <strong className="tabular-nums">{formatDateTime(tx.return_requested_at)}</strong>. Please hand over the physical key to the officer at the Security post.
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 sm:mt-0 shrink-0">
                                                    {isBorrowed ? (
                                                        <PrimaryButton
                                                            type="button"
                                                            onClick={() => handleOpenReturn(tx)}
                                                            className="bg-[#E31B23] hover:bg-[#C4141B]"
                                                        >
                                                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                            </svg>
                                                            Request Key Return
                                                        </PrimaryButton>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                                                            Awaiting Security Post
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Return History Section */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-900">Completed Return History</h2>
                                <p className="text-xs text-slate-500">
                                    Record of room keys whose physical return has been verified by Security officers.
                                </p>
                            </div>

                            {myHistory.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400">
                                    No completed return history recorded yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3">Transaction No</th>
                                                <th className="px-6 py-3">Room</th>
                                                <th className="px-6 py-3">Borrowed At</th>
                                                <th className="px-6 py-3">Returned At</th>
                                                <th className="px-6 py-3">Security Officer</th>
                                                <th className="px-6 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {myHistory.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-6 py-3.5 font-mono text-slate-600">{tx.transaction_number}</td>
                                                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                                                        {tx.room.room_number} - {tx.room.name}
                                                    </td>
                                                    <td className="px-6 py-3.5 tabular-nums text-slate-600">{formatDateTime(tx.borrowed_at)}</td>
                                                    <td className="px-6 py-3.5 tabular-nums text-slate-600">{formatDateTime(tx.returned_at)}</td>
                                                    <td className="px-6 py-3.5 font-medium text-slate-800">
                                                        {tx.security_user?.name || 'Security Officer'}
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <Badge variant="success" size="sm">Completed</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════
                    TAB 3: SECURITY RETURN QUEUE
                ═══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'pending-returns' && permissions.can_approve_return && (
                    <div className="space-y-6">
                        {/* Pending Verification Queue */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                        !
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">
                                            Physical Key Return Confirmation Queue
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            Physically verify that the hotel room key has been handed over at the Security post before completing the transaction.
                                        </p>
                                    </div>
                                </div>
                                <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold tabular-nums">
                                    {pendingReturns.length} Pending Verification
                                </span>
                            </div>

                            {pendingReturns.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800">Queue is Clear</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        All key returns have been verified. There are no pending return requests at this time.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {pendingReturns.map((tx) => (
                                        <div key={tx.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-[#E31B23]">
                                                        {tx.room.room_number}
                                                    </span>
                                                    <h3 className="text-base font-bold text-slate-900">
                                                        {tx.room.name}
                                                    </h3>
                                                    {tx.room.key_code && (
                                                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                            {tx.room.key_code}
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                                        Requested {calculateElapsedTime(tx.return_requested_at)}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-slate-600">
                                                    <div>
                                                        <span className="text-slate-400 block">Borrower:</span>
                                                        <span className="font-semibold text-slate-800">{tx.borrower?.user?.name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block">Department:</span>
                                                        <span className="text-slate-700">{tx.borrower?.department?.name}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block">Borrowed At:</span>
                                                        <span className="font-semibold text-slate-700 tabular-nums">{formatDateTime(tx.borrowed_at)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block">Duration / Due:</span>
                                                        <span className="font-semibold text-slate-700 tabular-nums">
                                                            {tx.expected_duration_hours ? `${tx.expected_duration_hours}h` : '-'}
                                                            {tx.expected_return_at && (
                                                                <span className="block text-[11px] text-slate-500 font-normal">
                                                                    {formatDateTime(tx.expected_return_at)}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block">Requested At:</span>
                                                        <span className="font-semibold text-slate-700 tabular-nums">{formatDateTime(tx.return_requested_at)}</span>
                                                    </div>
                                                </div>

                                                {tx.purpose && (
                                                    <div className="text-xs text-slate-600">
                                                        <span className="text-slate-400">Purpose: </span>
                                                        <span className="italic">"{tx.purpose}"</span>
                                                    </div>
                                                )}

                                                {tx.return_notes && (
                                                    <div className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                                                        <span className="font-medium text-slate-500">Borrower Notes: </span>
                                                        "{tx.return_notes}"
                                                    </div>
                                                )}
                                            </div>

                                            <div className="shrink-0 flex items-center gap-2">
                                                <PrimaryButton
                                                    type="button"
                                                    onClick={() => handleOpenConfirm(tx)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-sm"
                                                >
                                                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Confirm Key Receipt
                                                </PrimaryButton>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Completed Confirmations Audit Log */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-900">Security Verified Return Audit Log</h2>
                                <p className="text-xs text-slate-500">
                                    Audit trail of physical room key handovers completed by Security personnel.
                                </p>
                            </div>

                            {recentAuditTransactions.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400">
                                    No completed return transactions logged yet.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3">Transaction No</th>
                                                <th className="px-6 py-3">Room</th>
                                                <th className="px-6 py-3">Borrower</th>
                                                <th className="px-6 py-3">Borrowed At</th>
                                                <th className="px-6 py-3">Received At</th>
                                                <th className="px-6 py-3">Security Officer</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {recentAuditTransactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-6 py-3.5 font-mono text-slate-600">{tx.transaction_number}</td>
                                                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                                                        {tx.room.room_number} - {tx.room.name}
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <div className="font-semibold text-slate-800">{tx.borrower?.user?.name}</div>
                                                        <div className="text-[11px] text-slate-400">{tx.borrower?.department?.name}</div>
                                                    </td>
                                                    <td className="px-6 py-3.5 tabular-nums text-slate-600">{formatDateTime(tx.borrowed_at)}</td>
                                                    <td className="px-6 py-3.5 tabular-nums text-slate-600">{formatDateTime(tx.returned_at)}</td>
                                                    <td className="px-6 py-3.5 font-medium text-emerald-800">
                                                        {tx.security_user?.name || 'Security Officer'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════
                    TAB 4: MANAGE ROOMS (ADMIN)
                ═══════════════════════════════════════════════════════════════════════════ */}
                {activeTab === 'manage-rooms' && permissions.can_manage_rooms && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Hotel Room Inventory</h2>
                                <p className="text-xs text-slate-500">
                                    Master list of hotel rooms, locations, capacities, and physical key codes.
                                </p>
                            </div>
                            <PrimaryButton
                                type="button"
                                onClick={handleOpenCreateRoom}
                                className="bg-[#E31B23] hover:bg-[#C4141B]"
                            >
                                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Room
                            </PrimaryButton>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Code</th>
                                        <th className="px-6 py-3">Room Name</th>
                                        <th className="px-6 py-3">Location</th>
                                        <th className="px-6 py-3">Capacity</th>
                                        <th className="px-6 py-3">Key Tag</th>
                                        <th className="px-6 py-3">Current Status</th>
                                        <th className="px-6 py-3">Active</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {allRoomsForAdmin.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5 font-mono font-bold text-[#E31B23]">{r.room_number}</td>
                                            <td className="px-6 py-3.5 font-semibold text-slate-900">{r.name}</td>
                                            <td className="px-6 py-3.5 text-slate-600">{r.location || '-'}</td>
                                            <td className="px-6 py-3.5 tabular-nums text-slate-600">{r.capacity ? `${r.capacity} Pax` : '-'}</td>
                                            <td className="px-6 py-3.5 font-mono text-slate-700">{r.key_code || '-'}</td>
                                            <td className="px-6 py-3.5">
                                                {r.status === 'AVAILABLE' && <Badge variant="success" size="sm">Available</Badge>}
                                                {r.status === 'BORROWED' && <Badge variant="danger" size="sm">Borrowed</Badge>}
                                                {r.status === 'PENDING_RETURN' && <Badge variant="warning" size="sm">Pending Return</Badge>}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleRoom(r)}
                                                    className={`px-2 py-0.5 rounded-full font-semibold text-[11px] transition-colors ${
                                                        r.is_active
                                                             ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                             : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                                    }`}
                                                >
                                                    {r.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditRoom(r)}
                                                    className="font-medium text-indigo-600 hover:text-indigo-900 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <BorrowRoomModal
                show={borrowModalOpen}
                onClose={() => setBorrowModalOpen(false)}
                room={selectedRoomToBorrow}
            />

            <ReturnRequestModal
                show={returnModalOpen}
                onClose={() => setReturnModalOpen(false)}
                transaction={selectedTxToReturn}
            />

            <SecurityConfirmReturnModal
                show={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                transaction={selectedTxToConfirm}
            />

            <RoomModal
                show={roomModalOpen}
                onClose={() => setRoomModalOpen(false)}
                room={selectedRoomToEdit}
            />

            <QrCodeModal
                show={qrModalOpen}
                onClose={() => setQrModalOpen(false)}
                qrUrl={qrUrl}
            />
        </AuthenticatedLayout>
    );
}
