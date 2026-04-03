import React, { useCallback, useRef, useState, useMemo, useEffect, memo } from 'react'

const SNAP_TOLERANCE = 1.5 // % threshold for snapping

/* ═══════════════════════════════════════════════════════════
   EditorCanvas – professional design surface
   Features: rAF drag, boundary clamping, snap-to system,
   multi-corner resize handles, snap guide lines
═══════════════════════════════════════════════════════════ */
export default function EditorCanvas({
    layers,
    backgroundImage,
    selectedId,
    onSelect,
    onMove,
    onResize,
    onDragStart,
    onCanvasReady,
    showGrid = false,
    showGuides = true,
}) {
    const canvasRef = useRef(null)
    const rafRef = useRef(null)
    const tempPosRef = useRef(null)    // temp position during drag { id, x, y }
    const tempSizeRef = useRef(null)   // temp size during resize { id, w, h }

    const [dragging, setDragging] = useState(null)
    const [resizing, setResizing] = useState(null)
    const [snapLines, setSnapLines] = useState([]) // { axis:'h'|'v', pos:% }
    const [hoveredId, setHoveredId] = useState(null)

    // Local display overrides (used during drag/resize for smooth rendering)
    const [localPos, setLocalPos] = useState(null)   // { id, x, y }
    const [localSize, setLocalSize] = useState(null)  // { id, w, h }

    /* ── Sorted layers (memoized) ── */
    const sorted = useMemo(() =>
        [...layers].sort((a, b) => a.zIndex - b.zIndex),
        [layers]
    )

    /* ── Report canvas width (for CertificateTemplate scaling) ── */
    useEffect(() => {
        if (!onCanvasReady) return
        const report = () => {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (rect) onCanvasReady(rect.width)
        }
        report()
        const ro = new ResizeObserver(report)
        if (canvasRef.current) ro.observe(canvasRef.current)
        return () => ro.disconnect()
    }, [onCanvasReady])

    /* ── Pixel → % conversion ── */
    const pxToPercent = useCallback((clientX, clientY) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return { x: 0, y: 0 }
        return {
            x: ((clientX - rect.left) / rect.width) * 100,
            y: ((clientY - rect.top) / rect.height) * 100,
        }
    }, [])

    /* ── Get layer's width/height as % of canvas ── */
    const layerSizePercent = useCallback((layer) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return { wp: 10, hp: 10 }
        const w = (localSize?.id === layer.id ? localSize.w : layer.width)
        const h = (localSize?.id === layer.id ? localSize.h : layer.height)
        return {
            wp: (w / rect.width) * 100,
            hp: (h / rect.height) * 100,
        }
    }, [localSize])

    /* ── Snap calculation ── */
    const calcSnap = useCallback((id, rawX, rawY, wpHalf, hpHalf) => {
        const guides = []
        let x = rawX,
            y = rawY

        // Snap targets: center + edges
        const snapTargetsH = [50] // horizontal center
        const snapTargetsV = [50] // vertical center

        // Add other layer positions as snap targets
        for (const l of layers) {
            if (l.id === id || !l.visible) continue
            snapTargetsH.push(l.x)
            snapTargetsV.push(l.y)
        }

        // Check horizontal snap (x axis)
        for (const target of snapTargetsH) {
            if (Math.abs(x - target) < SNAP_TOLERANCE) {
                x = target
                guides.push({ axis: 'v', pos: target })
                break
            }
        }
        // Check vertical snap (y axis)
        for (const target of snapTargetsV) {
            if (Math.abs(y - target) < SNAP_TOLERANCE) {
                y = target
                guides.push({ axis: 'h', pos: target })
                break
            }
        }

        return { x, y, guides }
    }, [layers])

    /* ── Boundary clamping ── */
    const clamp = useCallback((x, y, wpHalf, hpHalf) => ({
        x: Math.max(wpHalf, Math.min(100 - wpHalf, x)),
        y: Math.max(hpHalf, Math.min(100 - hpHalf, y)),
    }), [])

    /* ── Drag start ── */
    const handleLayerMouseDown = useCallback((e, layer) => {
        if (layer.locked) return
        e.stopPropagation()
        e.preventDefault()
        onSelect(layer.id)
        const pos = pxToPercent(e.clientX, e.clientY)
        onDragStart?.()
        setDragging({
            id: layer.id,
            offsetX: pos.x - layer.x,
            offsetY: pos.y - layer.y,
        })
    }, [onSelect, pxToPercent, onDragStart])

    /* ── Mouse move (rAF throttled) ── */
    const handleMouseMove = useCallback((e) => {
        if (!dragging && !resizing) return

        if (rafRef.current) cancelAnimationFrame(rafRef.current)

        const clientX = e.clientX
        const clientY = e.clientY

        rafRef.current = requestAnimationFrame(() => {
            if (dragging) {
                const pos = pxToPercent(clientX, clientY)
                let rawX = pos.x - dragging.offsetX
                let rawY = pos.y - dragging.offsetY

                const layer = layers.find(l => l.id === dragging.id)
                if (!layer) return
                const { wp, hp } = layerSizePercent(layer)
                const wpHalf = wp / 2, hpHalf = hp / 2

                // Clamp to boundaries
                const clamped = clamp(rawX, rawY, wpHalf, hpHalf)

                // Snap
                const snapped = calcSnap(dragging.id, clamped.x, clamped.y, wpHalf, hpHalf)

                setLocalPos({ id: dragging.id, x: snapped.x, y: snapped.y })
                setSnapLines(snapped.guides)
                tempPosRef.current = { id: dragging.id, x: snapped.x, y: snapped.y }
            }

            if (resizing) {
                const dx = clientX - resizing.startMX
                const dy = clientY - resizing.startMY
                const newW = Math.max(30, resizing.startW + dx * resizing.dirX)
                const newH = Math.max(20, resizing.startH + dy * resizing.dirY)
                setLocalSize({ id: resizing.id, w: newW, h: newH })
                tempSizeRef.current = { id: resizing.id, w: newW, h: newH }
            }
        })
    }, [dragging, resizing, pxToPercent, layers, layerSizePercent, clamp, calcSnap])

    /* ── Mouse up: commit ── */
    const handleMouseUp = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)

        if (tempPosRef.current && dragging) {
            onMove(tempPosRef.current.id, tempPosRef.current.x, tempPosRef.current.y)
        }
        if (tempSizeRef.current && resizing) {
            onResize(tempSizeRef.current.id, tempSizeRef.current.w, tempSizeRef.current.h)
        }

        tempPosRef.current = null
        tempSizeRef.current = null
        setDragging(null)
        setResizing(null)
        setLocalPos(null)
        setLocalSize(null)
        setSnapLines([])
    }, [dragging, resizing, onMove, onResize])

    /* ── Resize handle mousedown ── */
    const handleResizeStart = useCallback((e, layer, dirX = 1, dirY = 1) => {
        e.stopPropagation()
        e.preventDefault()
        onDragStart?.()
        setResizing({
            id: layer.id,
            startW: layer.width,
            startH: layer.height,
            startMX: e.clientX,
            startMY: e.clientY,
            dirX, dirY,
        })
    }, [onDragStart])

    /* ── Click canvas background → deselect ── */
    const handleCanvasClick = useCallback((e) => {
        if (e.target === canvasRef.current || e.target.classList.contains('canvas-bg')) {
            onSelect(null)
        }
    }, [onSelect])

    return (
        <div
            ref={canvasRef}
            className="editor-canvas-surface"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '297 / 210',
                overflow: 'hidden',
                cursor: dragging ? 'grabbing' : 'default',
                userSelect: 'none',
                background: backgroundImage ? 'transparent' : '#fff',
            }}
        >
            {/* ── Background ── */}
            {backgroundImage && (
                <img
                    src={backgroundImage}
                    alt="template bg"
                    className="canvas-bg"
                    draggable={false}
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'fill', pointerEvents: 'none',
                        display: 'block',
                    }}
                />
            )}

            {/* ── Grid overlay ── */}
            {showGrid && (
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999,
                    backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
                    backgroundSize: '5% 5%',
                }} />
            )}

            {/* ── Center guides ── */}
            {showGuides && (
                <>
                    <div style={{
                        position: 'absolute', left: '50%', top: 0, bottom: 0,
                        width: '1px', background: 'rgba(201,162,39,0.25)',
                        pointerEvents: 'none', zIndex: 998,
                    }} />
                    <div style={{
                        position: 'absolute', top: '50%', left: 0, right: 0,
                        height: '1px', background: 'rgba(201,162,39,0.25)',
                        pointerEvents: 'none', zIndex: 998,
                    }} />
                </>
            )}

            {/* ── Snap guide lines (purple) ── */}
            {snapLines.map((g, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    ...(g.axis === 'v'
                        ? { left: `${g.pos}%`, top: 0, bottom: 0, width: '2px' }
                        : { top: `${g.pos}%`, left: 0, right: 0, height: '2px' }),
                    background: '#a855f7',
                    pointerEvents: 'none',
                    zIndex: 1001,
                    boxShadow: '0 0 6px rgba(168,85,247,0.6)',
                }} />
            ))}

            {/* ── Layers ── */}
            {sorted.map(layer => {
                if (!layer.visible) return null
                const isSelected = layer.id === selectedId
                const isLocked = layer.locked
                const isHovered = layer.id === hoveredId

                // Use local overrides during drag/resize
                const displayX = (localPos?.id === layer.id) ? localPos.x : layer.x
                const displayY = (localPos?.id === layer.id) ? localPos.y : layer.y
                const displayW = (localSize?.id === layer.id) ? localSize.w : layer.width
                const displayH = (localSize?.id === layer.id) ? localSize.h : layer.height

                return (
                    <div
                        key={layer.id}
                        onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                        onMouseEnter={() => setHoveredId(layer.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                            position: 'absolute',
                            left: `${displayX}%`,
                            top: `${displayY}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: layer.zIndex,
                            width: `${displayW}px`,
                            height: layer.type === 'text' ? 'auto' : `${displayH}px`,
                            minHeight: `${displayH}px`,
                            cursor: isLocked ? 'not-allowed' : (dragging?.id === layer.id ? 'grabbing' : 'grab'),
                            opacity: isLocked ? 0.5 : 1,
                            outline: isSelected
                                ? '2px solid #3b82f6'
                                : (isHovered && !isLocked)
                                    ? '1px solid rgba(59,130,246,0.5)'
                                    : (isLocked ? '1px dashed rgba(0,0,0,0.15)' : 'none'),
                            outlineOffset: '2px',
                            transition: (dragging?.id === layer.id || resizing?.id === layer.id) ? 'none' : 'outline 0.12s',
                            pointerEvents: isLocked ? 'none' : 'auto',
                        }}
                    >
                        {/* Layer label badge */}
                        {isSelected && (
                            <div style={{
                                position: 'absolute',
                                top: '-22px', right: '0',
                                background: '#3b82f6', color: '#fff',
                                fontSize: '10px', fontWeight: 700,
                                padding: '2px 8px', borderRadius: '4px 4px 0 0',
                                whiteSpace: 'nowrap', pointerEvents: 'none',
                                direction: 'rtl',
                            }}>
                                {layer.label}
                            </div>
                        )}

                        {/* Layer content */}
                        <LayerContent layer={layer} />

                        {/* Resize handles — show on hover or selection */}
                        {(isSelected || isHovered) && !isLocked && (
                            <ResizeHandles
                                layer={layer}
                                onResizeStart={handleResizeStart}
                                showAll={isSelected}
                            />
                        )}
                    </div>
                )
            })}

            {/* Empty state */}
            {layers.length === 0 && !backgroundImage && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#999', fontSize: '1rem', fontFamily: 'Cairo',
                    flexDirection: 'column', gap: '8px',
                }}>
                    <span style={{ fontSize: '2rem' }}>📐</span>
                    <span>قم بإضافة طبقات من اللوحة اليمنى</span>
                </div>
            )}
        </div>
    )
}

/* ── Resize handles component ── */
const ResizeHandles = memo(function ResizeHandles({ layer, onResizeStart, showAll }) {
    const handleStyle = (cursor, pos) => ({
        position: 'absolute',
        ...pos,
        width: showAll ? '10px' : '8px',
        height: showAll ? '10px' : '8px',
        background: showAll ? '#3b82f6' : 'rgba(59,130,246,0.5)',
        borderRadius: '2px',
        cursor,
        zIndex: 1000,
        border: '1px solid rgba(255,255,255,0.8)',
        transition: 'opacity 0.12s',
    })

    return (
        <>
            {/* Bottom-right */}
            <div
                onMouseDown={(e) => onResizeStart(e, layer, 1, 1)}
                style={handleStyle('nwse-resize', { bottom: '-5px', left: '-5px' })}
            />
            {showAll && (
                <>
                    {/* Bottom-left */}
                    <div
                        onMouseDown={(e) => onResizeStart(e, layer, -1, 1)}
                        style={handleStyle('nesw-resize', { bottom: '-5px', right: '-5px' })}
                    />
                    {/* Top-right */}
                    <div
                        onMouseDown={(e) => onResizeStart(e, layer, 1, -1)}
                        style={handleStyle('nesw-resize', { top: '-5px', left: '-5px' })}
                    />
                    {/* Top-left */}
                    <div
                        onMouseDown={(e) => onResizeStart(e, layer, -1, -1)}
                        style={handleStyle('nwse-resize', { top: '-5px', right: '-5px' })}
                    />
                </>
            )}
        </>
    )
})

/* ── LayerContent: renders inside of each layer ── */
const LayerContent = memo(function LayerContent({ layer }) {
    const s = layer.style || {}

    switch (layer.type) {
        case 'text':
            return (
                <div style={{
                    fontSize: `${s.fontSize || 16}px`,
                    fontWeight: s.fontWeight || 'normal',
                    color: s.color || '#000',
                    fontFamily: s.fontFamily || 'Cairo',
                    textAlign: s.textAlign || 'center',
                    width: '100%',
                    lineHeight: 1.4,
                    direction: 'rtl',
                    wordBreak: 'break-word',
                    pointerEvents: 'none',
                }}>
                    {layer.label}
                </div>
            )

        case 'image':
            return (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: s.opacity ?? 1,
                    transform: s.rotation ? `rotate(${s.rotation}deg)` : 'none',
                }}>
                    <div style={{
                        width: '100%', height: '100%',
                        border: '1px dashed rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: '#999',
                        background: 'rgba(245,245,245,0.6)',
                        pointerEvents: 'none',
                    }}>
                        🖼️ {layer.label}
                    </div>
                </div>
            )

        case 'qr':
            return (
                <div style={{
                    width: '100%', height: '100%',
                    border: '1px dashed rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', background: 'rgba(245,245,245,0.6)',
                    pointerEvents: 'none',
                }}>
                    📱
                </div>
            )

        case 'shape':
            return (
                <div style={{
                    width: '100%', height: '100%',
                    background: s.fill || 'rgba(201,162,39,0.15)',
                    border: `${s.borderWidth || 1}px solid ${s.borderColor || '#c9a227'}`,
                    borderRadius: s.borderRadius || '0',
                    pointerEvents: 'none',
                }} />
            )

        default:
            return null
    }
})
