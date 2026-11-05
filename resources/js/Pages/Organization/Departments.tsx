import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/Badge';

export default function Departments({ auth, departments = [] }: PageProps<{ departments: any[] }>) {
    const deptList = Array.isArray(departments) 
        ? departments 
        : (departments && typeof departments === 'object' && Array.isArray((departments as any).data) 
            ? (departments as any).data 
            : Object.values(departments || {}));

    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState<any>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset } = useForm({
        name: '',
        description: '',
    });

    const openCreateModal = () => {
        setEditingDept(null);
        reset();
        setShowModal(true);
    };

    const openEditModal = (dept: any) => {
        setEditingDept(dept);
        setData({ name: dept.name, description: dept.description || '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDept) {
            put(route('departments.update', editingDept.id), { onSuccess: () => closeModal() });
        } else {
            post(route('departments.store'), { onSuccess: () => closeModal() });
        }
    };

    const deleteDepartment = (dept: any) => {
        if (dept.employees_count > 0) {
            alert('Cannot delete a department that has employees.');
            return;
        }
        if (confirm(`Are you sure you want to delete "${dept.name}"?`)) {
            destroy(route('departments.destroy', dept.id));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-slate-800 leading-tight">Departments</h2>
                    <PrimaryButton onClick={openCreateModal}>
                        + New Department
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Departments" />

            <div className="w-full">
                <div className="w-full">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200">
                        <div className="p-4 sm:p-5 text-slate-900 overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3.5 text-center font-semibold text-slate-600 uppercase tracking-wider">Employees</th>
                                        <th className="px-6 py-3.5 text-right font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {deptList.map((dept: any) => (
                                        <tr key={dept.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{dept.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{dept.description || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <Badge variant="neutral">
                                                    {dept.employees_count} staff
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                <button onClick={() => openEditModal(dept)} className="text-[#E31B23] hover:text-[#c4141b] font-semibold transition-colors">Edit</button>
                                                <button onClick={() => deleteDepartment(dept)} className={`text-slate-400 hover:text-red-600 font-semibold transition-colors ${dept.employees_count > 0 ? 'opacity-40 cursor-not-allowed' : ''}`} disabled={dept.employees_count > 0}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {deptList.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">No departments found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed z-50 inset-0 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>
                        <div className="relative inline-block bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-slate-200">
                            <form onSubmit={submit}>
                                <div className="bg-white px-6 pt-6 pb-4 sm:p-6">
                                    <h3 className="text-base font-bold text-slate-900 mb-4">{editingDept ? 'Edit Department' : 'Create Department'}</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Name <span className="text-red-500">*</span></label>
                                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] text-sm" required />
                                            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                                            <textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={3} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] text-sm" />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 px-6 py-3.5 flex justify-end gap-3 border-t border-slate-100">
                                    <SecondaryButton type="button" onClick={closeModal}>Cancel</SecondaryButton>
                                    <PrimaryButton type="submit" disabled={processing}>{processing ? 'Saving...' : 'Save Department'}</PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
