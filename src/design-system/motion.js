/**
 * 🌪️ motion.js
 * Optimized Micro-Interaction Presets for Framer Motion.
 * Standardizes non-heavy, hardware-accelerated visual transitions.
 */

export const motionPresets = {
    // Fade In transition
    fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.25, ease: 'easeInOut' }
    },
    // Smooth lift slide-up for premium cards
    slideUp: {
        initial: { opacity: 0, y: 15 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -15 },
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } // Ease-out-expo
    },
    // Hover micro-scale for clickable dashboard metrics
    hoverScale: {
        whileHover: { scale: 1.018, y: -2 },
        whileTap: { scale: 0.985 },
        transition: { type: 'spring', stiffness: 350, damping: 25 }
    },
    // Active tap scale for buttons
    tapActive: {
        whileTap: { scale: 0.975 },
        transition: { duration: 0.1 }
    },
    // Error shake animation properties (React side hook-up)
    shake: {
        animate: { x: [0, -6, 6, -6, 6, 0] },
        transition: { duration: 0.4, ease: 'easeInOut' }
    }
};
export default motionPresets;
