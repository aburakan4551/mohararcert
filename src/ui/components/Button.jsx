import React from 'react';
import { motion } from 'framer-motion';

/**
 * Enterprise Button Component
 * Variants: primary | accent | secondary | outline | ghost | danger
 * Sizes: xs | sm | md | lg
 */
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
    const variantClass = {
        primary:   'btn-primary',
        accent:    'btn-accent',
        secondary: 'btn-secondary',
        outline:   'btn-outline',
        ghost:     'btn-ghost',
        danger:    'btn-danger',
    }[variant] || 'btn-primary';

    const sizeClass = {
        xs: 'btn-xs',
        sm: 'btn-sm',
        md: 'btn-md',
        lg: 'btn-lg',
    }[size] || 'btn-md';

    const spinnerColor = {
        primary:   'border-white border-t-transparent',
        accent:    'border-white border-t-transparent',
        secondary: 'border-gray-400 border-t-transparent',
        outline:   'border-green-600 border-t-transparent',
        ghost:     'border-gray-500 border-t-transparent',
        danger:    'border-white border-t-transparent',
    }[variant];

    const iconSize = { xs: 'w-3 h-3', sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' }[size] || 'w-4 h-4';

    return (
        <motion.button
            ref={ref}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
            className={`btn ${variantClass} ${sizeClass} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <>
                    <span className={`inline-block rounded-full border-2 animate-spin ${spinnerColor} ${iconSize}`} />
                    <span>{children}</span>
                </>
            ) : (
                <>
                    {LeftIcon && <LeftIcon className={`${iconSize} shrink-0`} />}
                    {children && <span>{children}</span>}
                    {RightIcon && <RightIcon className={`${iconSize} shrink-0`} />}
                </>
            )}
        </motion.button>
    );
});

Button.displayName = 'Button';

/**
 * Icon-only button (square)
 */
export const IconButton = React.forwardRef(({
    icon: Icon,
    size = 'md',
    variant = 'ghost',
    label,
    className = '',
    ...props
}, ref) => {
    const sizeMap = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8',
        md: 'w-9 h-9',
        lg: 'w-10 h-10',
    };
    const iconMap = {
        xs: 'w-3 h-3',
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    const variantClass = {
        primary:   'btn-primary',
        accent:    'btn-accent',
        secondary: 'btn-secondary',
        outline:   'btn-outline',
        ghost:     'btn-ghost',
        danger:    'btn-danger',
    }[variant] || 'btn-ghost';

    return (
        <motion.button
            ref={ref}
            whileTap={{ scale: 0.95 }}
            title={label}
            aria-label={label}
            className={`btn ${variantClass} ${sizeMap[size]} !p-0 rounded-xl ${className}`}
            {...props}
        >
            {Icon && <Icon className={iconMap[size]} />}
        </motion.button>
    );
});

IconButton.displayName = 'IconButton';

export default Button;
