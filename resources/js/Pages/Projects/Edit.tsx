import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';

interface EditProps extends PageProps {
    project: any;
    employees: any[];
    departments: any[];
    projectStatuses?: any[];
}

const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    if (typeof dateStr === 'string') {
        return dateStr.split('T')[0];
    }
    return '';
};

export default function Edit({
    auth,
    project,
    employees,
    departments = [],
    projectStatuses,
}: EditProps) {
    const deptList = Array.isArray(departments) ? departments : Object.values(departments || {});
    const { data, setData, put, processing, errors } = useForm({
        name: project?.name || '',
        description: project?.description || '',
        status: project?.status || 'Planning',
        owner_id: project?.owner_id ? String(project.owner_id) : '',
        department_id: project?.department_id ? String(project.department_id) : '',
        start_date: formatDate(project?.start_date),
        deadline: formatDate(project?.deadline),
    });

    const availableStatuses = projectStatuses?.length
        ? projectStatuses.map((s) => (typeof s === 'string' ? s : s.value || s.name))
        : ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled', 'Archived'];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('projects.update', project.id));
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete project "${project.name}"? All tasks inside it will be permanently deleted.`)) {
            router.delete(route('projects.destroy', project.id));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-xl text-gray-800 leading-tight">Edit Project</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Edit information for project {project.name}</p>
                    </div>
                    <Link
                        href={route('projects.show', project.id)}
                        className="text-sm font-semibold text-slate-600 hover:text-[#E31B23] px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                    >
                        &larr; Back to Project
                    </Link>
                </div>
            }
        >
            <Head title={`Edit Project - ${project.name}`} />

            <div className="w-full">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200 p-6 sm:p-8">
                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Project Name <span className="text-[#E31B23]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    placeholder="Project name..."
                                    required
                                />
                                {errors.name && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.name}</div>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Project Status <span className="text-[#E31B23]">*</span>
                                    </label>
                                    <select
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                        required
                                    >
                                        {availableStatuses.map((st) => (
                                            <option key={st} value={st}>
                                                {st}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.status && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.status}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Department / Division
                                    </label>
                                    <select
                                        value={data.department_id}
                                        onChange={(e) => setData('department_id', e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    >
                                        <option value="">Select Department</option>
                                        {deptList.map((dept: any) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.department_id && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.department_id}</div>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Project Owner / PIC
                                </label>
                                <select
                                    value={data.owner_id}
                                    onChange={(e) => setData('owner_id', e.target.value)}
                                    className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                >
                                    <option value="">Select PIC / Owner</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.user?.name || emp.employee_number} {emp.department?.name ? `(${emp.department.name})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.owner_id && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.owner_id}</div>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    />
                                    {errors.start_date && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.start_date}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Deadline
                                    </label>
                                    <input
                                        type="date"
                                        value={data.deadline}
                                        onChange={(e) => setData('deadline', e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    />
                                    {errors.deadline && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.deadline}</div>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Project Description
                                </label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    rows={4}
                                    placeholder="Detailed description of the project..."
                                    className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                />
                                {errors.description && <div className="text-rose-600 text-xs mt-1 font-medium">{errors.description}</div>}
                            </div>

                            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="text-sm text-rose-600 hover:text-rose-800 font-semibold px-4 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 transition-colors inline-flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Project
                                </button>
                                <div className="flex items-center gap-3">
                                    <Link
                                        href={route('projects.show', project.id)}
                                        className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white font-semibold py-2 px-6 rounded-xl text-sm shadow-xs transition-colors disabled:opacity-50"
                                    >
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
