import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Settings({ auth }: PageProps) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-slate-800 leading-tight">System Settings</h2>}
        >
            <Head title="Settings" />

            <div className="w-full">
                <div className="w-full">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200">
                        <div className="p-6 text-slate-900 space-y-8">
                            {/* Application Info */}
                            <div>
                                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Application Info</h3>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Application Name</dt>
                                        <dd className="mt-1 text-sm font-bold text-slate-900">Swiss-Belinn Hotel Management System</dd>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization</dt>
                                        <dd className="mt-1 text-sm font-bold text-slate-900">Swiss-Belinn SKA Pekanbaru</dd>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Developer Team</dt>
                                        <dd className="mt-1 text-sm font-bold text-[#E31B23]">Stackbit</dd>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Version</dt>
                                        <dd className="mt-1 text-sm font-bold text-slate-900">1.0.0</dd>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Environment</dt>
                                        <dd className="mt-1 text-sm font-bold text-emerald-600">Production Ready</dd>
                                    </div>
                                </dl>
                            </div>

                            {/* Performance Settings */}
                            <div>
                                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2">EPI Configuration</h3>
                                <p className="text-xs text-slate-500 mb-4">Employee Performance Index formula weights. These values are used to calculate the overall EPI score.</p>
                                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">Completion Rate Weight</span>
                                        <span className="text-sm text-[#E31B23] font-bold tabular-nums">30%</span>
                                    </div>
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">On-Time Rate Weight</span>
                                        <span className="text-sm text-[#E31B23] font-bold tabular-nums">25%</span>
                                    </div>
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">Task Weight Score</span>
                                        <span className="text-sm text-[#E31B23] font-bold tabular-nums">15%</span>
                                    </div>
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">Supervisor Assessment</span>
                                        <span className="text-sm text-[#E31B23] font-bold tabular-nums">30%</span>
                                    </div>
                                </dl>
                            </div>

                            {/* Priority Weights */}
                            <div>
                                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Task Priority Weights</h3>
                                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">Low</span>
                                        <span className="text-sm text-slate-600 font-bold tabular-nums">1</span>
                                    </div>
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">Normal</span>
                                        <span className="text-sm text-sky-600 font-bold tabular-nums">2</span>
                                    </div>
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">High</span>
                                        <span className="text-sm text-amber-600 font-bold tabular-nums">3</span>
                                    </div>
                                    <div className="flex justify-between items-center border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
                                        <span className="text-sm font-medium text-slate-700">Urgent</span>
                                        <span className="text-sm text-red-600 font-bold tabular-nums">4</span>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
