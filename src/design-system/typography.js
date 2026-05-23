/**
 * ✍️ typography.js
 * Typographic Hierarchy and Scale Tokens for mohararcert.
 * Standardizes Cairo font sizes, weights, and RTL-optimized line-heights.
 */

export const typography = {
    fontFamily: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
    sizes: {
        xs: '0.7rem',         // 11.2px (Labels and Metadatas)
        sm: '0.8rem',         // 12.8px (Small buttons and subheadings)
        base: '0.875rem',     // 14px (Default text, paragraphs, options)
        md: '0.95rem',        // 15.2px (Tables, dropdown inputs)
        lg: '1.1rem',         // 17.6px (Card headers, page subtitles)
        xl: '1.25rem',        // 20px (Section titles)
        xxl: '1.8rem',        // 28.8px (Dashboard greetings, big numbers)
        giant: '2.5rem'       // 40px (Hero labels, numbers)
    },
    weights: {
        light: '300',
        normal: '400',
        medium: '500',
        bold: '600',
        extrabold: '700',
        black: '850'
    },
    lineHeights: {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.85',      // Best readability for Cairo Arabic text
        loose: '2'
    }
};
