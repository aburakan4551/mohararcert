import React from 'react';

/**
 * Avatar Component
 * Displays user initials or image with fallback
 */
export const Avatar = ({
    name = '',
    src,
    size = 'md',
    className = '',
    ...props
}) => {
    const initials = name
        ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
        : '?';

    const sizeClass = {
        sm: 'avatar-sm',
        md: 'avatar-md',
        lg: 'avatar-lg',
        xl: 'avatar-xl',
    }[size] || 'avatar-md';

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className={`avatar ${sizeClass} object-cover ${className}`}
                {...props}
            />
        );
    }

    return (
        <div className={`avatar ${sizeClass} ${className}`} title={name} {...props}>
            {initials}
        </div>
    );
};

Avatar.displayName = 'Avatar';
export default Avatar;
