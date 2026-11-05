import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import SecondaryButton from '@/Components/SecondaryButton';

export default function Payslip({ payroll }: any) {
    const earnings = payroll.items.filter((i: any) => i.type === 'Earnings');
    const deductions = payroll.items.filter((i: any) => i.type === 'Deduction');
    const currentUrl = usePage().url;
    const navigationSource = new URLSearchParams(currentUrl.split('?')[1] || '').get('source');
    const fromWorkspace = navigationSource === 'my-workspace';
    const fromHr = navigationSource === 'hr';

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                        {(fromWorkspace || fromHr) && (
                            <nav className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500" aria-label="Breadcrumb">
                                <Link href={route('dashboard', { view: fromHr ? 'hr' : 'overview' })} className="hover:text-[#E31B23]">
                                    {fromHr ? 'Human Resources' : 'My Workspace'}
                                </Link>
                                <span className="text-slate-300">/</span>
                                <Link href={fromHr ? route('payroll.my', { source: 'hr' }) : route('payroll.my')} className="hover:text-[#E31B23]">My Payslips</Link>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-800">Details</span>
                            </nav>
                        )}
                        <h2 className="font-semibold text-xl text-slate-800 leading-tight">Payslip: {payroll.period?.name}</h2>
                    </div>
                    <SecondaryButton 
                        onClick={() => window.print()}
                    >
                        Print Slip
                    </SecondaryButton>
                </div>
            }
        >
            <Head title="Payslip" />

            <div className="py-2">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200 p-8 print:shadow-none print:p-0 print:border-none">
                        
                        <div className="text-center mb-8 border-b border-slate-200 pb-6">
                            <span className="text-xs font-bold uppercase tracking-widest text-[#E31B23]">Official Document</span>
                            <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest mt-1">Swiss-Belinn SKA Pekanbaru</h1>
                            <p className="text-slate-500 text-sm mt-1">Salary Slip - {payroll.period?.name}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8 p-5 bg-slate-50/70 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee Name</p>
                                <p className="font-semibold text-slate-900 text-sm">{payroll.employee?.user?.name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID</p>
                                <p className="font-semibold text-slate-900 text-sm">{payroll.employee?.employee_number}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</p>
                                <p className="font-semibold text-slate-900 text-sm">{payroll.employee?.department?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Position / Role</p>
                                <p className="font-semibold text-slate-900 text-sm">{payroll.employee?.user?.roles?.[0]?.name || '-'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            {/* Earnings */}
                            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/40">
                                <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2 flex items-center justify-between">
                                    <span>Earnings</span>
                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Penerimaan</span>
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Base Salary</span>
                                        <span className="font-semibold text-slate-900 tabular-nums">Rp {Number(payroll.base_salary).toLocaleString('id-ID')}</span>
                                    </div>
                                    {earnings.map((item: any) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="text-slate-600">{item.name}</span>
                                            <span className="font-semibold text-slate-900 tabular-nums">Rp {Number(item.amount).toLocaleString('id-ID')}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between font-bold text-emerald-700">
                                    <span>Total Earnings</span>
                                    <span className="tabular-nums">Rp {(Number(payroll.base_salary) + Number(payroll.total_allowance)).toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/40">
                                <h3 className="text-base font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2 flex items-center justify-between">
                                    <span>Deductions</span>
                                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">Potongan</span>
                                </h3>
                                <div className="space-y-3">
                                    {deductions.length === 0 ? (
                                        <div className="text-sm text-slate-500 italic">No deductions</div>
                                    ) : (
                                        deductions.map((item: any) => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-slate-600">{item.name}</span>
                                                <span className="font-semibold text-red-600 tabular-nums">- Rp {Number(item.amount).toLocaleString('id-ID')}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="mt-6 pt-3 border-t border-slate-200 flex justify-between font-bold text-red-700">
                                    <span>Total Deductions</span>
                                    <span className="tabular-nums">Rp {Number(payroll.total_deduction).toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Pay */}
                        <div className="bg-red-50/60 border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:bg-white print:border-slate-300">
                            <div>
                                <h3 className="text-xs font-bold text-[#E31B23] uppercase tracking-wider mb-1 print:text-slate-900">Net Salary (Take Home Pay)</h3>
                                <p className="text-xs text-slate-600 print:text-slate-500">Total Earnings minus Total Deductions</p>
                            </div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-[#E31B23] print:text-slate-900 tabular-nums">
                                Rp {Number(payroll.net_salary).toLocaleString('id-ID')}
                            </div>
                        </div>

                        <div className="mt-12 pt-8 grid grid-cols-2 gap-8 text-center text-sm">
                            <div>
                                <p className="mb-16 text-slate-600">Prepared By (HR Dept)</p>
                                <p className="font-semibold border-b border-slate-400 inline-block px-8 pb-1 text-slate-900">_________________________</p>
                            </div>
                            <div>
                                <p className="mb-16 text-slate-600">Received By (Employee)</p>
                                <p className="font-semibold border-b border-slate-400 inline-block px-8 pb-1 text-slate-900">{payroll.employee?.user?.name}</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
