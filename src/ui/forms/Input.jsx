import React, { forwardRef } from 'react';

/**
 * Enterprise Input System
 * Components: Input, Textarea, Select, Label, FormGroup
 */

export const Label = ({ children, required, className = '', ...props }) => (
    <label className={`form-label ${className}`} {...props}>
        {children}
        {required && <span style={{ color: 'var(--color-danger)', marginRight: '3px' }}>*</span>}
    </label>
);
Label.displayName = 'Label';

export const Input = forwardRef(({
    className = '',
    type = 'text',
    icon: Icon,
    iconEnd: IconEnd,
    error,
    ...props
}, ref) => {
    const hasStart = !!Icon;
    const hasEnd   = !!IconEnd;

    if (!hasStart && !hasEnd) {
        return (
            <div className="w-full">
                <input
                    ref={ref}
                    type={type}
                    className={`form-input ${error ? 'border-red-400 focus:!border-red-400 focus:![box-shadow:0_0_0_4px_rgba(239,68,68,0.12)]' : ''} ${className}`}
                    {...props}
                />
                {error && (
                    <p style={{ fontSize: 'var(--text-micro)', color: 'var(--color-danger)', marginTop: '4px', fontWeight: 600 }}>
                        {error}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="form-input-group">
                {Icon && <Icon className="form-input-icon-start" />}
                <input
                    ref={ref}
                    type={type}
                    className={`form-input ${hasStart ? 'has-icon-start' : ''} ${hasEnd ? 'has-icon-end' : ''} ${error ? 'border-red-400' : ''} ${className}`}
                    {...props}
                />
                {IconEnd && <IconEnd className="form-input-icon-end" />}
            </div>
            {error && (
                <p style={{ fontSize: 'var(--text-micro)', color: 'var(--color-danger)', marginTop: '4px', fontWeight: 600 }}>
                    {error}
                </p>
            )}
        </div>
    );
});
Input.displayName = 'Input';

export const Textarea = forwardRef(({
    className = '',
    error,
    rows = 4,
    ...props
}, ref) => (
    <div className="w-full">
        <textarea
            ref={ref}
            rows={rows}
            className={`form-input form-textarea ${error ? 'border-red-400' : ''} ${className}`}
            {...props}
        />
        {error && (
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--color-danger)', marginTop: '4px', fontWeight: 600 }}>
                {error}
            </p>
        )}
    </div>
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({
    className = '',
    error,
    children,
    ...props
}, ref) => (
    <div className="w-full">
        <select
            ref={ref}
            className={`form-input form-select ${error ? 'border-red-400' : ''} ${className}`}
            {...props}
        >
            {children}
        </select>
        {error && (
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--color-danger)', marginTop: '4px', fontWeight: 600 }}>
                {error}
            </p>
        )}
    </div>
));
Select.displayName = 'Select';

export const FormGroup = ({ children, className = '' }) => (
    <div className={`form-group ${className}`}>{children}</div>
);

export default Input;
