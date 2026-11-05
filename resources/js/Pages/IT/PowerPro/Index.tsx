import React, { useState, useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import SignaturePad from '@/Components/SignaturePad';

interface EmployeeItem {
    id: number;
    employee_number: string;
    department_id: number;
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
}

interface DepartmentItem {
    id: number;
    name: string;
}

interface PowerProRequestItem {
    id: number;
    request_number: string;
    request_type: 'create_new' | 'modify_access' | 'reset_password' | 'deactivate';
    request_type_label: string;
    employee_id: number;
    department_id: number;
    employment_status?: string;
    system_type: string;
    power_pro_modules: string[];
    access_level: string;
    special_privileges?: string[];
    proposed_username?: string;
    reason?: string;
    status: 'On Request' | 'Approved' | 'Done' | 'Rejected';
    status_color: string;
    requested_by_user_id?: number;
    requested_by_username?: string;
    requested_at?: string;
    requester_signature?: string;
    approved_by_user_id?: number;
    approved_by_username?: string;
    approved_at?: string;
    approver_signature?: string;
    approval_notes?: string;
    processed_by_user_id?: number;
    processed_by_username?: string;
    processed_at?: string;
    it_signature?: string;
    created_user_id?: string;
    it_notes?: string;
    rejection_reason?: string;
    created_at: string;
    employee?: {
        id: number;
        employee_number: string;
        user?: {
            name: string;
            email: string;
        };
        position?: {
            name: string;
        };
    };
    department?: {
        id: number;
        name: string;
    };
    requested_by?: {
        name: string;
    };
    approved_by?: {
        name: string;
    };
    processed_by?: {
        name: string;
    };
}

interface Props {
    requests: {
        data: PowerProRequestItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    stats: {
        total: number;
        on_request: number;
        approved: number;
        done: number;
        rejected: number;
    };
    departments: DepartmentItem[];
    employees: EmployeeItem[];
    filters: {
        search: string;
        status: string;
        request_type: string;
        department_id: string;
    };
    permissions: {
        isAdmin: boolean;
        isItStaff: boolean;
        isHod: boolean;
        isSupervisor: boolean;
        departmentId?: number;
        departmentName?: string;
    };
    currentUser: {
        id: number;
        name: string;
        employee_id?: number;
        department_id?: number;
        department_name?: string;
        position_name?: string;
    };
}

const AVAILABLE_MODULES = [
    { id: 'Front Office', label: 'Front Office (FO)', desc: 'Check-in, Check-out, Reservation, Room Folio & Billing' },
    { id: 'Point of Sales (POS)', label: 'Point of Sales (POS)', desc: 'Restaurant, Bar, Room Service, Banquet Cashier' },
    { id: 'Housekeeping', label: 'Housekeeping (HK)', desc: 'Room Status (Clean/Dirty/OOO), Linen, Mini Bar' },
    { id: 'Accounting / Back Office', label: 'Accounting / Finance', desc: 'Accounts Receivable (AR), AP, GL, Night Audit' },
    { id: 'Purchasing & Receiving', label: 'Purchasing & Store', desc: 'Material Requisition, Receiving, Stock Taking' },
    { id: 'Sales & Marketing', label: 'Sales & Catering', desc: 'Company Profile, Contract Rates, Banquet Event' },
];

const AVAILABLE_PRIVILEGES = [
    { id: 'Void / Cancel Transaction', label: 'Void / Bill Cancellation' },
    { id: 'Discount Override', label: 'Manual Discount / Override' },
    { id: 'Rate Change Override', label: 'Room Rate Override' },
    { id: 'Reprint Receipt / Folio', label: 'Reprint Bill / Folio' },
    { id: 'Open Cash Drawer', label: 'Open Cash Drawer (No Sale)' },
    { id: 'Night Audit Posting', label: 'Night Audit Posting' },
];

export default function PowerProIndex({
    requests = { data: [], current_page: 1, last_page: 1, total: 0, links: [] },
    stats = { total: 0, on_request: 0, approved: 0, done: 0, rejected: 0 },
    departments = [],
    employees = [],
    filters = { search: '', status: 'all', request_type: 'all', department_id: 'all' },
    permissions = { isAdmin: false, isItStaff: false, isHod: false, isSupervisor: false },
    currentUser = { id: 0, name: '' },
}: Props) {
    const safeDepartments = Array.isArray(departments) ? departments : [];
    const safeEmployees = Array.isArray(employees) ? employees : [];
    const safeStats = stats || { total: 0, on_request: 0, approved: 0, done: 0, rejected: 0 };
    const safeRequests = requests && Array.isArray(requests?.data) ? requests : { data: [], current_page: 1, last_page: 1, total: 0, links: [] };

    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [statusFilter, setStatusFilter] = useState(filters?.status || 'all');
    const [typeFilter, setTypeFilter] = useState(filters?.request_type || 'all');
    const [deptFilter, setDeptFilter] = useState(filters?.department_id || 'all');

    // Modals state
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<PowerProRequestItem | null>(null);

    // Create Form
    const createForm = useForm({
        employee_id: currentUser?.employee_id ? String(currentUser.employee_id) : '',
        request_type: 'create_new',
        employment_status: 'Permanent',
        power_pro_modules: ['Front Office'],
        access_level: 'Operator / Front Desk Agent',
        special_privileges: [] as string[],
        proposed_username: '',
        reason: '',
        requester_signature: '',
    });

    // Approve Form (HOD)
    const approveForm = useForm({
        approval_notes: '',
        approver_signature: '',
    });

    // Process Form (IT)
    const processForm = useForm({
        created_user_id: '',
        it_notes: '',
        it_signature: '',
    });

    // Reject Form
    const rejectForm = useForm({
        rejection_reason: '',
    });

    // Handle filter submit
    const applyFilters = (newFilters: Partial<typeof filters>) => {
        router.get(
            route('power-pro.index'),
            {
                search: newFilters.search ?? searchTerm,
                status: newFilters.status ?? statusFilter,
                request_type: newFilters.request_type ?? typeFilter,
                department_id: newFilters.department_id ?? deptFilter,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search: searchTerm });
    };

    // Toggle modules
    const handleModuleToggle = (modId: string) => {
        const current = createForm.data.power_pro_modules;
        if (current.includes(modId)) {
            if (current.length > 1) {
                createForm.setData('power_pro_modules', current.filter((m) => m !== modId));
            }
        } else {
            createForm.setData('power_pro_modules', [...current, modId]);
        }
    };

    // Toggle privileges
    const handlePrivilegeToggle = (privId: string) => {
        const current = createForm.data.special_privileges;
        if (current.includes(privId)) {
            createForm.setData('special_privileges', current.filter((p) => p !== privId));
        } else {
            createForm.setData('special_privileges', [...current, privId]);
        }
    };

    // Auto update selected employee department & position
    const selectedEmployee = useMemo(() => {
        return safeEmployees.find((e) => String(e.id) === String(createForm.data.employee_id));
    }, [createForm.data.employee_id, safeEmployees]);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(route('power-pro.store'), {
            onSuccess: () => {
                setIsCreateOpen(false);
                createForm.reset();
            },
        });
    };

    const handleApproveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeItem) return;
        approveForm.patch(route('power-pro.approve', activeItem.id), {
            onSuccess: () => {
                setIsApproveOpen(false);
                approveForm.reset();
                setActiveItem(null);
            },
        });
    };

    const handleProcessSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeItem) return;
        processForm.patch(route('power-pro.process', activeItem.id), {
            onSuccess: () => {
                setIsProcessOpen(false);
                processForm.reset();
                setActiveItem(null);
            },
        });
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeItem) return;
        rejectForm.patch(route('power-pro.reject', activeItem.id), {
            onSuccess: () => {
                setIsRejectOpen(false);
                rejectForm.reset();
                setActiveItem(null);
            },
        });
    };

    const handleDelete = (item: PowerProRequestItem) => {
        if (confirm(`Are you sure you want to delete request ${item.request_number}?`)) {
            router.delete(route('power-pro.destroy', item.id));
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                    Swiss-Belinn IT & Systems
                                </span>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    SOP-IT-ACC-004
                                </span>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Hotel System Access
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                Power Pro User ID Requests
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-sm shadow-red-600/25 transition-all hover:scale-102 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Request Power Pro ID</span>
                        </button>

                        {permissions.isItStaff && (
                            <a
                                href={route('power-pro.export')}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all hover:scale-102 cursor-pointer"
                            >
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export CSV</span>
                            </a>
                        )}

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
            <Head title="Power Pro User ID Request - IT Operations" />

            <div className="w-full space-y-4">
                {/* Description Info Banner */}
                <div className="bg-white rounded-2xl p-4 border border-red-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-50 text-[#E31B23] flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                Power Pro PMS & POS Account Authorization
                            </h3>
                            <p className="text-xs text-gray-500">
                                Official form for creating, modifying access privileges, and deactivating Swiss-Belinn SKA Hotel PMS & POS user IDs.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200">
                            Total: {safeStats.total} Requests
                        </span>
                        {safeStats.on_request > 0 && (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                                {safeStats.on_request} Awaiting HOD
                            </span>
                        )}
                        {safeStats.approved > 0 && (
                            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                                {safeStats.approved} Awaiting IT
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    <div
                        onClick={() => { setStatusFilter('all'); applyFilters({ status: 'all' }); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'all'
                                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <span className="text-xs font-semibold text-gray-500 block">Total Requests</span>
                        <span className="text-2xl font-black text-gray-900 mt-1 block">{safeStats.total}</span>
                        <span className="text-[11px] text-gray-400 mt-0.5 block">All submission history</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('On Request'); applyFilters({ status: 'On Request' }); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'On Request'
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                                : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-700">On Request</span>
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        </div>
                        <span className="text-2xl font-black text-amber-900 mt-1 block">{safeStats.on_request}</span>
                        <span className="text-[11px] text-amber-600 mt-0.5 block">Awaiting HOD review</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('Approved'); applyFilters({ status: 'Approved' }); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'Approved'
                                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                                : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-700">Approved</span>
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        </div>
                        <span className="text-2xl font-black text-blue-900 mt-1 block">{safeStats.approved}</span>
                        <span className="text-[11px] text-blue-600 mt-0.5 block">Ready for IT execution</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('Done'); applyFilters({ status: 'Done' }); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'Done'
                                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-700">Completed (Done)</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        </div>
                        <span className="text-2xl font-black text-emerald-900 mt-1 block">{safeStats.done}</span>
                        <span className="text-[11px] text-emerald-600 mt-0.5 block">User ID has been issued</span>
                    </div>

                    <div
                        onClick={() => { setStatusFilter('Rejected'); applyFilters({ status: 'Rejected' }); }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === 'Rejected'
                                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                                : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                        <span className="text-xs font-semibold text-rose-700 block">Rejected</span>
                        <span className="text-2xl font-black text-rose-900 mt-1 block">{safeStats.rejected}</span>
                        <span className="text-[11px] text-rose-600 mt-0.5 block">Needs revision / cancelled</span>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                id="power_pro_search"
                                name="power_pro_search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search request no., employee name, employee number, or User ID..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-xs sm:text-sm text-gray-800 transition-all"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                            <select
                                id="power_pro_dept_filter"
                                name="power_pro_dept_filter"
                                value={deptFilter}
                                onChange={(e) => {
                                    setDeptFilter(e.target.value);
                                    applyFilters({ department_id: e.target.value });
                                }}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            >
                                <option value="all">All Departments</option>
                                {safeDepartments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>

                            <select
                                id="power_pro_type_filter"
                                name="power_pro_type_filter"
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value);
                                    applyFilters({ request_type: e.target.value });
                                }}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                            >
                                <option value="all">All Request Types</option>
                                <option value="create_new">New User ID Creation</option>
                                <option value="modify_access">Access Rights Modification</option>
                                <option value="reset_password">Password Reset</option>
                                <option value="deactivate">Account Deactivation</option>
                            </select>

                            <button
                                type="submit"
                                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-all cursor-pointer"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                                    <th className="py-3.5 px-4">Request No.</th>
                                    <th className="py-3.5 px-4">Employee & Dept</th>
                                    <th className="py-3.5 px-4">Type & Requested Modules</th>
                                    <th className="py-3.5 px-4">Role & Special Privileges</th>
                                    <th className="py-3.5 px-4">Issued User ID</th>
                                    <th className="py-3.5 px-4">Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {safeRequests.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            <div className="max-w-xs mx-auto space-y-2">
                                                <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <p className="font-semibold text-gray-600">No Power Pro User ID requests found</p>
                                                <p className="text-[11px] text-gray-400">
                                                    Click the &quot;Request Power Pro ID&quot; button above to request hotel system access.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    safeRequests.data.map((item) => {
                                        const isMyDept = permissions.departmentId === item.department_id;
                                        const canApprove = (permissions.isAdmin || (permissions.isHod && isMyDept)) && item.status === 'On Request';
                                        const canProcess = (permissions.isAdmin || permissions.isItStaff) && (item.status === 'Approved' || item.status === 'On Request');
                                        const canReject = (permissions.isAdmin || permissions.isItStaff || (permissions.isHod && isMyDept)) && item.status !== 'Done' && item.status !== 'Rejected';
                                        const canDelete = item.status === 'On Request' && (permissions.isAdmin || item.requested_by_user_id === currentUser.id);

                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-semibold text-gray-900 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-red-700 font-bold">{item.request_number}</span>
                                                        <span className="text-[10px] text-gray-400 font-normal">
                                                            {formatDate(item.requested_at || item.created_at)}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-gray-900">
                                                        {item.employee?.user?.name || 'Unknown Employee'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
                                                        <span className="font-mono">{item.employee?.employee_number}</span>
                                                        <span>•</span>
                                                        <span className="inline-block px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 text-[10px] font-medium">
                                                            {item.department?.name}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span className="inline-block text-[11px] font-semibold text-gray-800">
                                                        {item.request_type_label}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Array.isArray(item.power_pro_modules) && item.power_pro_modules.map((mod, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-100"
                                                            >
                                                                {mod}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-gray-800">{item.access_level}</div>
                                                    {Array.isArray(item.special_privileges) && item.special_privileges.length > 0 && (
                                                        <div className="text-[10px] text-amber-700 font-medium mt-0.5 truncate max-w-xs">
                                                            Privileges: {item.special_privileges.join(', ')}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    {item.created_user_id ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-xs">
                                                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            {item.created_user_id}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 font-mono text-[11px]">
                                                            {item.proposed_username ? `(Proposed: ${item.proposed_username})` : 'Not Issued'}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${item.status_color}`}>
                                                        {item.status}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Detail View */}
                                                        <button
                                                            onClick={() => {
                                                                setActiveItem(item);
                                                                setIsDetailOpen(true);
                                                            }}
                                                            title="View Details & History"
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>

                                                        {/* Print SOP */}
                                                        <a
                                                            href={route('power-pro.print', item.id)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Print Official SOP Form"
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                            </svg>
                                                        </a>

                                                        {/* HOD Approve */}
                                                        {canApprove && (
                                                            <button
                                                                onClick={() => {
                                                                    setActiveItem(item);
                                                                    setIsApproveOpen(true);
                                                                }}
                                                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors"
                                                            >
                                                                Approve (HOD)
                                                            </button>
                                                        )}

                                                        {/* IT Process */}
                                                        {canProcess && (
                                                            <button
                                                                onClick={() => {
                                                                    setActiveItem(item);
                                                                    processForm.setData({
                                                                        created_user_id: item.proposed_username || '',
                                                                        it_notes: '',
                                                                        it_signature: '',
                                                                    });
                                                                    setIsProcessOpen(true);
                                                                }}
                                                                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] transition-colors"
                                                            >
                                                                Process (IT)
                                                            </button>
                                                        )}

                                                        {/* Reject */}
                                                        {canReject && (
                                                            <button
                                                                onClick={() => {
                                                                    setActiveItem(item);
                                                                    setIsRejectOpen(true);
                                                                }}
                                                                title="Reject Request"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                        {/* Delete */}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(item)}
                                                                title="Delete Request"
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {safeRequests.last_page > 1 && (
                        <div className="py-3 px-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <div>
                                Showing page <span className="font-semibold text-gray-800">{safeRequests.current_page}</span> of <span className="font-semibold text-gray-800">{safeRequests.last_page}</span> ({safeRequests.total} results)
                            </div>
                            <div className="flex gap-1">
                                {(safeRequests.links || []).map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                            link.active
                                                ? 'bg-red-600 text-white font-bold'
                                                : link.url
                                                ? 'hover:bg-gray-100 text-gray-700'
                                                : 'text-gray-300 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* =================== MODAL 1: REQUEST POWER PRO USER ID =================== */}
            <Modal show={isCreateOpen} onClose={() => setIsCreateOpen(false)} maxWidth="3xl">
                <form onSubmit={handleCreateSubmit} className="flex flex-col max-h-[90vh]">
                    {/* Sticky Header */}
                    <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                    SOP-IT-ACS-01
                                </span>
                                <span className="text-xs text-gray-500 font-medium">Power Pro PMS Access</span>
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-1">
                                Power Pro User ID Request Form
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(false)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs sm:text-sm">
                        {/* SECTION 1: EMPLOYEE & REQUEST INFORMATION */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
                                <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    1. Employee & Request Information
                                </h3>
                            </div>

                            {/* Dropdown Employee */}
                            <div>
                                <InputLabel htmlFor="employee_id" value="Employee Requiring Account *" />
                                <select
                                    id="employee_id"
                                    name="employee_id"
                                    value={createForm.data.employee_id}
                                    onChange={(e) => createForm.setData('employee_id', e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-800 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-xs"
                                    required
                                >
                                    <option value="">-- Select Employee --</option>
                                    {safeEmployees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.user?.name} ({emp.employee_number}) - {emp.department?.name} ({emp.position?.name || 'Staff'})
                                        </option>
                                    ))}
                                </select>
                                <InputError message={createForm.errors.employee_id} className="mt-1" />

                                {/* Employee Preview Card */}
                                {selectedEmployee && (
                                    <div className="mt-2.5 p-3.5 rounded-xl bg-gradient-to-r from-red-50/40 via-white to-gray-50 border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs border border-red-200">
                                                {selectedEmployee.user?.name
                                                    ? selectedEmployee.user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')
                                                    : 'EMP'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                                                    {selectedEmployee.user?.name}
                                                    <span className="ml-2 font-mono text-[11px] font-normal text-gray-500">
                                                        ID: {selectedEmployee.employee_number}
                                                    </span>
                                                </p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200/60">
                                                        {selectedEmployee.department?.name}
                                                    </span>
                                                    <span className="text-[11px] text-gray-600 font-medium">
                                                        {selectedEmployee.position?.name || 'Staff'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-gray-500 sm:text-right bg-white p-2 sm:p-0 rounded-lg border sm:border-0 border-gray-200 shrink-0">
                                            <span className="block text-[10px] uppercase font-bold text-gray-400">Target Approval</span>
                                            <span className="font-bold text-red-700">HOD {selectedEmployee.department?.name}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Request Type */}
                                <div>
                                    <InputLabel htmlFor="request_type" value="Request Type *" />
                                    <select
                                        id="request_type"
                                        name="request_type"
                                        value={createForm.data.request_type}
                                        onChange={(e) => createForm.setData('request_type', e.target.value as any)}
                                        className="mt-1 w-full rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-800 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                        required
                                    >
                                        <option value="create_new">New User ID Creation</option>
                                        <option value="modify_access">Access Rights / Role Modification</option>
                                        <option value="reset_password">Account Password Reset</option>
                                        <option value="deactivate">Account Deactivation (Resign / Transfer)</option>
                                    </select>
                                </div>

                                {/* Employment Status */}
                                <div>
                                    <InputLabel htmlFor="employment_status" value="Employment Status" />
                                    <select
                                        id="employment_status"
                                        name="employment_status"
                                        value={createForm.data.employment_status}
                                        onChange={(e) => createForm.setData('employment_status', e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-800 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                    >
                                        <option value="Permanent">Permanent</option>
                                        <option value="Contract">Contract (PKWT)</option>
                                        <option value="Daily Worker">Daily Worker (DW)</option>
                                        <option value="Trainee / OJT">Trainee / Intern (OJT)</option>
                                    </select>
                                </div>

                                {/* Role / Access Level */}
                                <div>
                                    <InputLabel htmlFor="access_level" value="System Role / Access Level *" />
                                    <TextInput
                                        id="access_level"
                                        name="access_level"
                                        value={createForm.data.access_level}
                                        onChange={(e) => createForm.setData('access_level', e.target.value)}
                                        placeholder="e.g. Receptionist, Cashier, Supervisor, Night Audit"
                                        className="mt-1 w-full text-xs sm:text-sm"
                                        required
                                    />
                                    <InputError message={createForm.errors.access_level} className="mt-1" />
                                </div>

                                {/* Proposed Username */}
                                <div>
                                    <InputLabel htmlFor="proposed_username" value="Proposed User ID (Optional)" />
                                    <TextInput
                                        id="proposed_username"
                                        name="proposed_username"
                                        value={createForm.data.proposed_username}
                                        onChange={(e) => createForm.setData('proposed_username', e.target.value.toUpperCase())}
                                        placeholder="e.g. FO_RUDI, POS_SINTA"
                                        className="mt-1 w-full text-xs sm:text-sm uppercase font-mono tracking-wider"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: REQUIRED POWER PRO MODULES */}
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                        2. Required Power Pro Modules <span className="text-red-500">*</span>
                                    </h3>
                                </div>
                                <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                    {createForm.data.power_pro_modules.length} modules selected
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-500">
                                Check the system modules that will be used by the employee in daily operations.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {AVAILABLE_MODULES.map((mod) => {
                                    const checked = createForm.data.power_pro_modules.includes(mod.id);
                                    const modInputId = `mod_${mod.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                                    return (
                                        <div
                                            key={mod.id}
                                            onClick={() => handleModuleToggle(mod.id)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                                                checked
                                                    ? 'bg-red-50/70 border-red-300 ring-2 ring-red-400/20 shadow-xs'
                                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                id={modInputId}
                                                name="power_pro_modules[]"
                                                checked={checked}
                                                onChange={() => {}}
                                                className="mt-0.5 rounded text-red-600 focus:ring-red-500 h-4 w-4 pointer-events-none"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className={`font-bold text-xs block ${checked ? 'text-red-950' : 'text-gray-900'}`}>
                                                    {mod.label}
                                                </span>
                                                <span className="text-[11px] text-gray-500 leading-snug block mt-0.5">
                                                    {mod.desc}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <InputError message={createForm.errors.power_pro_modules} className="mt-1" />
                        </div>

                        {/* SECTION 3: SPECIAL PRIVILEGES */}
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                        3. Special Access Rights / Privileges (Optional)
                                    </h3>
                                </div>
                                {createForm.data.special_privileges.length > 0 && (
                                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                        {createForm.data.special_privileges.length} privileges active
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-gray-500">
                                Check only if the employee requires authorization for sensitive financial / hotel operational transactions.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {AVAILABLE_PRIVILEGES.map((priv) => {
                                    const checked = createForm.data.special_privileges.includes(priv.id);
                                    const privInputId = `priv_${priv.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                                    return (
                                        <div
                                            key={priv.id}
                                            onClick={() => handlePrivilegeToggle(priv.id)}
                                            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none ${
                                                checked
                                                    ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/30 text-amber-950 font-medium shadow-xs'
                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50/50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                id={privInputId}
                                                name="special_privileges[]"
                                                checked={checked}
                                                onChange={() => {}}
                                                className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 pointer-events-none"
                                            />
                                            <span className="text-[11px] leading-tight flex-1">{priv.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SECTION 4: PURPOSE & SIGNATURE */}
                        <div className="space-y-4 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                    4. Purpose & Requester Signature
                                </h3>
                            </div>

                            <div>
                                <InputLabel htmlFor="reason" value="Purpose / Justification" />
                                <textarea
                                    id="reason"
                                    name="reason"
                                    rows={2}
                                    value={createForm.data.reason}
                                    onChange={(e) => createForm.setData('reason', e.target.value)}
                                    placeholder="e.g. New employee in Morning/Evening Shift Receptionist position, requires check-in access and front office cashier."
                                    className="mt-1 w-full rounded-xl border border-gray-200 text-xs sm:text-sm text-gray-800 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <InputLabel value="Requester Signature *" />
                                    <span className="text-[11px] text-gray-400">Request Confirmation</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mb-1.5">
                                    Draw your digital signature below to validate this request form.
                                </p>
                                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-2 shadow-xs">
                                    <SignaturePad
                                        value={createForm.data.requester_signature}
                                        onChange={(val) => createForm.setData('requester_signature', val || '')}
                                        title="Requester Signature"
                                        height={120}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-6 py-3.5 bg-gray-50/90">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Forwarded to the respective HOD for verification before account creation by IT.</span>
                        </div>
                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                            <SecondaryButton onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton disabled={createForm.processing} className="bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200">
                                {createForm.processing ? 'Submitting...' : 'Submit Request to HOD & IT'}
                            </PrimaryButton>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* =================== MODAL 2: HOD APPROVAL =================== */}
            <Modal show={isApproveOpen} onClose={() => setIsApproveOpen(false)} maxWidth="lg">
                <form onSubmit={handleApproveSubmit} className="flex flex-col max-h-[90vh]">
                    <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white">
                        <div>
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">HOD Authorization</span>
                            <h2 className="text-base font-bold text-gray-900">Head of Department Approval</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsApproveOpen(false)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
                        {activeItem && (
                            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Request No.:</span>
                                    <strong className="text-blue-900 font-mono">{activeItem.request_number}</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Employee:</span>
                                    <strong className="text-gray-800">{activeItem.employee?.user?.name} ({activeItem.department?.name})</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Request Type:</span>
                                    <span className="font-semibold text-gray-700">{activeItem.request_type_label}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Required Modules:</span>
                                    <span className="font-medium text-gray-700">{activeItem.power_pro_modules?.join(', ')}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <InputLabel htmlFor="approval_notes" value="HOD Approval Notes (Optional)" />
                            <textarea
                                id="approval_notes"
                                name="approval_notes"
                                rows={2}
                                value={approveForm.data.approval_notes}
                                onChange={(e) => approveForm.setData('approval_notes', e.target.value)}
                                placeholder="e.g. Approved, please issue User ID for operations this week."
                                className="mt-1 w-full rounded-xl border border-gray-200 text-xs text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div>
                            <InputLabel value="HOD Digital Signature *" />
                            <p className="text-[11px] text-gray-500 mb-1.5">
                                Draw your digital signature as proof of department head approval.
                            </p>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-2">
                                <SignaturePad
                                    value={approveForm.data.approver_signature}
                                    onChange={(val) => approveForm.setData('approver_signature', val || '')}
                                    title="HOD Signature"
                                    height={115}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2.5 border-t border-gray-100 px-6 py-3.5 bg-gray-50/80">
                        <SecondaryButton onClick={() => setIsApproveOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={approveForm.processing}>
                            {approveForm.processing ? 'Processing...' : 'Approve & Forward to IT'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* =================== MODAL 3: IT RESOLUTION (GENERATE USER ID) =================== */}
            <Modal show={isProcessOpen} onClose={() => setIsProcessOpen(false)} maxWidth="lg">
                <form onSubmit={handleProcessSubmit} className="flex flex-col max-h-[90vh]">
                    <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white">
                        <div>
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">IT Execution</span>
                            <h2 className="text-base font-bold text-gray-900">Power Pro User ID Issuance</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsProcessOpen(false)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
                        {activeItem && (
                            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Requester / Employee:</span>
                                    <strong className="text-gray-900">{activeItem.employee?.user?.name} ({activeItem.department?.name})</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Required Modules:</span>
                                    <strong className="text-red-700">{activeItem.power_pro_modules?.join(', ')}</strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Access Level:</span>
                                    <span className="text-gray-700">{activeItem.access_level}</span>
                                </div>
                                {activeItem.proposed_username && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Proposed Username:</span>
                                        <code className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                            {activeItem.proposed_username}
                                        </code>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <InputLabel htmlFor="created_user_id" value="Official Power Pro User ID Created *" />
                            <TextInput
                                id="created_user_id"
                                name="created_user_id"
                                value={processForm.data.created_user_id}
                                onChange={(e) => processForm.setData('created_user_id', e.target.value.toUpperCase())}
                                placeholder="e.g. FO_RUDI_01"
                                className="mt-1 w-full text-sm font-mono font-bold uppercase tracking-wider text-red-800"
                                required
                            />
                            <InputError message={processForm.errors.created_user_id} className="mt-1" />
                            <p className="text-[11px] text-gray-500 mt-1">
                                Enter the login User ID that you created in the Power Pro database server.
                            </p>
                        </div>

                        <div>
                            <InputLabel htmlFor="it_notes" value="IT Notes / Remarks (Optional)" />
                            <textarea
                                id="it_notes"
                                name="it_notes"
                                rows={2}
                                value={processForm.data.it_notes}
                                onChange={(e) => processForm.setData('it_notes', e.target.value)}
                                placeholder="e.g. Account is active on FO Workstation Terminals 1 & 2. Default password handed over in person."
                                className="mt-1 w-full rounded-xl border border-gray-200 text-xs text-gray-800"
                            />
                        </div>

                        <div>
                            <InputLabel value="IT Officer Signature *" />
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white p-2 mt-1">
                                <SignaturePad
                                    value={processForm.data.it_signature}
                                    onChange={(val) => processForm.setData('it_signature', val || '')}
                                    title="IT Officer Signature"
                                    height={115}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-2.5 border-t border-gray-100 px-6 py-3.5 bg-gray-50/80">
                        <SecondaryButton onClick={() => setIsProcessOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={processForm.processing} className="bg-red-600 hover:bg-red-700">
                            {processForm.processing ? 'Saving...' : 'Complete & Issue ID'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* =================== MODAL 4: FULL DETAILS & HISTORY =================== */}
            <Modal show={isDetailOpen} onClose={() => setIsDetailOpen(false)} maxWidth="3xl">
                {activeItem && (
                    <div className="flex flex-col max-h-[90vh]">
                        <div className="shrink-0 flex items-start justify-between border-b border-gray-100 px-6 py-4 bg-white">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-red-700">{activeItem.request_number}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${activeItem.status_color}`}>
                                        {activeItem.status}
                                    </span>
                                </div>
                                <h2 className="text-base font-bold text-gray-900 mt-1">
                                    {activeItem.request_type_label}
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={route('power-pro.print', activeItem.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                                >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print SOP
                                </a>
                                <button
                                    onClick={() => setIsDetailOpen(false)}
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Detail Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Detail Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                                <div className="space-y-1.5">
                                    <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">Employee Details</span>
                                    <p className="font-bold text-gray-900 text-sm">{activeItem.employee?.user?.name}</p>
                                    <p className="text-gray-600">ID: <strong className="text-gray-800">{activeItem.employee?.employee_number}</strong></p>
                                    <p className="text-gray-600">Department: <strong className="text-gray-800">{activeItem.department?.name}</strong></p>
                                    <p className="text-gray-600">Employment Status: <strong className="text-gray-800">{activeItem.employment_status || 'Permanent'}</strong></p>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-gray-400 block font-bold uppercase tracking-wider text-[10px]">Power Pro System Access</span>
                                    <p className="font-semibold text-gray-800">Access Level: {activeItem.access_level}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {Array.isArray(activeItem.power_pro_modules) && activeItem.power_pro_modules.map((m, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold border border-red-200">
                                                {m}
                                            </span>
                                        ))}
                                    </div>
                                    {activeItem.created_user_id && (
                                        <div className="mt-2">
                                            <span className="text-[10px] uppercase font-bold text-emerald-600 block">Official User ID Issued:</span>
                                            <span className="text-emerald-800 font-mono font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block text-sm">
                                                {activeItem.created_user_id}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {Array.isArray(activeItem.special_privileges) && activeItem.special_privileges.length > 0 && (
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                                        Authorized Special Rights / Privileges
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeItem.special_privileges.map((p, i) => (
                                            <span key={i} className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs border border-amber-200 font-medium">
                                                ✓ {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeItem.reason && (
                                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs">
                                    <span className="font-semibold text-gray-700 block mb-0.5">Purpose / Justification:</span>
                                    <p className="text-gray-600">{activeItem.reason}</p>
                                </div>
                            )}

                            {activeItem.it_notes && (
                                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 text-xs">
                                    <span className="font-semibold text-emerald-800 block mb-0.5">IT Team Notes:</span>
                                    <p className="text-emerald-700">{activeItem.it_notes}</p>
                                </div>
                            )}

                            {activeItem.rejection_reason && (
                                <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-xs">
                                    <span className="font-semibold text-rose-800 block mb-0.5">Rejection Reason:</span>
                                    <p className="text-rose-700">{activeItem.rejection_reason}</p>
                                </div>
                            )}

                            {/* Timeline & Signatures */}
                            <div className="border-t border-gray-100 pt-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                    Authorization & Signature Sheet
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Requester */}
                                    <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50/50">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">1. Requester</span>
                                        <div className="h-16 my-1 flex items-center justify-center">
                                            {activeItem.requester_signature ? (
                                                <img src={activeItem.requester_signature} alt="Sign" className="max-h-full object-contain" />
                                            ) : (
                                                <span className="text-[10px] text-gray-300 italic">Not Signed</span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-gray-800 text-[11px] truncate">{activeItem.requested_by_username || activeItem.employee?.user?.name}</p>
                                        <p className="text-[9px] text-gray-400">{formatDate(activeItem.requested_at)}</p>
                                    </div>

                                    {/* HOD */}
                                    <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50/50">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">2. Respective HOD</span>
                                        <div className="h-16 my-1 flex items-center justify-center">
                                            {activeItem.approver_signature ? (
                                                <img src={activeItem.approver_signature} alt="Sign" className="max-h-full object-contain" />
                                            ) : (
                                                <span className="text-[10px] text-gray-300 italic">Not Approved</span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-gray-800 text-[11px] truncate">{activeItem.approved_by_username || '-'}</p>
                                        <p className="text-[9px] text-gray-400">{formatDate(activeItem.approved_at)}</p>
                                    </div>

                                    {/* IT */}
                                    <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50/50">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase block">3. IT Department</span>
                                        <div className="h-16 my-1 flex items-center justify-center">
                                            {activeItem.it_signature ? (
                                                <img src={activeItem.it_signature} alt="Sign" className="max-h-full object-contain" />
                                            ) : (
                                                <span className="text-[10px] text-gray-300 italic">Not Processed</span>
                                            )}
                                        </div>
                                        <p className="font-semibold text-gray-800 text-[11px] truncate">{activeItem.processed_by_username || '-'}</p>
                                        <p className="text-[9px] text-gray-400">{formatDate(activeItem.processed_at)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 flex justify-end border-t border-gray-100 px-6 py-3.5 bg-gray-50/80">
                            <SecondaryButton onClick={() => setIsDetailOpen(false)}>
                                Close
                            </SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>

            {/* =================== MODAL 5: REJECT =================== */}
            <Modal show={isRejectOpen} onClose={() => setIsRejectOpen(false)} maxWidth="sm">
                <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-rose-700">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h2 className="text-base font-bold text-gray-900">Reject Request</h2>
                    </div>

                    <p className="text-xs text-gray-600">
                        Are you sure you want to reject request <strong className="text-gray-800">{activeItem?.request_number}</strong>? Provide a rejection reason for the requester.
                    </p>

                    <div>
                        <InputLabel htmlFor="rejection_reason" value="Rejection Reason *" />
                        <textarea
                            id="rejection_reason"
                            name="rejection_reason"
                            rows={3}
                            value={rejectForm.data.rejection_reason}
                            onChange={(e) => rejectForm.setData('rejection_reason', e.target.value)}
                            placeholder="State the reason for rejection..."
                            className="mt-1 w-full rounded-xl border border-gray-200 text-xs text-gray-800"
                            required
                        />
                        <InputError message={rejectForm.errors.rejection_reason} className="mt-1" />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <SecondaryButton onClick={() => setIsRejectOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton disabled={rejectForm.processing}>
                            {rejectForm.processing ? 'Rejecting...' : 'Confirm Rejection'}
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
