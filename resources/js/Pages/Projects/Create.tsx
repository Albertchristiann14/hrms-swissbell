import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Create({ auth, employees, departments = [] }: PageProps<{ employees: any[], departments: any[] }>) {
    const deptList = Array.isArray(departments) ? departments : Object.values(departments || {});
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        owner_id: '',
        department_id: '',
        start_date: '',
        deadline: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('projects.store'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Create Project</h2>}
        >
            <Head title="Create Project" />

            <div className="w-full">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200 p-6 sm:p-8">
                        <form onSubmit={submit}>
                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Project Name</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Enter project name..."
                                    className="block w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                />
                                {errors.name && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.name}</div>}
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="Project objectives, scope, or background..."
                                    className="block w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    rows={4}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                                    <select
                                        value={data.department_id}
                                        onChange={e => setData('department_id', e.target.value)}
                                        className="block w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    >
                                        <option value="">Select Department</option>
                                        {deptList.map((dept: any) => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Project Owner / PIC</label>
                                    <select
                                        value={data.owner_id}
                                        onChange={e => setData('owner_id', e.target.value)}
                                        className="block w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    >
                                        <option value="">Select Owner</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.user?.name || emp.employee_number}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={data.start_date}
                                        onChange={e => setData('start_date', e.target.value)}
                                        className="block w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Deadline</label>
                                    <input
                                        type="date"
                                        value={data.deadline}
                                        onChange={e => setData('deadline', e.target.value)}
                                        className="block w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white font-semibold py-2.5 px-6 rounded-xl text-sm shadow-xs transition-colors disabled:opacity-50"
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
