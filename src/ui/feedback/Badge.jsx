import React from 'react';

export const Badge = ({
    children,
    variant = 'primary',
    className = '',
    ...props
}) => {
    const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border tracking-wide transition-colors duration-200';

    const variants = {
        primary: 'bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400',
        secondary: 'bg-slate-500/10 border-slate-500/25 text-slate-600 dark:text-slate-400',
        success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
        warning: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
        danger: 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400',
        info: 'bg-sky-500/10 border-sky-500/25 text-sky-600 dark:text-sky-400',
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
            <span className="w-1.5 h-1.5 rounded-full bg-currentColor shrink-0 animate-pulse" />
            {children}
        </span>
    );
};

export default Badge;
