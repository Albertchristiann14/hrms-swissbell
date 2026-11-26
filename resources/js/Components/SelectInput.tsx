import { forwardRef, SelectHTMLAttributes } from 'react';

export default forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
    function SelectInput({ className = '', children, ...props }, ref) {
        return (
            <select
                {...props}
                ref={ref}
                className={
                    'rounded-lg border-slate-300 bg-white shadow-2xs text-sm text-slate-900 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors py-2 pl-3 pr-9 ' +
                    className
                }
            >
                {children}
            </select>
        );
    },
);
