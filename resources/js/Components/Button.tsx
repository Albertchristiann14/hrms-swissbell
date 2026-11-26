import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'navy' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'icon';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: ReactNode;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    className = '',
    disabled,
    children,
    type = 'button',
    ...props
}: ButtonProps) {
    const variantClasses: Record<ButtonVariant, string> = {
        primary:
            'bg-[#E31B23] text-white border border-transparent hover:bg-[#c4141b] active:bg-[#a30f15] focus:ring-[#E31B23]/30 shadow-xs',
        navy:
            'bg-[#0F172A] text-white border border-transparent hover:bg-slate-800 active:bg-slate-950 focus:ring-slate-900/30 shadow-xs',
        secondary:
            'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200/80 hover:text-slate-900 focus:ring-slate-400/30',
        outline:
            'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 focus:ring-slate-400/30 shadow-2xs',
        ghost:
            'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400/20',
        destructive:
            'bg-rose-600 text-white border border-transparent hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500/30 shadow-xs',
        icon:
            'bg-transparent text-slate-500 border border-transparent hover:bg-slate-100 hover:text-slate-800 focus:ring-slate-400/20',
    };

    const sizeClasses: Record<ButtonSize, string> = {
        xs: variant === 'icon' ? 'p-1.5 rounded-lg' : 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
        sm: variant === 'icon' ? 'p-2 rounded-lg' : 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
        md: variant === 'icon' ? 'p-2 rounded-lg' : 'px-4 py-2 text-sm rounded-lg gap-2',
        lg: variant === 'icon' ? 'p-2.5 rounded-xl' : 'px-5 py-2.5 text-sm rounded-xl gap-2',
    };

    const isDisabled = disabled || loading;

    return (
        <button
            {...props}
            type={type}
            disabled={isDisabled}
            className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                variantClasses[variant]
            } ${sizeClasses[size]} ${
                isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
            } ${className}`}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
            ) : (
                icon && <span className="shrink-0">{icon}</span>
            )}
            {children}
        </button>
    );
}
