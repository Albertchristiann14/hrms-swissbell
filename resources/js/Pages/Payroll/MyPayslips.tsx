import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import Badge from '@/Components/Badge';

export default function MyPayslips({ payrolls }: any) {
    const openedFromHr = new URLSearchParams(usePage().url.split('?')[1] || '').get('source') === 'hr';

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <nav className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500" aria-label="Breadcrumb">
                        <Link href={route('dashboard', { view: openedFromHr ? 'hr' : 'overview' })} className="hover:text-[#E31B23]">
                            {openedFromHr ? 'Human Resources' : 'My Workspace'}
                        </Link>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-800">My Payslips</span>
                    </nav>
                    <h2 className="font-bold text-xl text-slate-900 leading-tight">My Payslips</h2>
                </div>
            }
        >
            <Head title="My Payslips" />

            <div className="w-full">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200 p-6">
                        
                        {payrolls && payrolls.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {payrolls.map((pr: any) => (
                                    <div key={pr.id} className="border border-slate-200 rounded-2xl shadow-xs hover:shadow-md transition-shadow bg-white flex flex-col overflow-hidden">
                                        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
                                            <div>
                                                <h3 className="font-bold text-slate-900">{pr.period?.name}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">Monthly Slip</p>
                                            </div>
                                            <Badge variant={pr.status === 'Paid' ? 'success' : 'warning'} dot>
                                                {pr.status}
                                            </Badge>
                                        </div>
                                        <div className="p-5 flex-grow">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-slate-500">Take Home Pay</span>
                                                <span className="font-bold text-slate-900 tabular-nums">Rp {Number(pr.net_salary).toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-center">
                                            <Link 
                                                href={route('payroll.show', { id: pr.id, source: openedFromHr ? 'hr' : 'my-workspace' })}
                                                className="text-[#E31B23] hover:text-[#c4141b] font-semibold text-sm inline-flex items-center gap-1 group"
                                            >
                                                <span>View Details</span>
                                                <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm">
                                You don't have any payslips available yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
