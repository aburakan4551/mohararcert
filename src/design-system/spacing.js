/**
 * 📐 spacing.js
 * Rigid Spacing and Layout Proportions for mohararcert.
 * Standardizes paddings, margins, and gaps to ensure layout consistency.
 */

export const spacing = {
    padding: {
        xs: '0.5rem',        // 8px (Small badges)
        sm: '0.75rem',       // 12px (Option lists, alert banners)
        base: '1rem',        // 16px (Buttons, small cards)
        md: '1.5rem',        // 24px (Dashboard widgets, main cards)
        lg: '2rem',          // 32px (Executive panels, banners)
        xl: '3rem'           // 48px (Obsidian preview gaps)
    },
    margin: {
        xs: '0.5rem',
        sm: '0.75rem',
        base: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem'
    },
    gap: {
        xs: '0.35rem',
        sm: '0.5rem',
        base: '1rem',
        md: '1.5rem',
        lg: '2rem'
    },
    containers: {
        max: '1280px',
        sidebarExpanded: '280px',
        sidebarCollapsed: '80px'
    }
};
