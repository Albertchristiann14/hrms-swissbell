import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const user = usePage<PageProps>().props.auth.user;
    const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
    const role = user.roles?.[0]?.name || 'Team Member';
    const department = user.employee?.department?.name;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <nav className="mb-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500" aria-label="Breadcrumb">
                            <Link href={route('dashboard', { view: 'overview' })} className="hover:text-[#E31B23]">My Workspace</Link>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-800">Profile Settings</span>
                        </nav>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
                    </div>
                    <Link href={route('dashboard', { view: 'overview' })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:text-[#E31B23]">
                        ← Personal Dashboard
                    </Link>
                </div>
            }
        >
            <Head title="Profile Settings" />

            <div className="w-full space-y-4">
                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E31B23] via-[#c7141d] to-[#8f1720] px-5 py-6 text-white shadow-sm sm:px-7">
                    <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border-[36px] border-white/10" aria-hidden="true" />
                    <div className="pointer-events-none absolute bottom-[-95px] right-36 h-44 w-44 rounded-full bg-white/5" aria-hidden="true" />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white/30 bg-white/20 text-2xl font-bold shadow-sm">
                            {user.profile_photo_url ? (
                                <img src={user.profile_photo_url} alt={`Foto ${user.name}`} className="h-full w-full object-cover" />
                            ) : initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Your personal space</p>
                            <h2 className="truncate text-2xl font-extrabold tracking-tight">{user.name}</h2>
                            <p className="mt-1 break-all text-sm text-white/80">{user.email}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                                <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1">{role}</span>
                                {department && <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1">{department}</span>}
                            </div>
                        </div>
                        <div className="hidden max-w-[205px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs leading-relaxed text-white/85 lg:block">
                            Keep your contact details and account security up to date.
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-7">
                        <UpdateProfileInformationForm mustVerifyEmail={mustVerifyEmail} status={status} />
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-5">
                        <UpdatePasswordForm />
                        <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-800">
                            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 11v6m0-10h.01" /></svg>
                            Use a unique password and avoid sharing your account credentials.
                        </div>
                    </div>
                </div>

                <details className="group overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition hover:bg-red-50/50 sm:px-6 [&::-webkit-details-marker]:hidden">
                        <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6" /></svg>
                            </span>
                            <span>
                                <span className="block text-sm font-bold text-slate-800">Account Management</span>
                                <span className="block text-xs text-slate-500">Advanced options for your account</span>
                            </span>
                        </span>
                        <svg className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
                    </summary>
                    <div className="border-t border-red-100 px-5 py-5 sm:px-6">
                        <DeleteUserForm />
                    </div>
                </details>
            </div>
        </AuthenticatedLayout>
    );
}
