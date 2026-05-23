import React from 'react';

/**
 * Spinner / Loading indicator
 */
export const Spinner = ({ size = 'md', className = '' }) => {
    const sizeClass = {
        sm: 'spinner-sm',
        md: 'spinner-md',
        lg: 'spinner-lg',
    }[size] || 'spinner-md';

    return <span className={`spinner ${sizeClass} ${className}`} />;
};

/**
 * Full-page loading state
 */
export const PageLoader = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        flexDirection: 'column',
        gap: '12px',
    }}>
        <Spinner size="lg" />
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
            جارٍ التحميل...
        </p>
    </div>
);

Spinner.displayName = 'Spinner';
export default Spinner;
