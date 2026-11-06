import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

interface TaskRevisionModalProps {
    task: any;
    show: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function TaskRevisionModal({ task, show, onClose, onSuccess }: TaskRevisionModalProps) {
    const formatDate = (d: any) => {
        if (!d) return '';
        if (typeof d === 'string') return d.split('T')[0];
        return '';
    };

    const [deadline, setDeadline] = useState('');
    const [revisionNote, setRevisionNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (task && show) {
            setDeadline(formatDate(task.deadline));
            setRevisionNote('');
            setError('');
        }
    }, [task, show]);

    if (!show || !task) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        router.put(route('tasks.update', task.id), {
            status: 'In Progress',
            deadline: deadline || null,
            revision_note: revisionNote || 'Revision required per assigner instructions.',
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIsSubmitting(false);
                onClose();
                if (onSuccess) onSuccess();
            },
            onError: (errs) => {
                setIsSubmitting(false);
                setError(Object.values(errs)[0] as string || 'Failed to return task to In Progress.');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

                <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-100">
                    <form onSubmit={handleSubmit}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold leading-6">Return to In Progress</h3>
                                        <p className="text-xs text-amber-100">Request revision & adjust due date</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="text-white/80 hover:text-white rounded-lg p-1 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-r-lg font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Task</span>
                                <p className="text-sm font-semibold text-slate-800 line-clamp-2 mt-0.5">{task.title}</p>
                            </div>

                            {/* New Due Date */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                                    <span>Update Due Date (Deadline)</span>
                                    <span className="text-[11px] font-normal text-slate-400 lowercase">(optional)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={(e) => setDeadline(e.target.value)}
                                        className="w-full rounded-xl border-slate-300 shadow-xs focus:border-amber-500 focus:ring-amber-500 text-sm py-2 px-3 text-slate-800 font-medium"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Provide additional time to complete requested revisions.
                                </p>
                            </div>

                            {/* Revision Note */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Revision Notes / Instructions <span className="text-amber-600">*</span>
                                </label>
                                <textarea
                                    value={revisionNote}
                                    onChange={(e) => setRevisionNote(e.target.value)}
                                    rows={3}
                                    placeholder="Explain what needs improvement and what should be revised by the assignee..."
                                    className="w-full rounded-xl border-slate-300 shadow-xs focus:border-amber-500 focus:ring-amber-500 text-sm py-2 px-3 placeholder-slate-400"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    These notes will automatically be added to task comments and notified to assignees.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={onClose}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !revisionNote.trim()}
                                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:from-amber-700 active:to-orange-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                        </svg>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span>Submit Revision & Return to In Progress</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
