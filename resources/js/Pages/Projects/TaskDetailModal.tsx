import React, { useState, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import AssigneeSelect from '@/Components/AssigneeSelect';
import TaskRevisionModal from '@/Components/TaskRevisionModal';
import DeadlineBadge from '@/Components/DeadlineBadge';
import { getDeadlineStatus } from '@/Utils/deadline';
import { formatDate as formatDateUtil, formatDateTime } from '@/Utils/date';

interface TaskDetailModalProps {
    task: any;
    onClose: () => void;
    currentUser: any;
    project?: any;
    employees?: any[];
    statuses?: any[];
    priorities?: any[];
    initialTab?: 'details' | 'checklists' | 'comments' | 'activity';
    readOnly?: boolean;
    assignmentHistory?: Array<{
        id: number;
        employee_name: string;
        employee_number: string | null;
        department_name: string | null;
        assigned_by: string | null;
        assigned_at: string;
        acknowledged_at: string | null;
        unassigned_at: string | null;
        declined_at?: string | null;
        decline_reason?: string | null;
        source: string;
    }>;
}

const formatDate = (d: any) => {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0];
    return '';
};

export default function TaskDetailModal({
    task,
    onClose,
    currentUser,
    project,
    employees = [],
    statuses = [],
    priorities = [],
    initialTab,
    readOnly = false,
    assignmentHistory,
}: TaskDetailModalProps) {
    const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
    const defaultTab = (urlTab && ['details', 'checklists', 'comments', 'activity'].includes(urlTab))
        ? (urlTab as 'details' | 'checklists' | 'comments' | 'activity')
        : (initialTab || 'details');

    const [activeTab, setActiveTab] = useState<'details' | 'checklists' | 'comments' | 'activity' | 'assignment_history'>(defaultTab);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editError, setEditError] = useState('');
    const [showRevisionModal, setShowRevisionModal] = useState(false);

    const [editData, setEditData] = useState({
        title: task?.title || '',
        description: task?.description || '',
        priority: typeof task?.priority === 'object' ? task.priority?.value || 'Normal' : task?.priority || 'Normal',
        status: typeof task?.status === 'object' ? task.status?.value || 'To Do' : task?.status || 'To Do',
        start_date: formatDate(task?.start_date),
        deadline: formatDate(task?.deadline),
        assignees: task?.assignees ? task.assignees.map((a: any) => a.id) : [],
    });

    useEffect(() => {
        if (task) {
            setEditData({
                title: task.title || '',
                description: task.description || '',
                priority: typeof task.priority === 'object' ? task.priority?.value || 'Normal' : task.priority || 'Normal',
                status: typeof task.status === 'object' ? task.status?.value || 'To Do' : task.status || 'To Do',
                start_date: formatDate(task.start_date),
                deadline: formatDate(task.deadline),
                assignees: task.assignees ? task.assignees.map((a: any) => a.id) : [],
            });
        }
    }, [task]);

    const checklistForm = useForm({
        title: '',
    });

    const commentForm = useForm<{
        content: string;
        tagged_user_ids: number[];
        file: File | null;
    }>({
        content: '',
        tagged_user_ids: [],
        file: null,
    });

    const [commentFilePreview, setCommentFilePreview] = useState<string | null>(null);
    const commentFileInputRef = React.useRef<HTMLInputElement>(null);

    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [showMentionMenu, setShowMentionMenu] = useState(false);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const commentTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const mentionFocusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (mentionFocusTimerRef.current !== null) clearTimeout(mentionFocusTimerRef.current);
    }, []);

    const mentionableUsers = React.useMemo(() => {
        const list: Array<{
            userId: number;
            employeeId: number;
            name: string;
            departmentName?: string;
            profilePhoto?: string;
            isAssignee: boolean;
        }> = [];
        const seenUserIds = new Set<number>();

        // 1. Task assignees first (priority)
        if (task?.assignees && Array.isArray(task.assignees)) {
            task.assignees.forEach((assignee: any) => {
                const uId = assignee.user?.id || assignee.user_id;
                const name = assignee.user?.name;
                if (uId && name && !seenUserIds.has(uId)) {
                    seenUserIds.add(uId);
                    list.push({
                        userId: uId,
                        employeeId: assignee.id,
                        name,
                        departmentName: assignee.department?.name,
                        profilePhoto: assignee.user?.profile_photo_url || assignee.profile_photo,
                        isAssignee: true,
                    });
                }
            });
        }

        // 2. All other employees
        if (employees && Array.isArray(employees)) {
            employees.forEach((emp: any) => {
                const uId = emp.user?.id || emp.user_id;
                const name = emp.user?.name;
                if (uId && name && !seenUserIds.has(uId)) {
                    seenUserIds.add(uId);
                    list.push({
                        userId: uId,
                        employeeId: emp.id,
                        name,
                        departmentName: emp.department?.name,
                        profilePhoto: emp.user?.profile_photo_url || emp.profile_photo,
                        isAssignee: false,
                    });
                }
            });
        }

        return list;
    }, [employees, task?.assignees]);

    const filteredMentions = React.useMemo(() => {
        if (mentionQuery === null) return [];
        const q = mentionQuery.toLowerCase().trim();
        if (!q) return mentionableUsers.slice(0, 8);
        return mentionableUsers.filter(u => 
            u.name.toLowerCase().includes(q) || 
            (u.departmentName && u.departmentName.toLowerCase().includes(q))
        ).slice(0, 8);
    }, [mentionQuery, mentionableUsers]);

    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
            if (!textAfterAt.includes('\n') && textAfterAt.length <= 25) {
                if (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1])) {
                    setMentionQuery(textAfterAt);
                    setShowMentionMenu(true);
                    setMentionIndex(0);
                    commentForm.setData('content', val);
                    return;
                }
            }
        }

        setShowMentionMenu(false);
        setMentionQuery(null);
        commentForm.setData('content', val);
    };

    const insertMention = (user: { userId: number; name: string }) => {
        const textarea = commentTextareaRef.current;
        const currentVal = commentForm.data.content;
        const cursorPos = textarea ? textarea.selectionStart : currentVal.length;
        const textBeforeCursor = currentVal.slice(0, cursorPos);
        const textAfterCursor = currentVal.slice(cursorPos);

        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        let newContent = '';
        if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))) {
            const beforeAt = textBeforeCursor.slice(0, lastAtIndex);
            newContent = `${beforeAt}@${user.name} ${textAfterCursor}`;
        } else {
            newContent = currentVal.trim() ? `${currentVal} @${user.name} ` : `@${user.name} `;
        }

        const nextTagged = Array.from(new Set([...(commentForm.data.tagged_user_ids || []), user.userId]));
        commentForm.setData({
            content: newContent,
            tagged_user_ids: nextTagged,
        });

        setShowMentionMenu(false);
        setMentionQuery(null);
        setShowTagPicker(false);

        if (mentionFocusTimerRef.current !== null) clearTimeout(mentionFocusTimerRef.current);
        mentionFocusTimerRef.current = setTimeout(() => {
            mentionFocusTimerRef.current = null;
            if (textarea) {
                if (document.visibilityState === 'visible' && textarea.isConnected) textarea.focus();
            }
        }, 50);
    };

    const removeTaggedUser = (userId: number) => {
        const targetUser = mentionableUsers.find(u => u.userId === userId);
        const nextTagged = (commentForm.data.tagged_user_ids || []).filter(id => id !== userId);
        
        let newContent = commentForm.data.content;
        if (targetUser) {
            newContent = newContent.replace(new RegExp(`@${targetUser.name}\\s*`, 'g'), '').trim();
        }

        commentForm.setData({
            content: newContent,
            tagged_user_ids: nextTagged,
        });
    };

    const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentionMenu && filteredMentions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (filteredMentions[mentionIndex]) {
                    insertMention(filteredMentions[mentionIndex]);
                }
                return;
            }
            if (e.key === 'Escape') {
                setShowMentionMenu(false);
                return;
            }
        }
    };

    const renderCommentContent = (content: string) => {
        if (!content) return null;

        const knownNames = mentionableUsers.map(u => u.name).filter(Boolean);
        const escapedNames = knownNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        
        const pattern = escapedNames.length > 0
            ? new RegExp(`@(${escapedNames.join('|')}|[a-zA-Z0-9_.-]+(?:\\s+[a-zA-Z0-9_.-]+)?)`, 'g')
            : /@([a-zA-Z0-9_.-]+(?:\s+[a-zA-Z0-9_.-]+)?)/g;

        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(content)) !== null) {
            const matchStart = match.index;
            const matchEnd = pattern.lastIndex;
            const mentionedName = match[1];

            if (matchStart > lastIndex) {
                parts.push(content.slice(lastIndex, matchStart));
            }

            const isCurrentUser = currentUser && (
                currentUser.name?.toLowerCase() === mentionedName.toLowerCase() ||
                currentUser.name?.toLowerCase().includes(mentionedName.toLowerCase())
            );

            parts.push(
                <span
                    key={`${matchStart}-${mentionedName}`}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold mx-0.5 align-baseline shadow-xs ${
                        isCurrentUser
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-400/50'
                            : 'bg-red-50 text-[#E31B23] border border-red-200/80 hover:bg-red-100/80'
                    }`}
                >
                    <span className="text-red-400 font-bold">@</span>
                    <span>{mentionedName}</span>
                    {isCurrentUser && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-200/70 px-1 rounded ml-0.5">
                            You
                        </span>
                    )}
                </span>
            );

            lastIndex = matchEnd;
        }

        if (lastIndex < content.length) {
            parts.push(content.slice(lastIndex));
        }

        return parts;
    };

    const addChecklist = (e: React.FormEvent) => {
        e.preventDefault();
        checklistForm.post(route('tasks.checklists.store', task.id), {
            onSuccess: () => checklistForm.reset(),
            preserveScroll: true,
        });
    };

    const toggleChecklist = (checklist: any) => {
        router.put(route('tasks.checklists.update', checklist.id), {
            is_completed: !checklist.is_completed,
        }, { preserveScroll: true });
    };

    const deleteChecklist = (checklist: any) => {
        router.delete(route('tasks.checklists.destroy', checklist.id), { preserveScroll: true });
    };

    const addComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentForm.data.content.trim() && !commentForm.data.file) return;

        commentForm.post(route('tasks.comments.store', task.id), {
            onSuccess: () => {
                commentForm.reset();
                if (commentFileInputRef.current) commentFileInputRef.current.value = '';
                setCommentFilePreview(null);
                setShowMentionMenu(false);
                setMentionQuery(null);
                setShowTagPicker(false);
            },
            preserveScroll: true,
        });
    };

    const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        commentForm.setData('file', file);
        if (file && file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setCommentFilePreview(url);
        } else {
            setCommentFilePreview(null);
        }
    };

    const clearCommentFile = () => {
        commentForm.setData('file', null);
        if (commentFileInputRef.current) commentFileInputRef.current.value = '';
        if (commentFilePreview) {
            URL.revokeObjectURL(commentFilePreview);
            setCommentFilePreview(null);
        }
    };

    const deleteComment = (commentId: number) => {
        if (confirm('Are you sure you want to delete this comment?')) {
            router.delete(route('tasks.comments.destroy', commentId), {
                preserveScroll: true,
            });
        }
    };

    const acknowledgeTask = () => {
        router.post(route('tasks.acknowledge', task.id), {}, { preserveScroll: true });
    };

    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [declineError, setDeclineError] = useState('');
    const [isDeclining, setIsDeclining] = useState(false);

    const handleDeclineTask = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = declineReason.trim();
        if (!trimmed) {
            setDeclineError('Please provide a reason for declining the task.');
            return;
        }
        if (trimmed.length < 5) {
            setDeclineError('The reason must be at least 5 characters long.');
            return;
        }

        setIsDeclining(true);
        setDeclineError('');

        router.post(route('tasks.decline', task.id), {
            reason: trimmed,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeclining(false);
                setIsDeclineModalOpen(false);
                setDeclineReason('');
            },
            onError: (errs) => {
                setIsDeclining(false);
                setDeclineError((Object.values(errs)[0] as string) || 'An error occurred while declining the task.');
            },
        });
    };

    const handleSaveTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editData.title.trim()) {
            setEditError('Task title is required.');
            return;
        }

        setIsSaving(true);
        setEditError('');

        router.put(route('tasks.update', task.id), {
            title: editData.title,
            description: editData.description,
            priority: editData.priority,
            status: editData.status,
            start_date: editData.start_date || null,
            deadline: editData.deadline || null,
            assignees: editData.assignees,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSaving(false);
                setIsEditing(false);
            },
            onError: (errs) => {
                setIsSaving(false);
                setEditError(Object.values(errs)[0] as string || 'An error occurred while saving.');
            },
        });
    };

    const handleDeleteTask = () => {
        if (confirm(`Are you sure you want to delete task "${task.title}"?`)) {
            setIsDeleting(true);
            router.delete(route('tasks.destroy', task.id), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleting(false);
                    onClose();
                },
                onError: () => {
                    setIsDeleting(false);
                },
            });
        }
    };

    const isAssignee = task.assignees?.some((a: any) => a.user?.id === currentUser?.id);
    const hasAcknowledged = task.assignees?.find((a: any) => a.user?.id === currentUser?.id)?.pivot?.acknowledged_at !== null;

    const canEditTask = !readOnly && Boolean(
        (task?.created_by && task.created_by === currentUser?.id) ||
        (task?.project && task.project.created_by === currentUser?.id) ||
        (project && project.created_by === currentUser?.id) ||
        (project?.owner_id && currentUser?.employee?.id === project.owner_id) ||
        (task?.project?.owner_id && currentUser?.employee?.id === task.project.owner_id) ||
        currentUser?.roles?.some((r: any) => ['Super Admin'].includes(r.name))
    );

    const canApproveTask = !readOnly && Boolean(
        (task?.created_by && task.created_by === currentUser?.id) ||
        (task?.project && task.project.created_by === currentUser?.id) ||
        (project && project.created_by === currentUser?.id) ||
        (project?.owner_id && currentUser?.employee?.id === project.owner_id) ||
        (task?.project?.owner_id && currentUser?.employee?.id === task.project.owner_id) ||
        currentUser?.roles?.some((r: any) => ['Super Admin', 'HRD / Admin', 'General Manager'].includes(r.name))
    );

    const handleQuickApprove = () => {
        router.put(route('tasks.update', task.id), {
            status: 'Approved',
        }, {
            preserveScroll: true,
            onError: (errs) => {
                alert(Object.values(errs)[0] as string || 'Gagal menyetujui task.');
            }
        });
    };

    const availableStatuses = statuses.length > 0
        ? statuses.map(s => typeof s === 'string' ? s : s.value || s.name)
        : ['To Do', 'In Progress', 'Done', 'Approved'];

    const availablePriorities = priorities.length > 0
        ? priorities.map(p => typeof p === 'string' ? p : p.value || p.name)
        : ['Low', 'Normal', 'High', 'Urgent'];

    const priorityBadgeColor = (p: string) => {
        switch (p) {
            case 'Urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Normal': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Low': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const statusBadgeColor = (s: string) => {
        switch (s) {
            case 'To Do': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Review': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Done': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'Approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

                <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl h-[85vh] flex flex-col z-10 border border-gray-100">
                    
                    {/* Header */}
                    <div className="bg-white px-6 py-4 border-b flex justify-between items-center shrink-0">
                        <div className="flex-1 min-w-0 pr-4">
                            {!isEditing ? (
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug break-words">
                                            {task.title}
                                        </h3>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${priorityBadgeColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusBadgeColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    {(() => {
                                        const deadlineInfo = getDeadlineStatus(task.deadline, task.status, task.completed_at);
                                        const isLate = Boolean(deadlineInfo?.isOverdue && !deadlineInfo?.isCompleted);

                                        return (
                                            <>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                    {task.project?.name && (
                                                        <span>Project: <span className="font-medium text-gray-700">{task.project.name}</span></span>
                                                    )}
                                                    {(() => {
                                                        const sStr = task.start_date ? String(task.start_date).split('T')[0] : null;
                                                        const eStr = task.deadline ? String(task.deadline).split('T')[0] : null;
                                                        if (sStr && eStr && sStr !== eStr) {
                                                            const dt1 = new Date(sStr);
                                                            const dt2 = new Date(eStr);
                                                            const days = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                                            return (
                                                                <span className="flex items-center gap-1.5 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                    Period: {formatDateUtil(sStr)} - {formatDateUtil(eStr)} ({days} {days === 1 ? 'day' : 'days'})
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    {task.deadline && (
                                                        <DeadlineBadge 
                                                            dueDate={task.deadline} 
                                                            status={task.status} 
                                                            completedAt={task.completed_at} 
                                                            size="sm" 
                                                        />
                                                    )}
                                                </div>

                                                {/* Explanatory Overdue Notice */}
                                                {isLate && (
                                                    <div className="mt-2.5 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-xs text-red-800 flex items-start gap-2 shadow-xs">
                                                        <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                        </svg>
                                                        <div>
                                                            <span className="font-bold">Overdue: </span>
                                                            This task passed the deadline on <span className="font-bold underline">{formatDateTime(task.deadline)}</span> and has not been completed.
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-bold text-[#E31B23] flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#E31B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Edit Task Information & Assignees
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Update title, details, or manage assigned team members</p>
                                </div>
                            )}
                        </div>

                        {/* Action buttons in header */}
                        <div className="flex items-center gap-2 shrink-0">
                            {canEditTask && (!isEditing ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#E31B23] text-xs font-semibold rounded-xl transition-colors border border-red-200"
                                    title="Edit Task"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Edit Task
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditError('');
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                                >
                                    Cancel Edit
                                </button>
                            ))}
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Tabs (visible when not editing) */}
                    {!isEditing && (
                        <div className="border-b border-slate-200 bg-white px-6 shrink-0 overflow-x-auto">
                            <nav className="-mb-px flex space-x-6 min-w-max" aria-label="Tabs">
                                {[
                                    { id: 'details', label: 'Details' },
                                    { id: 'checklists', label: `Checklists (${task.checklists?.length || 0})` },
                                    { id: 'comments', label: `Comments (${task.comments?.length || 0})` },
                                    { id: 'activity', label: `Activity (${task.activities?.length || 0})` },
                                    ...(assignmentHistory ? [{ id: 'assignment_history', label: `Assignment History (${assignmentHistory.length})` }] : []),
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`${
                                            activeTab === tab.id
                                                ? 'border-[#E31B23] text-[#E31B23]'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xs sm:text-sm`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    )}

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {/* EDIT MODE FORM */}
                        {isEditing ? (
                            <form onSubmit={handleSaveTask} className="space-y-5 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                {editError && (
                                    <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                                        {editError}
                                    </div>
                                )}

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Task Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editData.title}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm font-medium"
                                        placeholder="Enter task title..."
                                        required
                                    />
                                </div>

                                {/* Priority, Status, Deadline */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Priority <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={editData.priority}
                                            onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                            className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                        >
                                            {availablePriorities.map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Status <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={editData.status}
                                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                            className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                        >
                                            {availableStatuses.map((s) => {
                                                const isApproved = s === 'Approved';
                                                const isDisabled = isApproved && !canApproveTask;
                                                return (
                                                    <option key={s} value={s} disabled={isDisabled}>
                                                        {s} {isDisabled ? '(Assigner Only)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={editData.start_date}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditData({
                                                    ...editData,
                                                    start_date: val,
                                                    deadline: editData.deadline && editData.deadline >= val ? editData.deadline : val,
                                                });
                                            }}
                                            className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                                            Due Date (Deadline)
                                        </label>
                                        <input
                                            type="date"
                                            value={editData.deadline}
                                            min={editData.start_date || undefined}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setEditData({
                                                    ...editData,
                                                    deadline: val,
                                                    start_date: editData.start_date || val,
                                                });
                                            }}
                                            className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Assignees */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Assignees
                                        </label>
                                        <span className="text-xs text-gray-400">
                                            {editData.assignees.length} selected
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Filter by department or select team members to assign them to this task.
                                    </p>
                                    <AssigneeSelect
                                        employees={employees}
                                        selectedIds={editData.assignees}
                                        onChange={(ids) => setEditData({ ...editData, assignees: ids })}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Task Description
                                    </label>
                                    <textarea
                                        value={editData.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        rows={4}
                                        placeholder="Instructions or notes regarding this task..."
                                        className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                    />
                                </div>

                                {/* Form Actions */}
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        disabled={isDeleting || isSaving}
                                        onClick={handleDeleteTask}
                                        className="w-full sm:w-auto text-xs text-red-600 hover:text-red-800 font-semibold px-3 py-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <svg className="animate-spin h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                </svg>
                                                <span>Deleting...</span>
                                            </>
                                        ) : (
                                            'Delete Task'
                                        )}
                                    </button>

                                    <div className="flex w-full sm:w-auto justify-end gap-2">
                                        <button
                                            type="button"
                                            disabled={isSaving || isDeleting}
                                            onClick={() => setIsEditing(false)}
                                            className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSaving || isDeleting}
                                            className="w-full sm:w-auto px-5 py-2 bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white rounded-xl text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                    </svg>
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            /* VIEW MODE */
                            <>
                                {/* Details Tab */}
                                {activeTab === 'details' && (
                                    <div className="space-y-6">
                                        {/* Done / Waiting Approval Card */}
                                        {task.status === 'Done' && (
                                            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-xs">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
                                                            <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-sm text-amber-900">
                                                                    Work Output Awaiting Approval
                                                                </h4>
                                                                {canApproveTask && (
                                                                    <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                                                        You are the Assigner
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                                                                {canApproveTask
                                                                    ? 'Task has been completed by the team. Please review whether the work meets your expectations. If satisfied, click Approve. If revisions are required, you can return it to In Progress (Revision) and adjust the deadline if needed.'
                                                                    : 'Task has been marked as done by the assignee and is awaiting review and approval from the task assigner.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {canApproveTask && (
                                                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowRevisionModal(true)}
                                                                className="px-3.5 py-2 bg-white hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-300 shadow-xs transition-colors"
                                                            >
                                                                ↺ Revision & Adjust Deadline
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleQuickApprove}
                                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                                Approve Task
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Approved Card */}
                                        {task.status === 'Approved' && (
                                            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                                                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-emerald-900">
                                                            Task Approved
                                                        </h4>
                                                        <p className="text-xs text-emerald-800 mt-0.5">
                                                            Work output has been verified and meets the assigner's expectations. This task is counted as 100% completed.
                                                        </p>
                                                    </div>
                                                </div>
                                                {canApproveTask && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRevisionModal(true)}
                                                        className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-300 shadow-xs transition-colors shrink-0"
                                                        title="Return to In Progress if further adjustments are required"
                                                    >
                                                        ↺ Request Revision
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Description Card */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                            <h4 className="font-semibold text-gray-900 text-sm mb-2">Description</h4>
                                            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                {task.description || (
                                                    <span className="italic text-gray-400">No description provided.</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Assignees Card */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-semibold text-gray-900 text-sm">Assignees</h4>
                                                {canEditTask && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditing(true)}
                                                        className="text-xs font-semibold text-[#E31B23] hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full border border-red-200 inline-flex items-center gap-1 transition-colors"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                        Add / Manage Assignees
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {task.assignees?.map((assignee: any) => (
                                                    <span
                                                        key={assignee.id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-800 border border-red-200"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-[#E31B23]" />
                                                        <span>{assignee.user?.name || assignee.employee_number}</span>
                                                        {assignee.department?.name && (
                                                            <span className="text-[10px] text-[#E31B23]">({assignee.department.name})</span>
                                                        )}
                                                        {assignee.pivot?.acknowledged_at && (
                                                            <span
                                                                className="ml-1 text-emerald-600 font-bold"
                                                                title={`Acknowledged on ${new Date(assignee.pivot.acknowledged_at).toLocaleString('en-US')}`}
                                                            >
                                                                ✓
                                                            </span>
                                                        )}
                                                    </span>
                                                ))}
                                                {(!task.assignees || task.assignees.length === 0) && (
                                                    <p className="text-sm text-slate-400 italic">No team members assigned to this task yet.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Acknowledge Alert */}
                                        {!readOnly && isAssignee && !hasAcknowledged && (
                                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl shadow-xs">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="p-1 rounded-full bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-amber-900">
                                                                Task Assignment Pending Acknowledgement
                                                            </p>
                                                            <p className="text-xs text-amber-700 mt-0.5">
                                                                You have been assigned to this task. Please acknowledge receipt to accept it, or decline if you cannot take it.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setDeclineError('');
                                                                setDeclineReason('');
                                                                setIsDeclineModalOpen(true);
                                                            }}
                                                            className="text-xs bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-semibold py-1.5 px-3.5 rounded-xl shadow-2xs hover:border-rose-400 transition-colors cursor-pointer"
                                                        >
                                                            Decline Task
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={acknowledgeTask}
                                                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                                                        >
                                                            Acknowledge Task
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bottom Action Cards */}
                                        {canEditTask && (
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditing(true)}
                                                    className="px-4 py-2 bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                    Edit Information & Assignees
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Checklists Tab */}
                                {activeTab === 'checklists' && (
                                    <div className="space-y-4">
                                        {!readOnly && <form onSubmit={addChecklist} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={checklistForm.data.title}
                                                onChange={(e) => checklistForm.setData('title', e.target.value)}
                                                placeholder="Add new checklist item..."
                                                className="flex-1 rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-sm"
                                            />
                                            <button
                                                type="submit"
                                                disabled={checklistForm.processing || !checklistForm.data.title.trim()}
                                                className="bg-[#E31B23] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#c4141b] disabled:opacity-50 transition-colors"
                                            >
                                                Add
                                            </button>
                                        </form>}

                                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                                            {task.checklists?.map((item: any) => (
                                                <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                                                    <label className="flex items-center flex-1 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.is_completed}
                                                        disabled={readOnly}
                                                        onChange={() => { if (!readOnly) toggleChecklist(item); }}
                                                            className="h-4 w-4 text-[#E31B23] focus:ring-[#E31B23] border-slate-300 rounded-md"
                                                        />
                                                        <span className={`ml-3 text-sm ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                            {item.title}
                                                        </span>
                                                    </label>
                                                    {!readOnly && <button
                                                        onClick={() => deleteChecklist(item)}
                                                        className="text-red-500 hover:text-red-700 text-xs font-medium ml-2 p-1 rounded hover:bg-red-50"
                                                    >
                                                        Delete
                                                    </button>}
                                                </div>
                                            ))}
                                            {task.checklists?.length === 0 && (
                                                <div className="p-6 text-center text-sm text-gray-400">No checklist items yet.</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Comments Tab */}
                                {activeTab === 'comments' && (
                                    <div className="flex flex-col h-full space-y-4">
                                        <div className="flex-1 space-y-3">
                                            {task.comments?.map((comment: any) => {
                                                const isUserTagged = (comment.tagged_user_ids && Array.isArray(comment.tagged_user_ids) && currentUser?.id && comment.tagged_user_ids.includes(currentUser.id)) ||
                                                    (currentUser?.name && comment.content?.toLowerCase().includes(`@${currentUser.name.toLowerCase()}`));
                                                
                                                const canDelete = currentUser?.employee?.id === comment.employee_id || 
                                                    currentUser?.id === comment.employee?.user_id;

                                                return (
                                                    <div 
                                                        key={comment.id} 
                                                        className={`p-4 rounded-xl shadow-sm border transition-all duration-200 ${
                                                            isUserTagged 
                                                                ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-300/60' 
                                                                : 'bg-white border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#E31B23] to-red-400 text-white font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                                                    {comment.employee?.user?.profile_photo_url ? (
                                                                        <img src={comment.employee.user.profile_photo_url} alt="" className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        (comment.employee?.user?.name || 'E').charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-xs text-gray-900">
                                                                            {comment.employee?.user?.name || 'Employee'}
                                                                        </span>
                                                                        {comment.employee?.department?.name && (
                                                                            <span className="text-[10px] text-gray-400 hidden sm:inline">
                                                                                • {comment.employee.department.name}
                                                                            </span>
                                                                        )}
                                                                        {isUserTagged && (
                                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                                                <svg className="w-2.5 h-2.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                                                                                </svg>
                                                                                Mentioned You
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        {new Date(comment.created_at).toLocaleString('en-US', {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {!readOnly && canDelete && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => deleteComment(comment.id)}
                                                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors"
                                                                    title="Delete Comment"
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed pl-9">
                                                            {renderCommentContent(comment.content)}

                                                            {comment.file_path && (() => {
                                                                const fileUrl = comment.file_url || `/storage/${comment.file_path}`;
                                                                const isImg = comment.is_image || 
                                                                    (comment.file_type && comment.file_type.startsWith('image/')) ||
                                                                    (comment.file_name && /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(comment.file_name));
                                                                const sizeFormatted = comment.file_size 
                                                                    ? comment.file_size > 1024 * 1024 
                                                                        ? `${(comment.file_size / (1024 * 1024)).toFixed(1)} MB` 
                                                                        : `${(comment.file_size / 1024).toFixed(0)} KB` 
                                                                    : null;

                                                                if (isImg) {
                                                                    return (
                                                                        <div className="mt-2.5">
                                                                            <a
                                                                                href={fileUrl}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="group relative inline-block rounded-xl overflow-hidden border border-gray-200/90 bg-gray-50 shadow-xs hover:shadow-md transition-all max-w-sm"
                                                                            >
                                                                                <img
                                                                                    src={fileUrl}
                                                                                    alt={comment.file_name || 'Attached image'}
                                                                                    className="max-h-60 rounded-xl object-contain bg-slate-900/5 group-hover:scale-[1.01] transition-transform duration-200"
                                                                                />
                                                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-2 text-white text-[11px] flex items-center justify-between opacity-90 group-hover:opacity-100">
                                                                                    <span className="truncate font-medium">{comment.file_name || 'View Image'}</span>
                                                                                    {sizeFormatted && (
                                                                                        <span className="text-[10px] text-white/80 shrink-0 ml-2">{sizeFormatted}</span>
                                                                                    )}
                                                                                </div>
                                                                            </a>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div className="mt-2.5">
                                                                        <a
                                                                            href={fileUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            download
                                                                            className="inline-flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-red-50/60 hover:border-red-200 shadow-xs hover:shadow-sm transition-all max-w-md group"
                                                                        >
                                                                            <div className="h-9 w-9 rounded-lg bg-red-100 text-[#E31B23] flex items-center justify-center shrink-0 group-hover:bg-[#E31B23] group-hover:text-white transition-colors">
                                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                                </svg>
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="text-xs font-semibold text-slate-800 group-hover:text-[#E31B23] truncate">
                                                                                    {comment.file_name || 'Download Attachment'}
                                                                                </p>
                                                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                                                    {sizeFormatted || 'Attachment'} • Click to view / download
                                                                                </p>
                                                                            </div>
                                                                            <div className="text-slate-400 group-hover:text-[#E31B23] px-1">
                                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                                </svg>
                                                                            </div>
                                                                        </a>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {task.comments?.length === 0 && (
                                                <div className="text-center py-8 text-sm text-slate-400 bg-white rounded-xl border border-slate-200">
                                                    No comments yet. Start the conversation and use <span className="font-semibold text-[#E31B23]">@</span> to mention teammates!
                                                </div>
                                            )}
                                        </div>

                                        {!readOnly && <form onSubmit={addComment} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs relative">
                                            {/* Autocomplete Popup when typing @ */}
                                            {showMentionMenu && filteredMentions.length > 0 && (
                                                <div className="absolute bottom-full mb-2 left-4 right-4 sm:left-4 sm:right-auto sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
                                                    <div className="p-2 bg-red-50/80 border-b border-red-100 flex items-center justify-between">
                                                        <span className="text-[11px] font-semibold text-red-950 flex items-center gap-1.5">
                                                            <span className="flex h-2 w-2 relative">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E31B23]"></span>
                                                            </span>
                                                            Select Teammate to Mention (@)
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">↑↓ navigate • Enter select</span>
                                                    </div>
                                                    <div className="max-h-52 overflow-y-auto py-1">
                                                        {filteredMentions.map((user, idx) => (
                                                            <button
                                                                key={user.userId}
                                                                type="button"
                                                                onClick={() => insertMention(user)}
                                                                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                                                                    idx === mentionIndex ? 'bg-red-50 text-red-950' : 'hover:bg-slate-50 text-slate-700'
                                                                }`}
                                                            >
                                                                <div className="h-7 w-7 rounded-full bg-red-100 text-[#E31B23] font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                                                                    {user.profilePhoto ? (
                                                                        <img src={user.profilePhoto} alt="" className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        user.name.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-xs font-semibold truncate">{user.name}</span>
                                                                        {user.isAssignee && (
                                                                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                                                                                Assigned
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {user.departmentName && (
                                                                        <p className="text-[10px] text-gray-400 truncate">{user.departmentName}</p>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Textarea */}
                                            <div className="relative">
                                                <textarea
                                                    ref={commentTextareaRef}
                                                    value={commentForm.data.content}
                                                    onChange={handleCommentChange}
                                                    onKeyDown={handleCommentKeyDown}
                                                    rows={3}
                                                    placeholder="Write a message... Attach files/photos or type @ to mention teammates"
                                                    className="w-full rounded-xl border-slate-300 shadow-xs focus:border-[#E31B23] focus:ring-[#E31B23] text-xs sm:text-sm mb-2"
                                                />
                                            </div>

                                            {/* Hidden file input */}
                                            <input 
                                                type="file" 
                                                ref={commentFileInputRef} 
                                                onChange={handleCommentFileChange} 
                                                className="hidden" 
                                            />

                                            {/* File attachment preview inside chat composer */}
                                            {commentForm.data.file && (
                                                <div className="mb-2.5 p-2 bg-red-50/80 border border-red-200/90 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-150">
                                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                                        {commentFilePreview ? (
                                                            <img 
                                                                src={commentFilePreview} 
                                                                alt="Upload preview" 
                                                                className="h-10 w-10 rounded-lg object-cover border border-red-200 shrink-0 bg-white" 
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-lg bg-red-100 text-[#E31B23] flex items-center justify-center shrink-0">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                                                                    {commentForm.data.file.name}
                                                                </span>
                                                                <span className="text-[10px] bg-red-100 text-red-800 font-medium px-1.5 py-0.5 rounded-full shrink-0">
                                                                    {commentForm.data.file.size > 1024 * 1024 
                                                                        ? `${(commentForm.data.file.size / (1024 * 1024)).toFixed(1)} MB` 
                                                                        : `${(commentForm.data.file.size / 1024).toFixed(0)} KB`}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-red-600">Attached to message</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={clearCommentFile}
                                                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white/80 transition-colors shrink-0"
                                                        title="Remove attachment"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}

                                            {commentForm.errors.file && (
                                                <p className="text-rose-600 text-xs mb-2">{commentForm.errors.file}</p>
                                            )}
                                            {commentForm.errors.content && (
                                                <p className="text-rose-600 text-xs mb-2">{commentForm.errors.content}</p>
                                            )}

                                            {/* Quick Mention / Tag bar & Toolbar */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {/* Attach button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => commentFileInputRef.current?.click()}
                                                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-medium ${
                                                            commentForm.data.file 
                                                                ? 'bg-red-50 text-[#E31B23] border-red-200 font-semibold shadow-xs ring-1 ring-red-100' 
                                                                : 'bg-white text-slate-700 border-slate-300 hover:border-red-300 hover:bg-red-50/50 hover:text-[#E31B23]'
                                                        }`}
                                                        title="Attach file or image"
                                                    >
                                                        <svg className="w-3.5 h-3.5 text-[#E31B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                        </svg>
                                                        <span>{commentForm.data.file ? 'Attached' : 'Attach'}</span>
                                                    </button>

                                                    <span className="text-[11px] font-medium text-slate-400 mx-0.5">•</span>

                                                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5 text-[#E31B23]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                        </svg>
                                                        Tag:
                                                    </span>

                                                    {/* Quick Assignees chips */}
                                                    {mentionableUsers.filter(u => u.isAssignee).map(user => {
                                                        const isTagged = (commentForm.data.tagged_user_ids || []).includes(user.userId) || 
                                                            commentForm.data.content.includes(`@${user.name}`);
                                                        return (
                                                            <button
                                                                key={user.userId}
                                                                type="button"
                                                                onClick={() => insertMention(user)}
                                                                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                                                                    isTagged 
                                                                        ? 'bg-red-50 text-[#E31B23] border-red-200 font-semibold ring-1 ring-red-100' 
                                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-red-50/50 hover:text-[#E31B23]'
                                                                }`}
                                                                title={`Tag ${user.name}`}
                                                            >
                                                                <span>@{user.name.split(' ')[0]}</span>
                                                                {isTagged && <span className="text-[#E31B23] font-bold">✓</span>}
                                                            </button>
                                                        );
                                                    })}

                                                    {/* Button to show tag picker dropdown for other employees */}
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowTagPicker(!showTagPicker)}
                                                            className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-500 hover:text-[#E31B23] hover:border-red-300 bg-white transition-colors flex items-center gap-1"
                                                        >
                                                            <span>+ Select Employee</span>
                                                        </button>

                                                        {showTagPicker && (
                                                            <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2.5">
                                                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                                                                    <span className="text-xs font-semibold text-slate-800">Mention Teammate</span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => setShowTagPicker(false)}
                                                                        className="text-slate-400 hover:text-slate-600 text-xs"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                                <div className="max-h-44 overflow-y-auto space-y-1">
                                                                    {mentionableUsers.map(user => (
                                                                        <button
                                                                            key={user.userId}
                                                                            type="button"
                                                                            onClick={() => insertMention(user)}
                                                                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-xs flex items-center justify-between transition-colors group"
                                                                        >
                                                                            <span className="truncate group-hover:text-[#E31B23] font-medium text-slate-700">{user.name}</span>
                                                                            {user.departmentName && (
                                                                                <span className="text-[10px] text-slate-400 ml-1 shrink-0">{user.departmentName}</span>
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Submit Button */}
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={commentForm.processing || (!commentForm.data.content.trim() && !commentForm.data.file)}
                                                        className="bg-[#E31B23] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#c4141b] active:bg-[#a30f15] focus:outline-none focus:ring-2 focus:ring-[#E31B23] focus:ring-offset-2 disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors"
                                                    >
                                                        {commentForm.processing ? (
                                                             <>
                                                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                                </svg>
                                                                <span>Sending...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                                </svg>
                                                                <span>Send</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Tagged users summary banner */}
                                            {(commentForm.data.tagged_user_ids?.length > 0 || commentForm.data.content.includes('@')) && (
                                                <div className="mt-2 text-[11px] text-red-700 bg-red-50/70 border border-red-100 rounded-xl p-2.5 flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-[#E31B23] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                                    </svg>
                                                    <span>Mentioned teammates (@) will automatically receive notifications and emails so they don't miss updates.</span>
                                                </div>
                                            )}
                                        </form>}
                                    </div>
                                )}

                                {/* Activity History Tab */}
                                {activeTab === 'activity' && (
                                    <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                        <ul className="relative border-l border-slate-200 ml-3 space-y-6">
                                            {task.activities?.map((activity: any) => (
                                                <li key={activity.id} className="ml-6">
                                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-red-100 rounded-full -left-3 ring-8 ring-white">
                                                        <svg className="w-3 h-3 text-[#E31B23]" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"></path>
                                                        </svg>
                                                    </span>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs sm:text-sm font-semibold text-slate-900">{activity.description}</span>
                                                        <span className="text-[10px] text-slate-500 mt-0.5">
                                                            By {activity.employee?.user?.name || 'System'} • {formatDateTime(activity.created_at)}
                                                        </span>
                                                        {activity.old_value && activity.new_value && (
                                                            <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 border border-slate-200 rounded-lg inline-block">
                                                                <span className="line-through text-rose-500 mr-2">{JSON.stringify(activity.old_value)}</span>
                                                                <span>➔</span>
                                                                <span className="ml-2 font-semibold text-emerald-600">{JSON.stringify(activity.new_value)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                            {task.activities?.length === 0 && (
                                                <div className="text-sm text-slate-400 ml-4">No activity history yet.</div>
                                            )}
                                        </ul>
                                    </div>
                                )}
                                {activeTab === 'assignment_history' && assignmentHistory && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-slate-500">Permanent assignment history based on the receiving department when assigned. Employee transfers do not alter this record.</p>
                                        {assignmentHistory.map((history) => (
                                            <div key={history.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-semibold text-slate-900">{history.employee_name}</span>
                                                    {history.employee_number && <span className="text-xs text-slate-400">{history.employee_number}</span>}
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                        history.declined_at
                                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                            : history.unassigned_at
                                                            ? 'bg-slate-100 text-slate-600'
                                                            : 'bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                        {history.declined_at ? 'Declined' : history.unassigned_at ? 'Removed' : 'Assigned'}
                                                    </span>
                                                    {history.source === 'backfill' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800" title="Imported from current known assignment; original assignment details may be unavailable.">Imported*</span>}
                                                </div>
                                                <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                                    <span>Department at assignment: <strong>{history.department_name || 'Unknown'}</strong></span>
                                                    <span>Assigned by: {history.assigned_by || 'Unknown'}</span>
                                                    <span>Assigned: {formatDateTime(history.assigned_at)}</span>
                                                    <span>Acknowledged: {history.acknowledged_at ? formatDateTime(history.acknowledged_at) : (history.declined_at ? 'Declined' : 'Pending')}</span>
                                                    {history.unassigned_at && !history.declined_at && <span>Unassigned: {formatDateTime(history.unassigned_at)}</span>}
                                                    {history.declined_at && <span>Declined: {formatDateTime(history.declined_at)}</span>}
                                                </div>
                                                {history.declined_at && (
                                                    <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50/70 border border-rose-200 text-xs text-rose-800">
                                                        <span className="font-bold">Decline Reason:</span> {history.decline_reason || 'No reason provided'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {assignmentHistory.length === 0 && <p className="rounded-lg bg-white p-4 text-sm text-slate-500">No assignment history for this department.</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Decline Task Modal */}
            {isDeclineModalOpen && (
                <div className="fixed inset-0 z-[60] overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-slate-900">Decline Task Assignment</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Please provide a reason why you are unable to accept this task. The task creator will be notified.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleDeclineTask} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Reason for Declining <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    value={declineReason}
                                    onChange={(e) => {
                                        setDeclineReason(e.target.value);
                                        if (declineError) setDeclineError('');
                                    }}
                                    placeholder="Explain why you are declining this task (e.g., current workload, out of scope, on leave)..."
                                    className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 shadow-2xs focus:border-rose-500 focus:ring-1 focus:ring-rose-500 p-3 placeholder:text-slate-400"
                                    autoFocus
                                />
                                {declineError && (
                                    <p className="text-xs font-medium text-rose-600 mt-1">{declineError}</p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDeclineModalOpen(false);
                                        setDeclineError('');
                                        setDeclineReason('');
                                    }}
                                    disabled={isDeclining}
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isDeclining || !declineReason.trim()}
                                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                                >
                                    {isDeclining ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Declining...</span>
                                        </>
                                    ) : (
                                        <span>Confirm Decline</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Revision Modal */}
            {showRevisionModal && (
                <TaskRevisionModal
                    task={task}
                    show={showRevisionModal}
                    onClose={() => setShowRevisionModal(false)}
                />
            )}
        </div>
    );
}
