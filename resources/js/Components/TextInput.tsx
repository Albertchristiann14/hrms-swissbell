import {
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        ...props
    }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-lg border-slate-300 bg-white shadow-2xs text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors py-2 px-3 ' +
                className
            }
            ref={localRef}
        />
    );
});
