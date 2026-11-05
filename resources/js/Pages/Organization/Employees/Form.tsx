import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { PageProps } from '@/types';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

export default function EmployeeForm({ auth, employee, currentRole, departments, positions, roles, supervisors, suggestedEmployeeNumber }: PageProps<{
    employee?: any,
    currentRole?: string,
    departments: any[],
    positions: any[],
    roles: string[],
    supervisors: { id: number, name: string }[],
    suggestedEmployeeNumber?: string,
}>) {
    const isEditing = !!employee;
    const deptList = Array.isArray(departments) ? departments : Object.values(departments || {});
    const posList = Array.isArray(positions) ? positions : Object.values(positions || {});
    const supList = Array.isArray(supervisors) ? supervisors : Object.values(supervisors || {});

    const { data, setData, post, put, processing, errors } = useForm({
        name: employee?.user?.name || '',
        email: employee?.user?.email || '',
        password: '',
        employee_number: employee?.employee_number || suggestedEmployeeNumber || '',
        phone_number: employee?.phone_number || '',
        department_id: employee?.department_id?.toString() || '',
        position_id: employee?.position_id?.toString() || '',
        supervisor_id: employee?.supervisor_id?.toString() || '',
        join_date: employee?.join_date || '',
        employment_status: employee?.employment_status || 'Active',
        role: currentRole || 'Staff / Employee',
    });

    const availablePositions = posList.filter((position: any) =>
        data.department_id !== '' && String(position.department_id) === data.department_id
    );

    const changeDepartment = (departmentId: string) => {
        // Positions are department-specific. Clear a stale position when changing department.
        setData(previous => ({
            ...previous,
            department_id: departmentId,
            position_id: previous.position_id && posList.some((position: any) =>
                String(position.id) === previous.position_id && String(position.department_id) === departmentId
            ) ? previous.position_id : '',
        }));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            put(route('employees.update', employee.id));
        } else {
            post(route('employees.store'));
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center gap-4">
                    <Link href={route('employees.index')} className="text-sm font-semibold text-[#E31B23] hover:text-[#c4141b] transition-colors">
                        ← Back to List
                    </Link>
                    <h2 className="font-semibold text-xl text-slate-800 leading-tight">
                        {isEditing ? `Edit: ${employee.user?.name}` : 'New Employee'}
                    </h2>
                </div>
            }
        >
            <Head title={isEditing ? `Edit ${employee.user?.name}` : 'New Employee'} />

            <div className="w-full">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200">
                        <form onSubmit={submit} className="p-6 sm:p-8 space-y-6">
                            {/* Account Info */}
                            <div>
                                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Account Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Full Name <span className="text-red-500">*</span></label>
                                        <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]" required />
                                        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Email <span className="text-red-500">*</span></label>
                                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]" required />
                                        {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                            Password {isEditing ? '(leave blank to keep current)' : <span className="text-red-500">*</span>}
                                        </label>
                                        <input type="password" value={data.password} onChange={e => setData('password', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]" required={!isEditing} />
                                        {errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Role <span className="text-red-500">*</span></label>
                                        <select value={data.role} onChange={e => setData('role', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]" required>
                                            {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        {errors.role && <p className="text-red-600 text-xs mt-1">{errors.role}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Employee Info */}
                            <div>
                                <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Employee Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Employee Number <span className="text-red-500">*</span></label>
                                        <input type="text" value={data.employee_number} readOnly className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] bg-slate-100 cursor-not-allowed text-slate-600 font-mono" required />
                                        {errors.employee_number && <p className="text-red-600 text-xs mt-1">{errors.employee_number}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                                        <input type="text" value={data.phone_number} onChange={e => setData('phone_number', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Department</label>
                                        <select value={data.department_id} onChange={e => changeDepartment(e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]">
                                            <option value="">-- Select Department --</option>
                                            {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Position</label>
                                        <select value={data.position_id} onChange={e => setData('position_id', e.target.value)} disabled={!data.department_id} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] disabled:bg-slate-100 disabled:cursor-not-allowed">
                                            <option value="">{data.department_id ? '-- Select Position --' : '-- Choose Department First --'}</option>
                                            {availablePositions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        {errors.position_id && <p className="text-red-600 text-xs mt-1">{errors.position_id}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Supervisor</label>
                                        <select value={data.supervisor_id} onChange={e => setData('supervisor_id', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]">
                                            <option value="">-- No Supervisor --</option>
                                            {supList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Join Date</label>
                                        <input type="date" value={data.join_date} onChange={e => setData('join_date', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Employment Status <span className="text-red-500">*</span></label>
                                        <select value={data.employment_status} onChange={e => setData('employment_status', e.target.value)} className="mt-1 block w-full border-slate-300 rounded-xl shadow-xs text-sm focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]" required>
                                            <option value="Active">Active</option>
                                            <option value="Resigned">Resigned</option>
                                            <option value="On Leave">On Leave</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                                <Link 
                                    href={route('employees.index')} 
                                    className="inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-xs text-slate-700 uppercase tracking-widest shadow-xs hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </Link>
                                <PrimaryButton type="submit" disabled={processing}>
                                    {processing ? 'Saving...' : (isEditing ? 'Update Employee' : 'Create Employee')}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
