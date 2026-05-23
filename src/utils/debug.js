/**
 * ⚙️ debug.js
 * Advanced Enterprise Diagnostic & Console Logging Engine.
 * Provides styled logs, runtime diagnostics, and on-demand session debug toggles.
 */

const DEBUG_KEY = 'mohararcert_debug';

// Determine initial state: active in development or if localStorage flag is explicitly set to 'true'
const isDevelopment = typeof process !== 'undefined' ? process.env?.NODE_ENV === 'development' : true;
let isDebugEnabled = localStorage.getItem(DEBUG_KEY) === 'true' || (localStorage.getItem(DEBUG_KEY) !== 'false' && isDevelopment);

export const enableDebug = () => {
    localStorage.setItem(DEBUG_KEY, 'true');
    isDebugEnabled = true;
    console.log('%c⚙️ [SYSTEM] Debug Mode Enabled.', 'color: #eab308; font-weight: bold; background: #0f1f38; padding: 4px 8px; border-radius: 4px;');
};

export const disableDebug = () => {
    localStorage.setItem(DEBUG_KEY, 'false');
    isDebugEnabled = false;
    console.log('%c⚙️ [SYSTEM] Debug Mode Disabled.', 'color: #94a3b8; font-weight: bold; background: #0f1f38; padding: 4px 8px; border-radius: 4px;');
};

const styles = {
    auth: 'color: #f59e0b; font-weight: bold; background: #261d0f; padding: 2px 6px; border-radius: 4px; border: 1px dashed #f59e0b;',
    workflow: 'color: #10b981; font-weight: bold; background: #0c2016; padding: 2px 6px; border-radius: 4px; border: 1px dashed #10b981;',
    nav: 'color: #3b82f6; font-weight: bold; background: #0f1d3a; padding: 2px 6px; border-radius: 4px; border: 1px dashed #3b82f6;',
    api: 'color: #8b5cf6; font-weight: bold; background: #1c0f3a; padding: 2px 6px; border-radius: 4px; border: 1px dashed #8b5cf6;',
    error: 'color: #ef4444; font-weight: bold; background: #2d1010; padding: 2px 6px; border-radius: 4px; border: 1px solid #ef4444;',
    system: 'color: #eab308; font-weight: bold; background: #071123; padding: 2px 6px; border-radius: 4px; border: 1px solid #eab308;'
};

const formatMessage = (prefix, message) => {
    const timestamp = new Date().toLocaleTimeString('ar-SA', { hour12: false });
    return `[${timestamp}] [${prefix}] ${message}`;
};

export const logger = {
    auth: (message, ...data) => {
        if (!isDebugEnabled) return;
        console.log(`%c${formatMessage('AUTH', message)}`, styles.auth, ...data);
    },
    workflow: (message, ...data) => {
        if (!isDebugEnabled) return;
        console.log(`%c${formatMessage('WORKFLOW', message)}`, styles.workflow, ...data);
    },
    nav: (message, ...data) => {
        if (!isDebugEnabled) return;
        console.log(`%c${formatMessage('NAV', message)}`, styles.nav, ...data);
    },
    api: (message, ...data) => {
        if (!isDebugEnabled) return;
        console.log(`%c${formatMessage('API', message)}`, styles.api, ...data);
    },
    error: (message, errorObj = null, ...data) => {
        // Errors are always logged in console for safety, but with gorgeous styling
        console.error(`%c${formatMessage('ERROR', message)}`, styles.error);
        if (errorObj) console.error(errorObj);
        if (data.length > 0) console.error('Error Context Data:', ...data);
    },
    system: (message, ...data) => {
        if (!isDebugEnabled) return;
        console.log(`%c${formatMessage('SYSTEM', message)}`, styles.system, ...data);
    }
};

// Expose these methods to window for live console debugging capability
if (typeof window !== 'undefined') {
    window.enableDebug = enableDebug;
    window.disableDebug = disableDebug;
    window.mohararcert_logger = logger;
}
