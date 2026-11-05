import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Badge from '@/Components/Badge';

export default function AuditLogs({ auth, logs, filters }: PageProps<{ logs: any, filters: any }>) {
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.get(route('audit-logs.index'), { ...filters, search: e.target.value }, { preserveState: true, replace: true });
    };

    const handleActionFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.get(route('audit-logs.index'), { ...filters, action: e.target.value }, { preserveState: true, replace: true });
    };

    const getActionVariant = (action: string) => {
        switch (action) {
            case 'created': return 'success';
            case 'updated': return 'info';
            case 'deleted': return 'danger';
            default: return 'neutral';
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-slate-800 leading-tight">Audit Logs</h2>}
        >
            <Head title="Audit Logs" />

            <div className="w-full">
                <div className="w-full space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-72">
                            <input
                                type="text"
                                placeholder="Search logs..."
                                defaultValue={filters.search}
                                onChange={handleSearch}
                                className="w-full text-xs pl-8 pr-3 py-2 border-slate-300 rounded-xl shadow-xs focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] text-slate-900"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <select 
                            onChange={handleActionFilter} 
                            defaultValue={filters.action || ''} 
                            className="text-xs border-slate-300 rounded-xl shadow-xs py-2 px-3 focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23] text-slate-900"
                        >
                            <option value="">All Actions</option>
                            <option value="created">Created</option>
                            <option value="updated">Updated</option>
                            <option value="deleted">Deleted</option>
                        </select>
                    </div>

                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200">
                        <div className="p-4 sm:p-5 text-slate-900 overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider">Timestamp</th>
                                        <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                                        <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase tracking-wider">IP Address</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {logs.data.map((log: any) => (
                                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-500 tabular-nums">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap font-semibold text-slate-900">
                                                {log.user?.name || 'System'}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <Badge variant={getActionVariant(log.action)} dot>
                                                    {log.action}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-3.5 text-slate-600 max-w-md truncate">
                                                {log.description}
                                            </td>
                                            <td className="px-6 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                                                {log.ip_address}
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.data.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">No audit logs found.</td></tr>
                                    )}
                                </tbody>
                            </table>

                            {logs.last_page > 1 && (
                                <div className="mt-6 flex justify-center gap-1.5 pt-4 border-t border-slate-100">
                                    {logs.links.map((link: any, i: number) => (
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
