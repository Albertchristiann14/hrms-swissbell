import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import Badge from '@/Components/Badge';

interface OvertimeRequestItem {
    id: number;
    employee_id: number;
    date: string;
    start_time: string;
    end_time: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_by?: number | null;
    created_at?: string;
    employee?: {
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
    approver?: {
        id: number;
        name: string;
    } | null;
}

interface OvertimeIndexProps {
    overtimeRequests: OvertimeRequestItem[];
    myRequests?: OvertimeRequestItem[];
    allRequests?: OvertimeRequestItem[];
    canApprove?: boolean;
    activeTab?: string;
    pendingApprovalsCount?: number;
}

export default function OvertimeIndex({
    overtimeRequests = [],
    myRequests = [],
    allRequests = [],
    canApprove = false,
    activeTab = 'approvals',
    pendingApprovalsCount = 0,
}: OvertimeIndexProps) {
    const [currentTab, setCurrentTab] = useState<'approvals' | 'my'>(
        canApprove ? (activeTab === 'my' ? 'my' : 'approvals') : 'my'
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusProcessingId, setStatusProcessingId] = useState<number | null>(null);
    const [searchFilter, setSearchFilter] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        date: '',
        start_time: '',
        end_time: '',
        reason: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('overtime.store'), {
            onSuccess: () => {
                closeModal();
                if (canApprove) {
                    setCurrentTab('my');
                }
            },
        });
    };

    const closeModal = () => {
        setIsModalOpen(false);
        reset();
    };

    const updateStatus = (id: number, status: 'Approved' | 'Rejected') => {
        setStatusProcessingId(id);
        router.patch(
            route('overtime.status', id),
            { status },
            {
                preserveScroll: true,
                onFinish: () => setStatusProcessingId(null),
            }
        );
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'success';
            case 'Rejected':
                return 'danger';
            default:
                return 'warning';
        }
    };

    // Filter displayed list based on active tab
    const displayedRequests = canApprove
        ? currentTab === 'approvals'
            ? allRequests
            : myRequests
        : overtimeRequests.length > 0
        ? overtimeRequests
        : myRequests;

    const filteredRequests = displayedRequests.filter((req) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        const empName = req.employee?.user?.name?.toLowerCase() || '';
        const empNum = req.employee?.employee_number?.toLowerCase() || '';
        const dept = req.employee?.department?.name?.toLowerCase() || '';
        const reason = req.reason?.toLowerCase() || '';
        const date = req.date?.toLowerCase() || '';
        return empName.includes(q) || empNum.includes(q) || dept.includes(q) || reason.includes(q) || date.includes(q);
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-[#E31B23] font-semibold mb-0.5">
                            <span>Human Resources</span>
                            <span>/</span>
                            <span className="text-slate-500">Overtime Management</span>
                        </div>
                        <h2 className="font-bold text-xl text-slate-900 tracking-tight">
                            {canApprove ? 'Overtime (SPKL) & Approvals' : 'Overtime Requests (SPKL)'}
                        </h2>
                    </div>
                    <PrimaryButton
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#E31B23] hover:bg-[#c4141b] text-white self-start sm:self-auto shrink-0 shadow-sm"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Request Overtime
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Overtime Requests (SPKL) - Swiss-Belinn" />

            <div className="w-full">
                <div className="w-full space-y-4">
                    {/* Role Banner for Admin/Super Admin */}
                    {canApprove && (
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                                        Overtime & SPKL Oversight
                                    </span>
                                    {pendingApprovalsCount > 0 && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            {pendingApprovalsCount} SPKL Awaiting Approval
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base font-bold mt-1.5">Overtime Control & Employee Self-Service</h3>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    Review and verify team overtime hours or submit your own overtime work order.
                                </p>
                            </div>
                            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setCurrentTab('approvals')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                        currentTab === 'approvals'
                                            ? 'bg-[#E31B23] text-white shadow-xs'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <span>Approval Queue</span>
                                    {pendingApprovalsCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-slate-900 font-bold">
                                            {pendingApprovalsCount}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentTab('my')}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
                                        currentTab === 'my'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <span>My Requests</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                                        {myRequests.length}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Main Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">
                                    {canApprove && currentTab === 'approvals'
                                        ? 'Team Overtime (SPKL) Verification Queue'
                                        : 'My Overtime Work History'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {canApprove && currentTab === 'approvals'
                                        ? 'Review and verify operational overtime duties requested by team members.'
                                        : 'List of Overtime Work Order (SPKL) requests and supervisor verification status.'}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search employee, duty, date..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                        className="w-full text-xs rounded-xl border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2 pl-8 pr-3 shadow-2xs"
                                    />
                                    <svg
                                        className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/80 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/80">
                                    <tr>
                                        {canApprove && currentTab === 'approvals' && (
                                            <th className="px-6 py-3.5">Employee</th>
                                        )}
                                        <th className="px-6 py-3.5">Date</th>
                                        <th className="px-6 py-3.5">Overtime Hours</th>
                                        <th className="px-6 py-3.5">Reason / Operational Task</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                        {canApprove && currentTab === 'approvals' && (
                                            <th className="px-6 py-3.5 text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRequests.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={canApprove && currentTab === 'approvals' ? 6 : 4}
                                                className="px-6 py-16 text-center text-slate-500"
                                            >
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700">No overtime requests found</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {canApprove && currentTab === 'approvals'
                                                        ? 'There are currently no overtime requests awaiting verification.'
                                                        : 'Use the "Request Overtime" button above to submit a new SPKL.'}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRequests.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50/75 transition-colors">
                                                {canApprove && currentTab === 'approvals' && (
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-slate-900">
                                                            {req.employee?.user?.name || 'Unknown Employee'}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                            <span>{req.employee?.employee_number || '-'}</span>
                                                            {req.employee?.department?.name && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="text-slate-600">{req.employee.department.name}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 font-semibold text-slate-900 tabular-nums">
                                                    {req.date}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 tabular-nums">
                                                    {req.start_time} - {req.end_time}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 max-w-md truncate" title={req.reason}>
                                                    {req.reason}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Badge variant={getStatusVariant(req.status)} dot>
                                                        {req.status}
                                                    </Badge>
                                                    {req.approver && (
                                                        <div className="text-[10px] text-slate-400 mt-1">
                                                            by {req.approver.name}
                                                        </div>
                                                    )}
                                                </td>
                                                {canApprove && currentTab === 'approvals' && (
                                                    <td className="px-6 py-4 text-right">
                                                        {req.status === 'Pending' ? (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={statusProcessingId === req.id}
                                                                    onClick={() => updateStatus(req.id, 'Approved')}
                                                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={statusProcessingId === req.id}
                                                                    onClick={() => updateStatus(req.id, 'Rejected')}
                                                                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Resolved</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overtime Request Submission Modal */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Submit Overtime Request (SPKL)</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Surat Perintah Kerja Lembur verification</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeModal}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="date" value="Overtime Date" />
                            <TextInput
                                id="date"
                                type="date"
                                className="mt-1.5 block w-full"
                                value={data.date}
                                onChange={(e) => setData('date', e.target.value)}
                                required
                            />
                            <InputError message={errors.date} className="mt-1.5" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="start_time" value="Start Time" />
                                <TextInput
                                    id="start_time"
                                    type="time"
                                    className="mt-1.5 block w-full"
                                    value={data.start_time}
                                    onChange={(e) => setData('start_time', e.target.value)}
                                    required
                                />
                                <InputError message={errors.start_time} className="mt-1.5" />
                            </div>
                            <div>
                                <InputLabel htmlFor="end_time" value="End Time" />
                                <TextInput
                                    id="end_time"
                                    type="time"
                                    className="mt-1.5 block w-full"
                                    value={data.end_time}
                                    onChange={(e) => setData('end_time', e.target.value)}
                                    required
                                />
                                <InputError message={errors.end_time} className="mt-1.5" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="reason" value="Reason / Task Description" />
                            <textarea
                                id="reason"
                                className="mt-1.5 block w-full rounded-xl border-slate-300 text-sm text-slate-900 shadow-xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2.5 px-3"
                                rows={3}
                                placeholder="Describe the operational duties requiring overtime..."
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                required
                            ></textarea>
                            <InputError message={errors.reason} className="mt-1.5" />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <SecondaryButton onClick={closeModal}>Cancel</SecondaryButton>
                        <PrimaryButton
                            disabled={processing}
                            className="bg-[#E31B23] hover:bg-[#c4141b] text-white"
                        >
                            {processing ? 'Submitting...' : 'Submit SPKL'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
