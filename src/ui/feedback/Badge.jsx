import React from 'react';

/**
 * Enterprise Badge Component
 * Variants: success | warning | danger | info | neutral | primary
 * With optional dot indicator
 */
export const Badge = ({
    children,
    variant = 'neutral',
    dot = false,
    className = '',
    ...props
}) => {
    const variantClass = {
        success: 'badge-success',
        warning: 'badge-warning',
        danger:  'badge-danger',
        info:    'badge-info',
        neutral: 'badge-neutral',
        primary: 'badge-success',     // alias
        secondary: 'badge-neutral',   // alias
    }[variant] || 'badge-neutral';

    return (
        <span
            className={`badge ${variantClass} ${dot ? 'badge-dot' : ''} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
};

Badge.displayName = 'Badge';
export default Badge;
