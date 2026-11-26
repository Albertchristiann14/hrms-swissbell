import React from 'react';
import { Link } from '@inertiajs/react';
import PrimaryButton from './PrimaryButton';

interface EmptyStateAction {
    label: string;
    onClick?: () => void;
    href?: string;
}

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    action?: EmptyStateAction;
    compact?: boolean;
    className?: string;
}

export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    action,
    compact = false,
    className = '',
}: EmptyStateProps) {
    const defaultIcon = (
        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
    );

    const effectiveActionLabel = action?.label || actionLabel;
    const effectiveOnAction = action?.onClick || onAction;
    const effectiveHref = action?.href;

    return (
        <div
            className={`flex flex-col items-center justify-center text-center rounded-xl bg-slate-50/60 border border-dashed border-slate-300/80 transition-colors ${
                compact ? 'py-5 px-4' : 'py-10 px-6'
            } ${className}`}
            role="status"
        >
            <div className={`rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-500 mb-3 ${
                compact ? 'w-10 h-10' : 'w-12 h-12'
            }`}>
                {icon || defaultIcon}
            </div>

            <h3 className={`font-bold text-slate-800 ${compact ? 'text-xs' : 'text-sm sm:text-base'}`}>
                {title}
            </h3>

            <p className={`text-slate-500 max-w-sm mt-1 leading-relaxed ${
                compact ? 'text-[11px]' : 'text-xs sm:text-sm'
            }`}>
                {description}
            </p>

            {effectiveActionLabel && (
                <div className="mt-4">
                    {effectiveHref ? (
                        <Link
                            href={effectiveHref}
                            className="inline-flex items-center px-4 py-2 bg-[#E31B23] border border-transparent rounded-xl font-semibold text-xs text-white uppercase tracking-widest hover:bg-[#C4141B] transition ease-in-out duration-150"
                        >
                            {effectiveActionLabel}
                        </Link>
                    ) : (
                        <PrimaryButton onClick={effectiveOnAction} className="text-xs">
                            {effectiveActionLabel}
                        </PrimaryButton>
                    )}
                </div>
            )}
        </div>
    );
}
