import React, { PropsWithChildren, ThHTMLAttributes, TdHTMLAttributes } from 'react';

export function Table({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
    return (
        <div className="w-full overflow-x-auto">
            <table className={`min-w-full divide-y divide-slate-200 text-xs ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function TableHead({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
    return <thead className={`bg-slate-50/90 border-b border-slate-200 ${className}`}>{children}</thead>;
}

export function TableHeaderCell({
    children,
    className = '',
    align = 'left',
    ...props
}: PropsWithChildren<ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }>) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    return (
        <th
            {...props}
            className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap ${alignClass} ${className}`}
        >
            {children}
        </th>
    );
}

export function TableBody({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
    return <tbody className={`divide-y divide-slate-200/70 bg-white ${className}`}>{children}</tbody>;
}

export function TableRow({
    children,
    className = '',
    onClick,
}: PropsWithChildren<{ className?: string; onClick?: () => void }>) {
    return (
        <tr
            onClick={onClick}
            className={`transition-colors hover:bg-slate-50/80 ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
            {children}
        </tr>
    );
}

export function TableCell({
    children,
    className = '',
    align = 'left',
    ...props
}: PropsWithChildren<TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right' }>) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
    return (
        <td {...props} className={`px-4 py-3 text-slate-700 align-middle ${alignClass} ${className}`}>
            {children}
        </td>
    );
}
