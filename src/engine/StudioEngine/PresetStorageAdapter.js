/**
 * 💾 PresetStorageAdapter.js
 * Storage Provider Agnostic Adapter for reusable blocks, presets, and asset libraries.
 * Can easily switch between LocalStorage, IndexedDB, and server API.
 */
class PresetStorageAdapter {
    constructor(provider = 'local') {
        this.provider = provider;
    }

    async savePreset(preset) {
        if (this.provider === 'local') {
            const stored = localStorage.getItem('government_custom_presets') || '[]';
            const presets = JSON.parse(stored);
            
            const newPreset = {
                ...preset,
                id: preset.id || `preset_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                version: '1.0'
            };
            
            presets.push(newPreset);
            localStorage.setItem('government_custom_presets', JSON.stringify(presets));
            return newPreset;
        }
        return null;
    }

    async getPresets() {
        if (this.provider === 'local') {
            const stored = localStorage.getItem('government_custom_presets') || '[]';
            return JSON.parse(stored);
        }
        return [];
    }

    async deletePreset(presetId) {
        if (this.provider === 'local') {
            const stored = localStorage.getItem('government_custom_presets') || '[]';
            const presets = JSON.parse(stored);
            const filtered = presets.filter(p => p.id !== presetId);
            localStorage.setItem('government_custom_presets', JSON.stringify(filtered));
            return true;
        }
        return false;
    }
}

export const presetStorage = new PresetStorageAdapter();
export default PresetStorageAdapter;
