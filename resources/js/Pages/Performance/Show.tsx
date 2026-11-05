import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Badge from '@/Components/Badge';

export default function PerformanceShow({ employee, period, score, assessment, tasks = [] }: any) {
    const getCategoryVariant = (category: string) => {
        switch (category) {
            case 'Excellent': return 'success';
            case 'Very Good': return 'info';
            case 'Good': return 'brand';
            case 'Needs Improvement': return 'warning';
            case 'Evaluation Required': return 'danger';
            default: return 'neutral';
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-xl text-slate-800 leading-tight">
                        Performance Report: {employee.user.name}
                    </h2>
                    <Link href={route('performance.index')} className="text-sm text-[#E31B23] hover:text-[#c4141b] font-medium">
                        &larr; Back to List
                    </Link>
                </div>
            }
        >
            <Head title={`Performance - ${employee.user.name}`} />

            <div className="w-full">
                <div className="w-full space-y-4">
                    
                    {/* Header Info */}
                    <div className="bg-white p-6 shadow-xs rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{employee.user.name}</h3>
                            <p className="text-sm text-slate-500 mt-0.5">{employee.department?.name} &bull; {period.name}</p>
                        </div>
                        {score && (
                            <div className="text-left sm:text-right">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Final EPI</p>
                                <div className="flex items-center sm:justify-end gap-3">
                                    <span className="text-4xl font-extrabold text-[#E31B23] tabular-nums">{score.final_epi}</span>
                                    <Badge variant={getCategoryVariant(score.category)} dot>
                                        {score.category}
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </div>

                    {!score ? (
                        <div className="bg-white p-8 shadow-xs rounded-2xl border border-slate-200 text-center py-12">
                            <p className="text-slate-500 text-sm">No performance score calculated for this period yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Task Metrics */}
                                <div className="bg-white p-6 shadow-xs rounded-2xl border border-slate-200">
                                    <h4 className="text-base font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Task Metrics (70%)</h4>
                                    
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-medium text-slate-700">Completion Rate (30%)</span>
                                                <span className="font-bold text-slate-900 tabular-nums">{score.completion_rate}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className="bg-[#E31B23] h-2.5 rounded-full" style={{ width: `${score.completion_rate}%` }}></div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{score.completed_tasks} of {score.assigned_tasks} tasks completed (only acknowledged tasks)</p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-medium text-slate-700">On-Time Rate (25%)</span>
                                                <span className="font-bold text-slate-900 tabular-nums">{score.on_time_rate}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${score.on_time_rate}%` }}></div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{score.completed_on_time_tasks} of {score.completed_tasks} completed on time ({score.overdue_tasks} overdue / unacknowledged)</p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-medium text-slate-700">Task Weight Score (15%)</span>
                                                <span className="font-bold text-slate-900 tabular-nums">{score.task_weight_score}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: `${score.task_weight_score}%` }}></div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Average priority complexity</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Supervisor Assessment */}
                                <div className="bg-white p-6 shadow-xs rounded-2xl border border-slate-200">
                                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                        <h4 className="text-base font-semibold text-slate-800">Supervisor Assessment (30%)</h4>
                                        <Link 
                                            href={route('performance.assess', [employee.id, period.id])} 
                                            className="text-xs text-[#E31B23] border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 font-semibold transition-colors"
                                        >
                                            {assessment ? 'Edit Assessment' : 'Give Assessment'}
                                        </Link>
                                    </div>
                                    
                                    {assessment ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                    <p className="text-xs text-slate-500 uppercase font-semibold">Work Quality</p>
                                                    <p className="text-xl font-bold text-slate-900 mt-0.5">{assessment.work_quality} <span className="text-xs text-slate-400 font-normal">/ 5</span></p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                    <p className="text-xs text-slate-500 uppercase font-semibold">Accuracy</p>
                                                    <p className="text-xl font-bold text-slate-900 mt-0.5">{assessment.accuracy} <span className="text-xs text-slate-400 font-normal">/ 5</span></p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                    <p className="text-xs text-slate-500 uppercase font-semibold">Responsibility</p>
                                                    <p className="text-xl font-bold text-slate-900 mt-0.5">{assessment.responsibility} <span className="text-xs text-slate-400 font-normal">/ 5</span></p>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                                    <p className="text-xs text-slate-500 uppercase font-semibold">Communication</p>
                                                    <p className="text-xl font-bold text-slate-900 mt-0.5">{assessment.communication} <span className="text-xs text-slate-400 font-normal">/ 5</span></p>
                                                </div>
                                            </div>

                                            <div className="mt-4">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium text-slate-700">Total Supervisor Score</span>
                                                    <span className="font-bold text-slate-900 tabular-nums">{score.supervisor_score}%</span>
                                                </div>
                                            </div>

                                            {assessment.notes && (
                                                <div className="mt-4 p-4 bg-amber-50/80 rounded-xl text-sm text-amber-900 border border-amber-200">
                                                    <span className="font-bold block mb-1">Supervisor Notes:</span>
                                                    {assessment.notes}
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-400 text-right">Assessed by: {assessment.supervisor?.user?.name}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <svg className="w-10 h-10 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <p className="text-sm text-slate-500">No supervisor assessment provided yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Evaluated Tasks List */}
                            <div className="bg-white p-6 shadow-xs rounded-2xl border border-slate-200">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                    <div>
                                        <h4 className="text-base font-semibold text-slate-900">Tasks Evaluated in this Period ({tasks.length})</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">Only tasks with status "Done" AND acknowledged receipt count as completed tasks.</p>
                                    </div>
                                </div>

                                {tasks.length === 0 ? (
                                    <p className="text-sm text-slate-500 py-6 text-center">No tasks were assigned during this period.</p>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Task Title</th>
                                                    <th className="px-4 py-3.5 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Project</th>
                                                    <th className="px-4 py-3.5 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Priority</th>
                                                    <th className="px-4 py-3.5 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Task Status</th>
                                                    <th className="px-4 py-3.5 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Acknowledgment</th>
                                                    <th className="px-4 py-3.5 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">EPI Point Credit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {tasks.map((task: any) => {
                                                    const isAck = !!task.pivot?.acknowledged_at;
                                                    const isDone = (task.status?.value || task.status) === 'Done';
                                                    const getsCredit = isDone && isAck;

                                                    return (
                                                        <tr key={task.id} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                                {task.title}
                                                                {task.deadline && (
                                                                    <div className="text-xs text-slate-400 font-normal">
                                                                        Deadline: {new Date(task.deadline).toLocaleDateString('en-US')}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600">
                                                                {task.project?.name || '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Badge variant="neutral">
                                                                    {task.priority?.value || task.priority}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <Badge variant={isDone ? 'success' : 'info'} dot>
                                                                    {task.status?.value || task.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {isAck ? (
                                                                    <Badge variant="success" dot>
                                                                        Acknowledged
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="warning" dot>
                                                                        Unacknowledged
                                                                    </Badge>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {getsCredit ? (
                                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                                                        +1 Completed
                                                                    </span>
                                                                ) : isDone && !isAck ? (
                                                                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full" title="Task completed but receipt was never acknowledged">
                                                                        Not Counted (Unacknowledged)
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400">
                                                                        -
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
