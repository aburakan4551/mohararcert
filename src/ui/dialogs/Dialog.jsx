import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Dialog = ({
    isOpen,
    onClose,
    children,
    ...props
}) => {
    // Backdrop and panel animations
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/70 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Dialog Container */}
                    <div className="relative w-full max-w-lg z-10 my-8 mx-auto">
                        {children}
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export const DialogContent = React.forwardRef(({
    children,
    className = '',
    onClose,
    ...props
}, ref) => {
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-2xl shadow-xl overflow-hidden flex flex-col w-full ${className}`}
            {...props}
        >
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            {children}
        </motion.div>
    );
});
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className = '', children, ...props }) => (
    <div className={`p-6 border-b border-slate-100 dark:border-slate-800/20 flex flex-col gap-1 ${className}`} {...props}>
        {children}
    </div>
);
DialogHeader.displayName = 'DialogHeader';

export const DialogTitle = ({ className = '', children, ...props }) => (
    <h3 className={`text-base font-bold text-slate-900 dark:text-slate-100 font-sans ${className}`} {...props}>
        {children}
    </h3>
);
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = ({ className = '', children, ...props }) => (
    <p className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${className}`} {...props}>
        {children}
    </p>
);
DialogDescription.displayName = 'DialogDescription';

export const DialogFooter = ({ className = '', children, ...props }) => (
    <div className={`p-6 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/20 flex items-center justify-end gap-3 ${className}`} {...props}>
        {children}
    </div>
);
DialogFooter.displayName = 'DialogFooter';
