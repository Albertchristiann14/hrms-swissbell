import React, { PropsWithChildren } from 'react';

interface CardProps extends PropsWithChildren {
    className?: string;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'none' }: CardProps) {
    const padClass = {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    }[padding];

    return (
        <div
            className={`bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden ${padClass} ${className}`}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps extends PropsWithChildren {
    className?: string;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function CardHeader({ children, className = '', title, subtitle, action }: CardHeaderProps) {
    return (
        <div className={`px-5 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4 ${className}`}>
            {title ? (
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
                </div>
            ) : (
                <div className="min-w-0 flex-1">{children}</div>
            )}
            {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
    );
}

export function CardBody({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
    return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
    return (
        <div className={`px-5 py-3.5 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between gap-3 ${className}`}>
            {children}
        </div>
    );
}

export default Card;
