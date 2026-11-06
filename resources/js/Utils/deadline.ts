/**
 * Deadline status evaluation utility for SIPU Swiss-Belinn SKA Pekanbaru
 * Evaluates deadlines with Asia/Jakarta (WIB) timezone awareness and exact time-of-day precision.
 */

import { parseDate, formatDate, formatDateTime, formatTime } from './date';

export type DeadlineVariant = 
    | 'danger'        // Overdue (Late) - Red badge with warning icon
    | 'warning'       // Due today - Orange badge
    | 'soon'          // Due 1-3 days - Yellow/Amber badge
    | 'neutral'       // Due > 3 days - Neutral text
    | 'success'       // Completed on time - Green badge
    | 'late_done';    // Completed late - Gray/Rose badge

export interface DeadlineStatusResult {
    type: 'overdue' | 'today' | 'soon' | 'neutral' | 'completed_on_time' | 'completed_late';
    label: string;
    variant: DeadlineVariant;
    isOverdue: boolean;
    isCompleted: boolean;
    dueDateFormatted: string;
    dueDateTimeFormatted: string;
    diffDays: number;
    diffHours: number;
    explanation?: string;
}

/**
 * Determine if a task status corresponds to "Completed"
 */
export function isTaskCompleted(status?: string | null): boolean {
    if (!status) return false;
    const s = String(status).trim().toLowerCase();
    return s === 'approved' || s === 'completed' || s === 'selesai';
}

/**
 * Compute the deadline status and badge properties
 * 
 * Rules:
 * - Belum selesai, due date sudah lewat: Badge merah + ikon peringatan: "Terlambat 2 hari" (jika < 1 hari: "Terlambat 5 jam")
 * - Belum selesai, due hari ini: Badge oranye: "Jatuh tempo hari ini"
 * - Belum selesai, due 1-3 hari lagi: Badge kuning: "Sisa 2 hari"
 * - Belum selesai, due lebih dari 3 hari: Teks netral: tanggal biasa
 * - Selesai sebelum/tepat due date: Badge hijau: "Selesai tepat waktu"
 * - Selesai setelah due date: Badge abu-merah: "Selesai terlambat 1 hari"
 */
export function getDeadlineStatus(
    dueDate: string | Date | null | undefined,
    status?: string | null,
    completedAt?: string | Date | null
): DeadlineStatusResult | null {
    const due = parseDate(dueDate);
    if (!due) return null;

    const now = new Date();
    const dueDateFormatted = formatDate(due);
    const dueDateTimeFormatted = formatDateTime(due);
    const completed = isTaskCompleted(status);

    // 1. Task Completed Cases
    if (completed) {
        const finishDate = parseDate(completedAt) || now;
        const finishDiffMs = finishDate.getTime() - due.getTime();

        if (finishDiffMs > 0) {
            const lateDays = Math.max(1, Math.floor(finishDiffMs / (24 * 60 * 60 * 1000)));
            return {
                type: 'completed_late',
                label: `Completed ${lateDays} day${lateDays > 1 ? 's' : ''} late`,
                variant: 'late_done',
                isOverdue: false,
                isCompleted: true,
                dueDateFormatted,
                dueDateTimeFormatted,
                diffDays: lateDays,
                diffHours: Math.floor(finishDiffMs / (60 * 60 * 1000)),
                explanation: `Task was completed past the deadline on ${dueDateTimeFormatted}.`,
            };
        }

        return {
            type: 'completed_on_time',
            label: 'Completed on time',
            variant: 'success',
            isOverdue: false,
            isCompleted: true,
            dueDateFormatted,
            dueDateTimeFormatted,
            diffDays: 0,
            diffHours: 0,
            explanation: `Task completed on time before the deadline of ${dueDateTimeFormatted}.`,
        };
    }

    // 2. Uncompleted Task Cases
    const diffMs = due.getTime() - now.getTime();

    // Past deadline (Overdue)
    if (diffMs < 0) {
        const absDiffMs = Math.abs(diffMs);
        const hoursOverdue = Math.floor(absDiffMs / (60 * 60 * 1000));
        const daysOverdue = Math.floor(absDiffMs / (24 * 60 * 60 * 1000));

        const label = daysOverdue < 1 
            ? `${Math.max(1, hoursOverdue)} hour${hoursOverdue > 1 ? 's' : ''} overdue` 
            : `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`;

        return {
            type: 'overdue',
            label,
            variant: 'danger',
            isOverdue: true,
            isCompleted: false,
            dueDateFormatted,
            dueDateTimeFormatted,
            diffDays: -daysOverdue,
            diffHours: -hoursOverdue,
            explanation: `This task passed the deadline on ${dueDateTimeFormatted} and has not been completed.`,
        };
    }

    // Check if due is today in Asia/Jakarta timezone
    const isToday = formatDate(due) === formatDate(now);
    if (isToday) {
        return {
            type: 'today',
            label: 'Due today',
            variant: 'warning',
            isOverdue: false,
            isCompleted: false,
            dueDateFormatted,
            dueDateTimeFormatted,
            diffDays: 0,
            diffHours: Math.floor(diffMs / (60 * 60 * 1000)),
            explanation: `The deadline for this task is today at ${formatTime(due)}.`,
        };
    }

    // Calculate days left
    const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (daysLeft >= 1 && daysLeft <= 3) {
        return {
            type: 'soon',
            label: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`,
            variant: 'soon',
            isOverdue: false,
            isCompleted: false,
            dueDateFormatted,
            dueDateTimeFormatted,
            diffDays: daysLeft,
            diffHours: Math.floor(diffMs / (60 * 60 * 1000)),
            explanation: `This task has ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining before the deadline of ${dueDateTimeFormatted}.`,
        };
    }

    // Due in more than 3 days: Neutral text with formatted date
    return {
        type: 'neutral',
        label: dueDateFormatted,
        variant: 'neutral',
        isOverdue: false,
        isCompleted: false,
        dueDateFormatted,
        dueDateTimeFormatted,
        diffDays: daysLeft,
        diffHours: Math.floor(diffMs / (60 * 60 * 1000)),
    };
}

/**
 * Sort tasks with overdue items first (oldest overdue first),
 * followed by due today, then upcoming nearest deadline, then tasks with no deadline.
 */
export function sortTasksByDeadlineAndOverdue<T extends { deadline?: string | Date | null; status?: string | null }>(
    tasks: T[]
): T[] {
    const now = new Date().getTime();

    return [...tasks].sort((a, b) => {
        const deadA = a.deadline ? new Date(a.deadline).getTime() : null;
        const deadB = b.deadline ? new Date(b.deadline).getTime() : null;

        // Place tasks without deadline at the very bottom
        if (deadA === null && deadB === null) return 0;
        if (deadA === null) return 1;
        if (deadB === null) return -1;

        const isOverdueA = deadA < now && !isTaskCompleted(a.status);
        const isOverdueB = deadB < now && !isTaskCompleted(b.status);

        // 1. Both overdue: earliest deadline (longest overdue) comes first
        if (isOverdueA && isOverdueB) {
            return deadA - deadB;
        }

        // 2. One is overdue: overdue comes first
        if (isOverdueA) return -1;
        if (isOverdueB) return 1;

        // 3. Neither overdue: upcoming with earliest deadline first
        return deadA - deadB;
    });
}
