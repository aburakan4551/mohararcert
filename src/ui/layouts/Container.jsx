import React from 'react';

export const Container = ({ children, className = '', size = 'xl', ...props }) => {
    const sizes = {
        sm: 'max-w-3xl',
        md: 'max-w-5xl',
        lg: 'max-w-6xl',
        xl: 'max-w-7xl',
        full: 'max-w-full',
    };

    return (
        <div
            className={`w-full mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Container;
