import React from 'react';
import { motion } from 'framer-motion';

export const Button = React.forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className = '',
    disabled = false,
    ...props
}, ref) => {
    // Styles mapping following modern Vercel/Linear guidelines
    const baseStyles = 'inline-flex items-center justify-center font-sans font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';
    
    const variants = {
        primary: 'bg-teal-700 hover:bg-teal-600 text-white shadow-[0_4px_12px_rgba(15,118,110,0.15)] hover:shadow-[0_6px_20px_rgba(15,118,110,0.25)] focus:ring-teal-500 border border-teal-800',
        secondary: 'bg-slate-900 dark:bg-slate-800 text-slate-100 hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-800 dark:border-slate-700 shadow-sm focus:ring-slate-500',
        outline: 'bg-transparent border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 focus:ring-teal-500',
        ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950 focus:ring-slate-500',
        danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm focus:ring-red-500 border border-red-700',
        accent: 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 shadow-[0_4px_12px_rgba(217,119,6,0.15)] hover:shadow-[0_6px_20px_rgba(217,119,6,0.25)] focus:ring-amber-500 border border-amber-700',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
        md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
        lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
    };

    const loaderColors = {
        primary: 'border-white',
        secondary: 'border-slate-300',
        outline: 'border-teal-600',
        ghost: 'border-slate-500',
        danger: 'border-white',
        accent: 'border-white',
    };

    return (
        <motion.button
            ref={ref}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <svg className={`animate-spin h-4 w-4 ${loaderColors[variant]}`} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <>
                    {LeftIcon && <LeftIcon className="w-4 h-4 shrink-0" />}
                    <span>{children}</span>
                    {RightIcon && <RightIcon className="w-4 h-4 shrink-0" />}
                </>
            )}
        </motion.button>
    );
});

Button.displayName = 'Button';
export default Button;
