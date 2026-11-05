import React, { useState, useEffect, useRef, useMemo } from 'react';
import { router } from '@inertiajs/react';

interface SearchItem {
    id: string;
    title: string;
    description: string;
    category: string;
    href: string;
    icon?: React.ReactNode;
}

const GLOBAL_SEARCH_CATALOG: SearchItem[] = [
    // Tasks
    { id: 'tasks-list', title: 'List Task', description: 'Lihat seluruh daftar tugas dan penugasan tim', category: 'Task Management', href: '/tasks' },
    { id: 'tasks-kanban', title: 'My List (Kanban)', description: 'Papan kartu kanban dan perubahan status tugas', category: 'Task Management', href: '/tasks/kanban' },
    { id: 'tasks-calendar', title: 'Task Calendar', description: 'Jadwal dan kalender deadline tugas hotel', category: 'Task Management', href: '/tasks/calendar' },
    { id: 'tasks-create', title: 'Buat Tugas Baru', description: 'Tambahkan penugasan baru untuk staf hotel', category: 'Task Management', href: '/tasks?create=1' },

    // HR
    { id: 'hr-attendance', title: 'Data Absensi & Kehadiran', description: 'Catatan clock in/out dan rekapan absensi harian', category: 'Human Resources', href: '/attendance' },
    { id: 'hr-employees', title: 'Daftar Karyawan (Staff Directory)', description: 'Direktori staf hotel, jabatan, dan departemen', category: 'Human Resources', href: '/employees' },
    { id: 'hr-leaves', title: 'Pengajuan Cuti (Leave Requests)', description: 'Kelola permohonan cuti tahunan dan cuti sakit', category: 'Human Resources', href: '/leave' },
    { id: 'hr-overtime', title: 'Lembur / SPKL (Overtime)', description: 'Surat Perintah Kerja Lembur dan perhitungan jam', category: 'Human Resources', href: '/overtime' },
    { id: 'hr-payroll', title: 'Slip Gaji (My Payslips)', description: 'Arsip slip gaji dan rincian take home pay', category: 'Human Resources', href: '/payroll/my-payslips' },
    { id: 'hr-shifts', title: 'Shift Roster (Scheduler)', description: 'Jadwal giliran kerja mingguan karyawan', category: 'Human Resources', href: '/schedules' },

    // IT Operations
    { id: 'it-helpdesk', title: 'Laporkan Kendala IT (IT Tickets)', description: 'Buat tiket aduan WiFi, printer, POS, hardware', category: 'IT Operations', href: '/it?tab=tickets' },
    { id: 'it-assets', title: 'Inventaris Aset IT (IT Assets)', description: 'Katalog hardware komputer, switch, dan perangkat IT', category: 'IT Operations', href: '/it?tab=assets' },
    { id: 'it-powerpro', title: 'Permohonan Akun PowerPro PMS', description: 'Otorisasi dan aktivasi User ID PMS PowerPro', category: 'IT Operations', href: '/power-pro' },
    { id: 'it-master-keys', title: 'Master Key Programming', description: 'Pemrograman kartu master RFID dan otorisasi kunci', category: 'IT Operations', href: '/master-keys' },

    // Room & Key Management
    { id: 'room-borrow', title: 'Form Peminjaman Kamar & Kunci', description: 'Pinjam fisik kunci kamar hotel via pos sekuriti', category: 'Room & Key Management', href: '/room-borrowing?tab=borrow' },
    { id: 'room-catalog', title: 'Katalog Ketersediaan Kamar', description: 'Status ketersediaan kamar dan kunci hotel', category: 'Room & Key Management', href: '/room-borrowing?tab=catalog' },
    { id: 'room-my-loans', title: 'Peminjaman Saya (My Borrowings)', description: 'Daftar kunci kamar yang sedang Anda bawa', category: 'Room & Key Management', href: '/room-borrowing?tab=my-borrowings' },
    { id: 'room-security-queue', title: 'Antrean Verifikasi Pengembalian', description: 'Verifikasi fisik serah terima kunci pos security', category: 'Room & Key Management', href: '/room-borrowing?tab=pending-returns' },

    // Knowledge & Information
    { id: 'announcements', title: 'Pengumuman Hotel (Announcements)', description: 'Memo resmi manajemen Swiss-Belinn SKA Pekanbaru', category: 'Knowledge & Info', href: '/announcements' },
    { id: 'documents', title: 'Dokumen & SOP (Repository)', description: 'Standard Operating Procedures dan formulir hotel', category: 'Knowledge & Info', href: '/documents' },

    // Profile & Settings
    { id: 'profile', title: 'Pengaturan Profil Saya', description: 'Ubah foto profil, password, dan info akun', category: 'Akun & Pengaturan', href: '/profile' },
];

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            const focusTimer = setTimeout(() => {
                if (document.visibilityState === 'visible') inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(focusTimer);
        }
    }, [isOpen]);

    const results = useMemo(() => {
        if (!query.trim()) return GLOBAL_SEARCH_CATALOG.slice(0, 8);
        const q = query.toLowerCase().trim();
        return GLOBAL_SEARCH_CATALOG.filter(
            item =>
                item.title.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q)
        );
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            router.visit(results[selectedIndex].href);
            onClose();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input Bar */}
                <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
                    <svg className="w-5 h-5 text-slate-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-18 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Ketik nama modul, fitur, atau halaman (Tekan Esc untuk keluar)..."
                        className="w-full text-sm sm:text-base bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-900 placeholder-slate-400 p-0"
                    />
                    <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
                        ESC
                    </kbd>
                </div>

                {/* Results List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2">
                    {results.length > 0 ? (
                        results.map((item, idx) => {
                            const isSelected = idx === selectedIndex;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        router.visit(item.href);
                                        onClose();
                                    }}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    className={`w-full text-left flex items-start justify-between gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                                        isSelected ? 'bg-red-50/80 text-[#E31B23]' : 'hover:bg-slate-50 text-slate-800'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${isSelected ? 'text-[#E31B23]' : 'text-slate-900'}`}>
                                                {item.title}
                                            </span>
                                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                {item.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            {item.description}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold ${isSelected ? 'text-[#E31B23] translate-x-1' : 'text-slate-300'} transition-transform shrink-0`}>
                                        →
                                    </span>
                                </button>
                            );
                        })
                    ) : (
                        <div className="py-8 text-center text-xs text-slate-400">
                            Tidak ditemukan hasil pencarian untuk "<strong className="text-slate-600">{query}</strong>"
                        </div>
                    )}
                </div>

                {/* Footer hints */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↓</kbd> Navigasi</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↵</kbd> Buka</span>
                    </div>
                    <span>SIPU Global Search</span>
                </div>
            </div>
        </div>
    );
}
