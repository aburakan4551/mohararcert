import React from 'react';

// 🏷️ Label Component
export const Label = ({ children, className = '', required = false, ...props }) => (
    <label className={`block text-xs font-bold text-slate-700 dark:text-slate-300 font-sans mb-1.5 ${className}`} {...props}>
        {children}
        {required && <span className="text-red-500 mr-1">*</span>}
    </label>
);

// 📝 Input Component
export const Input = React.forwardRef(({
    type = 'text',
    className = '',
    error = '',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    ...props
}, ref) => {
    return (
        <div className="relative w-full">
            {LeftIcon && (
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <LeftIcon className="w-4 h-4 shrink-0" />
                </div>
            )}
            <input
                ref={ref}
                type={type}
                className={`w-full font-sans text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border ${
                    error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500/10'
                } rounded-xl px-4 py-2.5 outline-none transition-all duration-200 focus:ring-4 ${
                    LeftIcon ? 'pl-10' : ''
                } ${RightIcon ? 'pr-10' : ''} ${className}`}
                {...props}
            />
            {RightIcon && (
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <RightIcon className="w-4 h-4 shrink-0" />
                </div>
            )}
            {error && (
                <span className="block mt-1 text-xs font-bold text-red-500 animate-fade-in">
                    {error}
                </span>
            )}
        </div>
    );
});
Input.displayName = 'Input';

// 🗳️ Select Component
export const Select = React.forwardRef(({
    children,
    className = '',
    error = '',
    leftIcon: LeftIcon,
    ...props
}, ref) => {
    return (
        <div className="relative w-full">
            {LeftIcon && (
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <LeftIcon className="w-4 h-4 shrink-0" />
                </div>
            )}
            <select
                ref={ref}
                className={`w-full font-sans text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border appearance-none ${
                    error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500/10'
                } rounded-xl px-4 py-2.5 pr-10 outline-none transition-all duration-200 focus:ring-4 ${
                    LeftIcon ? 'pl-10' : ''
                } ${className}`}
                {...props}
            >
                {children}
            </select>
            {/* Custom Arrow */}
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {error && (
                <span className="block mt-1 text-xs font-bold text-red-500 animate-fade-in">
                    {error}
                </span>
            )}
        </div>
    );
});
Select.displayName = 'Select';

// 🖊️ Textarea Component
export const Textarea = React.forwardRef(({
    className = '',
    error = '',
    ...props
}, ref) => {
    return (
        <div className="relative w-full">
            <textarea
                ref={ref}
                className={`w-full font-sans text-sm font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border ${
                    error
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500/10'
                } rounded-xl px-4 py-2.5 outline-none transition-all duration-200 focus:ring-4 min-h-[100px] resize-y ${className}`}
                {...props}
            />
            {error && (
                <span className="block mt-1 text-xs font-bold text-red-500 animate-fade-in">
                    {error}
                </span>
            )}
        </div>
    );
});
Textarea.displayName = 'Textarea';
