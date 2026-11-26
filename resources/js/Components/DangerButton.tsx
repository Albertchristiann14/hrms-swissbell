import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-lg border border-transparent bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:ring-offset-1 active:bg-rose-800 transition-colors duration-150 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
