import React from 'react';

/**
 * PageHeader Component
 * Consistent page-level heading with title, subtitle, and actions slot
 */
export const PageHeader = ({
    title,
    subtitle,
    breadcrumb,
    actions,
    className = '',
}) => (
    <div className={`page-header ${className}`}>
        <div>
            {breadcrumb && (
                <nav style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '6px',
                    fontSize: 'var(--text-micro)',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                }}>
                    {breadcrumb}
                </nav>
            )}
            <h1 className="page-title">{title}</h1>
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {actions}
            </div>
        )}
    </div>
);

PageHeader.displayName = 'PageHeader';
export default PageHeader;
