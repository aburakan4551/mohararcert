import React from 'react';

/**
 * Enterprise Card Component System
 * Compound pattern: Card, Card.Header, Card.Body, Card.Footer, Card.Section
 */

export const Card = React.forwardRef(({
    className = '',
    children,
    variant = 'default',
    hover = true,
    ...props
}, ref) => {
    const variantClass = {
        default: 'card',
        flat:    'card-flat',
        inset:   'card-inset',
    }[variant] || 'card';

    return (
        <div
            ref={ref}
            className={`${variantClass} ${hover ? '' : '!transform-none'} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
});
Card.displayName = 'Card';

export const CardHeader = ({ className = '', children, ...props }) => (
    <div
        className={`card-header ${className}`}
        {...props}
    >
        {children}
    </div>
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = ({ className = '', children, as: Tag = 'h3', ...props }) => (
    <Tag
        className={`font-bold text-[--text-primary] tracking-tight ${className}`}
        style={{ fontSize: 'var(--text-body)', lineHeight: '1.3' }}
        {...props}
    >
        {children}
    </Tag>
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = ({ className = '', children, ...props }) => (
    <p
        className={`font-medium ${className}`}
        style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}
        {...props}
    >
        {children}
    </p>
);
CardDescription.displayName = 'CardDescription';

export const CardContent = ({ className = '', children, ...props }) => (
    <div className={`card-body ${className}`} {...props}>
        {children}
    </div>
);
CardContent.displayName = 'CardContent';

export const CardFooter = ({ className = '', children, ...props }) => (
    <div className={`card-footer flex items-center justify-end gap-3 ${className}`} {...props}>
        {children}
    </div>
);
CardFooter.displayName = 'CardFooter';

/**
 * KPI Stats Card
 */
export const KpiCard = ({
    label,
    value,
    change,
    changeType = 'up',
    icon: Icon,
    iconBg = 'rgba(15,169,88,0.10)',
    iconColor = 'var(--color-primary-600)',
    className = '',
}) => (
    <div className={`kpi-card ${className}`}>
        <div className="kpi-card-left">
            <span className="kpi-label">{label}</span>
            <span className="kpi-value">{value}</span>
            {change && (
                <span className={`kpi-change ${changeType}`}>
                    {changeType === 'up' ? '↑' : '↓'} {change}
                </span>
            )}
        </div>
        {Icon && (
            <div className="kpi-icon-wrap" style={{ background: iconBg, color: iconColor }}>
                <Icon size={22} strokeWidth={1.75} />
            </div>
        )}
    </div>
);

export default Card;
