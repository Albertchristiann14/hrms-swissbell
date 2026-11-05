import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Badge from '@/Components/Badge';

const sortableHeaders = [
    { key: 'employee', label: 'Employee' },
    { key: 'id', label: 'ID' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'status', label: 'Status' },
    { key: 'join_date', label: 'Join Date' },
] as const;

type SortKey = (typeof sortableHeaders)[number]['key'];

export default function EmployeesIndex({ auth, employees, departments = [], filters = {} }: PageProps<{ employees: any, departments: any[], filters: any }>) {
    const deptList = Array.isArray(departments) 
        ? departments 
        : (departments && typeof departments === 'object' && Array.isArray((departments as any).data) 
            ? (departments as any).data 
            : Object.values(departments || {}));

    const activeSort = (filters?.sort || '') as SortKey | '';
    const activeDirection = filters?.direction === 'desc' ? 'desc' : 'asc';

    const handleSort = (column: SortKey) => {
        const nextFilters = { ...filters };
        delete nextFilters.page;

        if (activeSort !== column) {
            nextFilters.sort = column;
            nextFilters.direction = 'asc';
        } else if (activeDirection === 'asc') {
            nextFilters.direction = 'desc';
        } else {
            // Third click: restore the default server order.
            delete nextFilters.sort;
            delete nextFilters.direction;
        }

        router.get(route('employees.index'), nextFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const getSortHint = (column: SortKey, label: string) => {
        if (activeSort !== column) return `Sort ${label}: A–Z / oldest first`;
        if (activeDirection === 'asc') return `Sort ${label}: Z–A / newest first`;
        return `Restore default order for ${label}`;
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.get(route('employees.index'), { ...filters, search: e.target.value }, { preserveState: true, replace: true });
    };

    const handleDeptFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.get(route('employees.index'), { ...filters, department: e.target.value }, { preserveState: true, replace: true });
    };

    const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.get(route('employees.index'), { ...filters, status: e.target.value }, { preserveState: true, replace: true });
    };

    const deleteEmployee = (emp: any) => {
        if (confirm(`Are you sure you want to delete ${emp.user?.name}?`)) {
            router.delete(route('employees.destroy', emp.id));
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'Active': return 'success';
            case 'Resigned': return 'danger';
            case 'On Leave': return 'warning';
            default: return 'neutral';
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-slate-800 leading-tight">Employees</h2>
                    <Link 
                        href={route('employees.create')} 
                        className="inline-flex items-center px-4 py-2 bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white font-semibold text-xs uppercase tracking-widest rounded-xl transition-colors shadow-xs"
                    >
                        + New Employee
                    </Link>
                </div>
            }
        >
            <Head title="Employees" />

            <div className="w-full">
                <div className="w-full space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-72">
                            <input
                                type="text"
                                placeholder="Search by name, email, or ID..."
                                defaultValue={filters?.search || ''}
                                onChange={handleSearch}
                                className="w-full text-xs pl-8 pr-3 py-2 border-slate-300 rounded-xl shadow-xs focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] text-slate-900"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="relative min-w-[158px]">
                            <select
                                aria-label="Filter by department"
                                onChange={handleDeptFilter}
                                value={filters?.department || ''}
                                className="w-full appearance-none text-xs border-slate-300 rounded-xl shadow-xs py-2 pl-3 pr-9 focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] text-slate-900"
                            >
                                <option value="">All Departments</option>
                                {deptList.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                        </div>
                        <div className="relative min-w-[130px]">
                            <select
                                aria-label="Filter by employment status"
                                onChange={handleStatusFilter}
                                value={filters?.status || ''}
                                className="w-full appearance-none text-xs border-slate-300 rounded-xl shadow-xs py-2 pl-3 pr-9 focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] text-slate-900"
                            >
                                <option value="">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Resigned">Resigned</option>
                                <option value="On Leave">On Leave</option>
                            </select>
                            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                        </div>
                        <span className="ml-auto text-[11px] text-slate-500">Click a column title to sort · 3rd click resets</span>
                    </div>

                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200">
                        <div className="p-4 sm:p-5 text-slate-900 overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {sortableHeaders.map(({ key, label }) => (
                                            <th
                                                key={key}
                                                scope="col"
                                                aria-sort={activeSort === key ? (activeDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                                                className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => handleSort(key)}
                                                    title={getSortHint(key, label)}
                                                    aria-label={getSortHint(key, label)}
                                                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md transition-colors hover:text-[#E31B23] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E31B23] ${activeSort === key ? 'text-[#E31B23]' : ''}`}
                                                >
                                                    <span>{label}</span>
                                                    <span aria-hidden="true" className={`text-sm leading-none ${activeSort === key ? 'font-bold' : 'text-slate-400'}`}>
                                                        {activeSort === key ? (activeDirection === 'asc' ? '↑' : '↓') : '↕'}
                                                    </span>
                                                </button>
                                            </th>
                                        ))}
                                        <th className="px-6 py-3.5 text-right font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {(employees?.data || []).map((emp: any) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                                                        <span className="text-[#E31B23] font-bold text-sm">
                                                            {emp.user?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </span>
                                                    </div>
                                                    <div className="ml-3.5">
                                                        <div className="text-sm font-semibold text-slate-900">{emp.user?.name}</div>
                                                        <div className="text-xs text-slate-500">{emp.user?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-mono text-xs">{emp.employee_number}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">{emp.department?.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">{emp.position?.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={getStatusVariant(emp.employment_status)} dot>
                                                    {emp.employment_status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 tabular-nums">
                                                {emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                <Link href={route('employees.edit', emp.id)} className="text-[#E31B23] hover:text-[#c4141b] font-semibold transition-colors">Edit</Link>
                                                <button onClick={() => deleteEmployee(emp)} className="text-slate-400 hover:text-red-600 font-semibold transition-colors">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(employees?.data || []).length === 0 && (
                                        <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">No employees found.</td></tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {(employees?.last_page || 0) > 1 && (
                                <div className="mt-6 flex justify-center gap-1.5 pt-4 border-t border-slate-100">
                                    {(employees?.links || []).map((link: any, i: number) => (
                                        <Link
                                            key={i}
                                            href={link.url || '#'}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                link.active 
                                                    ? 'bg-[#E31B23] text-white shadow-xs' 
                                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
