import React from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { PageProps } from '@/types';
import Badge from '@/Components/Badge';

export default function Roles({ auth, roles }: PageProps<{ roles: any[] }>) {
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-slate-800 leading-tight">Roles & Permissions</h2>}
        >
            <Head title="Roles & Permissions" />

            <div className="w-full">
                <div className="w-full">
                    <div className="bg-white overflow-hidden shadow-xs rounded-2xl border border-slate-200">
                        <div className="p-6 text-slate-900">
                            <p className="text-sm text-slate-500 mb-6">
                                Below are the system roles and the permissions assigned to each. Roles are managed by the system administrator.
                            </p>
                            <div className="space-y-4">
                                {roles.map((role: any) => (
                                    <div key={role.id} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2.5">
                                                <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                                                <Badge variant="brand">Role</Badge>
                                            </div>
                                            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                                                {role.permissions?.length || 0} permissions
                                            </span>
                                        </div>
                                        {role.permissions && role.permissions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {role.permissions.map((perm: any) => (
                                                    <span key={perm.id} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200/60">
                                                        {perm.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Full access (Super Admin) or no specific permissions configured.</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
