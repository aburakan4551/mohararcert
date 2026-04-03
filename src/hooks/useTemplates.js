import { useLocalStorage } from './useLocalStorage'

const DEFAULT_POSITIONS = {
    namePosition: { x: 50, y: 42 },   // % of certificate dimensions
    eventPosition: { x: 50, y: 56 },
    datePosition: { x: 50, y: 67 },
    serialPosition: { x: 88, y: 88 },
    directorPosition: { x: 80, y: 78 },
    visaPosition: { x: 20, y: 78 },
    stampPosition: { x: 50, y: 76 },
    qrPosition: { x: 7, y: 84 },
}

function makeId() {
    return `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function useTemplates() {
    const [templates, setTemplates] = useLocalStorage('certTemplates', [])
    // ── Shared active template ID (persisted across pages) ──
    const [activeTemplateId, setActiveTemplateId] = useLocalStorage('activeTemplateId', null)

    // ── CRUD ──────────────────────────────────────────────────

    const addTemplate = (name, imageDataURL, type = 'pdf') => {
        const id = makeId()
        const isFirst = templates.length === 0
        const tpl = {
            id,
            name,
            image: imageDataURL,   // base64 PNG rendered from PDF or direct PNG
            type,                  // 'pdf' | 'image'
            createdAt: new Date().toISOString(),
            isDefault: isFirst,
            positions: { ...DEFAULT_POSITIONS },
        }
        setTemplates(prev => [...prev, tpl])
        // Auto-activate the first template added
        if (isFirst) setActiveTemplateId(id)
        return id
    }

    const updateTemplate = (id, updates) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    }

    const deleteTemplate = (id) => {
        setTemplates(prev => {
            const remaining = prev.filter(t => t.id !== id)
            // If we deleted the default, promote the first remaining
            if (remaining.length > 0 && !remaining.some(t => t.isDefault)) {
                remaining[0].isDefault = true
            }
            return remaining
        })
        // If the deleted template was active, clear or switch
        if (activeTemplateId === id) {
            const remaining = templates.filter(t => t.id !== id)
            setActiveTemplateId(remaining[0]?.id || null)
        }
    }

    const setDefault = (id) => {
        setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === id })))
    }

    const savePositions = (id, positions) => {
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, positions } : t))
    }

    // ── Selectors ──────────────────────────────────────────────

    const defaultTemplate = templates.find(t => t.isDefault) || templates[0] || null

    const getTemplate = (id) => templates.find(t => t.id === id) || null

    return {
        templates,
        defaultTemplate,
        getTemplate,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        setDefault,
        savePositions,
        DEFAULT_POSITIONS,
        // Shared active template ID
        activeTemplateId,
        setActiveTemplateId,
    }
}
