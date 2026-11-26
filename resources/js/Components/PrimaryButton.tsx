import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-lg border border-transparent bg-[#E31B23] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs hover:bg-[#c4141b] focus:bg-[#c4141b] focus:outline-none focus:ring-2 focus:ring-[#E31B23]/40 focus:ring-offset-1 active:bg-[#a30f15] transition-colors duration-150 ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
