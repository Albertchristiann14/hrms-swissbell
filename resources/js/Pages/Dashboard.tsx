import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import Modal from '@/Components/Modal';
import DeadlineBadge from '@/Components/DeadlineBadge';
import TextLink from '@/Components/TextLink';
import { formatDate, formatDateTime } from '@/Utils/date';
import { isTaskCompleted, sortTasksByDeadlineAndOverdue } from '@/Utils/deadline';
import { pluralize, formatActivitySentence } from '@/Utils/format';

const EmployeeDashboard = lazy(() => import('./Dashboard/Partials/EmployeeDashboard'));
const SupervisorDashboard = lazy(() => import('./Dashboard/Partials/SupervisorDashboard'));
const HRDashboard = lazy(() => import('./Dashboard/Partials/HRDashboard'));
const ManagerDashboard = lazy(() => import('./Dashboard/Partials/ManagerDashboard'));
const EmployeeHRDashboard = lazy(() => import('./Dashboard/Partials/EmployeeHRDashboard'));

const DashboardLoadingFallback = () => (
    <div className="flex items-center justify-center p-12 min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-red-200 border-t-[#E31B23] rounded-full animate-spin" />
            <span className="text-xs text-gray-500 font-medium">Loading dashboard...</span>
        </div>
    </div>
);

interface ShortcutOption {
    id: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    href: string;
    badge?: string | number | null;
    badgeColor?: string;
    colorClasses: string;
    visible?: boolean;
}

interface LauncherStats {
    activeTasks?: number;
    masterKeyOnRequest?: number;
    pendingLeaves?: number;
    pendingOvertime?: number;
    totalEmployees?: number;
    totalDepartments?: number;
    openItTickets?: number;
    totalItAssets?: number;
    pendingRoomReturns?: number;
    myActiveRoomBorrowings?: number;
}

interface DashboardProps {
    view?: string;
    role: string;
    launcherStats?: LauncherStats;
    announcements?: any[];
    employeeData?: any;
    supervisorData?: any;
    hrData?: any;
    managerData?: any;
    employeeHrData?: any;
}

interface AppItem {
    id: string;
    name: string;
    description: string;
    category: string;
    href?: string;
    action?: () => void;
    icon: React.ReactNode;
    gradient: string;
    badge?: string | number | null;
    badgeColor?: string;
    visible?: boolean;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
}

function getTodayDate(): string {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function Dashboard({
    view = 'launcher',
    role,
    launcherStats = {},
    announcements = [],
    employeeData,
    supervisorData,
    hrData,
    managerData,
    employeeHrData,
}: DashboardProps) {
    const user = usePage().props.auth.user as any;
    const [searchQuery, setSearchQuery] = useState('');
    const [adminHrTab, setAdminHrTab] = useState<'management' | 'self-service'>('management');
    const searchInputRef = useRef<HTMLInputElement>(null);

    const isSuperAdmin = user.roles?.some((r: any) => r.name === 'Super Admin');
    const isHRD = user.roles?.some((r: any) => r.name === 'HRD / Admin');
    const isManager = user.roles?.some((r: any) => r.name === 'General Manager');
    const isSupervisor = user.roles?.some((r: any) => ['Supervisor', 'Head of Department'].includes(r.name));
    // Management / HRD access level (Super Admin, HRD / Admin, General Manager)
    const isAdmin = isSuperAdmin || isHRD || isManager;
    const canViewPerformance = isAdmin;
    const canViewProjects = isAdmin || isSupervisor;
    const isHOD = user.roles?.some((r: any) => r.name === 'Head of Department');
    const isHousekeeping = user.employee?.department?.name === 'Housekeeping';
    const isItStaff = isSuperAdmin || isManager || (user.employee?.department?.name?.toLowerCase() === 'it');
    const canAccessHousekeeping = isAdmin || isHOD || isHousekeeping || isItStaff;
    const isSecurityUser = user.roles?.some((r: any) => r.name === 'Security') || isAdmin;

    // Custom Quick Shortcuts state (localStorage per user)
    const storageKey = `user_quick_shortcuts_${user.id}`;
    const [savedShortcutIds, setSavedShortcutIds] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {
            // ignore
        }
        return []; // starts empty by default as requested!
    });
    const [isCustomizingShortcuts, setIsCustomizingShortcuts] = useState(false);
    const [shortcutModalSearch, setShortcutModalSearch] = useState('');
    const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);

    // Listen for Ctrl+K / Cmd+K shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const pendingHrCount = (launcherStats.pendingLeaves || 0) + (launcherStats.pendingOvertime || 0);

    // Core Suite Apps displayed on Home Launcher Grid
    const coreApps: AppItem[] = useMemo(() => [
        {
            id: 'task-management',
            name: 'Task Management',
            description: 'Manage team tasks, kanban boards, and project tracking',
            category: 'Operations',
            action: () => router.get(route('dashboard'), { view: 'tasks' }),
            gradient: 'from-[#E31B23] to-[#c4141b]',
            badge: launcherStats.activeTasks && launcherStats.activeTasks > 0 ? `${launcherStats.activeTasks} Tasks` : null,
            badgeColor: 'bg-[#E31B23]',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
        },
        {
            id: 'human-resources',
            name: isAdmin ? 'Human Resources (HR)' : (isSupervisor ? 'HR & Team Hub' : 'Human Resources (HR)'),
            description: isAdmin
                ? 'Integrated HR Suite: Records, attendance, leave, overtime, payroll & KPI'
                : (isSupervisor
                    ? 'Team attendance, approvals, employee directory & HR self-service'
                    : 'Employee Self-Service: My attendance, leave requests, overtime (SPKL) & payslips'),
            category: 'Human Capital',
            action: () => router.get(route('dashboard'), { view: 'hr' }),
            gradient: 'from-red-600 via-rose-600 to-red-700',
            badge: isAdmin
                ? (pendingHrCount > 0 ? pluralize(pendingHrCount, 'Pending', 'Pending') : launcherStats.totalEmployees && launcherStats.totalEmployees > 0 ? `${launcherStats.totalEmployees} Staff` : null)
                : (isSupervisor
                    ? ((launcherStats.pendingLeaves || 0) + (launcherStats.pendingOvertime || 0) > 0 ? pluralize((launcherStats.pendingLeaves || 0) + (launcherStats.pendingOvertime || 0), 'Pending', 'Pending') : null)
                    : ((launcherStats.pendingLeaves || 0) + (launcherStats.pendingOvertime || 0) > 0 ? pluralize((launcherStats.pendingLeaves || 0) + (launcherStats.pendingOvertime || 0), 'Permohonan', 'Permohonan') : null)),
            badgeColor: (pendingHrCount > 0 || (launcherStats.pendingLeaves || 0) + (launcherStats.pendingOvertime || 0) > 0) ? 'bg-amber-500' : 'bg-[#E31B23]',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            id: 'it-operations',
            name: isItStaff ? 'IT Operations' : 'IT Helpdesk',
            description: isItStaff
                ? 'IT Asset inventory, hardware tracking, and IT Helpdesk ticketing'
                : 'Report hotel IT issues, track resolution status, and technician response',
            category: 'IT & Facilities',
            href: isItStaff ? route('it.index', { tab: 'overview' }) : route('it.index', { tab: 'tickets' }),
            gradient: 'from-red-600 to-rose-700',
            badge: launcherStats.openItTickets && launcherStats.openItTickets > 0 ? `${launcherStats.openItTickets} Active Tickets` : (isItStaff && launcherStats.totalItAssets ? pluralize(launcherStats.totalItAssets, 'Asset', 'Assets') : null),
            badgeColor: launcherStats.openItTickets && launcherStats.openItTickets > 0 ? 'bg-amber-500' : 'bg-red-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            id: 'room-borrowing',
            name: 'Room & Key Management',
            description: 'Room catalog, key custody, and physical return verification at Security post',
            category: 'Facilities & Security',
            href: route('room-borrowing.index'),
            gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
            badge: isSecurityUser && launcherStats.pendingRoomReturns && launcherStats.pendingRoomReturns > 0
                ? `${launcherStats.pendingRoomReturns} Pending Return`
                : launcherStats.myActiveRoomBorrowings && launcherStats.myActiveRoomBorrowings > 0
                    ? pluralize(launcherStats.myActiveRoomBorrowings, 'Key Borrowed', 'Keys Borrowed')
                    : null,
            badgeColor: isSecurityUser && launcherStats.pendingRoomReturns && launcherStats.pendingRoomReturns > 0 ? 'bg-amber-500' : 'bg-emerald-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
        },
        {
            id: 'knowledge-information',
            name: 'Knowledge & Information',
            description: 'Company announcements, hotel SOP digital repository, and policy archives',
            category: 'Knowledge & Information',
            href: route('announcements.index'),
            gradient: 'from-teal-600 via-emerald-600 to-teal-700',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
        },
        {
            id: 'my-overview',
            name: 'Personal Dashboard',
            description: 'Personal work stats, individual attendance, and account performance',
            category: 'Personal',
            action: () => router.get(route('dashboard'), { view: 'overview' }),
            gradient: 'from-slate-700 to-slate-900',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
        },
    ].filter(a => a.visible !== false), [launcherStats, pendingHrCount, isAdmin, isSupervisor, isItStaff, isSecurityUser]);

    // All available shortcut options that user can pin to their Quick Shortcuts bar
    const availableShortcutOptions: ShortcutOption[] = useMemo(() => [
        {
            id: 'attendance',
            title: isAdmin ? 'Attendance Logs' : 'My Attendance',
            description: isAdmin ? 'View all staff attendance records & time logs' : 'View personal daily attendance records',
            category: 'Human Capital',
            icon: '🕒',
            href: isAdmin ? route('attendance.index') : route('attendance.my'),
            colorClasses: 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/90 border-emerald-200/60',
            visible: true,
        },
        {
            id: 'schedules',
            title: 'Shift Roster (Scheduler)',
            description: 'Weekly employee shift scheduling and assignment roster',
            category: 'Human Capital',
            icon: '📅',
            href: route('schedules.index'),
            colorClasses: 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/90 border-indigo-200/60',
            visible: isAdmin,
        },
        {
            id: 'shifts',
            title: 'Work Shift Master',
            description: 'Manage hotel operational shift hours & grace periods',
            category: 'Human Capital',
            icon: '⏰',
            href: route('shifts.index'),
            colorClasses: 'text-purple-700 bg-purple-50/70 hover:bg-purple-100/90 border-purple-200/60',
            visible: isAdmin,
        },
        {
            id: 'leave',
            title: 'Leave Requests',
            description: 'Apply for leave, check balance, or review team leave requests',
            category: 'Human Capital',
            icon: '🏖️',
            href: route('leave.index'),
            badge: launcherStats.pendingLeaves && launcherStats.pendingLeaves > 0 ? `${launcherStats.pendingLeaves}` : null,
            badgeColor: 'bg-sky-600',
            colorClasses: 'text-sky-700 bg-sky-50/70 hover:bg-sky-100/90 border-sky-200/60',
            visible: true,
        },
        {
            id: 'overtime',
            title: 'Overtime (SPKL)',
            description: 'Overtime request submissions and supervisor approvals',
            category: 'Human Capital',
            icon: '⚡',
            href: route('overtime.index'),
            badge: launcherStats.pendingOvertime && launcherStats.pendingOvertime > 0 ? `${launcherStats.pendingOvertime}` : null,
            badgeColor: 'bg-rose-600',
            colorClasses: 'text-rose-700 bg-rose-50/70 hover:bg-rose-100/90 border-rose-200/60',
            visible: true,
        },
        {
            id: 'payroll',
            title: isAdmin ? 'Payroll Management' : 'My Payslips',
            description: isAdmin ? 'Process monthly payroll batches and salary records' : 'Download and view monthly salary slips',
            category: 'Human Capital',
            icon: '💵',
            href: isAdmin ? route('payroll.index') : route('payroll.my'),
            colorClasses: 'text-teal-700 bg-teal-50/70 hover:bg-teal-100/90 border-teal-200/60',
            visible: true,
        },
        {
            id: 'employees',
            title: 'Employee Records',
            description: 'Employee profiles, job contracts, and department assignments',
            category: 'Human Capital',
            icon: '👥',
            href: route('employees.index'),
            colorClasses: 'text-fuchsia-700 bg-fuchsia-50/70 hover:bg-fuchsia-100/90 border-fuchsia-200/60',
            visible: isAdmin,
        },
        {
            id: 'tasks',
            title: 'Task List',
            description: 'Team task management, kanban board, and task tracking',
            category: 'Operations',
            icon: '📋',
            href: route('tasks.index'),
            badge: launcherStats.activeTasks && launcherStats.activeTasks > 0 ? `${launcherStats.activeTasks}` : null,
            badgeColor: 'bg-[#E31B23]',
            colorClasses: 'text-slate-700 hover:text-[#E31B23] bg-red-50/70 hover:bg-red-100/90 border-red-200/60',
            visible: true,
        },
        {
            id: 'tasks-kanban',
            title: 'My Kanban Board',
            description: 'Visual task stages and personal workflow board',
            category: 'Operations',
            icon: '📌',
            href: route('tasks.kanban'),
            colorClasses: 'text-blue-700 bg-blue-50/70 hover:bg-blue-100/90 border-blue-200/60',
            visible: true,
        },
        {
            id: 'tasks-calendar',
            title: 'Task Calendar',
            description: 'View project deadlines and task milestones on calendar',
            category: 'Operations',
            icon: '🗓️',
            href: route('tasks.calendar'),
            colorClasses: 'text-amber-700 bg-amber-50/70 hover:bg-amber-100/90 border-amber-200/60',
            visible: true,
        },
        {
            id: 'projects',
            title: 'Team Projects',
            description: 'Manage departmental project initiatives and milestones',
            category: 'Operations',
            icon: '📁',
            href: route('projects.index'),
            colorClasses: 'text-violet-700 bg-violet-50/70 hover:bg-violet-100/90 border-violet-200/60',
            visible: canViewProjects,
        },
        {
            id: 'it-support',
            title: 'IT Helpdesk Support',
            description: 'Report technical issue or check technician resolution status',
            category: 'IT & Facilities',
            icon: '🛠️',
            href: route('it.index', { tab: 'tickets' }),
            badge: launcherStats.openItTickets && launcherStats.openItTickets > 0 ? `${launcherStats.openItTickets}` : null,
            badgeColor: 'bg-amber-500',
            colorClasses: 'text-slate-700 hover:text-red-700 bg-red-50/70 hover:bg-red-100/90 border-red-200/60',
            visible: true,
        },
        {
            id: 'it-assets',
            title: 'IT Asset Inventory',
            description: 'Hotel computer, server, and networking hardware assets',
            category: 'IT & Facilities',
            icon: '💻',
            href: route('it.index', { tab: 'assets' }),
            colorClasses: 'text-rose-700 bg-rose-50/70 hover:bg-rose-100/90 border-rose-200/60',
            visible: isItStaff,
        },
        {
            id: 'power-pro',
            title: 'PowerPro ID Requests',
            description: 'Request or approve PowerPro Hotel PMS system access IDs',
            category: 'IT & Facilities',
            icon: '🔑',
            href: route('power-pro.index'),
            colorClasses: 'text-cyan-700 bg-cyan-50/70 hover:bg-cyan-100/90 border-cyan-200/60',
            visible: true,
        },
        {
            id: 'master-keys',
            title: 'Master Key Programming',
            description: 'Access cards programming & RFID key security custody',
            category: 'IT & Facilities',
            icon: '🗝️',
            href: route('master-keys.index'),
            badge: launcherStats.masterKeyOnRequest && launcherStats.masterKeyOnRequest > 0 ? `${launcherStats.masterKeyOnRequest}` : null,
            badgeColor: 'bg-amber-500',
            colorClasses: 'text-amber-700 bg-amber-50/70 hover:bg-amber-100/90 border-amber-200/60',
            visible: isItStaff || canAccessHousekeeping,
        },
        {
            id: 'room-borrowing',
            title: 'Room & Key Management',
            description: 'Hotel room access custody and physical key return tracking',
            category: 'Facilities & Security',
            icon: '🚪',
            href: route('room-borrowing.index'),
            colorClasses: 'text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100/90 border-emerald-200/60',
            visible: true,
        },
        {
            id: 'announcements',
            title: 'Announcements',
            description: 'Company-wide notices, management memos, and hotel news',
            category: 'Knowledge & Information',
            icon: '📢',
            href: route('announcements.index'),
            colorClasses: 'text-pink-700 bg-pink-50/70 hover:bg-pink-100/90 border-pink-200/60',
            visible: true,
        },
        {
            id: 'documents',
            title: 'Hotel SOP Documents',
            description: 'Standard operating procedures, forms, and documentation',
            category: 'Knowledge & Information',
            icon: '📄',
            href: route('documents.index'),
            colorClasses: 'text-slate-700 bg-slate-50/70 hover:bg-slate-100/90 border-slate-200/60',
            visible: true,
        },
        {
            id: 'performance',
            title: 'Performance & KPI (EPI)',
            description: 'Staff performance evaluations and metric analytics',
            category: 'Human Capital',
            icon: '📈',
            href: route('performance.index'),
            colorClasses: 'text-amber-700 bg-amber-50/70 hover:bg-amber-100/90 border-amber-200/60',
            visible: canViewPerformance,
        },
    ].filter(item => item.visible !== false), [isAdmin, isSupervisor, isItStaff, canAccessHousekeeping, canViewProjects, canViewPerformance, launcherStats]);

    // Active shortcuts customized by the user
    const userShortcuts = useMemo(() => {
        return savedShortcutIds
            .map(id => availableShortcutOptions.find(opt => opt.id === id))
            .filter(Boolean) as ShortcutOption[];
    }, [savedShortcutIds, availableShortcutOptions]);

    const openCustomizeShortcutsModal = () => {
        setTempSelectedIds([...savedShortcutIds]);
        setShortcutModalSearch('');
        setIsCustomizingShortcuts(true);
    };

    const handleSaveShortcuts = () => {
        setSavedShortcutIds(tempSelectedIds);
        try {
            localStorage.setItem(storageKey, JSON.stringify(tempSelectedIds));
        } catch (e) {
            // ignore
        }
        setIsCustomizingShortcuts(false);
    };

    const toggleShortcutSelection = (id: string) => {
        setTempSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Full catalog for Ctrl+K search (includes both core suites and all specific sub-modules)
    const allSearchableItems: AppItem[] = useMemo(() => [
        ...coreApps,
        {
            id: 'employees',
            name: 'Employee Records',
            description: 'Manage employee identity, job history, and employment contracts',
            category: 'Human Capital',
            href: route('employees.index'),
            gradient: 'from-fuchsia-600 to-pink-600',
            visible: isAdmin,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        },
        {
            id: 'attendance',
            name: isAdmin ? 'Attendance Logs' : 'My Attendance',
            description: isAdmin
                ? 'Daily attendance logs, employee clock-ins, and shift rosters'
                : 'Your personal daily attendance records and work hours history',
            category: 'Human Capital',
            href: isAdmin ? route('attendance.index') : route('attendance.my'),
            gradient: 'from-teal-500 to-emerald-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            id: 'leave',
            name: 'Leave Requests',
            description: 'Annual leave, sick leave requests, and manager approvals',
            category: 'Human Capital',
            href: route('leave.index'),
            gradient: 'from-sky-500 to-blue-600',
            badge: launcherStats.pendingLeaves && launcherStats.pendingLeaves > 0 ? `${launcherStats.pendingLeaves} Pending` : null,
            badgeColor: 'bg-sky-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            id: 'overtime',
            name: 'Overtime Requests (SPKL)',
            description: 'Overtime work orders and hour calculations',
            category: 'Human Capital',
            href: route('overtime.index'),
            gradient: 'from-rose-500 to-red-600',
            badge: launcherStats.pendingOvertime && launcherStats.pendingOvertime > 0 ? `${launcherStats.pendingOvertime} Pending` : null,
            badgeColor: 'bg-rose-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
        },
        {
            id: 'payroll',
            name: isAdmin ? 'Payroll Management' : 'My Payslips',
            description: isAdmin
                ? 'Manage payroll batches, generate salaries, and monthly compensation reports'
                : 'Monthly payslip breakdown, allowances, and personal salary records',
            category: 'Human Capital',
            href: isAdmin ? route('payroll.index') : route('payroll.my'),
            gradient: 'from-emerald-600 to-teal-700',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            id: 'projects',
            name: 'Team Projects',
            description: 'Project grouping, milestone targets, and work progress',
            category: 'Operations',
            href: route('projects.index'),
            gradient: 'from-violet-500 to-purple-600',
            visible: canViewProjects,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
        },
        {
            id: 'performance',
            name: 'Reports & KPI',
            description: 'Staff performance evaluation, EPI scoring, and performance analytics',
            category: 'Human Capital',
            href: route('performance.index'),
            gradient: 'from-amber-600 to-amber-700',
            visible: canViewPerformance,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
        },
        {
            id: 'departments',
            name: 'Departments & Divisions',
            description: 'Hotel organization structure, department divisions, and headcounts',
            category: 'Human Capital',
            href: route('departments.index'),
            gradient: 'from-blue-600 to-cyan-600',
            visible: isAdmin,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
        },
        {
            id: 'kanban',
            name: 'My List',
            description: 'Interactive visual board for task progress',
            category: 'Operations',
            href: route('tasks.kanban'),
            gradient: 'from-blue-600 to-sky-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m7 10V7" />
                </svg>
            ),
        },
        {
            id: 'calendar',
            name: 'Task Calendar',
            description: 'Monthly schedule and deadline calendar for tasks',
            category: 'Operations',
            href: route('tasks.calendar'),
            gradient: 'from-[#E31B23] to-[#c4141b]',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },

        {
            id: 'it-tickets',
            name: 'IT Helpdesk Tickets',
            description: 'Report and track hotel IT issues, WiFi, hardware, and network requests',
            category: 'IT & Facilities',
            href: route('it.index', { tab: 'tickets' }),
            gradient: 'from-red-600 to-rose-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
        },
        {
            id: 'it-assets',
            name: 'IT Asset Inventory',
            description: 'Hotel IT hardware inventory, workstations, switches, printers, and access points',
            category: 'IT & Facilities',
            href: route('it.index', { tab: 'assets' }),
            gradient: 'from-rose-600 to-red-700',
            visible: isItStaff,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            ),
        },
        {
            id: 'directory',
            name: 'Employee Directory',
            description: 'Hotel internal staff directory, department phone extensions, and contacts',
            category: 'Human Capital',
            href: route('directory.index'),
            gradient: 'from-purple-500 to-indigo-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            id: 'announcements',
            name: 'Announcements',
            description: 'Company memos, official news, and hotel announcements',
            category: 'Knowledge & Information',
            href: route('announcements.index'),
            gradient: 'from-pink-500 to-rose-600',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
            ),
        },
        {
            id: 'documents',
            name: 'Documents & SOPs',
            description: 'Digital repository of SOPs, hotel forms, and policy archives',
            category: 'Knowledge & Information',
            href: route('documents.index'),
            gradient: 'from-slate-600 to-gray-700',
            visible: true,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            id: 'master-keys',
            name: 'Master Key Programming',
            description: 'RFID hotel master key programming, access authorization, and security custody',
            category: 'IT & Facilities',
            href: route('master-keys.index'),
            gradient: 'from-amber-500 to-orange-600',
            visible: canAccessHousekeeping || isItStaff,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
            ),
        },
        {
            id: 'settings',
            name: 'System Settings',
            description: 'Application parameters, roles, permissions, and security audit logs',
            category: 'Administration',
            href: route('settings.index'),
            gradient: 'from-zinc-700 to-slate-900',
            visible: isSuperAdmin,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            id: 'schedules',
            name: 'Shift Roster (Scheduler)',
            description: 'Weekly employee work shift scheduler and assignment roster',
            category: 'Human Capital',
            href: route('schedules.index'),
            gradient: 'from-indigo-600 to-violet-600',
            visible: isAdmin,
            icon: (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
    ].filter(a => a.visible !== false), [coreApps, launcherStats, isAdmin, canViewPerformance, canViewProjects, isItStaff, canAccessHousekeeping, isSuperAdmin]);

    // Filter apps based on search query (search searches allCatalog, default displays coreApps)
    const filteredApps = useMemo(() => {
        if (!searchQuery.trim()) return coreApps;
        const q = searchQuery.toLowerCase().trim();
        return allSearchableItems.filter(
            app =>
                app.name.toLowerCase().includes(q) ||
                app.description.toLowerCase().includes(q) ||
                app.category.toLowerCase().includes(q)
        );
    }, [coreApps, allSearchableItems, searchQuery]);

    // Handle open first matching app on Enter
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && filteredApps.length > 0) {
            e.preventDefault();
            const firstApp = filteredApps[0];
            if (firstApp.action) {
                firstApp.action();
            } else if (firstApp.href) {
                router.visit(firstApp.href);
            }
        }
    };

    // Sub-Workspace: TASK MANAGEMENT
    if (view === 'tasks') {
        const tasksSummary = employeeData?.tasksSummary || {
            todo: 0,
            in_progress: 0,
            review: 0,
            done: 0,
            overdue: 0,
        };
        const allTasks = employeeData?.upcomingTasks || [];
        const nowMs = new Date().getTime();

        const lateTasks = allTasks.filter((t: any) => {
            if (!t.deadline) return false;
            return new Date(t.deadline).getTime() < nowMs && !isTaskCompleted(t.status);
        });

        const upcomingTasks = allTasks.filter((t: any) => {
            if (!t.deadline) return false;
            return new Date(t.deadline).getTime() >= nowMs;
        });

        const sortedLateTasks = sortTasksByDeadlineAndOverdue(lateTasks);
        const sortedUpcomingTasks = sortTasksByDeadlineAndOverdue(upcomingTasks);

        // Ensure Overdue stat card number matches the number of tasks in the Late group
        const overdueCount = Math.max(tasksSummary.overdue || 0, lateTasks.length);

        const recentActivities = employeeData?.recentActivities || [];
        const projectProgress = supervisorData?.projectProgress || managerData?.projectProgress || [];

        return (
            <AuthenticatedLayout
                hideSidebar={false}
                header={
                    <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-0.5">
                                <Link href={route('dashboard')} className="hover:text-[#E31B23] transition-colors flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Main Menu
                                </Link>
                                <span>/</span>
                                <span className="text-slate-700 truncate">Task Management</span>
                            </div>
                            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 leading-tight truncate">
                                Task Management Workspace
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href={route('tasks.create')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold text-white bg-[#E31B23] hover:bg-[#c4141b] active:bg-[#a30f15] shadow-xs transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Create New Task</span>
                            </Link>
                        </div>
                    </div>
                }
            >
                <Head title="Task Management Workspace - Swiss-Belinn" />

                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-xs text-slate-500 font-medium">To Do (Queue)</span>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{tasksSummary.todo}</p>
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-2"></span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-xs text-slate-500 font-medium">In Progress</span>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{tasksSummary.in_progress}</p>
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mt-2"></span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-xs text-slate-500 font-medium">Awaiting Review</span>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{tasksSummary.review}</p>
                            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mt-2"></span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-xs text-slate-500 font-medium">Completed</span>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{tasksSummary.done}</p>
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mt-2"></span>
                        </div>

                        {/* Clickable Overdue Card */}
                        <Link
                            href={route('tasks.index', { filter: 'overdue' })}
                            className="bg-white p-4 rounded-2xl border border-red-200/90 shadow-xs col-span-2 sm:col-span-1 hover:border-red-400 hover:shadow-md hover:-translate-y-0.5 transition-all group block select-none cursor-pointer"
                            title="Click to view overdue tasks"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-red-700 font-bold group-hover:text-red-800 transition-colors">Overdue</span>
                                <span className="text-[10px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">Filter →</span>
                            </div>
                            <p className="text-2xl font-extrabold text-red-600 mt-1 tabular-nums">{overdueCount}</p>
                            <span className="inline-block w-2 h-2 rounded-full bg-red-600 mt-2"></span>
                        </Link>
                    </div>

                    {/* Deadlines & Recent Activities */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Deadlines Section: Late vs Upcoming */}
                        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <span>Deadline Tasks</span>
                                    {lateTasks.length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                                            {lateTasks.length} Overdue
                                        </span>
                                    )}
                                </h3>
                                <TextLink href={route('tasks.index')} arrow size="xs">
                                    View All
                                </TextLink>
                            </div>

                            {/* Group 1: Overdue */}
                            {sortedLateTasks.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 mb-2">
                                        <svg className="w-3.5 h-3.5 text-red-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <span>Overdue</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {sortedLateTasks.map((task: any) => (
                                            <Link
                                                key={task.id}
                                                href={route('tasks.show', task.id)}
                                                className="p-3 rounded-xl bg-red-50/40 hover:bg-red-50 transition-colors flex items-center justify-between gap-3 group border border-red-200/80 border-l-4 border-l-red-600"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 group-hover:text-[#E31B23] truncate">
                                                        {task.title}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                                        <span>Due: <strong className="text-red-700 font-bold">{formatDate(task.deadline)}</strong></span>
                                                        <span>•</span>
                                                        <span>Priority: {task.priority}</span>
                                                    </div>
                                                </div>
                                                <DeadlineBadge dueDate={task.deadline} status={task.status} size="xs" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Group 2: Akan Datang (Upcoming) */}
                            <div>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>Akan Datang (Upcoming)</span>
                                </div>
                                {sortedUpcomingTasks.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {sortedUpcomingTasks.map((task: any) => (
                                            <Link
                                                key={task.id}
                                                href={route('tasks.show', task.id)}
                                                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors flex items-center justify-between gap-3 group border border-slate-200/80"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 group-hover:text-[#E31B23] truncate">
                                                        {task.title}
                                                    </p>
                                                    <span className="text-[10px] text-slate-500">
                                                        Due: {formatDate(task.deadline)} • Priority: {task.priority}
                                                    </span>
                                                </div>
                                                <DeadlineBadge dueDate={task.deadline} status={task.status} size="xs" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                                        Tidak ada task dengan deadline akan datang.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Recent Activities */}
                        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-900 text-sm">Recent Activities</h3>
                                <TextLink href={route('tasks.index')} variant="muted" size="xs">
                                    Task Logs
                                </TextLink>
                            </div>
                            {recentActivities.length > 0 ? (
                                <div className="space-y-3">
                                    {recentActivities.map((act: any) => {
                                        const sentence = formatActivitySentence(act);
                                        return (
                                            <div key={act.id} className="flex items-start gap-3 text-xs">
                                                <div className="w-2 h-2 rounded-full bg-[#E31B23] mt-1.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-slate-700 leading-snug">
                                                        <span className="font-bold text-slate-900">{sentence.userName}</span>{' '}
                                                        <span className="font-medium text-slate-600">{sentence.verb}</span>{' '}
                                                        task{' '}
                                                        <span className="font-bold text-slate-900 italic">"{sentence.taskTitle}"</span>
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                                                        {formatDateTime(act.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat aktivitas tugas.</p>
                            )}
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    // Sub-Workspace: HUMAN RESOURCES (HR)
    if (view === 'hr') {
        return (
            <AuthenticatedLayout
                hideSidebar={false}
                header={
                    <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                        <div className="min-w-0">
                            <div className="hidden sm:flex items-center gap-2 text-xs text-[#E31B23] font-semibold mb-0.5">
                                <Link href={route('dashboard')} className="hover:underline flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Main Menu
                                </Link>
                                <span>/</span>
                                <span className="text-gray-500 truncate">Human Resources (HR)</span>
                            </div>
                            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 leading-tight truncate">
                                {isAdmin ? 'Human Resources Workspace' : (isSupervisor ? 'HR & Team Oversight' : 'Employee HR Portal')}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2.5">
                            {isAdmin && (
                                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => setAdminHrTab('management')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            adminHrTab === 'management'
                                                ? 'bg-white text-slate-900 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Management Suite
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAdminHrTab('self-service')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            adminHrTab === 'self-service'
                                                ? 'bg-white text-slate-900 shadow-xs'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        My HR Portal
                                    </button>
                                </div>
                            )}
                            <Link
                                href={route('dashboard')}
                                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
                                title="Back to Desk Launcher"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                <span className="hidden sm:inline">Desk Launcher</span>
                            </Link>
                        </div>
                    </div>
                }
            >
                <Head title="Human Resources (HR) - Swiss-Belinn" />

                <div className="space-y-6">
                    <Suspense fallback={<DashboardLoadingFallback />}>
                        {isAdmin && adminHrTab === 'management' ? (
                            <HRDashboard data={{ ...hrData, announcements }} />
                        ) : (
                            <EmployeeHRDashboard data={{ ...employeeHrData, supervisorData: isSupervisor ? supervisorData : null, announcements, role, user }} />
                        )}
                    </Suspense>
                </div>
            </AuthenticatedLayout>
        );
    }

    // Sub-Workspace: OVERVIEW / PERSONAL DASHBOARD
    if (view === 'overview') {
        const renderRoleDashboard = () => {
            if (role === 'Staff / Employee' || role === 'OJT / Trainee') {
                return <EmployeeDashboard data={{ ...employeeData, announcements }} />;
            } else if (role === 'Supervisor' || role === 'Head of Department') {
                return <SupervisorDashboard data={{ ...supervisorData, announcements }} />;
            } else if (role === 'HRD / Admin') {
                return <HRDashboard data={{ ...hrData, announcements }} />;
            } else if (role === 'General Manager' || role === 'Super Admin') {
                return <ManagerDashboard data={{ ...managerData, announcements }} />;
            }
            return <EmployeeDashboard data={{ ...employeeData, announcements }} />;
        };

        return (
            <AuthenticatedLayout
                hideSidebar={false}
                header={
                    <div className="flex items-center justify-between gap-3 min-w-0 w-full">
                        <div className="min-w-0">
                            <div className="hidden sm:flex items-center gap-2 text-xs text-indigo-600 font-semibold mb-0.5">
                                <Link href={route('dashboard')} className="hover:underline flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Main Menu
                                </Link>
                                <span>/</span>
                                <span className="text-gray-500 truncate">Personal Dashboard</span>
                            </div>
                            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 leading-tight truncate">
                                {getGreeting()}, {user.name} 👋
                            </h2>
                        </div>
                        <Link
                            href={route('dashboard')}
                            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
                            title="Back to Desk Launcher"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            <span className="hidden sm:inline">Desk Launcher</span>
                        </Link>
                    </div>
                }
            >
                <Head title="Personal Dashboard - Swiss-Belinn" />
                <Suspense fallback={<DashboardLoadingFallback />}>
                    {renderRoleDashboard()}
                </Suspense>
            </AuthenticatedLayout>
        );
    }

    // MAIN VIEW: FRAPPE / ERPNEXT DESK APP LAUNCHER
    return (
        <AuthenticatedLayout
            hideSidebar={true}
            header={
                <div className="relative w-full max-w-lg mx-auto">
                    <div className="relative flex items-center">
                        <svg
                            className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Search modules or apps..."
                            className="w-full pl-10 pr-10 sm:pr-16 py-2 text-xs sm:text-sm bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-[#E31B23] rounded-full focus:outline-none focus:ring-2 focus:ring-[#E31B23]/20 transition-all text-slate-800 placeholder-slate-400"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                                title="Clear search"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        ) : (
                            <div className="absolute right-3 hidden sm:flex items-center gap-1 pointer-events-none">
                                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">Ctrl</kbd>
                                <kbd className="px-1 py-0.5 text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">K</kbd>
                            </div>
                        )}
                    </div>
                </div>
            }
        >
            <Head title="Main Menu - SIPU Swiss-Belinn" />

            <div className="py-4 sm:py-10 space-y-6 sm:space-y-10">
                {/* Greeting & Header Bar */}
                <div className="text-center max-w-2xl mx-auto space-y-2 px-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-red-50 text-[#E31B23] border border-red-100 max-w-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                        <span className="truncate">{getTodayDate()} • Swiss-Belinn SKA Pekanbaru</span>
                    </div>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {getGreeting()}, {user.name} 👋
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                        Select an application module below to open your workspace
                    </p>
                </div>

                {/* Announcement Ticker (if any) */}
                {announcements.length > 0 && !searchQuery && (
                    <div className="max-w-4xl mx-auto px-2 sm:px-0">
                        <Link
                            href={route('announcements.index')}
                            className="block p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-50/80 via-orange-50/50 to-amber-50/50 border border-red-100/80 hover:border-red-200 shadow-xs hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-[#E31B23] text-white shadow-xs shrink-0">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                    </svg>
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#E31B23] bg-red-100/70 px-2 py-0.5 rounded-md">
                                            Latest Announcement
                                        </span>
                                        <span className="text-xs text-slate-500 truncate">
                                            {announcements[0]?.title}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-700 font-medium truncate mt-0.5">
                                        {announcements[0]?.content}
                                    </p>
                                </div>
                                <span className="text-xs text-[#E31B23] font-semibold group-hover:translate-x-1 transition-transform shrink-0 hidden sm:inline">
                                    Open →
                                </span>
                            </div>
                        </Link>
                    </div>
                )}

                {/* Custom Quick Shortcuts Bar */}
                {!searchQuery && (
                    <div className="max-w-4xl mx-auto px-2 sm:px-0">
                        {userShortcuts.length === 0 ? (
                            <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all hover:border-slate-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-red-50 text-[#E31B23] flex items-center justify-center shrink-0 border border-red-100/80">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-900">Custom Quick Shortcuts</span>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Personalized</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Pin your most frequent tools & routines here for instant 1-click access.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={openCustomizeShortcutsModal}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#E31B23] hover:bg-[#c4141b] shadow-xs hover:shadow transition-all active:scale-95 shrink-0 cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span>Customize Shortcuts</span>
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5">
                                <div className="flex items-center gap-2 px-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E31B23]"></span>
                                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        Quick Shortcuts
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-center sm:justify-end flex-1">
                                    {userShortcuts.map((shortcut) => (
                                        <Link
                                            key={shortcut.id}
                                            href={shortcut.href}
                                            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:scale-102 ${shortcut.colorClasses || 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                                            title={shortcut.description}
                                        >
                                            <span>{shortcut.icon}</span>
                                            <span>{shortcut.title}</span>
                                            {shortcut.badge && (
                                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white ${shortcut.badgeColor || 'bg-[#E31B23]'}`}>
                                                    {shortcut.badge}
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={openCustomizeShortcutsModal}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100/70 hover:bg-slate-200/70 border border-slate-200/60 transition-all cursor-pointer"
                                        title="Configure your quick shortcuts"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>Customize</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* APP LAUNCHER GRID (Frappe Desk style) */}
                <div className="max-w-4xl mx-auto px-2 sm:px-0">
                    {searchQuery && (
                        <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                            <span>
                                Showing {filteredApps.length} results for "<strong className="text-slate-800">{searchQuery}</strong>"
                            </span>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-[#E31B23] hover:underline font-semibold"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                    {filteredApps.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 sm:gap-x-12 gap-y-8 sm:gap-y-12 items-start justify-items-center">
                            {filteredApps.map((app) => {
                                const CardContent = (
                                    <div className="flex flex-col items-center group cursor-pointer focus:outline-none w-full">
                                        {/* Squircle App Icon */}
                                        <div className="relative">
                                            <div
                                                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[22px] bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-md shadow-slate-200/80 group-hover:shadow-xl group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300 ease-out`}
                                            >
                                                {app.icon}
                                            </div>

                                            {/* Badge Notification */}
                                            {app.badge && (
                                                <span className={`absolute -top-1.5 -right-2 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold text-white shadow-md border-2 border-white whitespace-nowrap z-10 animate-pulse ${app.badgeColor || 'bg-red-500'}`}>
                                                    {app.badge}
                                                </span>
                                            )}
                                        </div>

                                        {/* App Title with min 2-line height for aligned icon rows */}
                                        <span className="mt-2.5 sm:mt-3 min-h-[2.5rem] flex items-start justify-center text-xs sm:text-[13px] font-semibold text-slate-700 group-hover:text-[#E31B23] text-center tracking-tight transition-colors line-clamp-2 max-w-[130px] sm:max-w-[120px] leading-snug">
                                            {app.name}
                                        </span>
                                    </div>
                                );

                                if (app.href) {
                                    return (
                                        <Link key={app.id} href={app.href} title={app.description}>
                                            {CardContent}
                                        </Link>
                                    );
                                }

                                return (
                                    <button
                                        key={app.id}
                                        type="button"
                                        onClick={app.action}
                                        title={app.description}
                                        className="bg-transparent border-0 p-0"
                                    >
                                        {CardContent}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-base">Module Not Found</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    No application matches the keyword "{searchQuery}"
                                </p>
                            </div>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            >
                                Reset Search
                            </button>
                        </div>
                    )}
                </div>

                {/* Desk Quick Stats */}
                <div className="pt-8 border-t border-gray-200/60 max-w-4xl mx-auto flex flex-wrap items-center justify-between text-xs text-gray-400 gap-4">
                    <div className="flex items-center gap-4">
                        <span>Role: <strong className="text-gray-700 font-semibold">{role}</strong></span>
                        <span>•</span>
                        <span>Core Workspaces: <strong className="text-gray-700 font-semibold">{coreApps.length}</strong></span>
                    </div>
                </div>
            </div>

            {/* Customize Quick Shortcuts Modal */}
            <Modal show={isCustomizingShortcuts} onClose={() => setIsCustomizingShortcuts(false)} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <span className="p-1.5 rounded-xl bg-red-50 text-[#E31B23]">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </span>
                                Customize Quick Shortcuts
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select which routines and features to display on your personal quick shortcuts bar.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCustomizingShortcuts(false)}
                            className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer"
                        >
                            &times;
                        </button>
                    </div>

                    {/* Search & Selection count */}
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={shortcutModalSearch}
                                onChange={(e) => setShortcutModalSearch(e.target.value)}
                                placeholder="Search available shortcuts..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-600">
                                <strong className="text-[#E31B23]">{tempSelectedIds.length}</strong> selected
                            </span>
                            {tempSelectedIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setTempSelectedIds([])}
                                    className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Grid of shortcut options */}
                    <div className="mt-4 max-h-[50vh] overflow-y-auto space-y-2 pr-1">
                        {availableShortcutOptions
                            .filter(opt =>
                                !shortcutModalSearch ||
                                opt.title.toLowerCase().includes(shortcutModalSearch.toLowerCase()) ||
                                opt.description.toLowerCase().includes(shortcutModalSearch.toLowerCase()) ||
                                opt.category.toLowerCase().includes(shortcutModalSearch.toLowerCase())
                            )
                            .map((opt) => {
                                const isChecked = tempSelectedIds.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => toggleShortcutSelection(opt.id)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                            isChecked
                                                ? 'bg-red-50/40 border-[#E31B23] ring-1 ring-[#E31B23]/40'
                                                : 'bg-white hover:bg-slate-50 border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xl shrink-0">{opt.icon}</span>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs text-slate-900 truncate">
                                                        {opt.title}
                                                    </span>
                                                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                                        {opt.category}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                    {opt.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {}} // handled by row click
                                                className="w-4 h-4 rounded border-slate-300 text-[#E31B23] focus:ring-[#E31B23] cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {/* Modal Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCustomizingShortcuts(false)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveShortcuts}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#E31B23] hover:bg-[#c4141b] rounded-xl shadow-xs transition-colors cursor-pointer"
                        >
                            Save Shortcuts ({tempSelectedIds.length})
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
