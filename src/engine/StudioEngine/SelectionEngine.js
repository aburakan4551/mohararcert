/**
 * 📐 SelectionEngine.js
 * Pure mathematical calculations for multi-selection, group transforms,
 * proportional resizing, and spacing distributions.
 */
class SelectionEngine {
    /**
     * Compute unified bounding box coordinates (in percentages) for a list of elements
     * @param {Array} elements - Active elements list
     * @param {Array} selectedIds - Selected elements IDs
     * @returns {Object|null} - Unified bounding box bounds: { minX, minY, maxX, maxY, width, height }
     */
    static getUnifiedBoundingBox(elements, selectedIds) {
        if (!selectedIds || selectedIds.length === 0) return null;
        
        const selected = elements.filter(f => selectedIds.includes(f._uid));
        if (selected.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const canvasW = 1122.5;
        const canvasH = 793.7;

        selected.forEach(el => {
            const wPct = ((el.width || 200) / canvasW) * 100;
            const hPct = ((el.height || 60) / canvasH) * 100;

            const left = el.x - wPct / 2;
            const right = el.x + wPct / 2;
            const top = el.y - hPct / 2;
            const bottom = el.y + hPct / 2;

            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
            if (top < minY) minY = top;
            if (bottom > maxY) maxY = bottom;
        });

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: minX + (maxX - minX) / 2,
            centerY: minY + (maxY - minY) / 2
        };
    }

    /**
     * Apply proportional resize changes across grouped / selected elements
     */
    static resizeSelectedGroup(elements, selectedIds, scaleFactorX, scaleFactorY, originX, originY) {
        return elements.map(el => {
            if (!selectedIds.includes(el._uid) || el.locked) return el;
            
            const dx = el.x - originX;
            const dy = el.y - originY;

            return {
                ...el,
                x: Math.round((originX + dx * scaleFactorX) * 10) / 10,
                y: Math.round((originY + dy * scaleFactorY) * 10) / 10,
                width: Math.max(20, Math.round(el.width * scaleFactorX)),
                height: Math.max(10, Math.round(el.height * scaleFactorY)),
                fontSize: el.fontSize ? Math.max(8, Math.round(el.fontSize * Math.min(scaleFactorX, scaleFactorY))) : el.fontSize
            };
        });
    }

    /**
     * Group elements together by giving them a groupId
     */
    static groupElements(elements, selectedIds) {
        const groupId = `group_${Math.random().toString(36).substr(2, 9)}`;
        return elements.map(el => {
            if (selectedIds.includes(el._uid)) {
                return { ...el, groupId };
            }
            return el;
        });
    }

    /**
     * Ungroup elements by clearing their groupId
     */
    static ungroupElements(elements, selectedIds) {
        return elements.map(el => {
            if (selectedIds.includes(el._uid)) {
                const { groupId, ...rest } = el;
                return rest;
            }
            return el;
        });
    }

    /**
     * Distribute spacing evenly between selected elements
     */
    static distributeSpacing(elements, selectedIds, direction = 'horizontal') {
        const selected = elements.filter(f => selectedIds.includes(f._uid) && !f.locked);
        if (selected.length < 3) return elements; 

        const coordKey = direction === 'horizontal' ? 'x' : 'y';
        const sorted = [...selected].sort((a, b) => a[coordKey] - b[coordKey]);

        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = last[coordKey] - first[coordKey];
        const step = totalSpan / (sorted.length - 1);

        return elements.map(el => {
            if (!selectedIds.includes(el._uid) || el.locked) return el;
            
            const idx = sorted.findIndex(s => s._uid === el._uid);
            if (idx === 0 || idx === sorted.length - 1) return el; 

            return {
                ...el,
                [coordKey]: Math.round((first[coordKey] + idx * step) * 10) / 10
            };
        });
    }
}

export default SelectionEngine;
