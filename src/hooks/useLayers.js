import { useCallback, useRef, useState, useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

/* ── Default layers matching the certificate elements ── */
const DEFAULT_LAYERS = [
    {
        id: 'name',
        type: 'text',
        label: 'اسم المستفيد',
        x: 50, y: 42,
        width: 320, height: 60,
        visible: true, locked: false, zIndex: 10,
        style: { fontSize: 32, fontWeight: '900', color: '#1a3a6b', fontFamily: 'Cairo', textAlign: 'center' },
    },
    {
        id: 'reason',
        type: 'text',
        label: 'سبب التكريم',
        x: 50, y: 52,
        width: 400, height: 40,
        visible: true, locked: false, zIndex: 9,
        style: { fontSize: 16, fontWeight: '600', color: '#444', fontFamily: 'Cairo', textAlign: 'center' },
    },
    {
        id: 'event',
        type: 'text',
        label: 'المناسبة',
        x: 50, y: 58,
        width: 350, height: 36,
        visible: true, locked: false, zIndex: 8,
        style: { fontSize: 18, fontWeight: '800', color: '#1a3a6b', fontFamily: 'Cairo', textAlign: 'center' },
    },
    {
        id: 'date',
        type: 'text',
        label: 'التاريخ',
        x: 50, y: 66,
        width: 200, height: 30,
        visible: true, locked: false, zIndex: 7,
        style: { fontSize: 15, fontWeight: '600', color: '#555', fontFamily: 'Cairo', textAlign: 'center' },
    },
    {
        id: 'serial',
        type: 'text',
        label: 'الرقم التسلسلي',
        x: 88, y: 90,
        width: 150, height: 24,
        visible: true, locked: false, zIndex: 6,
        style: { fontSize: 12, fontWeight: '600', color: '#888', fontFamily: 'monospace', textAlign: 'center' },
    },
    {
        id: 'director-sig',
        type: 'image',
        label: 'توقيع المدير',
        x: 80, y: 78,
        width: 140, height: 80,
        visible: true, locked: false, zIndex: 5,
        style: { opacity: 1 },
    },
    {
        id: 'director-name',
        type: 'text',
        label: 'اسم المدير',
        x: 80, y: 86,
        width: 160, height: 30,
        visible: true, locked: false, zIndex: 5,
        style: { fontSize: 13, fontWeight: '700', color: '#1a3a6b', fontFamily: 'Cairo', textAlign: 'center' },
    },
    {
        id: 'visa-sig',
        type: 'image',
        label: 'التأشيرة',
        x: 20, y: 78,
        width: 120, height: 70,
        visible: true, locked: false, zIndex: 5,
        style: { opacity: 1 },
    },
    {
        id: 'visa-name',
        type: 'text',
        label: 'اسم التأشيرة',
        x: 20, y: 86,
        width: 140, height: 28,
        visible: true, locked: false, zIndex: 5,
        style: { fontSize: 13, fontWeight: '700', color: '#1a3a6b', fontFamily: 'Cairo', textAlign: 'center' },
    },
    {
        id: 'stamp',
        type: 'image',
        label: 'الختم',
        x: 50, y: 80,
        width: 120, height: 120,
        visible: true, locked: false, zIndex: 4,
        style: { opacity: 0.85, rotation: -8 },
    },
    {
        id: 'qr',
        type: 'qr',
        label: 'QR Code',
        x: 7, y: 88,
        width: 70, height: 70,
        visible: true, locked: false, zIndex: 3,
        style: {},
    },
]

const MAX_HISTORY = 50

/**
 * useLayers – manages layer state, CRUD ops, undo/redo, save status, and data-loss prevention.
 * Storage is auto-persisted via useLocalStorage per template: `layers-{templateId}`.
 * Save status: 'saved' | 'saving' | 'error' — indicates localStorage persistence state.
 */
export function useLayers(templateId = 'default') {
    const storageKey = `layers-${templateId}`
    const [layers, setLayers] = useLocalStorage(storageKey, DEFAULT_LAYERS)

    // Reference canvas width – stored per template so CertificateTemplate can scale px→mm
    const [canvasWidth, setCanvasWidth] = useLocalStorage(`canvasWidth-${templateId}`, 800)

    // Undo / Redo stacks (in-memory)
    const historyRef = useRef([])
    const futureRef = useRef([])

    // Save status tracking
    const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving' | 'error'
    const dirtyRef = useRef(false)
    const saveTimerRef = useRef(null)

    /* ── Auto-save is handled by useLocalStorage (writes every mutation)
       But we debounce a visual indicator for UX ── */
    const markDirty = useCallback(() => {
        dirtyRef.current = true
        setSaveStatus('saving')
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            dirtyRef.current = false
            setSaveStatus('saved')
        }, 800) // localStorage write is synchronous, so mark saved after brief delay
    }, [])

    /* ── beforeunload protection ── */
    useEffect(() => {
        const handler = (e) => {
            if (dirtyRef.current) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handler)
        return () => {
            window.removeEventListener('beforeunload', handler)
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        }
    }, [])

    /* ── Push current layers onto undo stack before any mutation ── */
    const pushHistory = useCallback((current) => {
        historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), JSON.parse(JSON.stringify(current))]
        futureRef.current = []
    }, [])

    /* ── Undo ── */
    const undo = useCallback(() => {
        setLayers(current => {
            if (historyRef.current.length === 0) return current
            futureRef.current = [JSON.parse(JSON.stringify(current)), ...futureRef.current]
            markDirty()
            return historyRef.current.pop()
        })
    }, [setLayers, markDirty])

    /* ── Redo ── */
    const redo = useCallback(() => {
        setLayers(current => {
            if (futureRef.current.length === 0) return current
            historyRef.current.push(JSON.parse(JSON.stringify(current)))
            const next = futureRef.current[0]
            futureRef.current = futureRef.current.slice(1)
            markDirty()
            return next
        })
    }, [setLayers, markDirty])

    /* ── Wrapped setLayers with dirty tracking ── */
    const setLayersTracked = useCallback((updater) => {
        setLayers(updater)
        markDirty()
    }, [setLayers, markDirty])

    /* ── Mutators ── */

    const updateLayer = useCallback((id, updates) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            return prev.map(l => l.id === id ? { ...l, ...updates } : l)
        })
    }, [setLayersTracked, pushHistory])

    const updateLayerStyle = useCallback((id, styleUpdates) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            return prev.map(l => l.id === id ? { ...l, style: { ...l.style, ...styleUpdates } } : l)
        })
    }, [setLayersTracked, pushHistory])

    const moveLayer = useCallback((id, x, y) => {
        // No history push per pixel — pushed on drag start
        setLayersTracked(prev => prev.map(l => l.id === id ? { ...l, x, y } : l))
    }, [setLayersTracked])

    const resizeLayer = useCallback((id, width, height) => {
        setLayersTracked(prev => prev.map(l => l.id === id ? { ...l, width, height } : l))
    }, [setLayersTracked])

    const toggleVisibility = useCallback((id) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            return prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
        })
    }, [setLayersTracked, pushHistory])

    const toggleLock = useCallback((id) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            return prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l)
        })
    }, [setLayersTracked, pushHistory])

    const deleteLayer = useCallback((id) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            return prev.filter(l => l.id !== id)
        })
    }, [setLayersTracked, pushHistory])

    const duplicateLayer = useCallback((id) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            const source = prev.find(l => l.id === id)
            if (!source) return prev
            const clone = {
                ...JSON.parse(JSON.stringify(source)),
                id: `${source.id}-copy-${Date.now().toString(36)}`,
                label: `${source.label} (نسخة)`,
                x: Math.min(source.x + 3, 95),
                y: Math.min(source.y + 3, 95),
            }
            const idx = prev.indexOf(source)
            const next = [...prev]
            next.splice(idx + 1, 0, clone)
            return next
        })
    }, [setLayersTracked, pushHistory])

    const bringForward = useCallback((id) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            const maxZ = Math.max(...prev.map(l => l.zIndex))
            return prev.map(l => l.id === id ? { ...l, zIndex: maxZ + 1 } : l)
        })
    }, [setLayersTracked, pushHistory])

    const sendBackward = useCallback((id) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            const minZ = Math.min(...prev.map(l => l.zIndex))
            return prev.map(l => l.id === id ? { ...l, zIndex: Math.max(0, minZ - 1) } : l)
        })
    }, [setLayersTracked, pushHistory])

    const addLayer = useCallback((layer) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            const maxZ = prev.length ? Math.max(...prev.map(l => l.zIndex)) : 0
            return [...prev, { ...layer, zIndex: maxZ + 1 }]
        })
    }, [setLayersTracked, pushHistory])

    const reorderLayers = useCallback((fromIdx, toIdx) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            const next = [...prev]
            const [moved] = next.splice(fromIdx, 1)
            next.splice(toIdx, 0, moved)
            return next
        })
    }, [setLayersTracked, pushHistory])

    const resetLayers = useCallback(() => {
        setLayersTracked(prev => {
            pushHistory(prev)
            return [...DEFAULT_LAYERS]
        })
    }, [setLayersTracked, pushHistory])

    // Alignment helpers
    const alignLayer = useCallback((id, alignment) => {
        setLayersTracked(prev => {
            pushHistory(prev)
            return prev.map(l => {
                if (l.id !== id) return l
                switch (alignment) {
                    case 'left': return { ...l, x: 10 }
                    case 'center-h': return { ...l, x: 50 }
                    case 'right': return { ...l, x: 90 }
                    case 'top': return { ...l, y: 10 }
                    case 'center-v': return { ...l, y: 50 }
                    case 'bottom': return { ...l, y: 90 }
                    default: return l
                }
            })
        })
    }, [setLayersTracked, pushHistory])

    return {
        layers,
        setLayers,
        updateLayer,
        updateLayerStyle,
        moveLayer,
        resizeLayer,
        toggleVisibility,
        toggleLock,
        deleteLayer,
        duplicateLayer,
        bringForward,
        sendBackward,
        addLayer,
        reorderLayers,
        resetLayers,
        alignLayer,
        undo,
        redo,
        pushHistory: () => pushHistory(layers),
        canUndo: historyRef.current.length > 0,
        canRedo: futureRef.current.length > 0,
        saveStatus,
        canvasWidth,
        setCanvasWidth,
        DEFAULT_LAYERS,
    }
}
