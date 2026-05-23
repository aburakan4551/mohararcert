/**
 * 🕶️ shadows.js
 * Visual Layer Depth and Border Glow Tokens for mohararcert.
 * Standardizes soft shadows, layered depth scales, and elegant glass bounds.
 */

export const shadows = {
    light: {
        subtle: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02)',
        card: '0 10px 15px -3px rgba(0, 0, 0, 0.03), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
        premium: '0 20px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        glass: 'inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 4px 20px rgba(0, 0, 0, 0.01)',
        glow: '0 0 20px rgba(202, 159, 34, 0.08)'
    },
    dark: {
        subtle: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        card: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
        premium: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
        glass: 'inset 0 1px 0 rgba(255, 255, 255, 0.02), 0 4px 30px rgba(0, 0, 0, 0.45)',
        glow: '0 0 30px rgba(20, 184, 166, 0.08)'
    }
};
