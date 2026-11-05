import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function PayrollIndex({ periods = [], selectedPeriodId, payrolls = [], flash }: any) {
    const [showGenerate, setShowGenerate] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });

    const handlePeriodChange = (e: any) => {
        router.get(route('payroll.index'), { period_id: e.target.value });
    };

    const submitGenerate = (e: any) => {
        e.preventDefault();
        post(route('payroll.generate'), {
            onSuccess: () => setShowGenerate(false)
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-slate-800 leading-tight">Payroll Management</h2>}
        >
            <Head title="Payroll" />

            <div className="w-full">
                <div className="w-full space-y-4">
                    {flash?.success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl">
                            {flash.success}
                        </div>
                    )}

                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200 p-6">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                            <div className="flex items-center space-x-3">
                                <label className="text-sm font-medium text-slate-700">Payroll Period:</label>
                                <select 
                                    className="border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl text-sm shadow-xs py-2 px-3 text-slate-900"
                                    value={selectedPeriodId || ''}
                                    onChange={handlePeriodChange}
                                >
                                    {periods.length === 0 && <option value="">No periods available</option>}
                                    {periods.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <PrimaryButton 
                                onClick={() => setShowGenerate(!showGenerate)}
                            >
                                {showGenerate ? 'Close Form' : 'Generate Payroll'}
                            </PrimaryButton>
                        </div>

                        {showGenerate && (
                            <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h3 className="text-base font-semibold text-slate-900 mb-4">Generate New Payroll</h3>
                                <form onSubmit={submitGenerate} className="flex flex-wrap items-end gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Month</label>
                                        <select 
                                            value={data.month} 
                                            onChange={e => setData('month', parseInt(e.target.value))}
                                            className="border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl text-sm shadow-xs w-36 py-2 px-3 text-slate-900"
                                        >
                                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Year</label>
                                        <input 
                                            type="number" 
                                            value={data.year} 
                                            onChange={e => setData('year', parseInt(e.target.value))}
                                            className="border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl text-sm shadow-xs w-32 py-2 px-3 text-slate-900"
                                            min="2020" max="2099"
                                        />
                                    </div>
                                    <PrimaryButton 
                                        type="submit" 
                                        disabled={processing}
                                    >
                                        {processing ? 'Processing...' : 'Run Calculation'}
                                    </PrimaryButton>
                                </form>
                                {errors.month && <p className="text-red-600 text-xs mt-2">{errors.month}</p>}
                                {errors.year && <p className="text-red-600 text-xs mt-2">{errors.year}</p>}
                            </div>
                        )}

                        {payrolls && payrolls.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Base Salary</th>
                                            <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Allowances</th>
                                            <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Deductions</th>
                                            <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Net Salary</th>
                                            <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {payrolls.map((pr: any) => (
                                            <tr key={pr.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-slate-900">{pr.employee?.user?.name}</div>
                                                    <div className="text-xs text-slate-500">{pr.employee?.department?.name || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-600 tabular-nums">
                                                    Rp {Number(pr.base_salary).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-600 font-medium tabular-nums">
                                                    + Rp {Number(pr.total_allowance).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium tabular-nums">
                                                    - Rp {Number(pr.total_deduction).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-900 tabular-nums">
                                                    Rp {Number(pr.net_salary).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                    <Link 
                                                        href={route('payroll.show', pr.id)} 
                                                        className="inline-flex items-center text-xs font-semibold text-[#E31B23] hover:text-[#c4141b] bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        View Slip
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500 text-sm">
                                {selectedPeriodId ? 'No payroll generated for this period yet.' : 'Please select or generate a payroll period.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
