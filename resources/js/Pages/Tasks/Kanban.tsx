import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import TaskDetailModal from '../Projects/TaskDetailModal';
import CreateTaskModal from '@/Components/CreateTaskModal';
import TaskViewSwitcher from '@/Components/TaskViewSwitcher';
import PrimaryButton from '@/Components/PrimaryButton';
import PageHeader from '@/Components/PageHeader';
import DeadlineBadge from '@/Components/DeadlineBadge';
import { getDeadlineStatus } from '@/Utils/deadline';

import TaskRevisionModal from '@/Components/TaskRevisionModal';

const columnConfig: Record<string, { color: string; bg: string; border: string; sublabel: string; icon: JSX.Element }> = {
    'To Do': {
        color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', sublabel: 'Pending',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
    },
    'In Progress': {
        color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', sublabel: 'In Progress',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    },
    'Done': {
        color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200', sublabel: 'Awaiting Approval',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    'Approved': {
        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', sublabel: 'Approved',
        icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
};

const priorityConfig: Record<string, { bg: string; text: string }> = {
    'Urgent': { bg: 'bg-red-100', text: 'text-red-700' },
    'High': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'Normal': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Low': { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export default function Kanban({ auth, tasks, statuses, priorities, employees, projects = [] }: any) {
    const [localTasks, setLocalTasks] = useState<any[]>(tasks || []);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);
    const [revisionModalTask, setRevisionModalTask] = useState<any>(null);
    const [filterOverdue, setFilterOverdue] = useState(false);
    const isDraggingRef = useRef(false);
    const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const resetDragAfter = (delay: number) => {
        if (dragResetTimerRef.current !== null) clearTimeout(dragResetTimerRef.current);
        dragResetTimerRef.current = setTimeout(() => {
            isDraggingRef.current = false;
            dragResetTimerRef.current = null;
        }, delay);
    };

    const showTemporaryWarning = (message: string) => {
        if (!mountedRef.current) return;
        setWarningMessage(message);
        if (warningTimerRef.current !== null) clearTimeout(warningTimerRef.current);
        warningTimerRef.current = setTimeout(() => {
            warningTimerRef.current = null;
            setWarningMessage(null);
        }, 4500);
    };

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (dragResetTimerRef.current !== null) clearTimeout(dragResetTimerRef.current);
            if (warningTimerRef.current !== null) clearTimeout(warningTimerRef.current);
        };
    }, []);

    // Keep localTasks in sync with Inertia tasks prop updates
    useEffect(() => {
        setLocalTasks(tasks || []);
    }, [tasks]);

    // Sync selectedTask when localTasks update (e.g. after adding comment/checklist)
    useEffect(() => {
        if (selectedTask && localTasks) {
            const updated = localTasks.find((t: any) => t.id === selectedTask.id);
            if (updated) setSelectedTask(updated);
        }
    }, [localTasks]);

    // Open task or create modal from URL query param if present
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const taskIdParam = params.get('task_id') || params.get('taskId');
        if (taskIdParam && localTasks) {
            const found = localTasks.find((t: any) => String(t.id) === String(taskIdParam));
            if (found) setSelectedTask(found);
        }
        if (params.get('create') === '1' || params.get('create') === 'true') {
            setShowCreateModal(true);
        }
        if (params.get('filter') === 'overdue') {
            setFilterOverdue(true);
        }
    }, [localTasks]);

    // Count overdue tasks
    const overdueCount = (localTasks || []).filter((t: any) => {
        const d = getDeadlineStatus(t.deadline, t.status, t.completed_at);
        return Boolean(d?.isOverdue && !d?.isCompleted);
    }).length;

    // Ensure drag state is cleared if drag ends anywhere on window
    useEffect(() => {
        const handleDragClean = () => {
            setDraggedTaskId(null);
            setDraggedOverColumn(null);
            resetDragAfter(50);
        };
        window.addEventListener('dragend', handleDragClean);
        window.addEventListener('drop', handleDragClean);
        return () => {
            window.removeEventListener('dragend', handleDragClean);
            window.removeEventListener('drop', handleDragClean);
        };
    }, []);

    const canApproveTask = (task: any) => {
        if (!task) return false;
        const currentUserId = auth.user?.id;
        const currentEmployeeId = auth.user?.employee?.id;
        const userRoles = auth.user?.roles?.map((r: any) => r.name) || [];

        if (userRoles.some((role: string) => ['Super Admin', 'HRD / Admin', 'General Manager'].includes(role))) {
            return true;
        }
        if (task.created_by && task.created_by === currentUserId) {
            return true;
        }
        if (task.project?.created_by && task.project.created_by === currentUserId) {
            return true;
        }
        if (task.project?.owner_id && currentEmployeeId && task.project.owner_id === currentEmployeeId) {
            return true;
        }
        return false;
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'To Do': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Done': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const handleDropTask = (taskId: number, newStatus: string) => {
        // Immediately reset drag states to prevent cards from staying greyed out
        setDraggedTaskId(null);
        setDraggedOverColumn(null);
        resetDragAfter(50);

        const currentTask = localTasks.find((t: any) => t.id === taskId);
        if (!currentTask || currentTask.status === newStatus) return;

        // Restriction: Only task creator can approve
        if (newStatus === 'Approved' && !canApproveTask(currentTask)) {
            showTemporaryWarning('Only the task creator or assigner can approve this task.');
            return;
        }

        // Restriction: Once approved, assignee cannot revert status
        if (currentTask.status === 'Approved' && newStatus !== 'Approved' && !canApproveTask(currentTask)) {
            showTemporaryWarning('Tasks that have been approved cannot be changed back by assignees.');
            return;
        }

        const previousTasks = [...localTasks];

        // Optimistic UI update for instantaneous snappy feedback
        setLocalTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        router.put(route('tasks.update', taskId), {
            status: newStatus
        }, {
            preserveScroll: true,
            preserveState: true,
            onError: (errs) => {
                if (!mountedRef.current) return;
                // Revert if error occurs
                setLocalTasks(previousTasks);
                showTemporaryWarning(Object.values(errs)[0] as string || 'Failed to update task status.');
            }
        });
    };

    const updateTaskStatus = (taskId: number, newStatus: string) => {
        handleDropTask(taskId, newStatus);
    };

    // Group tasks by status for the kanban board and sort by priority
    const getTasksByStatus = (statusValue: string) => {
        const priorityWeight: Record<string, number> = {
            'Urgent': 1,
            'High': 2,
            'Normal': 3,
            'Low': 4
        };

        const filteredTasks = (localTasks || []).filter((t: any) => {
            if (t.status !== statusValue) return false;
            if (filterOverdue) {
                const d = getDeadlineStatus(t.deadline, t.status, t.completed_at);
                return Boolean(d?.isOverdue && !d?.isCompleted);
            }
            return true;
        });
        
        return filteredTasks.sort((a: any, b: any) => {
            const weightA = priorityWeight[a.priority] || 99;
            const weightB = priorityWeight[b.priority] || 99;
            return weightA - weightB;
        });
    };

    const kanbanColumns = ['To Do', 'In Progress', 'Done', 'Approved'];
    const draggedTask = localTasks.find((t: any) => t.id === draggedTaskId);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    breadcrumbs={[
                        { label: 'Main Menu', href: route('dashboard') },
                        { label: 'Task Management', href: route('dashboard', { view: 'tasks' }) },
                        { label: 'My List' },
                    ]}
                    title="My List"
                    subtitle="Drag cards between columns to update work status in real time"
                    actions={
                        <div className="flex items-center gap-3">
                            <TaskViewSwitcher current="kanban" />
                            <PrimaryButton onClick={() => setShowCreateModal(true)}>
                                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Task
                            </PrimaryButton>
                        </div>
                    }
                />
            }
        >
            <Head title="My List" />

            <div className="mt-2">
                {/* Filter and Status Toolbar */}
                <div className="flex items-center justify-between mb-4 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setFilterOverdue(false)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                !filterOverdue
                                    ? 'bg-[#E31B23] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                        >
                            All Tasks ({localTasks.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterOverdue(true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                filterOverdue
                                    ? 'bg-red-700 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-red-700 hover:bg-red-50'
                            }`}
                        >
                            <span>Overdue</span>
                            {overdueCount > 0 && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    filterOverdue ? 'bg-white text-red-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {overdueCount}
                                </span>
                            )}
                        </button>
                    </div>
                    {filterOverdue && (
                        <div className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            Showing overdue tasks
                        </div>
                    )}
                </div>
                {/* Warning Toast */}
                {warningMessage && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span>{warningMessage}</span>
                        </div>
                        <button onClick={() => setWarningMessage(null)} className="text-amber-500 hover:text-amber-700 font-bold ml-3">✕</button>
                    </div>
                )}

                {/* Kanban Board */}
                <div className="flex flex-nowrap overflow-x-auto gap-4 pb-4 -mx-2 px-2">
                    {kanbanColumns.map(status => {
                        const config = columnConfig[status];
                        const columnTasks = getTasksByStatus(status);
                        const isColumnDraggedOver = draggedOverColumn === status && draggedTask && draggedTask.status !== status;

                        return (
                            <div 
                                key={status} 
                                className="flex-shrink-0 w-80 flex flex-col"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (draggedOverColumn !== status) {
                                        setDraggedOverColumn(status);
                                    }
                                }}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    setDraggedOverColumn(status);
                                }}
                                onDragLeave={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        if (draggedOverColumn === status) {
                                            setDraggedOverColumn(null);
                                        }
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDraggedOverColumn(null);
                                    setDraggedTaskId(null);
                                    isDraggingRef.current = false;
                                    const taskIdStr = e.dataTransfer.getData('text/plain');
                                    const taskId = Number(taskIdStr) || draggedTaskId;
                                    if (taskId) {
                                        handleDropTask(taskId, status);
                                    }
                                }}
                            >
                                {/* Column Header */}
                                <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-t-xl ${config.bg} border ${config.border} border-b-0 transition-all ${
                                    isColumnDraggedOver ? 'ring-2 ring-red-400 border-red-400' : ''
                                }`}>
                                    <span className={config.color}>{config.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-sm ${config.color} leading-none`}>{status}</h3>
                                        {config.sublabel && (
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{config.sublabel}</p>
                                        )}
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                                        {columnTasks.length}
                                    </span>
                                </div>
                                
                                {/* Task Cards Container */}
                                <div className={`border ${
                                    isColumnDraggedOver 
                                        ? 'border-red-400 bg-red-50/40 ring-2 ring-red-400/30' 
                                        : `${config.border} bg-slate-50/50`
                                } border-t-0 rounded-b-xl p-2.5 space-y-2.5 min-h-[260px] max-h-[72vh] overflow-y-auto transition-all duration-150`}>
                                    
                                    {/* Drop Target Preview Banner */}
                                    {isColumnDraggedOver && (
                                        <div className="border-2 border-dashed border-red-400 bg-red-100/70 rounded-xl p-3 text-center text-xs font-semibold text-red-700 flex items-center justify-center gap-2 shadow-xs animate-pulse">
                                            <svg className="w-4 h-4 text-[#E31B23] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                            <span>Drop into {status} column</span>
                                        </div>
                                    )}

                                    {columnTasks.map((task: any) => {
                                        const isBeingDragged = draggedTaskId === task.id;
                                        const priority = priorityConfig[task.priority] || priorityConfig['Normal'];
                                        const deadlineInfo = getDeadlineStatus(task.deadline, task.status, task.completed_at);
                                        const isLate = Boolean(deadlineInfo?.isOverdue && !deadlineInfo?.isCompleted);
                                        const assigneeNames = task.assignees?.map((a: any) => a.user?.name || 'Unknown') || [];
                                        
                                        return (
                                            <div 
                                                key={task.id} 
                                                draggable
                                                onDragStart={(e) => {
                                                    isDraggingRef.current = true;
                                                    setDraggedTaskId(task.id);
                                                    e.dataTransfer.setData('text/plain', String(task.id));
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedTaskId(null);
                                                    setDraggedOverColumn(null);
                                                    resetDragAfter(100);
                                                }}
                                                onClick={() => {
                                                    if (!isDraggingRef.current) {
                                                        setSelectedTask(task);
                                                    }
                                                }}
                                                className={`group cv-auto bg-white rounded-xl shadow-xs border transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
                                                    isBeingDragged
                                                        ? 'opacity-30 scale-95 border-dashed border-2 border-red-400 bg-red-50/50 rotate-1 shadow-inner'
                                                        : 'hover:shadow-md hover:-translate-y-0.5 border-slate-200 hover:border-red-300'
                                                } ${isLate && !isBeingDragged ? 'border-l-4 border-l-red-500 ring-1 ring-red-100 bg-red-50/10' : ''}`}
                                            >
                                                <div className="p-3.5">
                                                    {/* Task Title + Drag Handle Icon */}
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <h4 className={`font-semibold text-sm leading-snug group-hover:text-[#E31B23] transition-colors ${
                                                            isLate ? 'text-red-950 font-bold' : 'text-slate-900'
                                                        }`}>
                                                            {task.title}
                                                        </h4>
                                                        <span 
                                                            className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 pt-0.5 cursor-grab active:cursor-grabbing"
                                                            title="Drag and drop task card"
                                                        >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-12a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                                                            </svg>
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Project Name */}
                                                    <p className="text-[11px] text-slate-400 mb-2.5 truncate">{task.project?.name}</p>

                                                    {/* Priority + Deadline Row */}
                                                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${priority.bg} ${priority.text}`}>
                                                            {task.priority}
                                                        </span>
                                                        <DeadlineBadge 
                                                            dueDate={task.deadline} 
                                                            status={task.status} 
                                                            completedAt={task.completed_at} 
                                                            size="sm" 
                                                        />
                                                    </div>

                                                    {/* Done / Waiting Approval Action Box */}
                                                    {task.status === 'Done' && (
                                                        <div className="mb-2.5 p-2 bg-amber-50/90 rounded-lg border border-amber-200/80" onClick={e => e.stopPropagation()}>
                                                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                                                <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                                    Awaiting Approval
                                                                </span>
                                                                {canApproveTask(task) && (
                                                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Task Assigner</span>
                                                                )}
                                                            </div>
                                                            {canApproveTask(task) ? (
                                                                <div className="flex items-center gap-1.5 pt-1 border-t border-amber-200/60">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setRevisionModalTask(task)}
                                                                        className="flex-1 py-1 px-2 text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-100 rounded-md border border-amber-300 transition-colors text-center"
                                                                        title="Return to In Progress and adjust due date if revisions are needed"
                                                                    >
                                                                        ↺ Revision
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDropTask(task.id, 'Approved')}
                                                                        className="flex-1 py-1 px-2 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-md shadow-xs transition-colors text-center flex items-center justify-center gap-1"
                                                                        title="Approve this work output"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                        Approve
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[10px] text-amber-700/90 italic leading-tight">
                                                                    Awaiting verification and approval from the task assigner.
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Approved Status Box */}
                                                    {task.status === 'Approved' && (
                                                        <div className="mb-2.5 p-1.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                                                            <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <span>Approved & Met Expectations</span>
                                                        </div>
                                                    )}

                                                    {/* Footer */}
                                                    <div 
                                                        className="flex items-center justify-between pt-2.5 border-t border-slate-100" 
                                                        onClick={e => e.stopPropagation()}
                                                        onMouseDown={e => e.stopPropagation()}
                                                    >
                                                        {/* Assignee Avatars */}
                                                        <div className="flex -space-x-2">
                                                            {assigneeNames.slice(0, 3).map((name: string, idx: number) => (
                                                                <div key={idx} className="h-6 w-6 rounded-full bg-gradient-to-br from-[#E31B23] to-red-400 text-white flex items-center justify-center text-[9px] font-bold border-2 border-white" title={name}>
                                                                    {name.charAt(0)}
                                                                </div>
                                                            ))}
                                                            {assigneeNames.length > 3 && (
                                                                <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold border-2 border-white">
                                                                    +{assigneeNames.length - 3}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Quick Actions */}
                                                        <div className="flex items-center gap-2">
                                                            {task.comments?.length > 0 && (
                                                                <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                                    {task.comments.length}
                                                                </span>
                                                            )}
                                                            {((task.comments?.filter((c: any) => c.file_path)?.length || 0) + (task.attachments?.length || 0)) > 0 && (
                                                                <span className="flex items-center gap-0.5 text-[10px] text-slate-400" title="Attachments">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                                    {(task.comments?.filter((c: any) => c.file_path)?.length || 0) + (task.attachments?.length || 0)}
                                                                </span>
                                                            )}
                                                            <select 
                                                                className={`text-[10px] border rounded font-semibold py-1 pl-2 pr-6 ${getStatusColor(task.status)} focus:ring-1 focus:ring-[#E31B23] focus:border-[#E31B23]`}
                                                                value={task.status}
                                                                disabled={task.status === 'Approved' && !canApproveTask(task)}
                                                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                                onMouseDown={e => e.stopPropagation()}
                                                            >
                                                                {kanbanColumns.map(col => {
                                                                    const isApprovedOption = col === 'Approved';
                                                                    const isDisabled = isApprovedOption && !canApproveTask(task);
                                                                    return (
                                                                        <option key={col} value={col} disabled={isDisabled}>
                                                                            {col} {isDisabled ? '(Assigner Only)' : ''}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {columnTasks.length === 0 && !isColumnDraggedOver && (
                                        <div className="flex flex-col items-center justify-center py-10 text-center">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 text-gray-300">
                                                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                            </div>
                                            <p className="text-xs text-gray-400">No tasks yet</p>
                                            <p className="text-[11px] text-gray-400/80 mt-0.5">Drag tasks here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskDetailModal 
                    task={selectedTask} 
                    currentUser={auth.user} 
                    onClose={() => setSelectedTask(null)} 
                    employees={employees}
                    statuses={statuses}
                    priorities={priorities}
                />
            )}

            <CreateTaskModal 
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                employees={employees}
                statuses={statuses}
                priorities={priorities}
                projects={projects}
                defaultProjectId={null}
            />

            {/* Task Revision Modal */}
            {revisionModalTask && (
                <TaskRevisionModal
                    task={revisionModalTask}
                    show={Boolean(revisionModalTask)}
                    onClose={() => setRevisionModalTask(null)}
                />
            )}
        </AuthenticatedLayout>
    );
}
