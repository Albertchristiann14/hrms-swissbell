import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/Badge';

export default function PerformanceAssess({ employee, period, assessment }: any) {
    const { data, setData, post, processing, errors } = useForm({
        work_quality: assessment?.work_quality || 3,
        accuracy: assessment?.accuracy || 3,
        responsibility: assessment?.responsibility || 3,
        communication: assessment?.communication || 3,
        notes: assessment?.notes || ''
    });

    const submit = (e: any) => {
        e.preventDefault();
        post(route('performance.storeAssessment', [employee.id, period.id]));
    };

    const renderSlider = (name: string, label: string) => (
        <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-medium text-slate-700">{label}</label>
                <span className="text-2xl font-bold text-[#E31B23]">{(data as any)[name]}</span>
            </div>
            <input 
                type="range" 
                min="1" 
                max="5" 
                step="1"
                value={(data as any)[name]}
                onChange={e => setData(name as any, parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#E31B23]"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
                <span>Poor (1)</span>
                <span>Fair (2)</span>
                <span>Good (3)</span>
                <span>Very Good (4)</span>
                <span>Excellent (5)</span>
            </div>
            {errors[name as keyof typeof errors] && <div className="text-red-500 text-xs mt-1">{errors[name as keyof typeof errors]}</div>}
        </div>
    );

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-slate-800 leading-tight">
                        Supervisor Assessment
                    </h2>
                    <Link href={route('performance.show', [employee.id, period.id])} className="text-sm text-[#E31B23] hover:text-[#c4141b] font-medium">
                        &larr; Back to Detail
                    </Link>
                </div>
            }
        >
            <Head title="Supervisor Assessment" />

            <div className="w-full">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200">
                        <div className="p-6 bg-white">
                            
                            <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">{employee.user.name}</h3>
                                    <p className="text-sm text-slate-500">{employee.department?.name} &bull; {employee.position?.title}</p>
                                </div>
                                <div className="text-right">
                                    <Badge variant="brand">
                                        Period: {period.name}
                                    </Badge>
                                </div>
                            </div>

                            <form onSubmit={submit}>
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6">
                                    <h4 className="font-semibold text-slate-800 mb-6 text-center">Rate Employee Performance (1 - 5)</h4>
                                    
                                    {renderSlider('work_quality', 'Work Quality')}
                                    {renderSlider('accuracy', 'Accuracy & Precision')}
                                    {renderSlider('responsibility', 'Responsibility & Ownership')}
                                    {renderSlider('communication', 'Communication & Teamwork')}
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Supervisor Notes (Optional)</label>
                                    <textarea
                                        className="w-full border-slate-300 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] rounded-xl shadow-xs text-sm"
                                        rows={4}
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        placeholder="Add any specific comments about the employee's performance in this period..."
                                    ></textarea>
                                    {errors.notes && <div className="text-red-500 text-xs mt-1">{errors.notes}</div>}
                                </div>

                                <div className="flex justify-end items-center gap-3">
                                    <Link 
                                        href={route('performance.show', [employee.id, period.id])} 
                                        className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs text-slate-700 uppercase tracking-widest shadow-xs hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#E31B23] focus:ring-offset-2 transition ease-in-out duration-150"
                                    >
                                        Cancel
                                    </Link>
                                    <PrimaryButton 
                                        type="submit" 
                                        disabled={processing}
                                    >
                                        Save Assessment & Calculate EPI
                                    </PrimaryButton>
                                </div>
                            </form>
                            
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
