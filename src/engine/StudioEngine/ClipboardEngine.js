/**
 * 📋 ClipboardEngine.js
 * Decoupled clipboard manager supporting Internal clipboard and External Clipboard Adapters.
 * Conforming strictly to schema: { type, version, elements, metadata, sourceStudio, timestamp }
 */
class ClipboardEngine {
    constructor() {
        this.internalClipboard = null;
        this.version = '1.0';
        this.sourceStudio = 'SaudiGovernmentOfficialPublishingPlatform';
    }

    /**
     * Copy elements to the clipboard
     * @param {Array} elements - Selected fields to copy
     * @param {Object} metadata - Optional metadata (bounding box dimensions, offsets)
     */
    copy(elements, metadata = {}) {
        if (!elements || elements.length === 0) return false;
        
        this.internalClipboard = {
            type: 'elements',
            version: this.version,
            elements: JSON.parse(JSON.stringify(elements)), // Deep clone
            metadata: metadata,
            sourceStudio: this.sourceStudio,
            timestamp: Date.now()
        };

        // Attempt system clipboard write for Cross-tab copy
        try {
            if (navigator.clipboard) {
                const textPayload = JSON.stringify(this.internalClipboard);
                navigator.clipboard.writeText(textPayload).catch(err => {
                    console.warn("System clipboard write blocked, using internal clipboard.", err);
                });
            }
        } catch (e) {
            console.warn("External clipboard API unavailable, using internal memory.", e);
        }

        return true;
    }

    /**
     * Paste elements from the clipboard
     * @returns {Promise<Object|null>} - Standardized clipboard object
     */
    async paste() {
        // 1. Try reading from system clipboard (External Adapter)
        try {
            if (navigator.clipboard) {
                const text = await navigator.clipboard.readText();
                if (text) {
                    const parsed = JSON.parse(text);
                    if (parsed.sourceStudio === this.sourceStudio && parsed.type === 'elements') {
                        return parsed;
                    }
                }
            }
        } catch (e) {
            console.warn("System clipboard paste blocked or unavailable, using internal fallback.", e);
        }

        // 2. Fallback to Internal Clipboard
        if (this.internalClipboard) {
            return JSON.parse(JSON.stringify(this.internalClipboard));
        }

        return null;
    }
}

export const clipboardManager = new ClipboardEngine();
export default ClipboardEngine;
