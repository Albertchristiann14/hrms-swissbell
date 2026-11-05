import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage, router } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, createContext, useCallback, useContext, useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import GlobalSearchModal from '@/Components/GlobalSearchModal';

const icons: Record<string, JSX.Element> = {
    'Main Menu': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    'Menu Utama': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    Dashboard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>,
    'HR Dashboard': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Dashboard HR': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Task Summary': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    'Dept. Tasks': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V7a2 2 0 012-2h4a2 2 0 012 2v14M13 11h4a2 2 0 012 2v8M7 9h2m-2 4h2m-2 4h2m8-2h2" /></svg>,
    'Ringkasan Tugas': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    'Personal Dashboard': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    'Dashboard Pribadi': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    Projects: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    'My Tasks': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    'List Task': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    Kanban: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>,
    'Kanban Board': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>,
    'My List': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>,
    'HR Overview': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Documents & SOPs': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    Calendar: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    Employees: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    Departments: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    'Time Management': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Overview': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    'Attendance Data': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    'Shift Roster (Scheduler)': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    'Shift Management': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Attendance Reports': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    'Attendance Settings': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    'My Attendance': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Attendance Logs': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Shifts & Roster': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    'Leave Requests': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    'Overtime': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Overtime (SPKL)': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    'My Payslips': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Payroll Management': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    'Employee Directory': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    Announcements: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
    Documents: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    'Reports & EPI': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    'Roles & Permissions': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    'Audit Logs': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    'System Settings': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    Settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    'Master Key Access': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
    'Master Key Programming': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
    'Master Key Requests': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
    'Overview & Stats': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    'IT Helpdesk Tickets': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
    'My Support Tickets': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
    'Helpdesk Tickets': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
    'Asset Inventory': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    'Registration Approvals': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'IT Registration Approvals': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'Power Pro ID Requests': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>,
    'PowerPro ID Requests': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>,
    'Profile Settings': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    'Form Peminjaman': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    'Borrowing Form': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    'Room Catalog': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    'My Borrowings': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>,
    'Security Queue': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    'Manage Rooms': <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

const roleBadgeColors: Record<string, string> = {
    'Super Admin': 'bg-red-100 text-red-700',
    'HRD / Admin': 'bg-purple-100 text-purple-700',
    'General Manager': 'bg-amber-100 text-amber-700',
    'Head of Department': 'bg-blue-100 text-blue-700',
    'Supervisor': 'bg-teal-100 text-teal-700',
    'Staff / Employee': 'bg-slate-100 text-slate-700',
    'OJT / Trainee': 'bg-cyan-100 text-cyan-700',
    'Security': 'bg-emerald-100 text-emerald-800',
};

interface ModuleInfo {
    key: string;
    title: string;
    subtitle: string;
    badgeBg: string;
    badgeBorder: string;
    dotColor: string;
    sections: {
        title: string;
        items: {
            name: string;
            route: string;
            params?: Record<string, any>;
            pattern: string;
        }[];
    }[];
}

type ChromeOptions = { header?: ReactNode; hideSidebar: boolean };
const PersistentChromeContext = createContext<((options: ChromeOptions) => void) | null>(null);

// This component is installed once by Inertia, outside the changing page.
// It keeps the sidebar, topbar and their state alive across page visits.
export function PersistentAuthenticatedLayout({ children }: PropsWithChildren) {
    const [chrome, setChrome] = useState<ChromeOptions>({ hideSidebar: false });
    const updateChrome = useCallback((next: ChromeOptions) => {
        setChrome(prev => prev.header === next.header && prev.hideSidebar === next.hideSidebar ? prev : next);
    }, []);

    return (
        <PersistentChromeContext.Provider value={updateChrome}>
            <AuthenticatedShell header={chrome.header} hideSidebar={chrome.hideSidebar}>
                {children}
            </AuthenticatedShell>
        </PersistentChromeContext.Provider>
    );
}

// Existing pages may continue to pass their own header and hideSidebar props.
// When inside the persistent shell, this lightweight bridge only renders the
// page content and lets the shell update its chrome without replacing it.
export default function Authenticated({
    header,
    children,
    hideSidebar = false,
}: PropsWithChildren<{ header?: ReactNode; user?: any; hideSidebar?: boolean }>) {
    const updateChrome = useContext(PersistentChromeContext);

    useLayoutEffect(() => {
        updateChrome?.({ header, hideSidebar });
    }, [updateChrome, header, hideSidebar]);

    if (updateChrome) return <>{children}</>;

    // Safe fallback for pages rendered outside the standard Inertia shell.
    return <AuthenticatedShell header={header} hideSidebar={hideSidebar}>{children}</AuthenticatedShell>;
}

function AuthenticatedShell({
    user: _ignoredUser,
    header,
    children,
    hideSidebar = false,
}: PropsWithChildren<{ header?: ReactNode; user?: any; hideSidebar?: boolean }>) {
    const pageProps = usePage().props as any;
    const user = pageProps?.auth?.user ?? {};
    const currentUrl = usePage().url;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [navigatingMethod, setNavigatingMethod] = useState<'get' | 'post' | 'put' | 'patch' | 'delete'>('get');
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);

    // Sidebar open/close state with localStorage persistence
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sipu_sidebar_open');
            if (saved !== null) return saved === 'true';
        }
        return true;
    });

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('sipu_sidebar_open', String(next));
            }
            return next;
        });
    };

    // Keep each module's navigation preferences when Inertia swaps page components.
    // The layout currently lives inside each page, so it can remount on visits.
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
        try {
            return JSON.parse(sessionStorage.getItem('sipu_nav_collapsed_sections') || '{}');
        } catch {
            return {};
        }
    });
    const toggleSection = (title: string) => {
        const sectionKey = `${activeModuleInfo.key}:${title}`;
        setCollapsedSections(prev => {
            const next = { ...prev, [sectionKey]: !prev[sectionKey] };
            try {
                sessionStorage.setItem('sipu_nav_collapsed_sections', JSON.stringify(next));
            } catch {
                // Storage may be disabled; the menu remains usable in this visit.
            }
            return next;
        });
    };

    // Auto-expand section containing active item on page navigation
    useEffect(() => {
        try {
            const activeSection = activeModuleInfo?.sections?.find(s => s?.items?.some((item: any) => isItemActive(item)));
            const sectionKey = activeSection ? `${activeModuleInfo.key}:${activeSection.title}` : null;
            if (sectionKey && collapsedSections[sectionKey]) {
                setCollapsedSections(prev => {
                    const next = { ...prev, [sectionKey]: false };
                    try {
                        sessionStorage.setItem('sipu_nav_collapsed_sections', JSON.stringify(next));
                    } catch {
                        // Optional persistence only.
                    }
                    return next;
                });
            }
        } catch {
            // ignore layout expansion errors
        }
    }, [currentUrl]);

    // Keyboard shortcuts: Ctrl+B (sidebar) and Ctrl+K (search)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setShowGlobalSearch(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const removeStart = router.on('start', (event: any) => {
            setIsNavigating(true);
            const method = (event.detail?.visit?.method || 'get').toLowerCase();
            setNavigatingMethod(method as any);
        });

        const removeFinish = router.on('finish', () => setIsNavigating(false));
        const removeError = router.on('error', () => setIsNavigating(false));
        const removeCancel = router.on('cancel', () => setIsNavigating(false));

        return () => {
            removeStart();
            removeFinish();
            removeError();
            removeCancel();
        };
    }, []);

    const userRole = user.roles?.[0]?.name ?? 'Staff / Employee';
    const isSuperAdmin = user.roles?.some((r: any) => r.name === 'Super Admin');
    const isHRD = user.roles?.some((r: any) => r.name === 'HRD / Admin');
    const isManager = user.roles?.some((r: any) => r.name === 'General Manager');
    const canTrackDepartmentTasks = Boolean(pageProps?.auth?.canViewDepartmentTasks || isManager || isSuperAdmin);
    const isSupervisor = user.roles?.some((r: any) => ['Supervisor', 'Head of Department'].includes(r.name));
    // Hak akses level manajemen / HRD (Super Admin, HRD / Admin, General Manager)
    const isAdmin = isSuperAdmin || isHRD || isManager;
    const isItStaff = isSuperAdmin || isManager || (user.employee?.department?.name?.toLowerCase() === 'it');
    const canAccessMasterKey = isSuperAdmin || isHRD || isManager || isSupervisor || (user.employee?.department?.name === 'Housekeeping') || (user.employee?.department?.name?.toLowerCase() === 'it');
    const canViewPerformance = isAdmin;
    const canViewProjects = isAdmin || isSupervisor;

    // Attendance and payslips are shared personal pages. Preserve the module
    // they were opened from in the URL so HR links stay in HR, while links from
    // My Workspace (or direct visits) stay in My Workspace.
    const navigationSource = new URLSearchParams(currentUrl.split('?')[1] || '').get('source');
    const isPersonalWorkspacePage = (
        (route().current('attendance.my') || route().current('payroll.my')) && navigationSource !== 'hr'
    ) || (route().current('payroll.show') && navigationSource === 'my-workspace');

    // Detect active module and provide strictly contextual menus
    const activeModuleInfo = useMemo<ModuleInfo>(() => {
        // A. Task Management
        if (
            currentUrl.includes('view=tasks') ||
            route().current('dashboard.departments.tasks.*') ||
            route().current('tasks.*') ||
            route().current('projects.*')
        ) {
            return {
                key: 'tasks',
                title: 'Task Management',
                subtitle: 'Workspace & Projects',
                badgeBg: 'bg-blue-50',
                badgeBorder: 'border-blue-200',
                dotColor: 'bg-blue-600',
                sections: [
                    {
                        title: 'Task Management',
                        items: [
                            { name: 'Task Summary', route: 'dashboard', params: { view: 'tasks' }, pattern: 'dashboard' },
                            canTrackDepartmentTasks ? { name: 'Dept. Tasks', route: 'dashboard.departments.tasks.index', pattern: 'dashboard.departments.tasks.*' } : null,
                            { name: 'My List', route: 'tasks.kanban', pattern: 'tasks.kanban' },
                            { name: 'List Task', route: 'tasks.index', pattern: 'tasks.index' },
                            { name: 'Calendar', route: 'tasks.calendar', pattern: 'tasks.calendar' },
                            canViewProjects ? { name: 'Projects', route: 'projects.index', pattern: 'projects.*' } : null,
                        ].filter(Boolean) as any[],
                    },
                ],
            };
        }


        // E. Room & Key Management (Cross-department service)
        if (route().current('room-borrowing.*') || currentUrl.includes('/room-borrowing')) {
            const canApprove = isSuperAdmin || isHRD || isManager || user.roles?.some((r: any) => r.name === 'Security');
            const canManage = isSuperAdmin || isHRD || user.roles?.some((r: any) => r.name === 'Security');

            return {
                key: 'room-borrowing',
                title: 'Room & Key Management',
                subtitle: 'Hotel Keys & Facility Custody',
                badgeBg: 'bg-emerald-50',
                badgeBorder: 'border-emerald-200',
                dotColor: 'bg-emerald-600',
                sections: [
                    {
                        title: 'Room Services',
                        items: [
                            { name: 'Borrowing Form', route: 'room-borrowing.index', params: { tab: 'borrow' }, pattern: 'room-borrowing.*' },
                            isItStaff ? { name: 'Room Catalog', route: 'room-borrowing.index', params: { tab: 'catalog' }, pattern: 'room-borrowing.*' } : null,
                            { name: 'My Borrowings', route: 'room-borrowing.index', params: { tab: 'my-borrowings' }, pattern: 'room-borrowing.*' },
                        ].filter(Boolean) as any[],
                    },
                    canApprove ? {
                        title: 'Security & Verification',
                        items: [
                            { name: 'Security Queue', route: 'room-borrowing.index', params: { tab: 'pending-returns' }, pattern: 'room-borrowing.*' },
                        ],
                    } : null,
                    canManage ? {
                        title: 'Room Administration',
                        items: [
                            { name: 'Manage Rooms', route: 'room-borrowing.index', params: { tab: 'manage-rooms' }, pattern: 'room-borrowing.*' },
                        ],
                    } : null,
                ].filter(Boolean) as any[],
            };
        }

        // C. Human Resources
        if ((
            currentUrl.includes('view=hr') ||
            route().current('employees.*') ||
            route().current('departments.*') ||
            route().current('attendance.*') ||
            route().current('schedules.*') ||
            route().current('shifts.*') ||
            route().current('leave.*') ||
            route().current('overtime.*') ||
            route().current('payroll.*') ||
            route().current('directory.*') ||
            route().current('performance.*') ||
            currentUrl.includes('/employees') ||
            currentUrl.includes('/departments') ||
            currentUrl.includes('/attendance') ||
            currentUrl.includes('/leave') ||
            currentUrl.includes('/overtime') ||
            currentUrl.includes('/payroll') ||
            currentUrl.includes('/directory') ||
            currentUrl.includes('/performance')
        ) && !isPersonalWorkspacePage) {
            return {
                key: 'hr',
                title: 'Human Resources',
                subtitle: 'People & Organization',
                badgeBg: 'bg-purple-50',
                badgeBorder: 'border-purple-200',
                dotColor: 'bg-purple-600',
                sections: [
                    {
                        title: 'HR Overview',
                        items: [
                            { name: isAdmin ? 'HR Dashboard' : 'HR Overview', route: 'dashboard', params: { view: 'hr' }, pattern: 'dashboard' },
                        ],
                    },
                    {
                        title: 'People & Organization',
                        items: [
                            isAdmin ? { name: 'Employees', route: 'employees.index', pattern: 'employees.*' } : null,
                            isAdmin ? { name: 'Departments', route: 'departments.index', pattern: 'departments.*' } : null,
                            { name: 'Employee Directory', route: 'directory.index', pattern: 'directory.index' },
                        ].filter(Boolean) as any[],
                    },
                    {
                        title: 'Time Management',
                        items: [
                            isAdmin ? { name: 'Overview', route: 'attendance.index', params: { tab: 'overview' }, pattern: 'attendance.index' } : null,
                            isAdmin ? { name: 'Attendance Data', route: 'attendance.index', params: { tab: 'data' }, pattern: 'attendance.index' } : null,
                            { name: 'My Attendance', route: 'attendance.my', params: { source: 'hr' }, pattern: 'attendance.my' },
                            isAdmin ? { name: 'Shift Roster (Scheduler)', route: 'schedules.index', pattern: 'schedules.*' } : null,
                            isAdmin ? { name: 'Shift Management', route: 'shifts.index', pattern: 'shifts.*' } : null,
                            isAdmin ? { name: 'Attendance Reports', route: 'attendance.index', params: { tab: 'reports' }, pattern: 'attendance.index' } : null,
                            isAdmin ? { name: 'Attendance Settings', route: 'attendance.index', params: { tab: 'settings' }, pattern: 'attendance.index' } : null,
                        ].filter(Boolean) as any[],
                    },
                    {
                        title: 'Leave & Overtime',
                        items: [
                            { name: 'Leave Requests', route: 'leave.index', pattern: 'leave.*' },
                            { name: 'Overtime (SPKL)', route: 'overtime.index', pattern: 'overtime.*' },
                        ],
                    },
                    {
                        title: 'Compensation & Payroll',
                        items: [
                            { name: 'My Payslips', route: 'payroll.my', params: { source: 'hr' }, pattern: 'payroll.my' },
                            isAdmin ? { name: 'Payroll Management', route: 'payroll.index', pattern: 'payroll.index' } : null,
                        ].filter(Boolean) as any[],
                    },
                    canViewPerformance && {
                        title: 'Performance & Evaluation',
                        items: [
                            { name: 'Reports & EPI', route: 'performance.index', pattern: 'performance.*' },
                        ],
                    },
                ].filter(Boolean) as any[],
            };
        }

        // F. Knowledge & Information (Consolidated Announcements & Documents)
        if (
            route().current('announcements.*') ||
            route().current('documents.*') ||
            currentUrl.includes('/announcements') ||
            currentUrl.includes('/documents')
        ) {
            return {
                key: 'knowledge',
                title: 'Knowledge & Information',
                subtitle: 'Announcements & SOP Documents',
                badgeBg: 'bg-teal-50',
                badgeBorder: 'border-teal-200',
                dotColor: 'bg-teal-600',
                sections: [
                    {
                        title: 'Knowledge & Information',
                        items: [
                            { name: 'Announcements', route: 'announcements.index', pattern: 'announcements.index' },
                            { name: 'Documents & SOPs', route: 'documents.index', pattern: 'documents.index' },
                        ],
                    },
                ],
            };
        }

        // D. IT Operations
        if (
            route().current('it.*') ||
            route().current('power-pro.*') ||
            route().current('master-keys.*') ||
            currentUrl.includes('/it') ||
            currentUrl.includes('/master-keys')
        ) {
            return {
                key: 'it',
                title: 'IT Operations',
                subtitle: isItStaff ? 'Inventory, Helpdesk & Systems' : 'Hotel IT Services & System Access',
                badgeBg: 'bg-red-50',
                badgeBorder: 'border-red-200',
                dotColor: 'bg-red-600',
                sections: [
                    isItStaff ? {
                        title: 'IT Workspace',
                        items: [
                            { name: 'Overview & Stats', route: 'it.index', params: { tab: 'overview' }, pattern: 'it.index' },
                        ],
                    } : null,
                    {
                        title: 'IT Helpdesk',
                        items: [
                            { name: 'IT Helpdesk Tickets', route: 'it.index', params: { tab: 'tickets' }, pattern: 'it.index' },
                        ],
                    },
                    isItStaff ? {
                        title: 'Asset Management',
                        items: [
                            { name: 'Asset Inventory', route: 'it.index', params: { tab: 'assets' }, pattern: 'it.index' },
                        ],
                    } : null,
                    {
                        title: 'Account & Access Requests',
                        items: [
                            ...(isItStaff ? [{ name: 'Registration Approvals', route: 'it.registrations.index', pattern: 'it.registrations.*' }] : []),
                            { name: 'PowerPro ID Requests', route: 'power-pro.index', pattern: 'power-pro.*' },
                            ...(canAccessMasterKey ? [{ name: 'Master Key Programming', route: 'master-keys.index', pattern: 'master-keys.*' }] : []),
                        ],
                    },
                ].filter(Boolean) as any[],
            };
        }

        // G. Settings
        if (
            route().current('roles.*') ||
            route().current('audit-logs.*') ||
            route().current('settings.*') ||
            currentUrl.includes('/roles') ||
            currentUrl.includes('/audit-logs') ||
            currentUrl.includes('/settings')
        ) {
            return {
                key: 'admin',
                title: 'Settings',
                subtitle: isSuperAdmin ? 'System Configuration & Security' : 'Application Settings',
                badgeBg: 'bg-slate-100',
                badgeBorder: 'border-slate-200',
                dotColor: 'bg-slate-700',
                sections: [
                    {
                        title: 'Settings',
                        items: [
                            ...(isSuperAdmin ? [
                                { name: 'System Settings', route: 'settings.index', pattern: 'settings.*' },
                                { name: 'Roles & Permissions', route: 'roles.index', pattern: 'roles.*' },
                                { name: 'Audit Logs', route: 'audit-logs.index', pattern: 'audit-logs.*' },
                            ] : [
                                { name: 'Profile Settings', route: 'profile.edit', pattern: 'profile.*' },
                            ]),
                        ],
                    },
                ],
            };
        }

        // H. Personal Dashboard (My Workspace)
        if (
            isPersonalWorkspacePage ||
            currentUrl.includes('view=overview') ||
            route().current('profile.*') ||
            currentUrl.includes('/profile')
        ) {
            return {
                key: 'overview',
                title: 'My Workspace',
                subtitle: 'Personal Space & Shortcuts',
                badgeBg: 'bg-sky-50',
                badgeBorder: 'border-sky-200',
                dotColor: 'bg-sky-600',
                sections: [
                    {
                        title: 'My Workspace',
                        items: [
                            { name: 'Personal Dashboard', route: 'dashboard', params: { view: 'overview' }, pattern: 'dashboard' },
                            { name: 'Profile Settings', route: 'profile.edit', pattern: 'profile.*' },
                            { name: 'My Attendance', route: 'attendance.my', pattern: 'attendance.my' },
                            { name: 'My Payslips', route: 'payroll.my', pattern: 'payroll.my' },
                        ],
                    },
                ],
            };
        }

        // Default Fallback
        return {
            key: 'general',
            title: 'Workspace',
            subtitle: 'Swiss-Belinn SKA',
            badgeBg: 'bg-slate-100',
            badgeBorder: 'border-slate-200',
            dotColor: 'bg-[#E31B23]',
            sections: [
                {
                    title: 'Workspace',
                    items: [
                        { name: 'Main Menu', route: 'dashboard', pattern: 'dashboard' },
                    ],
                },
            ],
        };
    }, [currentUrl, isAdmin, isManager, isSupervisor, canViewPerformance, canViewProjects, isItStaff, canAccessMasterKey, isSuperAdmin, canTrackDepartmentTasks]);

    const desktopMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Inertia already performs SPA navigation, but a page-owned layout remount
    // used to throw the sidebar back to the top. Restore before browser paint.
    useLayoutEffect(() => {
        const restore = (element: HTMLDivElement | null, kind: 'desktop' | 'mobile') => {
            if (!element) return;
            try {
                const stored = sessionStorage.getItem(`sipu_nav_scroll_${kind}_${activeModuleInfo.key}`);
                element.scrollTop = stored ? Math.max(0, Number(stored) || 0) : 0;
            } catch {
                // Use the native scroll position if session storage is unavailable.
            }
        };

        restore(desktopMenuRef.current, 'desktop');
        restore(mobileMenuRef.current, 'mobile');
    }, [activeModuleInfo.key, hideSidebar]);

    const rememberMenuScroll = (element: HTMLDivElement, kind: 'desktop' | 'mobile') => {
        try {
            sessionStorage.setItem(`sipu_nav_scroll_${kind}_${activeModuleInfo.key}`, String(element.scrollTop));
        } catch {
            // Scroll still works without persistence.
        }
    };

    const getItemHref = (item: any): string => {
        return (item.params ? route(item.route, item.params) : route(item.route)) as unknown as string;
    };

    const isItemActive = (item: any) => {
        if (!item) return false;
        try {
            if (item.route === 'payroll.my' && route().current('payroll.show')) {
                return item.params?.source === 'hr'
                    ? navigationSource === 'hr'
                    : navigationSource === 'my-workspace';
            }
            if (item.params?.view) {
                return Boolean(route().current(item.pattern) && currentUrl.includes(`view=${item.params.view}`));
            }
            if (item.params?.tab) {
                if (item.params.tab === 'tickets' && route().current('it.tickets.*')) {
                    return true;
                }

                return Boolean(
                    route().current(item.pattern) &&
                    (currentUrl.includes(`tab=${item.params.tab}`) ||
                        (!currentUrl.includes('tab=') && (
                            (item.params.tab === 'overview' && isItStaff && route().current('it.index')) ||
                            (item.params.tab === 'data' && route().current('attendance.index')) ||
                            (item.params.tab === 'tickets' && !isItStaff && route().current('it.index')) ||
                            (item.params.tab === 'borrow' && currentUrl.includes('room-borrowing'))
                        ))
                    )
                );
            }
            if (item.route === 'dashboard') {
                return Boolean(route().current('dashboard') && !currentUrl.includes('view='));
            }
            return Boolean(route().current(item.pattern));
        } catch {
            return false;
        }
    };

    return (
        <div className="h-screen bg-[#f8fafc] flex overflow-hidden selection:bg-[#E31B23] selection:text-white">
            {/* Desktop Sidebar (Only rendered when hideSidebar is false) */}
            {!hideSidebar && (
                <aside
                    aria-label="Sidebar Navigation"
                    aria-hidden={!isSidebarOpen}
                    className={`hidden md:flex flex-col shrink-0 h-full bg-white/80 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out overflow-hidden z-20 ${
                        isSidebarOpen
                            ? 'w-64 border-r border-slate-200/60 opacity-100'
                            : 'w-0 border-r-0 border-transparent opacity-0 pointer-events-none'
                    }`}
                >
                    <div
                        className={`w-64 flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out ${
                            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                    >
                        {/* Brand Header with Close / Collapse Button */}
                        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-red-700/20 bg-[#E31B23]">
                            <Link href="/" className="flex items-center min-w-0 group" title="Swiss-Belinn SKA Pekanbaru">
                                <div className="h-8 w-8 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/30 shadow-xs">
                                    <ApplicationLogo className="h-full w-full object-cover" />
                                </div>
                                <div className="ml-2.5 min-w-0">
                                    <span className="font-bold text-white text-xs tracking-tight block truncate">Swiss-Belinn</span>
                                    <span className="block text-[9px] text-red-100 leading-none">SKA Pekanbaru</span>
                                </div>
                            </Link>
                            <button
                                type="button"
                                onClick={toggleSidebar}
                                title="Close Sidebar (Ctrl+B)"
                                className="text-white/80 hover:text-white hover:bg-white/15 p-1.5 rounded-lg transition-all ml-2 shrink-0 group active:scale-95"
                            >
                                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Quick Link: Return to Desk Launcher (Main Menu) */}
                        <div className="shrink-0 p-3 pb-2 border-b border-slate-100">
                            <Link
                                href={route('dashboard')}
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-[#E31B23] transition-all border border-slate-200/60 group font-semibold text-xs shadow-2xs"
                                title="Back to Main Menu (Desk Launcher)"
                            >
                                <div className="w-6 h-6 rounded-lg bg-red-100 group-hover:bg-[#E31B23] text-[#E31B23] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                </div>
                                <span className="truncate">← Main Menu (Desk)</span>
                            </Link>
                        </div>

                        {/* Active Module Indicator Card */}
                        <div className="shrink-0 px-3 pt-3 pb-1">
                            <div className={`p-2.5 rounded-xl ${activeModuleInfo.badgeBg} border ${activeModuleInfo.badgeBorder}`}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block leading-tight">Active Module</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`w-2 h-2 rounded-full ${activeModuleInfo.dotColor} shrink-0`}></span>
                                    <span className="text-xs font-bold text-gray-800 truncate">{activeModuleInfo.title}</span>
                                </div>
                            </div>
                        </div>

                        {/* Module Navigation (Only active module menus) */}
                        <div
                            ref={desktopMenuRef}
                            onScroll={(event) => rememberMenuScroll(event.currentTarget, 'desktop')}
                            className="flex-1 overflow-y-auto px-3 py-3 space-y-4"
                        >
                            {activeModuleInfo.sections.map((section, idx) => {
                                const isCollapsed = !!collapsedSections[`${activeModuleInfo.key}:${section.title}`];

                                return (
                                    <div key={idx} className="transition-all duration-200">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(section.title)}
                                            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-800 uppercase tracking-widest mb-1.5 group select-none cursor-pointer rounded-lg hover:bg-slate-100/70 transition-all active:scale-[0.99]"
                                            title={section.title}
                                        >
                                            <span className="truncate" title={section.title}>{section.title}</span>
                                            <svg
                                                className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-transform duration-200 ease-in-out shrink-0 pointer-events-none ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {!isCollapsed && (
                                            <ul className="space-y-0.5 animate-fadeIn">
                                                {section.items.map((item: any, itemIdx: number) => {
                                                    const active = isItemActive(item);
                                                    return (
                                                        <li key={itemIdx}>
                                                            <Link
                                                                href={getItemHref(item)}
                                                                className={`group flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-xl transition-all duration-200 ${
                                                                    active
                                                                        ? 'bg-red-50 text-[#E31B23] shadow-xs ring-1 ring-red-100 font-semibold hover:bg-red-100/70 hover:translate-x-0.5'
                                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                                                                }`}
                                                            >
                                                                <span className={`transition-colors shrink-0 ${active ? 'text-[#E31B23]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                                    {icons[item.name] || <span className="w-5 h-5 rounded bg-slate-200 inline-block" />}
                                                                </span>
                                                                <span className="truncate">{item.name}</span>
                                                            </Link>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Persistent Settings Link at bottom of Sidebar */}
                        <div className="shrink-0 px-3 py-2 border-t border-slate-100">
                            <Link
                                href={isSuperAdmin ? route('settings.index') : route('profile.edit')}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                                    (route().current('settings.*') || route().current('roles.*') || route().current('audit-logs.*'))
                                        ? 'bg-red-50 text-[#E31B23] shadow-xs ring-1 ring-red-100 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-0.5'
                                }`}
                            >
                                <span className={`transition-colors shrink-0 ${(route().current('settings.*') || route().current('roles.*') || route().current('audit-logs.*')) ? 'text-[#E31B23]' : 'text-slate-400'}`}>
                                    {icons['Settings']}
                                </span>
                                <span className="truncate">Settings</span>
                                {isSuperAdmin && (
                                    <span className="ml-auto text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        Admin
                                    </span>
                                )}
                            </Link>
                        </div>

                        {/* User Profile Footer */}
                        <div className="shrink-0 border-t border-slate-100 p-3 bg-white/50">
                            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 shadow-xs shrink-0">
                                    <img
                                        src={user.profile_photo_url}
                                        alt={user.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&color=7F9CF5&background=EBF4FF`;
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold ${roleBadgeColors[userRole] || 'bg-slate-100 text-slate-600'}`}>
                                        {userRole}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            )}

            {/* Main Content Area */}
            <div 
                className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden transition-all duration-300"
                scroll-region="true"
            >
                {/* Topbar */}
                <header className="bg-white/70 backdrop-blur-lg border-b border-slate-200/60 sticky top-0 z-30 shadow-xs transition-all duration-300">
                    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setShowingNavigationDropdown(!showingNavigationDropdown)}
                                className="inline-flex items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#E31B23] transition-colors"
                            >
                                <span className="sr-only">Open main menu</span>
                                {showingNavigationDropdown ? (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                ) : (
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                )}
                            </button>
                            <Link href={route('dashboard')} className="ml-3 md:hidden flex items-center" title="Swiss-Belinn SKA Pekanbaru">
                                <div className="h-8 w-8 rounded-xl overflow-hidden shadow-xs ring-1 ring-slate-200">
                                    <ApplicationLogo className="h-full w-full object-cover" />
                                </div>
                            </Link>
                        </div>

                        {/* Desktop: Collapsed Sidebar Indicator & Expand Button (Only visible when sidebar is collapsed) */}
                        {!hideSidebar && !isSidebarOpen && (
                            <div className="hidden md:flex items-center gap-2 mr-3 shrink-0 animate-fadeIn">
                                <button
                                    type="button"
                                    onClick={toggleSidebar}
                                    title="Toggle Sidebar (Ctrl+B)"
                                    className="p-2 rounded-xl text-slate-500 hover:text-[#E31B23] hover:bg-red-50 transition-all focus:outline-none focus:ring-2 focus:ring-[#E31B23]/20 flex items-center gap-1.5 group active:scale-95"
                                >
                                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                </button>

                                {/* When sidebar is collapsed: show mini brand and active module indicator */}
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={route('dashboard')}
                                        className="flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-slate-100 transition-colors group shrink-0"
                                        title="Back to Main Menu (Desk Launcher)"
                                    >
                                        <div className="h-8 w-8 rounded-xl overflow-hidden shadow-xs shrink-0 ring-1 ring-slate-200/80">
                                            <ApplicationLogo className="h-full w-full object-cover" />
                                        </div>
                                    </Link>
                                    <span className="text-slate-300 hidden sm:inline">|</span>
                                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200/60 shrink-0">
                                        <span className={`w-2 h-2 rounded-full ${activeModuleInfo.dotColor}`}></span>
                                        <span>{activeModuleInfo.title}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Logo on desktop when sidebar is hidden (Frappe Desk mode) */}
                        {hideSidebar && (
                            <div className="hidden md:flex items-center shrink-0 mr-5">
                                <Link 
                                    href={route('dashboard')} 
                                    className="flex items-center group transition-transform hover:scale-105 active:scale-95" 
                                    title="Swiss-Belinn SKA Pekanbaru"
                                >
                                    <div className="h-10 w-10 rounded-xl overflow-hidden shadow-xs ring-1 ring-slate-200/80 bg-white">
                                        <ApplicationLogo className="h-full w-full object-cover" />
                                    </div>
                                </Link>
                            </div>
                        )}

                        {/* Search slot (Only when hideSidebar is true, e.g. Desk Launcher) */}
                        {header && hideSidebar && (
                            <div className="hidden md:block flex-1 min-w-0 max-w-lg mx-auto px-4">
                                {header}
                            </div>
                        )}

                        {/* Topbar right */}
                        <div className="ml-auto flex items-center gap-2.5 sm:gap-3">
                            {/* Global Search / Command Palette Trigger (Available across all modules) */}
                            <button
                                type="button"
                                onClick={() => setShowGlobalSearch(true)}
                                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 bg-slate-100/90 hover:bg-slate-200/80 rounded-xl border border-slate-200/80 transition-all cursor-pointer shadow-2xs group"
                                title="Search modules, pages, or shortcuts (Ctrl+K)"
                                aria-label="Search system (Ctrl+K)"
                            >
                                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span className="hidden sm:inline font-medium">Search...</span>
                                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-slate-500 bg-white border border-slate-200 rounded shadow-2xs">Ctrl K</kbd>
                            </button>

                            {/* Notifications Dropdown */}
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button 
                                        className="relative flex items-center justify-center p-2 text-slate-400 hover:text-[#E31B23] hover:bg-red-50 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#E31B23]/20"
                                        aria-label="Notifikasi"
                                    >
                                        <svg className="w-5 h-5 transition-transform duration-300 hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                        {(() => {
                                            const notifList = (usePage().props.auth as any).notifications || [];
                                            const notifCount = notifList.length;
                                            if (notifCount === 0) return null;
                                            return (
                                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E31B23] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                                                    {notifCount > 9 ? '9+' : notifCount}
                                                </span>
                                            );
                                        })()}
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content contentClasses="w-80 sm:w-96 bg-white py-0 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                                            {(usePage().props.auth as any).notifications?.length > 0 && (
                                                <span className="text-[11px] font-semibold bg-red-100 text-[#E31B23] px-2 py-0.5 rounded-full">
                                                    {(usePage().props.auth as any).notifications.length}
                                                </span>
                                            )}
                                        </div>
                                        {(usePage().props.auth as any).notifications?.length > 0 && (
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (confirm('Are you sure you want to delete all notifications?')) {
                                                        router.delete(route('notifications.destroyAll'), {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        });
                                                    }
                                                }}
                                                className="text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors flex items-center gap-1.5"
                                                title="Delete all notifications"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                <span>Delete all</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                                        {(usePage().props.auth as any).notifications?.length > 0 ? (
                                            (usePage().props.auth as any).notifications.map((notif: any) => {
                                                const handleDeleteNotification = (e: React.MouseEvent) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    router.delete(route('notifications.destroy', notif.id), {
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                     });
                                                };
                                                const isMention = notif.data?.type === 'comment_mention';

                                                const notificationBody = (
                                                    <>
                                                        {isMention ? (
                                                            <div className="w-7 h-7 rounded-full bg-red-100 text-[#E31B23] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                                                                @
                                                            </div>
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-slate-100 text-[#E31B23] flex items-center justify-center shrink-0 mt-0.5">
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-slate-800 leading-snug font-medium line-clamp-2 hover:text-[#E31B23] transition-colors">{notif.data.message}</p>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                {isMention && (
                                                                    <span className="text-[9px] bg-red-100 text-[#E31B23] font-semibold px-1 rounded">
                                                                        Tagged
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-slate-400">{new Date(notif.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                );

                                                return (
                                                    <div 
                                                        key={notif.id}
                                                        className={`px-3.5 py-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-2.5 ${isMention ? 'bg-red-50/30' : ''}`}
                                                    >
                                                        {notif.data.action_url ? (
                                                            <Link href={notif.data.action_url} className="flex items-start gap-2.5 flex-1 min-w-0">
                                                                {notificationBody}
                                                            </Link>
                                                        ) : (
                                                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                                                {notificationBody}
                                                            </div>
                                                        )}
                                                        <button 
                                                            type="button"
                                                            onClick={handleDeleteNotification}
                                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors shrink-0"
                                                            title="Delete Notification"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                    </svg>
                                                </div>
                                                No new notifications
                                            </div>
                                        )}
                                    </div>
                                </Dropdown.Content>
                            </Dropdown>

                            {/* User Profile Dropdown */}
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="flex items-center gap-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 focus:outline-none transition-all duration-300 rounded-xl px-2 py-1.5 hover:bg-slate-100/50 hover:shadow-xs">
                                        <div className="h-9 w-9 rounded-full overflow-hidden shadow-xs ring-2 ring-white shrink-0">
                                            <img
                                                src={user.profile_photo_url}
                                                alt={user.name}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&color=7F9CF5&background=EBF4FF`;
                                                }}
                                            />
                                        </div>
                                        <span className="hidden sm:inline-block text-slate-700 font-medium">{user.name}</span>
                                        <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </Dropdown.Trigger>

                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>

                    {/* Mobile Search slot (Desk Launcher on mobile) */}
                    {header && hideSidebar && (
                        <div className="md:hidden border-t border-slate-100 bg-white/95 px-4 py-2.5">
                            {header}
                        </div>
                    )}

                    {/* Mobile Navigation Menu */}
                    <div className={`${showingNavigationDropdown ? 'block' : 'hidden'} md:hidden border-t border-slate-200 bg-white`}>
                        <div
                            ref={mobileMenuRef}
                            onScroll={(event) => rememberMenuScroll(event.currentTarget, 'mobile')}
                            className="space-y-1 pt-2 pb-3 px-2 max-h-[70vh] overflow-y-auto"
                        >
                            {/* Return to Desk Launcher on mobile */}
                            <div className="mb-2">
                                <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard') && !currentUrl.includes('view=')}>
                                    <span className="flex items-center gap-2 font-bold text-[#E31B23]">
                                        {icons['Main Menu'] || icons['Menu Utama']}
                                        Main Menu (Desk Launcher)
                                    </span>
                                </ResponsiveNavLink>
                            </div>

                            {/* Active module indicator */}
                            <div className="px-3 py-1.5 mb-2 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${activeModuleInfo.dotColor}`}></span>
                                <span>Module: {activeModuleInfo.title}</span>
                            </div>

                            {activeModuleInfo.sections.map((section, idx) => {
                                const isCollapsed = !!collapsedSections[`${activeModuleInfo.key}:${section.title}`];

                                return (
                                    <div key={idx} className="mb-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleSection(section.title)}
                                            className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 group cursor-pointer hover:bg-slate-50 rounded"
                                            title={isCollapsed ? `Expand ${section.title}` : `Collapse ${section.title}`}
                                        >
                                            <span>{section.title}</span>
                                            <svg
                                                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ease-in-out shrink-0 pointer-events-none ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                        {!isCollapsed && (
                                            <div className="space-y-0.5">
                                                {section.items.map((item: any, itemIdx: number) => {
                                                    const active = isItemActive(item);
                                                    return (
                                                        <ResponsiveNavLink key={itemIdx} href={getItemHref(item)} active={active}>
                                                            <span className="flex items-center gap-2">
                                                                {icons[item.name] || <span className="w-5 h-5 rounded bg-gray-200 inline-block" />}
                                                                {item.name}
                                                            </span>
                                                        </ResponsiveNavLink>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="border-t border-gray-200 px-4 py-3">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full overflow-hidden border border-gray-200 shrink-0">
                                    <img
                                        src={user.profile_photo_url}
                                        alt={user.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&color=7F9CF5&background=EBF4FF`;
                                        }}
                                    />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-800">{user.name}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                            </div>
                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={isSuperAdmin ? route('settings.index') : route('profile.edit')}>
                                    Settings
                                </ResponsiveNavLink>
                                <ResponsiveNavLink href={route('profile.edit')}>Profile</ResponsiveNavLink>
                                <ResponsiveNavLink method="post" href={route('logout')} as="button">Log Out</ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dedicated Page Header Banner for all normal pages (!hideSidebar) */}
                {header && !hideSidebar && (
                    <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 py-3 px-3 sm:px-4 lg:px-6 shadow-2xs transition-all">
                        <div className={isSidebarOpen ? 'w-full max-w-[1600px] mx-auto' : 'w-full max-w-[1650px] mx-auto'}>
                            {header}
                        </div>
                    </div>
                )}

                {/* Page Content */}
                <main className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${hideSidebar ? 'p-4 sm:p-6 lg:p-10' : 'p-3 sm:p-4 lg:p-5'}`}>
                    <div className={`flex-1 ${hideSidebar ? 'max-w-6xl mx-auto w-full' : isSidebarOpen ? 'w-full max-w-[1600px] mx-auto' : 'w-full max-w-[1650px] mx-auto'}`}>
                        {children}
                    </div>

                    {/* Global Page Footer */}
                    <footer className={`mt-8 pt-4 pb-2 border-t border-slate-200/70 text-xs text-slate-500 ${hideSidebar ? 'max-w-6xl mx-auto w-full' : isSidebarOpen ? 'w-full max-w-[1600px] mx-auto' : 'w-full max-w-[1650px] mx-auto'}`}>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-slate-500">
                                <span>&copy; {new Date().getFullYear()} <strong className="text-slate-700 font-semibold">Swiss-Belinn SKA Pekanbaru</strong>.</span>
                                <span className="hidden sm:inline text-slate-300">•</span>
                                <span className="text-slate-400">All rights reserved.</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                                <span>Developed by</span>
                                <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/90 text-xs transition-colors shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E31B23]"></span>
                                    Stackbit
                                </span>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>

            {/* Global Loading Top Bar & Floating Notification */}
            {isNavigating && (
                <>
                    <div className="fixed top-0 left-0 right-0 h-1 z-[99999] overflow-hidden bg-red-100/60 pointer-events-none">
                        <div className="h-full w-1/2 bg-gradient-to-r from-[#E31B23] via-red-500 to-[#b51219] rounded-full animate-indeterminate" />
                    </div>

                    <div className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 text-white backdrop-blur-md shadow-2xl border border-white/10 pointer-events-none transition-all duration-200">
                        <svg className="animate-spin h-4 w-4 text-[#E31B23] shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        <span className="text-xs font-medium tracking-wide">
                            {navigatingMethod === 'delete' && 'Deleting data...'}
                            {(navigatingMethod === 'put' || navigatingMethod === 'patch') && 'Saving changes...'}
                            {navigatingMethod === 'post' && 'Processing data...'}
                            {navigatingMethod === 'get' && 'Loading page...'}
                        </span>
                    </div>
                </>
            )}
            {/* Global Search / Command Palette Modal */}
            <GlobalSearchModal isOpen={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
        </div>
    );
}
