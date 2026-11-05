import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Badge from '@/Components/Badge';
import PageHeader from '@/Components/PageHeader';
import { formatDate } from '@/Utils/date';

export default function DocumentIndex({ documents, auth, flash }: any) {
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        title: '',
        type: 'General',
        file: null as File | null,
    });

    const isHR = auth.user.roles?.some((r: any) => r.name === 'Super Admin' || r.name === 'HRD / Admin' || r.name === 'General Manager');

    const submit = (e: any) => {
        e.preventDefault();
        post(route('documents.store'), {
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
            forceFormData: true,
        });
    };

    const getTypeVariant = (type: string) => {
        switch (type) {
            case 'SOP': return 'brand';
            case 'Policy': return 'warning';
            case 'Form': return 'success';
            default: return 'info';
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    breadcrumbs={[
                        { label: 'Main Menu', href: route('dashboard') },
                        { label: 'Knowledge & Information' },
                        { label: 'Documents & SOPs' },
                    ]}
                    title="Documents & SOP Management"
                    subtitle="Arsip peraturan internal hotel, Standard Operating Procedure (SOP), dan formulir operasional."
                    primaryAction={isHR ? {
                        label: showForm ? 'Close Form' : 'Upload Document',
                        icon: (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        ),
                        onClick: () => setShowForm(!showForm),
                    } : undefined}
                />
            }
        >
            <Head title="Documents Management" />

            <div className="w-full">
                <div className="w-full space-y-4">
                    
                    {flash?.success && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-sm shadow-xs">
                            <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>{flash.success}</span>
                        </div>
                    )}

                    {showForm && (
                        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                            <h3 className="text-base font-semibold text-slate-900 mb-4">Upload New Document</h3>
                            <form onSubmit={submit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Document Title</label>
                                        <input 
                                            type="text" 
                                            value={data.title} 
                                            placeholder="Official document name..."
                                            onChange={e => setData('title', e.target.value)}
                                            className="w-full rounded-xl border-slate-300 shadow-xs text-sm text-slate-900 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2.5 px-3"
                                        />
                                        {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">Document Type / Category</label>
                                        <select 
                                            value={data.type} 
                                            onChange={e => setData('type', e.target.value)}
                                            className="w-full rounded-xl border-slate-300 shadow-xs text-sm text-slate-900 focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23] py-2.5 px-3"
                                        >
                                            <option value="General">General</option>
                                            <option value="SOP">SOP (Standard Operating Procedure)</option>
                                            <option value="Policy">Company Policy</option>
                                            <option value="Form">Form / Template</option>
                                        </select>
                                        {errors.type && <p className="text-rose-500 text-xs mt-1">{errors.type}</p>}
                                    </div>
                                </div>
                                <div className="mb-5">
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">File (PDF, Word, Excel - Max 10MB)</label>
                                    <input 
                                        type="file" 
                                        onChange={e => setData('file', e.target.files ? e.target.files[0] : null)}
                                        className="w-full border border-slate-300 p-2.5 rounded-xl shadow-xs bg-slate-50 text-sm focus:border-[#E31B23] focus:ring-1 focus:ring-[#E31B23]"
                                    />
                                    {errors.file && <p className="text-rose-500 text-xs mt-1">{errors.file}</p>}
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <SecondaryButton onClick={() => setShowForm(false)}>
                                        Cancel
                                    </SecondaryButton>
                                    <PrimaryButton 
                                        type="submit" 
                                        disabled={processing}
                                    >
                                        {processing ? 'Uploading...' : 'Upload Now'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50/80">
                                    <tr>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Document Title</th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded By</th>
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {documents.length > 0 ? (
                                        documents.map((doc: any) => (
                                            <tr key={doc.id} className="hover:bg-slate-50/75 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E31B23] flex items-center justify-center mr-3 shrink-0">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-900">{doc.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge variant={getTypeVariant(doc.type)}>
                                                        {doc.type}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {doc.uploader?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 tabular-nums">
                                                    {formatDate(doc.created_at)}
                                                </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <a 
                                                    href={route('documents.download', doc.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E31B23] bg-red-50 hover:bg-red-100 transition-colors"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Download
                                                </a>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">No documents available</p>
                                            <p className="text-xs text-slate-400 mt-1">Uploaded SOP documents and hotel forms will appear here.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </AuthenticatedLayout>
);
}
