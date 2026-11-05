import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import SignaturePad from '@/Components/SignaturePad';

interface Employee {
    id: number;
    employee_number: string;
    phone_number?: string;
    user: {
        id: number;
        name: string;
        email: string;
        profile_photo_url?: string;
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

interface AuditLogItem {
    id: number;
    action: string;
    description: string;
    created_at: string;
    user?: {
        id: number;
        name: string;
    };
}

interface MasterKeyRequestItem {
    id: number;
    request_number: string;
    request_type: 'create_new' | 'extension' | 'replacement';
    request_type_label: string;
    request_by?: string;
    employee_id?: number;
    department_id?: number;
    key_number: string;
    key_type: string;
    room_range_access: string;
    valid_from: string;
    valid_until: string;
    renewal_cycle_months: number;
    remark?: string;
    purpose?: string;
    status: 'On Request' | 'Approved' | 'Created' | 'Updated' | 'Done' | 'Rejected';
    requested_by_user_id?: number;
    requested_by_username?: string;
    requested_at?: string;
    approved_by_user_id?: number;
    approved_by_username?: string;
    approved_at?: string;
    approval_notes?: string;
    hod_signature?: string;
    done_by_user_id?: number;
    done_by_username?: string;
    done_at?: string;
    done_notes?: string;
    it_signature?: string;
    requester_signature?: string;
    approver_signature?: string;
    previous_request_id?: number;
    created_at: string;
    is_expired: boolean;
    is_expiring_soon: boolean;
    days_remaining: number;
    computed_status: string;
    employee?: Employee;
    requested_by?: {
        id: number;
        name: string;
    };
    approved_by?: {
        id: number;
        name: string;
        employee?: {
            position?: {
                name: string;
            };
            department?: {
                name: string;
            };
        };
    };
    done_by?: {
        id: number;
        name: string;
        employee?: {
            position?: {
                name: string;
            };
            department?: {
                name: string;
            };
        };
    };
    previous_request?: {
        id: number;
        request_number: string;
        key_number: string;
        valid_until: string;
    };
    audit_logs?: AuditLogItem[];
}

interface ExistingKeySummary {
    id: number;
    request_number: string;
    key_number: string;
    key_type: string;
    room_range_access: string;
    valid_until: string;
    employee_id?: number;
    request_by?: string;
    employee?: {
        user?: {
            name: string;
        };
    };
}

interface MasterKeyHistoryItem {
    id: number;
    request_number: string;
    request_type: 'create_new' | 'extension' | 'replacement';
    request_by?: string;
    status: string;
    requested_at: string | null;
    valid_from: string | null;
    valid_until: string | null;
    previous_request_id?: number | null;
}

interface Props {
    requests: {
        data: MasterKeyRequestItem[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    renewalHistories?: Record<string, MasterKeyHistoryItem[]>;
    filters: {
        tab: string;
        search: string;
        key_type: string;
        request_type: string;
    };
    stats: {
        total: number;
        on_request: number;
        approved: number;
        done: number;
        rejected: number;
        expiring_soon: number;
        expired: number;
    };
    canApprove: boolean;
    canCreateKey: boolean;
    canManageAll: boolean;
    currentEmployee?: Employee;
    currentUser: {
        id: number;
        name: string;
        email: string;
    };
    hkEmployees: Employee[];
    existingKeys: ExistingKeySummary[];
    hodHK?: Employee | null;
    itStaff?: Employee | null;
    defaultKeyTypes: string[];
    commonRoomRanges: string[];
    migrationNotice?: string;
}

export default function MasterKeyIndex({
    requests,
    renewalHistories = {},
    filters,
    stats,
    canApprove,
    canCreateKey,
    canManageAll,
    currentEmployee,
    currentUser,
    hkEmployees,
    existingKeys,
    hodHK,
    itStaff,
    defaultKeyTypes,
    commonRoomRanges,
    migrationNotice,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedKeyType, setSelectedKeyType] = useState(filters.key_type || '');
    const [selectedReqType, setSelectedReqType] = useState(filters.request_type || '');

    // Modals
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isItModalOpen, setIsItModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Selected item for action
    const [activeItem, setActiveItem] = useState<MasterKeyRequestItem | null>(null);

    // 1 Form Hook (A. create new, extension, replacement | B. remark | C. status on request)
    const {
        data: formData,
        setData: setFormData,
        post: postForm,
        processing: formProcessing,
        errors: formErrors,
        reset: resetForm,
    } = useForm({
        request_type: 'create_new' as 'create_new' | 'extension' | 'replacement',
        previous_request_id: '' as string | number,
        request_by: currentEmployee?.user?.name || currentUser.name || '',
        employee_id: currentEmployee?.id ? String(currentEmployee.id) : '',
        key_number: '',
        key_type: 'Grand Master Key',
        room_range_access: '',
        valid_from: new Date().toISOString().split('T')[0],
        renewal_cycle_months: 3,
        remark: '',
        purpose: '',
        requester_signature: '',
    });

    // HOD HK Approval Hook
    const {
        data: approveData,
        setData: setApproveData,
        processing: approveProcessing,
        reset: resetApprove,
    } = useForm({
        action: 'Approved' as 'Approved' | 'Rejected',
        approval_notes: '',
        hod_signature: '',
    });

    // Department IT Card Creation / Update Hook
    const {
        data: itData,
        setData: setItData,
        processing: itProcessing,
        reset: resetIt,
    } = useForm({
        status: 'Created' as 'Created' | 'Updated',
        done_notes: '',
        it_signature: '',
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('master-keys.index'),
            {
                ...filters,
                search,
                key_type: selectedKeyType,
                request_type: selectedReqType,
            },
            { preserveState: true }
        );
    };

    const handleTabChange = (tab: string) => {
        router.get(
            route('master-keys.index'),
            {
                ...filters,
                tab,
                search,
                key_type: selectedKeyType,
                request_type: selectedReqType,
            },
            { preserveState: true }
        );
    };

    const handleFilterReset = () => {
        setSearch('');
        setSelectedKeyType('');
        setSelectedReqType('');
        router.get(route('master-keys.index'));
    };

    // Open Form modal with specific request type & optional prefilled item
    const openFormModal = (
        type: 'create_new' | 'extension' | 'replacement' = 'create_new',
        targetItem?: MasterKeyRequestItem | ExistingKeySummary
    ) => {
        const todayStr = new Date().toISOString().split('T')[0];

        if (targetItem) {
            let defaultRemark = '';
            let validFromStr = todayStr;

            if (type === 'extension') {
                defaultRemark = `Perpanjangan berkala 3 bulan akses master key ${targetItem.key_number} (Ref: ${targetItem.request_number}).`;
                // If valid_until exists, use day after or today if expired
                if (targetItem.valid_until) {
                    const untilDate = new Date(targetItem.valid_until);
                    const now = new Date();
                    if (untilDate > now) {
                        const nextDay = new Date(untilDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        validFromStr = nextDay.toISOString().split('T')[0];
                    }
                }
            } else if (type === 'replacement') {
                defaultRemark = `Penggantian kunci master ${targetItem.key_number} karena (chip RFID tidak terbaca / fisik kunci rusak / hilang).`;
            }

            setFormData({
                request_type: type,
                previous_request_id: targetItem.id,
                request_by: targetItem.request_by || targetItem.employee?.user?.name || '',
                employee_id: targetItem.employee_id ? String(targetItem.employee_id) : '',
                key_number: targetItem.key_number,
                key_type: targetItem.key_type || 'Grand Master Key',
                room_range_access: targetItem.room_range_access || '',
                valid_from: validFromStr,
                renewal_cycle_months: 3,
                remark: defaultRemark,
                purpose: defaultRemark,
                requester_signature: '',
            });
        } else {
            setFormData({
                request_type: type,
                previous_request_id: '',
                request_by: currentEmployee?.user?.name || currentUser.name || '',
                employee_id: currentEmployee?.id ? String(currentEmployee.id) : '',
                key_number: '',
                key_type: 'Grand Master Key',
                room_range_access: '',
                valid_from: todayStr,
                renewal_cycle_months: 3,
                remark: type === 'create_new'
                    ? 'Pembuatan akses master key baru untuk operasional housekeeping.'
                    : '',
                purpose: '',
                requester_signature: '',
            });
        }

        setIsFormModalOpen(true);
    };

    // When user toggles request_type inside the form modal
    const handleTypeChangeInForm = (newType: 'create_new' | 'extension' | 'replacement') => {
        setFormData(prev => {
            let suggestedRemark = prev.remark;
            if (newType === 'create_new') {
                suggestedRemark = 'Pembuatan akses master key baru untuk operasional housekeeping.';
            } else if (newType === 'extension') {
                suggestedRemark = prev.key_number
                    ? `Perpanjangan berkala 3 bulan akses master key ${prev.key_number}.`
                    : 'Perpanjangan berkala 3 bulan akses master key.';
            } else if (newType === 'replacement') {
                suggestedRemark = prev.key_number
                    ? `Penggantian kunci master ${prev.key_number} karena (chip RFID rusak / fisik patah / hilang).`
                    : 'Penggantian kunci master karena chip RFID rusak / fisik patah / hilang.';
            }

            return {
                ...prev,
                request_type: newType,
                remark: suggestedRemark,
            };
        });
    };

    // When selecting an existing key from dropdown inside Extension / Replacement mode
    const handleSelectExistingKey = (keyId: string) => {
        if (!keyId) {
            setFormData(prev => ({
                ...prev,
                previous_request_id: '',
            }));
            return;
        }

        const selected = existingKeys.find(k => String(k.id) === keyId);
        if (selected) {
            const isExt = formData.request_type === 'extension';
            setFormData(prev => ({
                ...prev,
                previous_request_id: selected.id,
                request_by: selected.request_by || selected.employee?.user?.name || '',
                employee_id: selected.employee_id ? String(selected.employee_id) : '',
                key_number: selected.key_number,
                key_type: selected.key_type,
                room_range_access: selected.room_range_access,
                remark: isExt
                    ? `Periodic 3-month renewal for master key access ${selected.key_number} (Ref: ${selected.request_number}).`
                    : `Master key replacement for ${selected.key_number} due to (damaged chip / lost physical key / wear and tear).`,
            }));
        }
    };

    // Submit 1 Unified Form
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postForm(route('master-keys.store'), {
            onSuccess: () => {
                setIsFormModalOpen(false);
                resetForm();
            },
        });
    };

    // Open HOD HK Approval Modal
    const openApproveModal = (item: MasterKeyRequestItem) => {
        setActiveItem(item);
        setApproveData({
            action: 'Approved',
            approval_notes: '',
            hod_signature: item.hod_signature || item.approver_signature || '',
        });
        setIsApproveModalOpen(true);
    };

    // Submit HOD Approval (Approved or Rejected)
    const handleApproveSubmit = (action: 'Approved' | 'Rejected') => {
        if (!activeItem) return;
        if (action === 'Approved' && !approveData.hod_signature) {
            alert('Mohon bubuhkan tanda tangan digital HOD Housekeeping terlebih dahulu sebelum menyetujui request.');
            return;
        }

        router.patch(
            route('master-keys.approve', activeItem.id),
            {
                action,
                approval_notes: approveData.approval_notes,
                hod_signature: approveData.hod_signature,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsApproveModalOpen(false);
                    setActiveItem(null);
                    resetApprove();
                },
            }
        );
    };

    // Open Department IT Key Processing Modal
    const openItModal = (item: MasterKeyRequestItem) => {
        setActiveItem(item);
        const suggestedStatus = item.request_type === 'create_new' ? 'Created' : 'Updated';
        const freshItSig = (item.it_signature && item.it_signature !== item.hod_signature && item.it_signature !== item.approver_signature)
            ? item.it_signature
            : '';
        setItData({
            status: suggestedStatus,
            done_notes: item.request_type === 'create_new'
                ? `Kartu Master Key RFID (${item.key_number}) telah diprogram & diterbitkan oleh Departemen IT.`
                : `Kartu Master Key RFID (${item.key_number}) telah diperbarui/di-update masa berlakunya oleh Departemen IT.`,
            it_signature: freshItSig,
        });
        setIsItModalOpen(true);
    };

    // Submit IT Card Processing (Created or Updated)
    const handleItSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeItem) return;
        if (!itData.it_signature) {
            alert('Petugas Departemen IT wajib membubuhkan tanda tangan digital sebelum menerbitkan kartu.');
            return;
        }

        router.patch(
            route('master-keys.process-key', activeItem.id),
            {
                status: itData.status,
                done_notes: itData.done_notes,
                it_signature: itData.it_signature,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsItModalOpen(false);
                    setActiveItem(null);
                    resetIt();
                },
            }
        );
    };

    // Open Detail & Log Modal
    const openDetailModal = (item: MasterKeyRequestItem) => {
        setActiveItem(item);
        setIsDetailModalOpen(true);
    };

    // Delete confirmation
    const handleDelete = (item: MasterKeyRequestItem) => {
        if (confirm(`Are you sure you want to delete master key request ${item.key_number} (${item.request_number})?`)) {
            router.delete(route('master-keys.destroy', item.id));
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

    // Compute expected valid_until for preview in create form (valid_from + 3 months)
    const computeValidUntilPreview = (validFromStr: string, months = 3) => {
        if (!validFromStr) return '-';
        const d = new Date(validFromStr);
        d.setMonth(d.getMonth() + Number(months));
        return d.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Helper badge for request_type
    const renderTypeBadge = (type: string) => {
        switch (type) {
            case 'create_new':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-red-50 text-[#E31B23] border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E31B23]"></span>
                        Create New
                    </span>
                );
            case 'extension':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-teal-50 text-teal-700 border border-teal-200">
                        <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Extension
                    </span>
                );
            case 'replacement':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-orange-50 text-orange-700 border border-orange-200">
                        <svg className="w-3 h-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Replacement
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                        {type}
                    </span>
                );
        }
    };

    // Helper badge for status: On Request, Approved, Created, Updated, Done, Rejected
    const renderStatusBadge = (status: string, item: MasterKeyRequestItem) => {
        if (['Created', 'Updated', 'Done'].includes(status)) {
            const label = status === 'Created' ? 'Created • Active' : (status === 'Updated' ? 'Updated • Active' : 'Done • Active');
            if (item.is_expired) {
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-red-50 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                            Expired
                        </span>
                        <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">{Math.abs(item.days_remaining)} days overdue • extension required</span>
                    </div>
                );
            }
            if (item.is_expiring_soon) {
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Expiring Soon
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">{item.days_remaining} days remaining</span>
                    </div>
                );
            }
            return (
                <div className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {label}
                    </span>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">{item.days_remaining} days remaining</span>
                </div>
            );
        }

        if (status === 'Approved') {
            return (
                <div className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Approved (HOD HK)
                    </span>
                    <span className="text-[10px] text-blue-600 whitespace-nowrap font-medium">Ready for Department IT</span>
                </div>
            );
        }

        if (status === 'Rejected') {
            return (
                <div className="flex flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Rejected
                    </span>
                    <span className="text-[10px] text-rose-500 whitespace-nowrap">Rejected by HOD HK</span>
                </div>
            );
        }

        // On Request status
        return (
            <div className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    On Request
                </span>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">Waiting HOD approval</span>
            </div>
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Housekeeping Master Key Access - Swiss-Belinn" />

            <div className="w-full space-y-4">
                {/* Migration Warning if table is not yet migrated on server */}
                {migrationNotice && (
                    <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 shadow-md flex items-start gap-4">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <h3 className="font-bold text-amber-900 dark:text-amber-100 text-base">
                                Attention: Database Table Not Yet Migrated on MySQL Server
                            </h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed">
                                {migrationNotice}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Run in server terminal:</span>
                                <code className="px-2.5 py-1 rounded-lg bg-amber-200/70 dark:bg-amber-900/80 font-mono text-xs font-bold text-amber-950 dark:text-amber-100 select-all border border-amber-300 dark:border-amber-700">
                                    php artisan migrate
                                </code>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Banner */}
                <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#E31B23]/20 text-red-300 border border-[#E31B23]/30">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                Housekeeping Security SOP • 3-Month Evaluation Cycle
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                Master Key Request & Renewal
                            </h1>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Unified form for <strong>Create New</strong>, <strong>Extension (3 Months)</strong>, and <strong>Replacement</strong>. Includes reason remark, <em>On Request / Done</em> statuses, and automatic requester & completion audit logging.
                            </p>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href={route('dashboard')}
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/10 backdrop-blur-xs transition-colors"
                                title="Return to Main Menu (App Launcher)"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>Main Menu</span>
                            </Link>

                            <button
                                onClick={() => openFormModal('create_new')}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white text-sm font-bold shadow-lg shadow-red-950/40 transition-all cursor-pointer hover:scale-102 active:scale-98"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Open Request Form
                            </button>

                            <a
                                href={route('master-keys.export', { ...filters })}
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/10 backdrop-blur-xs transition-colors"
                            >
                                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export Log (Excel)
                            </a>
                        </div>
                    </div>
                </div>

                {/* KPI Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Total */}
                    <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                            <div className="text-xl font-black text-gray-900">{stats.total}</div>
                            <span className="text-[10px] text-gray-400">All submissions</span>
                        </div>
                    </div>

                    {/* On Request */}
                    <div
                        onClick={() => handleTabChange('on_request')}
                        className="bg-white p-4 rounded-2xl shadow-xs border border-amber-200/80 hover:border-amber-400 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md"
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">1. On Request</span>
                            <div className="text-xl font-black text-amber-800">{stats.on_request}</div>
                            <span className="text-[10px] text-amber-600 font-medium">Pending HOD approval</span>
                        </div>
                    </div>

                    {/* Approved by HOD HK */}
                    <div
                        onClick={() => handleTabChange('approved')}
                        className="bg-white p-4 rounded-2xl shadow-xs border border-blue-200/80 hover:border-blue-400 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">2. Approved</span>
                            <div className="text-xl font-black text-blue-800">{stats.approved}</div>
                            <span className="text-[10px] text-blue-600 font-medium">Ready for IT card issue</span>
                        </div>
                    </div>

                    {/* Done / Created / Updated */}
                    <div
                        onClick={() => handleTabChange('done')}
                        className="bg-white p-4 rounded-2xl shadow-xs border border-emerald-200/80 hover:border-emerald-400 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md"
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">3. Created / Updated</span>
                            <div className="text-xl font-black text-emerald-800">{stats.done}</div>
                            <span className="text-[10px] text-emerald-600 font-medium">Active master keys</span>
                        </div>
                    </div>

                    {/* Needs Renewal (3 Bulan) */}
                    <div
                        onClick={() => handleTabChange('expiring')}
                        className="bg-white p-4 rounded-2xl shadow-xs border border-rose-200/80 hover:border-rose-400 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md"
                    >
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Needs Renewal</span>
                            <div className="text-xl font-black text-rose-700">{stats.expiring_soon + stats.expired}</div>
                            <span className="text-[10px] text-rose-600 font-medium">Cycle expiring soon</span>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Tab Buttons */}
                        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-full md:w-auto overflow-x-auto text-xs font-semibold">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'on_request', label: 'On Request', count: stats.on_request },
                                { key: 'approved', label: 'Approved (HOD HK)', count: stats.approved },
                                { key: 'done', label: 'Created / Updated (IT)', count: stats.done },
                                { key: 'expiring', label: 'Expiring Soon (≤14 Days)', count: stats.expiring_soon },
                                { key: 'expired', label: 'Expired', count: stats.expired },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                                        filters.tab === tab.key
                                            ? 'bg-white text-[#E31B23] shadow-xs font-bold'
                                             : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                                            filters.tab === tab.key ? 'bg-red-50 text-[#E31B23] font-semibold' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search and Filters */}
                        <form onSubmit={handleSearchSubmit} className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto">
                            {/* Request Type Filter */}
                            <select
                                value={selectedReqType}
                                onChange={(e) => setSelectedReqType(e.target.value)}
                                className="text-xs rounded-xl border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2 text-slate-800"
                            >
                                <option value="">All Request Types</option>
                                <option value="create_new">Create New</option>
                                <option value="extension">Extension</option>
                                <option value="replacement">Replacement</option>
                            </select>

                            {/* Key Type Filter */}
                            <select
                                value={selectedKeyType}
                                onChange={(e) => setSelectedKeyType(e.target.value)}
                                className="text-xs rounded-xl border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2 text-slate-800"
                            >
                                <option value="">All Key Types</option>
                                {defaultKeyTypes.map(kt => (
                                    <option key={kt} value={kt}>{kt}</option>
                                ))}
                            </select>

                            {/* Search input */}
                            <div className="relative flex-1 sm:w-60">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search key, remark, username..."
                                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] text-slate-800"
                                />
                                <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <button
                                type="submit"
                                className="px-3 py-2 bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Filter
                            </button>

                            {(search || selectedKeyType || selectedReqType) && (
                                <button
                                    type="button"
                                    onClick={handleFilterReset}
                                    className="px-2.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                                    title="Reset filter"
                                >
                                    Reset
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Table of Master Key Requests */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1080px] text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4 whitespace-nowrap w-[150px]">Registration No.</th>
                                    <th className="py-3 px-4 whitespace-nowrap w-[180px]">Requested by</th>
                                    <th className="py-3 px-4 whitespace-nowrap w-[190px]">Master Key</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Remark</th>
                                    <th className="py-3 px-4 whitespace-nowrap w-[150px]">Status</th>
                                    <th className="py-3 px-4 whitespace-nowrap w-[190px]">Audit Log</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right w-[150px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-normal">
                                {requests.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400">
                                            <div className="max-w-xs mx-auto space-y-2">
                                                <svg className="w-10 h-10 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                </svg>
                                                <p className="font-semibold text-gray-600">No master key request data found</p>
                                                <p className="text-[11px]">Please click the "Open Request Form" button to create a new submission.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    requests.data.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            {/* No. Registrasi & Tipe Form */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="font-mono font-bold text-gray-900 whitespace-nowrap">{item.request_number}</div>
                                                <div className="mt-1.5">
                                                    {renderTypeBadge(item.request_type)}
                                                </div>
                                            </td>

                                            {/* Diajukan oleh (Request by) */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="font-semibold text-gray-900 leading-snug">
                                                    {item.request_by || item.employee?.user?.name || '-'}
                                                </div>
                                                <div className="text-[11px] text-gray-500 mt-0.5">
                                                    {item.employee?.employee_number && (
                                                        <>
                                                            <span className="font-mono">{item.employee.employee_number}</span>
                                                            <span className="mx-1 text-gray-300">•</span>
                                                        </>
                                                    )}
                                                    {item.employee?.position?.name || 'Staff HK'}
                                                </div>
                                            </td>

                                            {/* Detail Master Key */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                        {item.key_number}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 whitespace-nowrap">{item.key_type}</span>
                                                </div>
                                                <div className="text-[11px] text-gray-500 mt-1 line-clamp-1" title={item.room_range_access}>
                                                    {item.room_range_access}
                                                </div>
                                                {(() => {
                                                    const extensions = (renewalHistories[item.key_number] || []).filter(entry => entry.request_type === 'extension');
                                                    return (
                                                        <div className="text-[10px] text-slate-500 mt-1.5">
                                                            {extensions.length > 0
                                                                ? `Last extension requested: ${formatDateTime(extensions[0].requested_at ?? undefined)} (${extensions.length} total)`
                                                                : 'No extension requests yet'}
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* Remark / Alasan */}
                                            <td className="py-4 px-4 align-top">
                                                <p className="text-gray-700 line-clamp-2 text-[11px] leading-relaxed" title={item.remark}>
                                                    {item.remark || '-'}
                                                </p>
                                            </td>

                                            {/* Status & Sisa Waktu */}
                                            <td className="py-4 px-4 align-top">
                                                {renderStatusBadge(item.status, item)}
                                                <div className="text-[10px] text-gray-400 mt-1.5 whitespace-nowrap">
                                                    s/d {formatDate(item.valid_until)}
                                                </div>
                                            </td>

                                            {/* Riwayat Log (3 Stages: Request, Approval, IT Issuance) */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="space-y-1.5 text-[11px]">
                                                    {/* Request */}
                                                    <div className="flex items-start gap-1.5">
                                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Stage 1: Requested"></span>
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-gray-800 truncate">
                                                                {item.requested_by_username || item.requested_by?.name || '-'}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 whitespace-nowrap">
                                                                Request • {formatDateTime(item.requested_at || item.created_at)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* HOD HK Approval */}
                                                    {(item.approved_by_username || item.approved_at) && (
                                                        <div className="flex items-start gap-1.5">
                                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Stage 2: Approved by HOD HK"></span>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-emerald-800 truncate">
                                                                    {item.approved_by_username || 'HOD Housekeeping'}
                                                                </div>
                                                                <div className="text-[10px] text-emerald-600 whitespace-nowrap">
                                                                    Approved • {formatDateTime(item.approved_at)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Department IT Issuance */}
                                                    {['Created', 'Updated', 'Done'].includes(item.status) && (
                                                        <div className="flex items-start gap-1.5">
                                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Stage 3: Issued by IT"></span>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-blue-800 truncate">
                                                                    {item.done_by_username || 'Department IT'}
                                                                </div>
                                                                <div className="text-[10px] text-blue-600 whitespace-nowrap">
                                                                    {item.status === 'Created' ? 'Created' : 'Updated'} • {formatDateTime(item.done_at)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Aksi */}
                                            <td className="py-4 px-4 align-top">
                                                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                                                    {/* Stage 2: HOD HK Approval button (Only for HOD HK / Admin when status is On Request) */}
                                                    {item.status === 'On Request' && canApprove && (
                                                        <button
                                                            onClick={() => openApproveModal(item)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                                                            title="Review & Approve (HOD Housekeeping)"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Stage 3: Department IT Card Creation / Update button (Only for IT / Admin when status is Approved) */}
                                                    {item.status === 'Approved' && canCreateKey && (
                                                        <button
                                                            onClick={() => openItModal(item)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                                                            title={item.request_type === 'create_new' ? "Create RFID Key Card (Department IT)" : "Update & Reprogram RFID Key Card (Department IT)"}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Quick Perpanjang (Extension) button if Active */}
                                                    {['Created', 'Updated', 'Done'].includes(item.status) && (
                                                        <button
                                                            onClick={() => openFormModal('extension', item)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-teal-600 hover:bg-teal-50 hover:border-teal-200 transition-colors cursor-pointer"
                                                            title="Renew for 3 Months (Extension)"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Quick Replacement button if Active */}
                                                    {['Created', 'Updated', 'Done'].includes(item.status) && (
                                                        <button
                                                            onClick={() => openFormModal('replacement', item)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-orange-600 hover:bg-orange-50 hover:border-orange-200 transition-colors cursor-pointer"
                                                            title="Replace Key (Replacement)"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Detail & Log View */}
                                                    <button
                                                        onClick={() => openDetailModal(item)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
                                                        title="Details & Activity Log"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>

                                                    {/* Print SOP Form */}
                                                    <a
                                                        href={route('master-keys.print', item.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                                        title="Print SOP Form"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                    </a>

                                                    {/* Delete Request (Admin, HOD HK, IT, GM, HRD, or Requester) */}
                                                    {(canManageAll || canApprove || canCreateKey || item.status === 'On Request') && (
                                                        <button
                                                            onClick={() => handleDelete(item)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-transparent text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors cursor-pointer"
                                                            title="Delete Request"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {requests.links && requests.links.length > 3 && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                            <div>
                                Showing {requests.data.length} of {requests.total} entries
                            </div>
                            <div className="flex items-center gap-1">
                                {requests.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg transition-colors ${
                                            link.active
                                                ? 'bg-[#E31B23] text-white font-bold'
                                                : link.url
                                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                : 'text-slate-300 pointer-events-none'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 1 FORM UNIFIED MODAL: Create New | Extension | Replacement (Point A & B)   */}
            {/* ========================================================================= */}
            <Modal show={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} maxWidth="2xl">
                <form onSubmit={handleFormSubmit} className="flex flex-col max-h-[90vh]">
                    <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-white">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">
                                Master Key Access Request Form
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Housekeeping • 3-month evaluation cycle • Swiss-Belinn SKA
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsFormModalOpen(false)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                            aria-label="Close"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                        {/* Point A: 1 form with Create New, Extension, Replacement options */}
                        <div>
                            <InputLabel value="Request Type *" />
                            <div className="grid grid-cols-3 gap-2 mt-1.5">
                                {[
                                    {
                                        type: 'create_new' as const,
                                        label: 'Create New',
                                        desc: 'New key',
                                        path: 'M12 4v16m8-8H4',
                                        tone: 'text-[#E31B23] bg-red-50',
                                    },
                                    {
                                        type: 'extension' as const,
                                        label: 'Extension',
                                        desc: '3-month renewal',
                                        path: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
                                        tone: 'text-teal-600 bg-teal-50',
                                    },
                                    {
                                        type: 'replacement' as const,
                                        label: 'Replacement',
                                        desc: 'Damaged / lost key',
                                        path: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
                                        tone: 'text-orange-600 bg-orange-50',
                                    },
                                ].map(t => (
                                    <button
                                        key={t.type}
                                        type="button"
                                        onClick={() => handleTypeChangeInForm(t.type)}
                                        className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                            formData.request_type === t.type
                                                ? 'border-[#E31B23] bg-red-50/40 ring-2 ring-[#E31B23]/20'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${t.tone}`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.path} />
                                            </svg>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-bold text-slate-900">{t.label}</span>
                                            <span className="block text-[10px] text-slate-500 leading-tight truncate">{t.desc}</span>
                                        </span>
                                        {formData.request_type === t.type && (
                                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E31B23]"></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <InputError message={formErrors.request_type} className="mt-1" />
                        </div>

                        {/* Optional Reference Dropdown for Extension or Replacement */}
                        {(formData.request_type === 'extension' || formData.request_type === 'replacement') && existingKeys.length > 0 && (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <InputLabel
                                    htmlFor="select_existing_key"
                                    value={`Select Key to ${formData.request_type === 'extension' ? 'Renew' : 'Replace'} (Optional):`}
                                    className="text-slate-900"
                                />
                                <select
                                    id="select_existing_key"
                                    value={formData.previous_request_id || ''}
                                    onChange={(e) => handleSelectExistingKey(e.target.value)}
                                    className="mt-1 block w-full text-xs rounded-xl border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                >
                                    <option value="">-- Select from previous keys --</option>
                                    {existingKeys.map(k => (
                                        <option key={k.id} value={k.id}>
                                            {k.key_number} ({k.key_type}) - {k.request_by || k.employee?.user?.name || 'Staff'} (Expires: {formatDate(k.valid_until)})
                                        </option>
                                    ))}
                                </select>
                                <span className="text-[10px] text-slate-500 mt-1 block">
                                    Selecting a key above will automatically populate the key number, room range, and requester name.
                                </span>
                            </div>
                        )}

                        {/* Diajukan oleh (Request by) - Di Ketik Saja */}
                        <div>
                            <InputLabel htmlFor="form_request_by" value="Requested by *" />
                            <TextInput
                                id="form_request_by"
                                type="text"
                                value={formData.request_by}
                                onChange={(e) => setFormData('request_by', e.target.value)}
                                placeholder="Type key holder / requester name..."
                                className="mt-1 block w-full text-xs font-semibold text-gray-900"
                                required
                            />
                            <p className="text-[10px] text-gray-500 mt-1">
                                Type the name of the staff member or key holder requesting master key access.
                            </p>
                            <InputError message={formErrors.request_by} className="mt-1" />
                        </div>

                        {/* Nomor Kunci & Tipe Kunci */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="form_key_number" value="Master Key Number / Code *" />
                                <TextInput
                                    id="form_key_number"
                                    type="text"
                                    value={formData.key_number}
                                    onChange={(e) => setFormData('key_number', e.target.value)}
                                    placeholder="E.g., MK-HK-201 or RFID-FL3"
                                    className="mt-1 block w-full text-xs font-mono font-bold"
                                    required
                                />
                                <InputError message={formErrors.key_number} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="form_key_type" value="Master Key Type *" />
                                <select
                                    id="form_key_type"
                                    value={formData.key_type}
                                    onChange={(e) => setFormData('key_type', e.target.value)}
                                    className="mt-1 block w-full text-xs rounded-xl border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                    required
                                >
                                    {defaultKeyTypes.map(kt => (
                                        <option key={kt} value={kt}>{kt}</option>
                                    ))}
                                </select>
                                <InputError message={formErrors.key_type} className="mt-1" />
                            </div>
                        </div>

                        {/* Cakupan Area Kamar */}
                        <div>
                            <InputLabel htmlFor="form_room_range" value="Room Coverage & Access Range *" />
                            <TextInput
                                id="form_room_range"
                                type="text"
                                list="common_room_ranges_list"
                                value={formData.room_range_access}
                                onChange={(e) => setFormData('room_range_access', e.target.value)}
                                placeholder="E.g., Lantai 2 (Kamar 201 - 210)"
                                className="mt-1 block w-full text-xs"
                                required
                            />
                            <datalist id="common_room_ranges_list">
                                {commonRoomRanges.map(cr => (
                                    <option key={cr} value={cr} />
                                ))}
                            </datalist>
                            {/* Quick options */}
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                {commonRoomRanges.map(cr => (
                                    <button
                                        type="button"
                                        key={cr}
                                        onClick={() => setFormData('room_range_access', cr)}
                                        className={`text-[10px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                            formData.room_range_access === cr
                                                ? 'bg-[#E31B23] text-white font-medium shadow-xs'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        + {cr}
                                    </button>
                                ))}
                            </div>
                            <InputError message={formErrors.room_range_access} className="mt-1" />
                        </div>

                        {/* Point B: Kolom remark untuk menjelaskan kenapa key nya dibuat atau diperbarui atau diganti */}
                        <div>
                            <div className="flex items-center justify-between">
                                <InputLabel
                                    htmlFor="form_remark"
                                    value="Remark / Reason for Request *"
                                    className="font-bold text-slate-900"
                                />
                                <span className="text-[10px] text-[#E31B23] font-semibold">
                                    {formData.request_type === 'create_new' && 'Reason for new key creation'}
                                    {formData.request_type === 'extension' && 'Reason for 3-month renewal'}
                                    {formData.request_type === 'replacement' && 'Reason for key replacement'}
                                </span>
                            </div>
                            <textarea
                                id="form_remark"
                                rows={3}
                                value={formData.remark}
                                onChange={(e) => setFormData('remark', e.target.value)}
                                placeholder={
                                    formData.request_type === 'create_new'
                                        ? 'Explain why this new key is created (e.g., Additional room attendant for morning shift on Floor 2).'
                                        : formData.request_type === 'extension'
                                        ? 'Explain the renewal reason (e.g., Periodic 3-month renewal for HK Q4 operational evaluation cycle).'
                                        : 'Explain the replacement reason (e.g., Previous RFID card cracked / sensor not responding at room 312).'
                                }
                                className="mt-1 block w-full text-xs rounded-xl border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] leading-relaxed"
                                required
                            />
                            <p className="text-[10px] text-slate-500 mt-1">
                                This entry is recorded in the hotel audit log and printed on the SOP handover form.
                            </p>
                            <InputError message={formErrors.remark} className="mt-1" />
                        </div>

                        {/* Masa Berlaku (3 Bulan) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <InputLabel htmlFor="form_valid_from" value="Effective Start Date *" />
                                <TextInput
                                    id="form_valid_from"
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={(e) => setFormData('valid_from', e.target.value)}
                                    className="mt-1 block w-full text-xs"
                                    required
                                />
                            </div>

                            <div>
                                <span className="block text-xs font-medium text-slate-700">Valid Until (3 Months):</span>
                                <div className="mt-1.5 p-2 bg-white rounded-lg border border-red-200 flex items-center justify-between text-xs">
                                    <span className="font-bold text-[#E31B23]">
                                        {computeValidUntilPreview(formData.valid_from, 3)}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 bg-red-50 text-[#E31B23] font-semibold rounded">
                                        3-Month Cycle
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Digital Signature Pemohon */}
                        <div>
                            <SignaturePad
                                title="Requester Signature (E-Sign)"
                                value={formData.requester_signature}
                                onChange={(sig) => setFormData('requester_signature', sig || '')}
                            />
                        </div>

                        {/* Point D: Info rekam username & tanggal request otomatis */}
                        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                            <div className="min-w-0">
                                <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wide block">Username</span>
                                <span className="font-semibold text-gray-900 truncate block">{currentUser.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wide block">Request Date</span>
                                <span className="font-semibold text-gray-900">{formatDate(new Date().toISOString())}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 text-[10px] uppercase font-semibold tracking-wide block">Initial Status</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-semibold text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    On Request
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <SecondaryButton type="button" onClick={() => setIsFormModalOpen(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={formProcessing}>
                            {formProcessing ? 'Processing...' : 'Submit Request'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* ========================================================================= */}
            {/* STAGE 2: HOD HOUSEKEEPING APPROVAL MODAL                                   */}
            {/* ========================================================================= */}
            <Modal show={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} maxWidth="lg">
                {activeItem && (
                    <div className="flex flex-col max-h-[90vh]">
                        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-white">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">
                                    HOD Housekeeping Request Approval
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Review master key request from staff, provide approval remarks & digital signature
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsApproveModalOpen(false)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                aria-label="Close"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {/* Request Summary Box */}
                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Registration No.:</span>
                                    <span className="font-mono font-bold text-gray-900">{activeItem.request_number}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Request Type:</span>
                                    <span className="font-semibold text-[#E31B23]">{activeItem.request_type_label}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Master Key:</span>
                                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{activeItem.key_number} ({activeItem.key_type})</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Room Coverage:</span>
                                    <span className="font-semibold text-gray-900">{activeItem.room_range_access}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Requested by:</span>
                                    <span className="font-semibold text-gray-900">{activeItem.request_by || activeItem.employee?.user?.name || '-'}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200">
                                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Remark:</span>
                                    <p className="text-gray-800 mt-0.5 leading-relaxed">{activeItem.remark || '-'}</p>
                                </div>
                            </div>

                            {/* HOD Approval Notes */}
                            <div>
                                <InputLabel htmlFor="approval_notes" value="Approval Notes / Catatan HOD (Optional)" />
                                <textarea
                                    id="approval_notes"
                                    rows={3}
                                    value={approveData.approval_notes}
                                    onChange={(e) => setApproveData('approval_notes', e.target.value)}
                                    placeholder="E.g., Disetujui untuk perpanjangan berkala operasional kamar lantai 3. Diteruskan ke IT untuk programming RFID."
                                    className="mt-1 block w-full text-xs rounded-xl border-gray-300 focus:border-amber-500 focus:ring-amber-500 leading-relaxed"
                                />
                            </div>

                            {/* Digital Signature HOD HK */}
                            <div>
                                <SignaturePad
                                    title="HOD Housekeeping Digital Signature *"
                                    value={approveData.hod_signature}
                                    onChange={(sig) => setApproveData('hod_signature', sig || '')}
                                />
                            </div>

                            {/* Signer Identification */}
                            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1">
                                <div className="flex justify-between items-center text-amber-900">
                                    <span className="font-semibold">Signing as HOD HK:</span>
                                    <span className="font-mono font-bold">{currentUser.name} ({hodHK?.position?.name || 'Executive Housekeeper'})</span>
                                </div>
                                <div className="text-[11px] text-amber-800">
                                    Setelah disetujui (Approved), status kartu otomatis diteruskan ke Departemen IT untuk pembuatan/update kartu RFID.
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <DangerButton
                                type="button"
                                onClick={() => handleApproveSubmit('Rejected')}
                                disabled={approveProcessing}
                                className="text-xs"
                            >
                                Reject Request
                            </DangerButton>

                            <div className="flex items-center gap-2">
                                <SecondaryButton type="button" onClick={() => setIsApproveModalOpen(false)}>
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton
                                    type="button"
                                    onClick={() => handleApproveSubmit('Approved')}
                                    disabled={approveProcessing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                                >
                                    {approveProcessing ? 'Processing...' : 'Approve & Forward to IT'}
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ========================================================================= */}
            {/* STAGE 3: DEPARTMENT IT CARD CREATION / UPDATE MODAL                        */}
            {/* ========================================================================= */}
            <Modal show={isItModalOpen} onClose={() => setIsItModalOpen(false)} maxWidth="lg">
                {activeItem && (
                    <form onSubmit={handleItSubmit} className="flex flex-col max-h-[90vh]">
                        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-white">
                            <div>
                                <h2 className="text-base font-bold text-gray-900">
                                    {activeItem.request_type === 'create_new'
                                        ? 'Create & Issue Master Key (Department IT)'
                                        : 'Update & Re-program Master Key (Department IT)'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    RFID card programming, physical key encoding & issuance by Department IT
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsItModalOpen(false)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                aria-label="Close"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {/* Request & HOD Approval Confirmation */}
                            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 text-xs space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Registration No.:</span>
                                    <span className="font-mono font-bold text-gray-900">{activeItem.request_number}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Master Key:</span>
                                    <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                                        {activeItem.key_number} ({activeItem.key_type})
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Coverage Area:</span>
                                    <span className="font-semibold text-gray-900">{activeItem.room_range_access}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Key Holder / Requester:</span>
                                    <span className="font-semibold text-gray-900">{activeItem.request_by || activeItem.employee?.user?.name || '-'}</span>
                                </div>
                                <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        HOD HK Approval:
                                    </span>
                                    <span className="font-medium text-emerald-800">
                                        {activeItem.approved_by_username || hodHK?.user?.name || 'HOD HK'} ({formatDate(activeItem.approved_at)})
                                    </span>
                                </div>
                            </div>

                            {/* Status to be Set */}
                            <div>
                                <InputLabel value="Action & Resulting Status" />
                                <div className="mt-1.5 p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                                    <div>
                                        <span className="block text-xs font-bold text-gray-900">
                                            {activeItem.request_type === 'create_new' ? 'New Key Card Creation' : 'Key Card Update / Extension'}
                                        </span>
                                        <span className="text-[11px] text-gray-500">
                                            Status will be set to:
                                        </span>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                        activeItem.request_type === 'create_new' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                                    }`}>
                                        <span className="w-2 h-2 rounded-full bg-current"></span>
                                        {activeItem.request_type === 'create_new' ? 'Created' : 'Updated'}
                                    </span>
                                </div>
                            </div>

                            {/* Catatan Pembuatan & Selesai */}
                            <div>
                                <InputLabel htmlFor="it_notes" value="IT Programming & Issuance Notes" />
                                <textarea
                                    id="it_notes"
                                    rows={3}
                                    value={itData.done_notes}
                                    onChange={(e) => setItData('done_notes', e.target.value)}
                                    placeholder="E.g., RFID master key card programmed with 3-month validity for Room 201-210. Card tested and handed over to Housekeeping staff."
                                    className="mt-1 block w-full text-xs rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 leading-relaxed"
                                />
                            </div>

                            {/* Digital Signature IT Officer / Petugas Pembuat */}
                            <div>
                                <SignaturePad
                                    title="Department IT Officer Digital Signature (Create by IT) *"
                                    value={itData.it_signature}
                                    onChange={(sig) => setItData('it_signature', sig || '')}
                                />
                            </div>

                            {/* Info Logging IT */}
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                                <div className="flex justify-between items-center text-gray-900">
                                    <span className="font-semibold">IT Officer Account:</span>
                                    <span className="font-mono font-bold text-blue-700">
                                        {currentUser.name} ({currentEmployee?.position?.name && currentEmployee?.position?.name !== 'IT Manager' ? currentEmployee.position.name : 'Information Technology Staff'})
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600 text-[11px]">
                                    <span>Issuance Timestamp:</span>
                                    <span>{new Date().toLocaleString('en-US')} (Automatically logged)</span>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <SecondaryButton type="button" onClick={() => setIsItModalOpen(false)}>
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton
                                type="submit"
                                disabled={itProcessing}
                                className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                            >
                                {itProcessing ? 'Processing...' : (activeItem.request_type === 'create_new' ? 'Confirm & Set Status: Created' : 'Confirm & Set Status: Updated')}
                            </PrimaryButton>
                        </div>
                    </form>
                )}
            </Modal>

            {/* ========================================================================= */}
            {/* DETAIL & AUDIT ACTIVITY LOG MODAL                                          */}
            {/* ========================================================================= */}
            <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} maxWidth="2xl">
                {activeItem && (
                    <div className="flex flex-col max-h-[90vh]">
                        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-white">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base font-bold text-gray-900 font-mono">
                                        {activeItem.request_number}
                                    </h2>
                                    {renderTypeBadge(activeItem.request_type)}
                                    {renderStatusBadge(activeItem.status, activeItem)}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Complete master key request details and audit history log
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDetailModalOpen(false)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                aria-label="Close"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                            {/* Section 1: Data Kunci & Pemegang */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Requested by</span>
                                    <div className="font-bold text-gray-900 text-sm leading-snug">{activeItem.request_by || activeItem.employee?.user?.name || '-'}</div>
                                    {activeItem.employee?.employee_number && (
                                        <div className="text-gray-600">Employee ID: <span className="font-mono font-medium text-gray-900">{activeItem.employee.employee_number}</span></div>
                                    )}
                                    <div className="text-gray-600">Position: <span className="text-gray-900">{activeItem.employee?.position?.name || 'Staff HK'}</span></div>
                                    <div className="text-gray-600">Department: <span className="text-gray-900">{activeItem.employee?.department?.name || 'Housekeeping'}</span></div>
                                </div>

                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Key Specifications</span>
                                    <div className="font-mono font-bold text-gray-900 text-sm bg-white px-2 py-0.5 rounded border border-gray-200 inline-block">{activeItem.key_number}</div>
                                    <div className="text-gray-600">Type: <span className="font-semibold text-gray-900">{activeItem.key_type}</span></div>
                                    <div className="text-gray-600">Coverage: <span className="text-gray-900">{activeItem.room_range_access}</span></div>
                                    <div className="text-gray-600">Validity: <span className="text-gray-900">{formatDate(activeItem.valid_from)} to {formatDate(activeItem.valid_until)}</span></div>
                                </div>
                            </div>

                            {/* History of all requests for this physical key, across pagination. */}
                            <div className="border border-gray-200 rounded-xl p-4 bg-white">
                                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        Master Key Request & Extension History
                                    </span>
                                    <span className="text-[11px] text-gray-500">
                                        {(renewalHistories[activeItem.key_number] || []).length} requests recorded
                                    </span>
                                </div>
                                {(() => {
                                    const history = renewalHistories[activeItem.key_number] || [];
                                    const lastExtension = history.find(entry => entry.request_type === 'extension');
                                    return (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-xs">
                                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                                                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Latest Request</div>
                                                    <div className="font-semibold text-slate-900 mt-1">{history.length > 0 ? formatDateTime(history[0].requested_at ?? undefined) : '-'}</div>
                                                </div>
                                                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                                                    <div className="text-[10px] font-semibold text-blue-600 uppercase">Latest Extension Request</div>
                                                    <div className="font-semibold text-blue-900 mt-1">{lastExtension ? formatDateTime(lastExtension.requested_at ?? undefined) : 'Not extended yet'}</div>
                                                </div>
                                            </div>
                                            {history.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full min-w-[580px] text-left text-[11px]">
                                                        <thead className="text-slate-500 uppercase text-[10px] border-b border-slate-200">
                                                            <tr>
                                                                <th className="py-2 pr-3">Request / Date</th>
                                                                <th className="py-2 pr-3">Type</th>
                                                                <th className="py-2 pr-3">Requested By</th>
                                                                <th className="py-2 pr-3">Valid Until</th>
                                                                <th className="py-2">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {history.map(entry => (
                                                                <tr key={entry.id} className={entry.id === activeItem.id ? 'bg-red-50/70' : ''}>
                                                                    <td className="py-2 pr-3">
                                                                        <div className="font-mono font-semibold text-slate-800">{entry.request_number}</div>
                                                                        <div className="text-slate-500">{formatDateTime(entry.requested_at ?? undefined)}</div>
                                                                    </td>
                                                                    <td className="py-2 pr-3 capitalize">{entry.request_type.replace('_', ' ')}</td>
                                                                    <td className="py-2 pr-3">{entry.request_by || '-'}</td>
                                                                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(entry.valid_until ?? undefined)}</td>
                                                                    <td className="py-2 font-semibold text-slate-700">{entry.status}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500">No earlier requests recorded for this key.</p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Section 2: Remark / Alasan Permohonan */}
                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider block mb-1">
                                    Remark / Reason for Request ({activeItem.request_type_label}):
                                </span>
                                <p className="text-gray-900 font-medium leading-relaxed">
                                    {activeItem.remark || '-'}
                                </p>
                            </div>

                            {/* Section 3: Visual Timeline (3 Stages: Request, Approve, Create) */}
                            <div className="border border-gray-200 rounded-xl p-4 bg-white">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
                                    Activity Log & System Trail (3 Stages: Request, Approve, Create)
                                </span>

                                <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                    {/* Step 1: Request by (Staff Housekeeping) */}
                                    <div className="relative">
                                        <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-[#E31B23] text-white flex items-center justify-center text-[9px] font-bold">
                                            1
                                        </div>
                                        <div className="text-xs font-bold text-gray-900">
                                            1. Request by (Staff Housekeeping)
                                        </div>
                                        <div className="text-[11px] text-gray-600 mt-0.5">
                                            Requester: <span className="font-semibold text-gray-900">{activeItem.request_by || activeItem.employee?.user?.name || '-'}</span> (Username: <span className="font-mono text-gray-700">{activeItem.requested_by_username || activeItem.requested_by?.name || '-'}</span>)
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            Submitted At: {formatDateTime(activeItem.requested_at || activeItem.created_at)}
                                        </div>
                                    </div>

                                    {/* Step 2: Approve by (HOD Housekeeping) */}
                                    <div className="relative">
                                        <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                            activeItem.approved_at || ['Approved', 'Created', 'Updated', 'Done'].includes(activeItem.status)
                                                ? 'bg-emerald-600 text-white'
                                                : activeItem.status === 'Rejected'
                                                ? 'bg-rose-600 text-white'
                                                : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            2
                                        </div>
                                        <div className="text-xs font-bold text-gray-900">
                                            2. Approve by (HOD Housekeeping)
                                        </div>
                                        <div className="text-[11px] text-gray-600 mt-0.5">
                                            HOD Authority: <span className="font-semibold text-gray-900">{activeItem.approved_by_username || hodHK?.user?.name || 'Executive Housekeeper'}</span>
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            {activeItem.approved_at || ['Approved', 'Created', 'Updated', 'Done'].includes(activeItem.status) ? (
                                                <span className="font-semibold text-emerald-700">
                                                    Approved by HOD Housekeeping ({formatDateTime(activeItem.approved_at)})
                                                </span>
                                            ) : activeItem.status === 'Rejected' ? (
                                                <span className="font-semibold text-rose-600">Rejected by HOD Housekeeping</span>
                                            ) : (
                                                <span className="font-semibold text-amber-600">Pending Review & Approval</span>
                                            )}
                                        </div>
                                        {activeItem.approval_notes && (
                                            <div className="text-[11px] text-gray-700 mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                                HOD Notes: {activeItem.approval_notes}
                                            </div>
                                        )}
                                    </div>

                                    {/* Step 3: Create by (Department IT) */}
                                    <div className="relative">
                                        <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                                            ['Created', 'Updated', 'Done'].includes(activeItem.status)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-300 text-gray-600'
                                        }`}>
                                            3
                                        </div>
                                        <div className="text-xs font-bold text-gray-900">
                                            3. Create by (Department IT)
                                        </div>
                                        {['Created', 'Updated', 'Done'].includes(activeItem.status) ? (
                                            <>
                                                <div className="text-[11px] text-gray-600 mt-0.5">
                                                    Created & Issued by: <span className="font-mono font-bold text-blue-700">{activeItem.done_by_username || activeItem.done_by?.name || (itStaff ? itStaff.user?.name : 'Department IT')}</span> (Information Technology Staff)
                                                </div>
                                                <div className="text-[10px] text-gray-400">
                                                    Completed At: {formatDateTime(activeItem.done_at)}
                                                </div>
                                                {activeItem.done_notes && (
                                                    <div className="text-[11px] text-gray-700 mt-1.5 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                                        IT Notes: {activeItem.done_notes}
                                                    </div>
                                                )}
                                            </>
                                        ) : activeItem.status === 'Approved' ? (
                                            <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                                                Request approved by HOD HK. Waiting for Department IT card programming & issuance.
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-gray-500 italic mt-0.5">
                                                Awaiting HOD HK approval before Department IT can issue the master key.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Audit Logs History Table (if available) */}
                            {activeItem.audit_logs && activeItem.audit_logs.length > 0 && (
                                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                                        Database Audit Log History ({activeItem.audit_logs.length} Logs)
                                    </span>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto text-[11px]">
                                        {activeItem.audit_logs.map(log => (
                                            <div key={log.id} className="p-2 bg-white rounded-lg border border-gray-200 flex items-start justify-between gap-3">
                                                <div>
                                                    <span className="font-semibold text-gray-800">{log.description}</span>
                                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                                        User: {log.user?.name || 'System'}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                                    {formatDateTime(log.created_at)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Signatures Preview: 3 Sign-offs (Request by, Approve by, Create by) */}
                            <div className="grid grid-cols-3 gap-3 text-xs">
                                <div className="p-3 border border-gray-200 rounded-xl text-center bg-white">
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                                        1. Request by
                                    </span>
                                    {activeItem.requester_signature ? (
                                        <div className="h-16 flex items-center justify-center p-1 bg-gray-50 rounded">
                                            <img
                                                src={activeItem.requester_signature}
                                                alt="Requester Signature"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic text-[11px] block py-4">[No E-Signature]</span>
                                    )}
                                    <div className="mt-1 text-[10px] text-gray-600 truncate font-semibold">
                                        {activeItem.request_by || activeItem.employee?.user?.name || 'Requester'}
                                    </div>
                                </div>

                                <div className="p-3 border border-gray-200 rounded-xl text-center bg-white">
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                                        2. Approve by (HOD HK)
                                    </span>
                                    {activeItem.hod_signature || activeItem.approver_signature ? (
                                        <div className="h-16 flex items-center justify-center p-1 bg-gray-50 rounded">
                                            <img
                                                src={activeItem.hod_signature || activeItem.approver_signature}
                                                alt="HOD HK Signature"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                    ) : ['Approved', 'Created', 'Updated', 'Done'].includes(activeItem.status) ? (
                                        <div className="h-16 flex flex-col items-center justify-center p-1 bg-emerald-50 rounded border border-emerald-100">
                                            <span className="text-emerald-700 font-bold text-[11px]">APPROVED</span>
                                            <span className="text-[9px] text-emerald-600">HOD Housekeeping</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic text-[11px] block py-4">[Pending Approval]</span>
                                    )}
                                    <div className="mt-1 text-[10px] text-gray-600 truncate font-semibold">
                                        {activeItem.approved_by_username || activeItem.approved_by?.name || (['Approved', 'Created', 'Updated', 'Done'].includes(activeItem.status) ? (hodHK?.user?.name || 'Executive Housekeeper') : '[Pending Approval]')}
                                    </div>
                                    <div className="text-[9px] text-gray-400 truncate">
                                        {activeItem.approved_by?.employee?.position?.name || hodHK?.position?.name || 'Executive Housekeeper'}
                                    </div>
                                </div>

                                <div className="p-3 border border-gray-200 rounded-xl text-center bg-white">
                                    <span className="text-[10px] text-gray-400 uppercase font-semibold block mb-1">
                                        3. Create by (Dept IT)
                                    </span>
                                    {activeItem.it_signature &&
                                    activeItem.it_signature !== activeItem.hod_signature &&
                                    activeItem.it_signature !== activeItem.approver_signature ? (
                                        <div className="h-16 flex items-center justify-center p-1 bg-gray-50 rounded">
                                            <img
                                                src={activeItem.it_signature}
                                                alt="IT Sign-off"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                    ) : ['Created', 'Updated', 'Done'].includes(activeItem.status) ? (
                                        <div className="h-16 flex flex-col items-center justify-center p-1 bg-blue-50 rounded border border-blue-100">
                                            <span className="text-blue-700 font-bold text-[11px]">
                                                {activeItem.status === 'Created' ? 'KEY CREATED' : 'KEY UPDATED'}
                                            </span>
                                            <span className="text-[9px] text-blue-600">Department IT</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic text-[11px] block py-4">[Pending IT Creation & Sign-off]</span>
                                    )}
                                    <div className="mt-1 text-[10px] text-gray-600 truncate font-semibold">
                                        {activeItem.done_by_username || activeItem.done_by?.name || (['Created', 'Updated', 'Done'].includes(activeItem.status) ? (itStaff?.user?.name || 'Department IT') : '(Pending IT Officer)')}
                                    </div>
                                    <div className="text-[9px] text-gray-400 truncate">
                                        {activeItem.done_by?.employee?.position?.name && activeItem.done_by?.employee?.position?.name !== 'IT Manager'
                                            ? activeItem.done_by.employee.position.name
                                            : 'Information Technology Staff'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <a
                                    href={route('master-keys.print', activeItem.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-2xs"
                                >
                                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print SOP Form
                                </a>

                                {(canManageAll || canApprove || canCreateKey || activeItem.status === 'On Request') && (
                                    <DangerButton
                                        type="button"
                                        onClick={() => {
                                            const itemToDelete = activeItem;
                                            setIsDetailModalOpen(false);
                                            handleDelete(itemToDelete);
                                        }}
                                        className="text-xs"
                                    >
                                        Delete Request
                                    </DangerButton>
                                )}
                            </div>

                            <SecondaryButton onClick={() => setIsDetailModalOpen(false)}>
                                Close
                            </SecondaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
