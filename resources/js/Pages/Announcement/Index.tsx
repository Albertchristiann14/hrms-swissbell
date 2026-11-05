import React, { useEffect, useMemo, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import PageHeader from '@/Components/PageHeader';
import EmptyState from '@/Components/EmptyState';
import { formatDate, formatDateTime } from '@/Utils/date';

type AnnouncementItem = {
    id: number;
    title: string;
    message: string;
    target_audience: string | null;
    published_at: string | null;
    created_at?: string | null;
    creator?: { name?: string | null } | null;
};

const audienceLabel = (audience?: string | null): string => {
    if (!audience || audience === 'All') return 'Semua Staf';
    if (audience === 'Supervisors') return 'HOD & Supervisor';
    return audience;
};

const publicationDate = (item: AnnouncementItem): string | null =>
    item.published_at || item.created_at || null;

const publicationTimestamp = (item: AnnouncementItem): number => {
    const timestamp = Date.parse(publicationDate(item) || '');
    return Number.isNaN(timestamp) ? 0 : timestamp;
};

function AnnouncementDetail({ announcement }: { announcement: AnnouncementItem }) {
    const author = announcement.creator?.name || 'Manajemen Hotel';

    return (
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50/80 to-white px-4 py-4 sm:px-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m3 11 18-5v12l-18-5V11Zm5 4 2 5h3l-2.2-5.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Pengumuman Internal
                    </span>
                    <span className="text-xs font-medium text-slate-500">{formatDate(publicationDate(announcement))}</span>
                </div>
                <h2 className="break-words text-xl font-bold leading-snug text-slate-900">{announcement.title}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-700">
                        {author.trim().slice(0, 1).toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-700">{author}</span>
                    <span className="text-slate-300">•</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600">
                        {audienceLabel(announcement.target_audience)}
                    </span>
                </div>
            </div>
            <div className="px-4 py-5 sm:px-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Isi Pengumuman</p>
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 sm:text-[15px]">
                    {announcement.message}
                </div>
                <div className="mt-6 border-t border-slate-100 pt-3 text-xs text-slate-400">
                    Dipublikasikan {formatDateTime(publicationDate(announcement))} WIB
                </div>
            </div>
        </article>
    );
}

export default function AnnouncementIndex({ announcements = [], auth, flash }: any) {
    const [showForm, setShowForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [audienceFilter, setAudienceFilter] = useState('all');
    const [sortDirection, setSortDirection] = useState<'newest' | 'oldest'>('newest');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
    const [listWidthPercent, setListWidthPercent] = useState(65);
    const listWidthRef = useRef(65);
    const splitContainerRef = useRef<HTMLDivElement | null>(null);
    const isResizingRef = useRef(false);
    const widthStorageKey = 'hrms:announcement-list-width:' + String(auth?.user?.id ?? 'guest');

    const clampListWidth = (requestedPercent: number): number => {
        const containerWidth = splitContainerRef.current?.getBoundingClientRect().width ?? 1200;
        if (containerWidth < 700) {
            return Math.min(77, Math.max(40, requestedPercent));
        }
        const minPercent = Math.max(40, Math.min(49, 360 / containerWidth * 100));
        const maxPercent = Math.max(minPercent, Math.min(77, (containerWidth - 16 - 320) / containerWidth * 100));
        return Math.min(maxPercent, Math.max(minPercent, requestedPercent));
    };

    const updateListWidth = (requestedPercent: number, savePreference = false) => {
        const nextPercent = clampListWidth(requestedPercent);
        listWidthRef.current = nextPercent;
        setListWidthPercent(nextPercent);

        if (savePreference) {
            try {
                window.localStorage.setItem(widthStorageKey, String(nextPercent));
            } catch {
                // Browsers with disabled storage can still resize the panels.
            }
        }
    };

    useEffect(() => {
        try {
            const savedPercent = window.localStorage.getItem(widthStorageKey);
            if (savedPercent !== null && Number.isFinite(Number(savedPercent))) {
                updateListWidth(Number(savedPercent));
            }
        } catch {
            // Keep the default 65/35 split when storage is unavailable.
        }

        const onWindowResize = () => {
            if (window.matchMedia('(min-width: 1280px)').matches) {
                updateListWidth(listWidthRef.current);
            }
        };
        window.addEventListener('resize', onWindowResize);
        const resizeObserver = typeof ResizeObserver !== 'undefined' && splitContainerRef.current
            ? new ResizeObserver(onWindowResize)
            : null;
        if (splitContainerRef.current) resizeObserver?.observe(splitContainerRef.current);

        return () => {
            window.removeEventListener('resize', onWindowResize);
            resizeObserver?.disconnect();
        };
    }, [widthStorageKey]);

    const onDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        isResizingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
    };

    const onDividerPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isResizingRef.current || !splitContainerRef.current) return;
        const bounds = splitContainerRef.current.getBoundingClientRect();
        updateListWidth((event.clientX - bounds.left) / bounds.width * 100);
    };

    const finishDividerResize = () => {
        if (!isResizingRef.current) return;
        isResizingRef.current = false;
        updateListWidth(listWidthRef.current, true);
    };

    const onDividerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            updateListWidth(listWidthRef.current + (event.key === 'ArrowRight' ? 3 : -3), true);
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            updateListWidth(event.key === 'Home' ? 0 : 100, true);
        }
    };

    const { data, setData, post, processing, reset, errors } = useForm({
        title: '',
        message: '',
        target_audience: 'All',
    });

    const items = (Array.isArray(announcements) ? announcements : []) as AnnouncementItem[];
    const isHR = auth?.user?.roles?.some((role: any) =>
        ['Super Admin', 'HRD / Admin', 'General Manager'].includes(role.name)
    ) || false;

    const audiences = useMemo(
        () => Array.from(new Set(items.map(item => item.target_audience).filter(Boolean))) as string[],
        [announcements]
    );

    const featured = useMemo(
        () => [...items].sort((a, b) => publicationTimestamp(b) - publicationTimestamp(a))[0] || null,
        [announcements]
    );

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase('id-ID');

        return items
            .filter(item => {
                const matchesAudience = audienceFilter === 'all' || item.target_audience === audienceFilter;
                const searchableText = [
                    item.title,
                    item.message,
                    item.creator?.name || '',
                ].join(' ').toLocaleLowerCase('id-ID');

                return matchesAudience && (!query || searchableText.includes(query));
            })
            .sort((a, b) => sortDirection === 'newest'
                ? publicationTimestamp(b) - publicationTimestamp(a)
                : publicationTimestamp(a) - publicationTimestamp(b)
            );
    }, [announcements, searchQuery, audienceFilter, sortDirection]);

    const selectedAnnouncement = filtered.find(item => item.id === selectedId) || filtered[0] || null;
    const showFeatured = !!featured && items.length > 1
        && searchQuery.trim() === '' && audienceFilter === 'all' && sortDirection === 'newest';

    useEffect(() => {
        if (!showForm && !mobileDetailOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowForm(false);
                setMobileDetailOpen(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [showForm, mobileDetailOpen]);

    const openDetail = (id: number) => {
        setSelectedId(id);
        setMobileDetailOpen(window.matchMedia('(max-width: 1279px)').matches);
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route('announcements.store'), {
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    breadcrumbs={[
                        { label: 'Main Menu', href: route('dashboard') },
                        { label: 'Human Resources', href: route('dashboard', { view: 'hr' }) },
                        { label: 'Announcements' },
                    ]}
                    title="Internal Announcements"
                    subtitle="Informasi dan pemberitahuan resmi untuk seluruh tim hotel."
                    primaryAction={isHR ? {
                        label: 'New Announcement',
                        icon: (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                            </svg>
                        ),
                        onClick: () => setShowForm(true),
                    } : undefined}
                />
            }
        >
            <Head title="Announcements" />

            <div className="w-full space-y-3 sm:space-y-4">
                {flash?.success && (
                    <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">
                        {flash.success}
                    </div>
                )}

                {showFeatured && (
                    <section className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-white p-4 shadow-xs sm:p-5">
                        <div className="absolute inset-y-0 left-0 w-1 bg-[#E31B23]" aria-hidden="true" />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                                        Sorotan Terbaru
                                    </span>
                                    <span className="text-[11px] text-slate-500">{formatDate(publicationDate(featured))}</span>
                                </div>
                                <h2 className="line-clamp-1 text-base font-bold text-slate-900 sm:text-lg">{featured.title}</h2>
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{featured.message}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openDetail(featured.id)}
                                className="shrink-0 self-start rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 sm:self-center"
                            >
                                Baca Selengkapnya →
                            </button>
                        </div>
                    </section>
                )}

                <section aria-label="Cari dan filter pengumuman" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                    <div className="relative min-w-[220px] flex-1">
                        <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m16 16 4 4" strokeLinecap="round" />
                        </svg>
                        <input
                            type="search"
                            aria-label="Cari pengumuman"
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder="Cari judul, isi, atau pembuat..."
                            className="w-full rounded-xl border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-300 focus:ring-rose-200"
                        />
                    </div>
                    <select
                        aria-label="Filter target pengumuman"
                        value={audienceFilter}
                        onChange={event => setAudienceFilter(event.target.value)}
                        className="min-w-[160px] flex-1 rounded-xl border-slate-200 bg-white py-2 text-sm text-slate-700 focus:border-rose-300 focus:ring-rose-200 sm:flex-none"
                    >
                        <option value="all">Semua Audiens</option>
                        {audiences.map(audience => (
                            <option key={audience} value={audience}>{audienceLabel(audience)}</option>
                        ))}
                    </select>
                    <select
                        aria-label="Urutkan pengumuman"
                        value={sortDirection}
                        onChange={event => setSortDirection(event.target.value as 'newest' | 'oldest')}
                        className="min-w-[130px] flex-1 rounded-xl border-slate-200 bg-white py-2 text-sm text-slate-700 focus:border-rose-300 focus:ring-rose-200 sm:flex-none"
                    >
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                    </select>
                    {(searchQuery || audienceFilter !== 'all' || sortDirection !== 'newest') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setAudienceFilter('all');
                                setSortDirection('newest');
                            }}
                            className="rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                            Reset
                        </button>
                    )}
                    <span className="w-full text-right text-xs font-medium text-slate-500 sm:w-auto sm:pl-2">
                        {filtered.length} dari {items.length} pengumuman
                    </span>
                </section>

                {filtered.length > 0 ? (
                    <div
                        ref={splitContainerRef}
                        className="flex min-w-0 flex-col items-start gap-3 xl:flex-row xl:gap-0"
                        style={{ '--announcement-list-width': String(listWidthPercent) + '%' } as React.CSSProperties}
                    >
                        <section aria-label="Daftar pengumuman" className="w-full min-w-0 space-y-2 xl:w-[var(--announcement-list-width)] xl:flex-none">
                            <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
                                <h2 className="text-sm font-bold text-slate-900">Daftar Pengumuman</h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500">Pilih untuk membaca detail</span>
                                    <button
                                        type="button"
                                        onClick={() => updateListWidth(65, true)}
                                        className="hidden rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-rose-700 xl:inline-flex"
                                        title="Kembalikan lebar panel ke ukuran awal"
                                    >
                                        Reset lebar
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                                <div className="hidden grid-cols-[minmax(115px,160px)_minmax(0,1fr)_88px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 xl:grid">
                                    <span>Pengirim</span>
                                    <span>Judul & Ringkasan</span>
                                    <span className="text-right">Tanggal</span>
                                </div>
                                {filtered.map(item => {
                                    const isSelected = selectedAnnouncement?.id === item.id;
                                    const author = item.creator?.name || 'Manajemen Hotel';

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => openDetail(item.id)}
                                            aria-pressed={isSelected}
                                            aria-label={'Baca pengumuman dari ' + author + ': ' + item.title}
                                            className={[
                                                'group block w-full border-b border-l-[3px] border-b-slate-100 px-3 py-3 text-left transition-colors last:border-b-0 sm:px-4',
                                                isSelected
                                                    ? 'border-l-[#E31B23] bg-rose-50/60'
                                                    : 'border-l-transparent bg-white hover:bg-slate-50',
                                            ].join(' ')}
                                        >
                                            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 xl:grid-cols-[minmax(115px,160px)_minmax(0,1fr)_88px] xl:items-center">
                                                <div className="col-start-1 row-start-1 min-w-0 xl:col-start-1">
                                                    <span className="block truncate text-xs font-bold text-slate-800 sm:text-[13px]" title={author}>{author}</span>
                                                    <span className="mt-1 inline-block max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                                        {audienceLabel(item.target_audience)}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 row-start-2 min-w-0 truncate text-xs leading-5 sm:text-[13px] xl:col-span-1 xl:col-start-2 xl:row-start-1">
                                                    <span className="font-semibold text-slate-900 group-hover:text-rose-700">{item.title}</span>
                                                    <span className="font-normal text-slate-400"> — {item.message}</span>
                                                </div>
                                                <time className="col-start-2 row-start-1 whitespace-nowrap text-right text-[11px] font-medium text-slate-500 xl:col-start-3">
                                                    {formatDate(publicationDate(item))}
                                                </time>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                        <div
                            role="separator"
                            aria-label="Atur lebar daftar dan detail pengumuman"
                            aria-orientation="vertical"
                            aria-valuemin={40}
                            aria-valuemax={77}
                            aria-valuenow={Math.round(listWidthPercent)}
                            tabIndex={0}
                            title="Tarik kiri atau kanan untuk mengatur lebar panel. Gunakan tombol panah saat fokus."
                            onPointerDown={onDividerPointerDown}
                            onPointerMove={onDividerPointerMove}
                            onPointerUp={finishDividerResize}
                            onPointerCancel={finishDividerResize}
                            onLostPointerCapture={finishDividerResize}
                            onKeyDown={onDividerKeyDown}
                            className="group relative hidden w-4 shrink-0 self-stretch cursor-col-resize touch-none select-none outline-none xl:block"
                        >
                            <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 transition-colors group-hover:bg-rose-300 group-focus:bg-rose-400" />
                            <span aria-hidden="true" className="sticky top-[40vh] mx-auto mt-20 flex h-12 w-3 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-400 shadow-sm transition-colors group-hover:border-rose-400 group-hover:text-rose-500 group-focus:border-rose-400 group-focus:text-rose-600">
                                ⋮
                            </span>
                        </div>
                        <aside aria-label="Detail pengumuman terpilih" className="hidden min-w-0 xl:sticky xl:top-2 xl:block xl:flex-1">
                            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-2xl">
                                <AnnouncementDetail announcement={selectedAnnouncement!} />
                            </div>
                        </aside>
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        title="Belum ada pengumuman"
                        description="Pengumuman resmi dari manajemen hotel akan ditampilkan di sini."
                        action={isHR ? { label: 'Buat Pengumuman', onClick: () => setShowForm(true) } : undefined}
                    />
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
                        <h2 className="text-base font-bold text-slate-800">Pengumuman tidak ditemukan</h2>
                        <p className="mt-1 text-sm text-slate-500">Coba kata kunci atau pilihan audiens lain.</p>
                        <button
                            type="button"
                            onClick={() => { setSearchQuery(''); setAudienceFilter('all'); setSortDirection('newest'); }}
                            className="mt-4 rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                        >
                            Tampilkan Semua
                        </button>
                    </div>
                )}
            </div>

            {mobileDetailOpen && selectedAnnouncement && (
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-2 sm:items-center sm:p-5 xl:hidden"
                    onClick={() => setMobileDetailOpen(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Detail pengumuman"
                        onClick={event => event.stopPropagation()}
                        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-2 shadow-2xl sm:p-3"
                    >
                        <div className="flex items-center justify-between px-2 py-2">
                            <span className="text-xs font-bold text-slate-600">Detail Pengumuman</span>
                            <button
                                type="button"
                                aria-label="Tutup detail pengumuman"
                                onClick={() => setMobileDetailOpen(false)}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                                Tutup ✕
                            </button>
                        </div>
                        <AnnouncementDetail announcement={selectedAnnouncement} />
                    </div>
                </div>
            )}

            {isHR && showForm && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-3 sm:p-5"
                    onClick={() => setShowForm(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="announcement-form-heading"
                        onClick={event => event.stopPropagation()}
                        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2 id="announcement-form-heading" className="text-lg font-bold text-slate-900">Buat Pengumuman Baru</h2>
                                <p className="mt-1 text-xs text-slate-500">Informasi akan diterbitkan setelah kamu memilih Publish.</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Tutup formulir"
                                onClick={() => setShowForm(false)}
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label htmlFor="announcement-title" className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Judul Pengumuman <span className="text-rose-600">*</span>
                                </label>
                                <input
                                    id="announcement-title"
                                    required
                                    type="text"
                                    maxLength={255}
                                    value={data.title}
                                    placeholder="Contoh: General Meeting Bulanan"
                                    onChange={event => setData('title', event.target.value)}
                                    className="w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-rose-400 focus:ring-rose-200"
                                />
                                {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title}</p>}
                            </div>
                            <div>
                                <label htmlFor="announcement-message" className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Isi Pengumuman <span className="text-rose-600">*</span>
                                </label>
                                <textarea
                                    id="announcement-message"
                                    required
                                    rows={6}
                                    value={data.message}
                                    onChange={event => setData('message', event.target.value)}
                                    placeholder="Tuliskan detail informasi untuk karyawan..."
                                    className="w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-rose-400 focus:ring-rose-200"
                                />
                                {errors.message && <p className="mt-1 text-xs text-rose-600">{errors.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="announcement-audience" className="mb-1.5 block text-xs font-bold text-slate-700">
                                    Target Penerima <span className="text-rose-600">*</span>
                                </label>
                                <select
                                    id="announcement-audience"
                                    value={data.target_audience}
                                    onChange={event => setData('target_audience', event.target.value)}
                                    className="w-full rounded-xl border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-rose-400 focus:ring-rose-200"
                                >
                                    <option value="All">Seluruh Staf Hotel</option>
                                    <option value="Supervisors">HOD & Supervisor</option>
                                </select>
                                {errors.target_audience && <p className="mt-1 text-xs text-rose-600">{errors.target_audience}</p>}
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                                <SecondaryButton type="button" onClick={() => setShowForm(false)}>Batal</SecondaryButton>
                                <PrimaryButton type="submit" disabled={processing}>
                                    {processing ? 'Publishing...' : 'Publish Announcement'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
