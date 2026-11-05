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

interface LeaveRequestItem {
    id: number;
    employee_id: number;
    type: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_by?: number | null;
    created_at: string;
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

interface LeaveIndexProps {
    leaveRequests: LeaveRequestItem[];
    myRequests?: LeaveRequestItem[];
    allRequests?: LeaveRequestItem[];
    canApprove?: boolean;
    activeTab?: string;
    pendingApprovalsCount?: number;
}

export default function LeaveIndex({
    leaveRequests = [],
    myRequests = [],
    allRequests = [],
    canApprove = false,
    activeTab = 'approvals',
    pendingApprovalsCount = 0,
}: LeaveIndexProps) {
    const [currentTab, setCurrentTab] = useState<'approvals' | 'my'>(
        canApprove ? (activeTab === 'my' ? 'my' : 'approvals') : 'my'
    );
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusProcessingId, setStatusProcessingId] = useState<number | null>(null);
    const [searchFilter, setSearchFilter] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'Annual',
        start_date: '',
        end_date: '',
        reason: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('leave.store'), {
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
            route('leave.status', id),
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
        : leaveRequests.length > 0
        ? leaveRequests
        : myRequests;

    const filteredRequests = displayedRequests.filter((req) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        const empName = req.employee?.user?.name?.toLowerCase() || '';
        const empNum = req.employee?.employee_number?.toLowerCase() || '';
        const dept = req.employee?.department?.name?.toLowerCase() || '';
        const reason = req.reason?.toLowerCase() || '';
        const type = req.type?.toLowerCase() || '';
        return empName.includes(q) || empNum.includes(q) || dept.includes(q) || reason.includes(q) || type.includes(q);
    });

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-[#E31B23] font-semibold mb-0.5">
                            <span>Human Resources</span>
                            <span>/</span>
                            <span className="text-slate-500">Leave Management</span>
                        </div>
                        <h2 className="font-bold text-xl text-slate-900 tracking-tight">
                            {canApprove ? 'Leave Requests & Approvals' : 'Employee Leave Requests'}
                        </h2>
                    </div>
                    <PrimaryButton
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#E31B23] hover:bg-[#c4141b] text-white self-start sm:self-auto shrink-0 shadow-sm"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Request Leave
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Leave Requests - Swiss-Belinn" />

            <div className="w-full">
                <div className="w-full space-y-4">
                    {/* Role Banner for Admin/Super Admin */}
                    {canApprove && (
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30">
                                        Executive HR Control
                                    </span>
                                    {pendingApprovalsCount > 0 && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            {pendingApprovalsCount} Awaiting Verification
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base font-bold mt-1.5">Leave Management & Self-Service Portal</h3>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    You can verify team submissions or click "Request Leave" to apply for your own personal leave.
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
                                        ? 'Team Leave Approval Queue'
                                        : 'My Personal Leave History'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {canApprove && currentTab === 'approvals'
                                        ? 'Review, approve, or reject employee leave requests submitted to HR.'
                                        : 'List of submitted leave applications and approval status.'}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search employee, leave type..."
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
                                        <th className="px-6 py-3.5">Leave Type</th>
                                        <th className="px-6 py-3.5">Duration</th>
                                        <th className="px-6 py-3.5">Reason</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                        {canApprove && currentTab === 'approvals' ? (
                                            <th className="px-6 py-3.5 text-right">Actions</th>
                                        ) : (
                                            <th className="px-6 py-3.5 text-right">Date Requested</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRequests.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={canApprove && currentTab === 'approvals' ? 6 : 5}
                                                className="px-6 py-16 text-center text-slate-500"
                                            >
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700">No leave requests found</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {canApprove && currentTab === 'approvals'
                                                        ? 'There are currently no leave requests in the queue.'
                                                        : 'Use the "Request Leave" button above to submit a new application.'}
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
                                                <td className="px-6 py-4 font-semibold text-slate-900">{req.type}</td>
                                                <td className="px-6 py-4 text-slate-600 tabular-nums">
                                                    {req.start_date} to {req.end_date}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={req.reason}>
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
                                                {canApprove && currentTab === 'approvals' ? (
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
                                                ) : (
                                                    <td className="px-6 py-4 text-slate-500 text-xs text-right tabular-nums">
                                                        {req.created_at
                                                            ? new Date(req.created_at).toLocaleDateString('en-US', {
                                                                  day: 'numeric',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                              })
                                                            : '-'}
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

            {/* Leave Request Submission Modal */}
            <Modal show={isModalOpen} onClose={closeModal} maxWidth="md">
                <form onSubmit={submit} className="p-6">
                    <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Submit Leave Request</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Apply for official leave of absence</p>
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
                            <InputLabel htmlFor="type" value="Leave Type" />
                            <select
                                id="type"
                                className="mt-1.5 block w-full rounded-xl border-slate-300 text-sm text-slate-900 shadow-xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2.5 px-3"
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value)}
                            >
                                <option value="Annual">Annual Leave (Cuti Tahunan)</option>
                                <option value="Sick">Sick Leave (Cuti Sakit)</option>
                                <option value="Unpaid">Unpaid Leave (Cuti Tanpa Upah)</option>
                                <option value="Maternity">Maternity / Paternity Leave</option>
                                <option value="Other">Other Reasons</option>
                            </select>
                            <InputError message={errors.type} className="mt-1.5" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="start_date" value="Start Date" />
                                <TextInput
                                    id="start_date"
                                    type="date"
                                    className="mt-1.5 block w-full"
                                    value={data.start_date}
                                    onChange={(e) => setData('start_date', e.target.value)}
                                    required
                                />
                                <InputError message={errors.start_date} className="mt-1.5" />
                            </div>
                            <div>
                                <InputLabel htmlFor="end_date" value="End Date" />
                                <TextInput
                                    id="end_date"
                                    type="date"
                                    className="mt-1.5 block w-full"
                                    value={data.end_date}
                                    onChange={(e) => setData('end_date', e.target.value)}
                                    required
                                />
                                <InputError message={errors.end_date} className="mt-1.5" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="reason" value="Reason for Leave" />
                            <textarea
                                id="reason"
                                className="mt-1.5 block w-full rounded-xl border-slate-300 text-sm text-slate-900 shadow-xs focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2.5 px-3"
                                rows={3}
                                placeholder="Explain the purpose of your leave request..."
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
                            {processing ? 'Submitting...' : 'Submit Request'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
