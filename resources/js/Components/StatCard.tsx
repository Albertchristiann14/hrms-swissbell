import React from 'react';
import { Link } from '@inertiajs/react';
import { SEMANTIC_TOKENS, SemanticStatus } from '@/constants/tokens';

interface StatCardAction {
    label: string;
    onClick?: () => void;
    href?: string;
}

interface StatCardProps {
    label: string;
    value: number | string;
    description?: string;
    icon: React.ReactNode;
    status?: SemanticStatus;
    variant?: SemanticStatus; // alias for status
    href?: string;
    onClick?: () => void;
    actionLabel?: string;
    action?: StatCardAction;
    badge?: string | number;
    className?: string;
}

export default function StatCard({
    label,
    value,
    description,
    icon,
    status = 'neutral',
    variant,
    href,
    onClick,
    actionLabel,
    action,
    badge,
    className = '',
}: StatCardProps) {
    const effectiveStatus = variant || status;
    const effectiveActionLabel = action?.label || actionLabel;
    const effectiveOnClick = action?.onClick || onClick;
    const effectiveHref = action?.href || href;
    const token = SEMANTIC_TOKENS[effectiveStatus] || SEMANTIC_TOKENS.neutral;

    const CardInner = (
        <div
            className={`bg-white rounded-xl p-4 sm:p-5 border shadow-2xs flex flex-col justify-between transition-colors select-none ${
                effectiveHref || effectiveOnClick
                    ? 'hover:border-slate-300 hover:bg-slate-50/40 cursor-pointer group'
                    : ''
            } ${effectiveStatus === 'danger' ? 'border-red-200/90' : effectiveStatus === 'warning' ? 'border-amber-200/80' : effectiveStatus === 'success' ? 'border-emerald-200/80' : 'border-slate-200/90'} ${className}`}
            role={effectiveHref || effectiveOnClick ? 'button' : 'region'}
            aria-label={`${label}: ${value}`}
        >
            {/* Header: Label + Line Icon */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                        {label}
                    </span>
                    {badge !== undefined && (
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${token.bg} ${token.text} border ${token.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${token.dotColor}`} aria-hidden="true" />
                            {badge}
                        </span>
                    )}
                </div>

                {/* Line Icon Container with semantic colors */}
                <div className={`w-9 h-9 rounded-lg ${token.bg} ${token.iconColor} border ${token.border} flex items-center justify-center shrink-0`}>
                    {icon}
                </div>
            </div>

            {/* Metric Value */}
            <div className="mt-3">
                <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                    status === 'danger' ? 'text-red-700' :
                    status === 'warning' ? 'text-amber-700' :
                    status === 'success' ? 'text-emerald-700' :
                    status === 'info' ? 'text-sky-700' :
                    'text-slate-900'
                }`}>
                    {value}
                </div>

                {description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {description}
                    </p>
                )}

                {/* Optional Action / Link at Bottom */}
                {(effectiveActionLabel || effectiveHref) && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#E31B23]">
                        <span>{effectiveActionLabel || 'Lihat Detail'}</span>
                        <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                    </div>
                )}
            </div>
        </div>
    );

    if (effectiveHref) {
        return (
            <Link href={effectiveHref} className="block no-underline">
                {CardInner}
            </Link>
        );
    }

    if (effectiveOnClick) {
        return (
            <button type="button" onClick={effectiveOnClick} className="text-left w-full bg-transparent border-0 p-0 block cursor-pointer">
                {CardInner}
            </button>
        );
    }

    return CardInner;
}
