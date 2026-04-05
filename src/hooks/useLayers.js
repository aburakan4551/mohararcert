import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { createScreenshotPresetLayers } from '../config/certificatePreset'

const DEFAULT_LAYERS = createScreenshotPresetLayers()
const MAX_HISTORY = 50

/**
 * useLayers - manages layer state, CRUD ops, undo/redo, and save status.
 * Storage is auto-persisted via useLocalStorage per template: `layers-{templateId}`.
 */
export function useLayers(templateId = 'default') {
    const storageKey = `layers-${templateId}`
    const [layers, setLayers] = useLocalStorage(storageKey, DEFAULT_LAYERS)
    const [canvasWidth, setCanvasWidth] = useLocalStorage(`canvasWidth-${templateId}`, 800)

    const historyRef = useRef([])
    const futureRef = useRef([])
    const [saveStatus, setSaveStatus] = useState('saved')
    const dirtyRef = useRef(false)
    const saveTimerRef = useRef(null)

    const markDirty = useCallback(() => {
        dirtyRef.current = true
        setSaveStatus('saving')
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
            dirtyRef.current = false
            setSaveStatus('saved')
        }, 800)
    }, [])

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

    const pushHistory = useCallback((current) => {
        historyRef.current = [
            ...historyRef.current.slice(-(MAX_HISTORY - 1)),
            JSON.parse(JSON.stringify(current)),
        ]
        futureRef.current = []
    }, [])

    const undo = useCallback(() => {
        setLayers((current) => {
            if (historyRef.current.length === 0) return current
            futureRef.current = [JSON.parse(JSON.stringify(current)), ...futureRef.current]
            markDirty()
            return historyRef.current.pop()
        })
    }, [setLayers, markDirty])

    const redo = useCallback(() => {
        setLayers((current) => {
            if (futureRef.current.length === 0) return current
            historyRef.current.push(JSON.parse(JSON.stringify(current)))
            const next = futureRef.current[0]
            futureRef.current = futureRef.current.slice(1)
            markDirty()
            return next
        })
    }, [setLayers, markDirty])

    const setLayersTracked = useCallback((updater) => {
        setLayers(updater)
        markDirty()
    }, [setLayers, markDirty])

    const replaceLayers = useCallback((nextLayers) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            return JSON.parse(JSON.stringify(nextLayers))
        })
    }, [setLayersTracked, pushHistory])

    const updateLayer = useCallback((id, updates) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            return prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
        })
    }, [setLayersTracked, pushHistory])

    const updateLayerStyle = useCallback((id, styleUpdates) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            return prev.map((layer) => (
                layer.id === id ? { ...layer, style: { ...layer.style, ...styleUpdates } } : layer
            ))
        })
    }, [setLayersTracked, pushHistory])

    const moveLayer = useCallback((id, x, y) => {
        setLayersTracked((prev) => prev.map((layer) => (layer.id === id ? { ...layer, x, y } : layer)))
    }, [setLayersTracked])

    const resizeLayer = useCallback((id, width, height) => {
        setLayersTracked((prev) => prev.map((layer) => (layer.id === id ? { ...layer, width, height } : layer)))
    }, [setLayersTracked])

    const toggleVisibility = useCallback((id) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            return prev.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer))
        })
    }, [setLayersTracked, pushHistory])

    const toggleLock = useCallback((id) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            return prev.map((layer) => (layer.id === id ? { ...layer, locked: !layer.locked } : layer))
        })
    }, [setLayersTracked, pushHistory])

    const deleteLayer = useCallback((id) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            return prev.filter((layer) => layer.id !== id)
        })
    }, [setLayersTracked, pushHistory])

    const duplicateLayer = useCallback((id) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            const source = prev.find((layer) => layer.id === id)
            if (!source) return prev

            const clone = {
                ...JSON.parse(JSON.stringify(source)),
                id: `${source.id}-copy-${Date.now().toString(36)}`,
                label: `${source.label} (نسخة)`,
                x: Math.min(source.x + 3, 95),
                y: Math.min(source.y + 3, 95),
            }

            const index = prev.indexOf(source)
            const next = [...prev]
            next.splice(index + 1, 0, clone)
            return next
        })
    }, [setLayersTracked, pushHistory])

    const bringForward = useCallback((id) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            const maxZ = Math.max(...prev.map((layer) => layer.zIndex))
            return prev.map((layer) => (layer.id === id ? { ...layer, zIndex: maxZ + 1 } : layer))
        })
    }, [setLayersTracked, pushHistory])

    const sendBackward = useCallback((id) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            const minZ = Math.min(...prev.map((layer) => layer.zIndex))
            return prev.map((layer) => (
                layer.id === id ? { ...layer, zIndex: Math.max(0, minZ - 1) } : layer
            ))
        })
    }, [setLayersTracked, pushHistory])

    const addLayer = useCallback((layer) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            const maxZ = prev.length ? Math.max(...prev.map((item) => item.zIndex)) : 0
            return [...prev, { ...layer, zIndex: maxZ + 1 }]
        })
    }, [setLayersTracked, pushHistory])

    const reorderLayers = useCallback((fromIndex, toIndex) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            const next = [...prev]
            const [moved] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, moved)
            return next
        })
    }, [setLayersTracked, pushHistory])

    const resetLayers = useCallback(() => {
        replaceLayers(createScreenshotPresetLayers())
    }, [replaceLayers])

    const alignLayer = useCallback((id, alignment) => {
        setLayersTracked((prev) => {
            pushHistory(prev)
            return prev.map((layer) => {
                if (layer.id !== id) return layer
                switch (alignment) {
                    case 'left':
                        return { ...layer, x: 10 }
                    case 'center-h':
                        return { ...layer, x: 50 }
                    case 'right':
                        return { ...layer, x: 90 }
                    case 'top':
                        return { ...layer, y: 10 }
                    case 'center-v':
                        return { ...layer, y: 50 }
                    case 'bottom':
                        return { ...layer, y: 90 }
                    default:
                        return layer
                }
            })
        })
    }, [setLayersTracked, pushHistory])

    return {
        layers,
        setLayers,
        replaceLayers,
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
