/**
 * 🧱 tokens.js
 * Centralized Design Tokens Coordinator.
 * Merges colors, typography, shadows, spacings, and animations into one module.
 */

import { colors } from './colors';
import { typography } from './typography';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { motionPresets } from './motion';

export const tokens = {
    colors,
    typography,
    shadows,
    spacing,
    motion: motionPresets
};

export default tokens;
