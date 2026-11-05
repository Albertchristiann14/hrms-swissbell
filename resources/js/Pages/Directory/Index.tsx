import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';

export default function DirectoryIndex({ employees = [], departments = [], filters = {} }: any) {
    const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingSearchRef = React.useRef<string | null>(null);
    const latestFiltersRef = React.useRef(filters);
    latestFiltersRef.current = filters;

    const flushSearch = React.useCallback(() => {
        searchTimeoutRef.current = null;
        if (document.visibilityState !== 'visible' || pendingSearchRef.current === null) return;

        const search = pendingSearchRef.current;
        pendingSearchRef.current = null;
        router.get(
            route('directory.index'),
            { ...latestFiltersRef.current, search },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    }, []);

    const scheduleSearch = React.useCallback(() => {
        if (searchTimeoutRef.current !== null) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
        if (document.visibilityState === 'visible' && pendingSearchRef.current !== null) {
            searchTimeoutRef.current = setTimeout(flushSearch, 300);
        }
    }, [flushSearch]);

    React.useEffect(() => {
        const onVisibilityChange = () => scheduleSearch();
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (searchTimeoutRef.current !== null) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
            pendingSearchRef.current = null;
        };
    }, [scheduleSearch]);

    const handleSearch = (e: any) => {
        pendingSearchRef.current = e.target.value;
        scheduleSearch();
    };

    const handleDepartmentChange = (e: any) => {
        if (searchTimeoutRef.current !== null) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
        const search = pendingSearchRef.current ?? filters.search;
        pendingSearchRef.current = null;
        router.get(route('directory.index'), { ...filters, search, department_id: e.target.value }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const employeeList = Array.isArray(employees) ? employees : (employees?.data || []);
    const deptList = Array.isArray(departments) 
        ? departments 
        : (departments && typeof departments === 'object' && Array.isArray((departments as any).data) 
            ? (departments as any).data 
            : Object.values(departments || {}));

    return (
        <AuthenticatedLayout
            header={<h2 className="font-bold text-xl text-slate-900 tracking-tight">Swiss-Belinn Staff Directory</h2>}
        >
            <Head title="Staff Directory" />

            <div className="w-full">
                <div className="w-full space-y-4">
                    
                    {/* Filter & Search Bar */}
                    <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 max-w-md relative">
                            <input 
                                type="text"
                                placeholder="Search employee name, ID number, email..."
                                className="w-full rounded-xl border-slate-300 shadow-xs text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] pl-10 py-2.5"
                                defaultValue={filters?.search || ''}
                                onChange={handleSearch}
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="w-full md:w-64">
                            <select 
                                className="w-full rounded-xl border-slate-300 shadow-xs text-sm text-slate-900 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2.5 px-3"
                                defaultValue={filters?.department_id || ''}
                                onChange={handleDepartmentChange}
                            >
                                <option value="">All Departments</option>
                                {deptList.map((dept: any) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Employee Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {employeeList.map((employee: any) => (
                            <div key={employee.id} className="bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col">
                                <div className="h-24 bg-gradient-to-r from-[#E31B23] via-[#c4141b] to-[#991b1b]"></div>
                                <div className="px-6 pb-6 relative flex-grow flex flex-col items-center text-center">
                                    <div className="h-20 w-20 rounded-full bg-white p-1 absolute -top-10 shadow-sm border-2 border-white">
                                        <div className="h-full w-full rounded-full overflow-hidden flex items-center justify-center bg-slate-100">
                                            <img src={employee.user?.profile_photo_url} alt={employee.user?.name} className="h-full w-full object-cover" />
                                        </div>
                                    </div>
                                    <div className="mt-12">
                                        <h3 className="text-base font-bold text-slate-900">{employee.user?.name || employee.employee_number}</h3>
                                        <p className="text-xs font-semibold text-[#E31B23] mt-0.5">{employee.user?.roles?.[0]?.name || 'Employee'}</p>
                                        <p className="text-xs text-slate-500 mt-1">{employee.department?.name || 'No Department Assigned'}</p>
                                    </div>
                                    
                                    <div className="mt-6 w-full space-y-2.5 pt-4 border-t border-slate-100">
                                        <div className="flex items-center text-xs text-slate-600 justify-center">
                                            <svg className="w-4 h-4 mr-2 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <a href={`mailto:${employee.user?.email}`} className="hover:text-[#E31B23] truncate transition-colors">{employee.user?.email}</a>
                                        </div>
                                        <div className="flex items-center text-xs text-slate-600 justify-center">
                                            <svg className="w-4 h-4 mr-2 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <a href={`tel:${employee.user?.phone_number || employee.phone_number}`} className="hover:text-[#E31B23] truncate transition-colors">{employee.user?.phone_number || employee.phone_number || '-'}</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {employeeList.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl shadow-xs border border-slate-200">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-semibold text-slate-900">No employees found</h3>
                            <p className="mt-1 text-xs text-slate-500">Try adjusting your search query or department filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
