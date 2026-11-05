import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/Badge';

interface Period {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    type: string;
}

interface PerformanceScore {
    id: number;
    employee_id: number;
    performance_period_id: number;
    assigned_tasks: number;
    completed_tasks: number;
    completed_on_time_tasks: number;
    overdue_tasks: number;
    completion_rate: number;
    on_time_rate: number;
    task_weight_score: number;
    supervisor_score: number;
    final_epi: number;
    category: string;
    employee?: {
        id: number;
        user?: {
            name: string;
            email: string;
        };
        department?: {
            name: string;
        };
    };
}

interface Props {
    periods: Period[];
    selectedPeriodId: number | string | null;
    scores: PerformanceScore[];
    flash?: {
        success?: string;
        error?: string;
    };
}

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PerformanceIndex({ periods = [], selectedPeriodId, scores = [], flash }: Props) {
    const [isCalculating, setIsCalculating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createMode, setCreateMode] = useState<'monthly' | 'custom'>('monthly');

    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    // Form for custom period
    const { data: customData, setData: setCustomData, post: postCustom, processing: processingCustom, errors: customErrors, reset: resetCustom } = useForm({
        name: '',
        type: 'Monthly',
        start_date: '',
        end_date: '',
    });

    const selectedPeriod = periods.find(p => String(p.id) === String(selectedPeriodId));

    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            router.get(route('performance.index'), { period_id: val }, { preserveState: true });
        }
    };

    const handleCalculate = () => {
        if (!selectedPeriodId) return;
        setIsCalculating(true);
        router.post(
            route('performance.calculate'),
            { period_id: selectedPeriodId },
            {
                onFinish: () => setIsCalculating(false),
            }
        );
    };

    const handleDeletePeriod = () => {
        if (!selectedPeriod) return;
        if (confirm(`Are you sure you want to delete period "${selectedPeriod.name}"? All EPI score records for this period will also be permanently deleted.`)) {
            router.delete(route('performance.periods.destroy', selectedPeriod.id));
        }
    };

    const handleQuickMonthSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            route('performance.periods.store'),
            {
                month: selectedMonth,
                year: selectedYear,
            },
            {
                onSuccess: () => {
                    setShowCreateModal(false);
                },
            }
        );
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postCustom(route('performance.periods.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                resetCustom();
            },
        });
    };

    const getCategoryVariant = (category: string) => {
        switch (category) {
            case 'Excellent': return 'success';
            case 'Very Good': return 'info';
            case 'Good': return 'brand';
            case 'Needs Improvement': return 'warning';
            case 'Evaluation Required': return 'danger';
            default: return 'neutral';
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-slate-800 leading-tight">Employee Performance (EPI)</h2>}
        >
            <Head title="Employee Performance" />

            <div className="w-full">
                <div className="w-full space-y-4">

                    {/* Flash Notifications */}
                    {flash?.success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium">{flash.success}</span>
                            </div>
                        </div>
                    )}

                    {flash?.error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-rose-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-medium">{flash.error}</span>
                            </div>
                        </div>
                    )}

                    {/* Main Card */}
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200 p-6 sm:p-8">
                        
                        {/* Control Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                            <div className="flex flex-wrap items-center gap-3">
                                <label htmlFor="period_select" className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                                    Select Period:
                                </label>
                                
                                <select 
                                    id="period_select"
                                    className="border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl shadow-xs min-w-[220px] w-64 text-sm font-medium text-slate-800 py-2 px-3 bg-white"
                                    value={selectedPeriodId || ''}
                                    onChange={handlePeriodChange}
                                >
                                    {periods.length === 0 ? (
                                        <option value="">No periods available</option>
                                    ) : (
                                        periods.map((period) => (
                                            <option key={period.id} value={period.id}>
                                                {period.name} ({period.type})
                                            </option>
                                        ))
                                    )}
                                </select>

                                {/* Add Period Button */}
                                <SecondaryButton
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="gap-1.5"
                                    title="Add New Evaluation Period"
                                >
                                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>New Period</span>
                                </SecondaryButton>

                                {/* Delete Period Button */}
                                {selectedPeriod && periods.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleDeletePeriod}
                                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                                        title={`Delete period "${selectedPeriod.name}"`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Calculate EPI Button */}
                            <div className="flex items-center gap-3">
                                <PrimaryButton 
                                    onClick={handleCalculate}
                                    disabled={!selectedPeriodId || isCalculating}
                                    className="gap-2"
                                >
                                    {isCalculating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Calculating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            Calculate EPI
                                        </>
                                    )}
                                </PrimaryButton>
                            </div>
                        </div>

                        {/* Scores Table or Empty State */}
                        {scores && scores.length > 0 ? (
                            <div className="overflow-x-auto mt-6 rounded-xl border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Tasks Done</th>
                                            <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">On-Time</th>
                                            <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Final EPI</th>
                                            <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {scores.map((score) => (
                                            <tr key={score.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-slate-900">{score.employee?.user?.name || 'N/A'}</div>
                                                    <div className="text-xs text-slate-400">{score.employee?.user?.email || ''}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {score.employee?.department?.name || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-slate-700 tabular-nums">
                                                    <span className="text-emerald-600 font-semibold">{score.completed_tasks}</span>
                                                    <span className="text-slate-400"> / </span>
                                                    <span>{score.assigned_tasks}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-700 font-medium tabular-nums">
                                                    {score.on_time_rate}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className="text-base font-bold text-slate-900 tabular-nums">{score.final_epi}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <Badge variant={getCategoryVariant(score.category)} dot>
                                                        {score.category}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                    <Link 
                                                        href={route('performance.show', [score.employee_id, score.performance_period_id])} 
                                                        className="inline-flex items-center text-xs font-semibold text-[#E31B23] hover:text-[#c4141b] bg-red-50 hover:bg-red-100/80 px-2.5 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Detail
                                                    </Link>
                                                    <Link 
                                                        href={route('performance.assess', [score.employee_id, score.performance_period_id])} 
                                                        className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Assess
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-16 px-4">
                                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-slate-900 mb-1">
                                    {selectedPeriod 
                                        ? `No performance records found for "${selectedPeriod.name}"`
                                        : 'No period selected'}
                                </h3>
                                <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                                    {selectedPeriod 
                                        ? 'Click "Calculate EPI" to generate performance metrics, task completion rates, and EPI rankings for all active employees.'
                                        : 'Please select or create a performance evaluation period to begin.'}
                                </p>
                                {selectedPeriod && (
                                    <PrimaryButton
                                        onClick={handleCalculate}
                                        disabled={isCalculating}
                                        className="gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Calculate EPI for {selectedPeriod.name}</span>
                                    </PrimaryButton>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Create Period Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                        <h3 className="text-lg font-bold text-gray-900">
                            Create Evaluation Period
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="text-gray-400 hover:text-gray-500 p-1 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex border-b border-slate-200 mb-5">
                        <button
                            type="button"
                            onClick={() => setCreateMode('monthly')}
                            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
                                createMode === 'monthly'
                                    ? 'border-[#E31B23] text-[#E31B23]'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Monthly (Quick)
                        </button>
                        <button
                            type="button"
                            onClick={() => setCreateMode('custom')}
                            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
                                createMode === 'custom'
                                    ? 'border-[#E31B23] text-[#E31B23]'
                                    : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Custom Range
                        </button>
                    </div>

                    {createMode === 'monthly' ? (
                        <form onSubmit={handleQuickMonthSubmit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="modal_month" value="Month" />
                                <select
                                    id="modal_month"
                                    className="mt-1 block w-full border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl shadow-xs text-sm"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                >
                                    {MONTH_NAMES.map((name, idx) => (
                                        <option key={idx + 1} value={idx + 1}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <InputLabel htmlFor="modal_year" value="Year" />
                                <select
                                    id="modal_year"
                                    className="mt-1 block w-full border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl shadow-xs text-sm"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                >
                                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-100">
                                <div><strong>Name Preview:</strong> {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</div>
                                <div className="mt-1">
                                    <strong>Date Range:</strong> 1 {MONTH_NAMES[selectedMonth - 1]} {selectedYear} to end of month
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <SecondaryButton type="button" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton type="submit">
                                    Save & Select Period
                                </PrimaryButton>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleCustomSubmit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="custom_name" value="Period Name (e.g. Q3 2026)" />
                                <TextInput
                                    id="custom_name"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={customData.name}
                                    onChange={(e) => setCustomData('name', e.target.value)}
                                    placeholder="e.g. Q3 2026"
                                    required
                                />
                                <InputError message={customErrors.name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="custom_type" value="Period Type" />
                                <select
                                    id="custom_type"
                                    className="mt-1 block w-full border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl shadow-xs text-sm"
                                    value={customData.type}
                                    onChange={(e) => setCustomData('type', e.target.value)}
                                >
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                    <option value="Yearly">Yearly</option>
                                </select>
                                <InputError message={customErrors.type} className="mt-1" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <InputLabel htmlFor="custom_start" value="Start Date" />
                                    <TextInput
                                        id="custom_start"
                                        type="date"
                                        className="mt-1 block w-full"
                                        value={customData.start_date}
                                        onChange={(e) => setCustomData('start_date', e.target.value)}
                                        required
                                    />
                                    <InputError message={customErrors.start_date} className="mt-1" />
                                </div>
                                <div>
                                    <InputLabel htmlFor="custom_end" value="End Date" />
                                    <TextInput
                                        id="custom_end"
                                        type="date"
                                        className="mt-1 block w-full"
                                        value={customData.end_date}
                                        onChange={(e) => setCustomData('end_date', e.target.value)}
                                        required
                                    />
                                    <InputError message={customErrors.end_date} className="mt-1" />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100">
                                <SecondaryButton type="button" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton type="submit" disabled={processingCustom}>
                                    {processingCustom ? 'Saving...' : 'Save Period'}
                                </PrimaryButton>
                            </div>
                        </form>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
