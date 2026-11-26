import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    'Planning': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    'Active': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'On Hold': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    'Completed': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
    'Cancelled': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
    'Archived': { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
};

export default function Index({ projects, auth, filters }: any) {
    const activeStatus = filters?.status;
    const isAllSelected = !activeStatus || activeStatus === 'all';

    const handleArchive = (e: React.MouseEvent, projectId: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Archive this project? Archived projects will be hidden from the active list to prevent clutter.')) {
            router.post(route('projects.archive', projectId), {}, { preserveScroll: true });
        }
    };

    const handleRestore = (e: React.MouseEvent, projectId: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Restore this project back to Active status?')) {
            router.post(route('projects.restore', projectId), {}, { preserveScroll: true });
        }
    };

    const handleDelete = (e: React.MouseEvent, projectId: number, projectName: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete project "${projectName}"? All tasks inside it will be permanently deleted.`)) {
            router.delete(route('projects.destroy', projectId), { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between w-full gap-4">
                    <div className="min-w-0">
                        <h2 className="font-bold text-xl text-gray-900 truncate">Projects</h2>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">Manage and monitor all hotel projects</p>
                    </div>
                    <Link 
                        href={route('projects.create')} 
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all duration-150 flex-shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Project
                    </Link>
                </div>
            }
        >
            <Head title="Projects" />

            {/* Filter Tabs & Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 mb-4 pb-2 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                    <Link
                        href={route('projects.index', { status: 'all' })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isAllSelected
                                ? 'bg-white text-[#E31B23] shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                        }`}
                    >
                        All Projects
                    </Link>
                    <Link
                        href={route('projects.index', { status: 'Active' })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            activeStatus === 'Active'
                                ? 'bg-white text-emerald-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        Active
                    </Link>
                    <Link
                        href={route('projects.index', { status: 'Planning' })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            activeStatus === 'Planning'
                                ? 'bg-white text-sky-700 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        Planning
                    </Link>
                    <Link
                        href={route('projects.index', { status: 'Completed' })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            activeStatus === 'Completed'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        Completed
                    </Link>
                    <Link
                        href={route('projects.index', { status: 'Archived' })}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            activeStatus === 'Archived'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                    >
                        Archived
                    </Link>
                </div>

                <div className="flex items-center gap-3">
                    {activeStatus && activeStatus !== 'all' && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                                Filter: <span className="font-semibold text-[#E31B23]">{activeStatus}</span>
                            </span>
                            <Link
                                href={route('projects.index')}
                                className="text-xs font-semibold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors border border-slate-200"
                            >
                                ✕ Reset Filter
                            </Link>
                        </div>
                    )}
                    <span className="text-xs text-slate-400 font-medium">Total: {projects.total ?? projects.data?.length ?? 0} {(projects.total ?? projects.data?.length ?? 0) === 1 ? 'project' : 'projects'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
                {projects.data.map((project: any) => {
                    const progressPercent = project.total_tasks > 0 
                        ? Math.round(((project.completed_tasks || 0) / project.total_tasks) * 100) 
                        : (project.progress || 0);
                    const isCompleted = project.status === 'Completed' || (project.total_tasks > 0 && (project.completed_tasks || 0) >= project.total_tasks) || progressPercent >= 100;
                    const status = statusConfig[isCompleted && project.status !== 'Archived' ? 'Completed' : project.status] || statusConfig['Planning'];
                    const progressColor = isCompleted ? 'bg-emerald-500' : progressPercent >= 75 ? 'bg-emerald-500' : progressPercent >= 40 ? 'bg-blue-500' : progressPercent >= 20 ? 'bg-amber-500' : 'bg-slate-300';
                    const isOverdue = project.deadline && new Date(project.deadline) < new Date() && !isCompleted && project.status !== 'Archived' && project.status !== 'Cancelled';
                    const isProjectCreator = project.created_by === auth?.user?.id 
                        || (project.owner_id && auth?.user?.employee?.id === project.owner_id) 
                        || auth?.user?.roles?.some((r: any) => ['Super Admin'].includes(r.name));
                    
                    return (
                        <Link 
                            key={project.id} 
                            href={route('projects.show', project.id)}
                            className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                        >
                            {/* Colored top bar */}
                            <div className={`h-1.5 ${status.dot}`} />
                            
                            <div className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-slate-900 group-hover:text-[#E31B23] transition-colors truncate">{project.name}</h3>
                                        {project.department?.name && (
                                            <p className="text-xs text-gray-400 mt-0.5">{project.department.name}</p>
                                        )}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${status.bg} ${status.text} flex-shrink-0`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                        {project.status}
                                    </span>
                                </div>

                                {/* Description */}
                                {project.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{project.description}</p>
                                )}

                                {/* Progress */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-500">Progress</span>
                                        <div className="flex items-center gap-1.5">
                                            {project.total_tasks !== undefined && project.total_tasks > 0 && (
                                                <span className="text-[11px] text-gray-400 font-medium">
                                                    {project.completed_tasks || 0}/{project.total_tasks} tasks
                                                </span>
                                            )}
                                            <span className="text-xs font-bold text-gray-700">{progressPercent}%</span>
                                        </div>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                        <div className={`h-full rounded-full ${progressColor} transition-all duration-700`} style={{ width: `${progressPercent}%` }} />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-50 gap-2">
                                    {project.deadline ? (
                                        <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue ? 'text-red-500' : isCompleted ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {new Date(project.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {isOverdue && <span className="ml-1 text-red-500 font-semibold">• Overdue</span>}
                                            {isCompleted && <span className="ml-1 text-emerald-600 font-semibold">• Completed</span>}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-300">No deadline</span>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        {isProjectCreator && (
                                            <>
                                                {project.status === 'Archived' ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleRestore(e, project.id)}
                                                        className="text-xs font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md border border-purple-200 transition-colors inline-flex items-center gap-1"
                                                        title="Restore Project to Active Status"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleArchive(e, project.id)}
                                                        className="text-xs font-medium text-gray-500 hover:text-amber-700 bg-gray-50 hover:bg-amber-50 px-2 py-1 rounded-md border border-gray-200 hover:border-amber-200 transition-colors inline-flex items-center gap-1"
                                                        title="Archive Project"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                        </svg>
                                                        Archive
                                                    </button>
                                                )}

                                                <Link
                                                    href={route('projects.edit', project.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs font-semibold text-slate-500 hover:text-[#E31B23] bg-slate-50 hover:bg-red-50/50 px-2 py-1 rounded-lg border border-slate-200 hover:border-red-200 transition-colors inline-flex items-center gap-1"
                                                    title="Edit Project"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </Link>

                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDelete(e, project.id, project.name)}
                                                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 px-2 py-1 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors inline-flex items-center gap-1"
                                                    title="Permanently Delete Project"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                        <span className="text-xs text-[#E31B23] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                            Board →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {projects.data.length === 0 && (
                <div className="text-center py-16">
                    <div className="inline-flex rounded-full bg-red-50 p-4 mb-4">
                        <svg className="w-8 h-8 text-[#E31B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                        {activeStatus ? `No projects found with status "${activeStatus}"` : 'No projects yet'}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                        {activeStatus 
                            ? 'Try changing the status filter or reset filter to see other projects' 
                            : 'Get started by creating a new project for your team'}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        {activeStatus && (
                            <Link 
                                href={route('projects.index')} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Reset Filter
                            </Link>
                        )}
                        <Link 
                            href={route('projects.create')} 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#E31B23] text-white text-sm font-semibold rounded-xl hover:bg-[#c4141b] active:bg-[#a30f15] shadow-xs transition-colors"
                        >
                            Create Project
                        </Link>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
