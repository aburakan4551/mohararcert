import React from 'react';

export const Card = React.forwardRef(({ className = '', children, ...props }, ref) => (
    <div
        ref={ref}
        className={`bg-white/80 dark:bg-slate-900/65 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/40 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className}`}
        {...props}
    >
        {children}
    </div>
));
Card.displayName = 'Card';

export const CardHeader = ({ className = '', children, ...props }) => (
    <div className={`p-6 flex flex-col gap-1.5 border-b border-slate-100 dark:border-slate-800/20 ${className}`} {...props}>
        {children}
    </div>
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = ({ className = '', children, ...props }) => (
    <h3 className={`text-base font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight ${className}`} {...props}>
        {children}
    </h3>
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = ({ className = '', children, ...props }) => (
    <p className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${className}`} {...props}>
        {children}
    </p>
);
CardDescription.displayName = 'CardDescription';

export const CardContent = ({ className = '', children, ...props }) => (
    <div className={`p-6 ${className}`} {...props}>
        {children}
    </div>
);
CardContent.displayName = 'CardContent';

export const CardFooter = ({ className = '', children, ...props }) => (
    <div className={`p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/20 flex items-center justify-end gap-3 ${className}`} {...props}>
        {children}
    </div>
);
CardFooter.displayName = 'CardFooter';
