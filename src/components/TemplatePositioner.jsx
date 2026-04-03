import React, { useCallback, useRef, useState } from 'react'
import { useTemplates } from '../hooks/useTemplates'
import { QRCodeSVG } from 'qrcode.react'

/**
 * DRAGGABLE ELEMENT DEFINITIONS
 * Each element that can be repositioned on the certificate template.
 */
const ELEMENTS = [
    { key: 'namePosition', label: 'اسم المستفيد', icon: '👤', color: '#1a3a6b' },
    { key: 'eventPosition', label: 'المناسبة', icon: '🎯', color: '#2d7d46' },
    { key: 'datePosition', label: 'التاريخ', icon: '📅', color: '#7d2d2d' },
    { key: 'serialPosition', label: 'الرقم التسلسلي', icon: '🔢', color: '#555' },
    { key: 'directorPosition', label: 'توقيع المدير', icon: '✍️', color: '#1a3a6b' },
    { key: 'visaPosition', label: 'التأشيرة', icon: '🔏', color: '#7d5a2d' },
    { key: 'stampPosition', label: 'الختم', icon: '🔵', color: '#2d4a7d' },
    { key: 'qrPosition', label: 'QR Code', icon: '📱', color: '#111' },
]

/**
 * TemplatePositioner
 * Full-screen overlay editor for dragging text elements on a certificate template.
 */
export default function TemplatePositioner({ template, onClose }) {
    const { savePositions, DEFAULT_POSITIONS } = useTemplates()

    const [positions, setPositions] = useState(
        template.positions || { ...DEFAULT_POSITIONS }
    )
    const [activeElement, setActiveElement] = useState(null)
    const [saved, setSaved] = useState(false)

    const canvasRef = useRef()
    const dragInfo = useRef(null)

    /* ── Drag handlers ── */
    const startDrag = useCallback((e, key) => {
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        dragInfo.current = {
            key,
            startX: clientX,
            startY: clientY,
            startPosX: positions[key].x,
            startPosY: positions[key].y,
            rectW: rect.width,
            rectH: rect.height,
        }
        setActiveElement(key)
    }, [positions])

    const onMove = useCallback((e) => {
        if (!dragInfo.current) return
        const { key, startX, startY, startPosX, startPosY, rectW, rectH } = dragInfo.current

        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY

        const dx = ((clientX - startX) / rectW) * 100
        const dy = ((clientY - startY) / rectH) * 100

        const newX = Math.min(98, Math.max(2, startPosX + dx))
        const newY = Math.min(98, Math.max(2, startPosY + dy))

        setPositions(prev => ({
            ...prev,
            [key]: { x: newX, y: newY }
        }))
    }, [])

    const endDrag = useCallback(() => {
        dragInfo.current = null
        setActiveElement(null)
    }, [])

    /* ── Save ── */
    const handleSave = () => {
        savePositions(template.id, positions)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handleReset = () => {
        setPositions({ ...DEFAULT_POSITIONS })
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: '#0f0f1a',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'var(--font)',
            direction: 'rtl'
        }}>
            {/* ── Top toolbar ── */}
            <div style={{
                height: '56px', background: 'rgba(255,255,255,0.05)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 20px', flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: '0.95rem' }}>
                        📍 ضبط مواضع العناصر — {template.name}
                    </span>
                    <span style={{
                        fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)',
                        background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '20px'
                    }}>
                        اسحب أي عنصر لتغيير موضعه
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={handleReset}
                        style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}>
                        🔄 إعادة تعيين
                    </button>
                    <button className="btn btn-gold btn-sm" onClick={handleSave}>
                        {saved ? '✅ تم الحفظ' : '💾 حفظ المواضع'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={onClose}>✕ إغلاق</button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                {/* ── Elements panel ── */}
                <div style={{
                    width: '220px', flexShrink: 0, overflowY: 'auto',
                    background: 'rgba(255,255,255,0.03)', borderLeft: '1px solid rgba(255,255,255,0.08)',
                    padding: '16px'
                }}>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: 600 }}>
                        العناصر القابلة للتحريك
                    </p>
                    {ELEMENTS.map(el => (
                        <div key={el.key} style={{
                            padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                            background: activeElement === el.key ? 'rgba(201,162,39,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${activeElement === el.key ? 'rgba(201,162,39,0.5)' : 'transparent'}`,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)',
                            direction: 'rtl'
                        }}>
                            <span>{el.icon}</span>
                            <span style={{ flex: 1 }}>{el.label}</span>
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                                {Math.round(positions[el.key]?.x ?? 0)}%,{Math.round(positions[el.key]?.y ?? 0)}%
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── Canvas ── */}
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px', overflow: 'hidden'
                }}>
                    <div
                        ref={canvasRef}
                        onMouseMove={onMove}
                        onMouseUp={endDrag}
                        onMouseLeave={endDrag}
                        onTouchMove={onMove}
                        onTouchEnd={endDrag}
                        style={{
                            position: 'relative',
                            aspectRatio: '297/210',
                            maxWidth: '100%', maxHeight: '100%',
                            userSelect: 'none',
                            cursor: dragInfo.current ? 'grabbing' : 'default',
                            boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
                            borderRadius: '4px',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Background template image */}
                        <img
                            src={template.image}
                            alt="template"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }}
                            draggable={false}
                        />

                        {/* Draggable elements */}
                        {ELEMENTS.map(el => {
                            const pos = positions[el.key] || { x: 50, y: 50 }
                            const isActive = activeElement === el.key
                            return (
                                <div
                                    key={el.key}
                                    onMouseDown={e => startDrag(e, el.key)}
                                    onTouchStart={e => startDrag(e, el.key)}
                                    style={{
                                        position: 'absolute',
                                        left: pos.x + '%',
                                        top: pos.y + '%',
                                        transform: 'translate(-50%, -50%)',
                                        cursor: 'grab',
                                        zIndex: isActive ? 10 : 5,
                                        transition: isActive ? 'none' : 'box-shadow 0.2s',
                                    }}
                                >
                                    {/* Visual handle */}
                                    <div style={{
                                        background: isActive ? 'rgba(201,162,39,0.9)' : 'rgba(26,58,107,0.85)',
                                        color: 'white',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        boxShadow: isActive
                                            ? '0 0 0 2px var(--gold), 0 4px 16px rgba(0,0,0,0.4)'
                                            : '0 2px 8px rgba(0,0,0,0.3)',
                                        border: `1.5px solid ${isActive ? 'var(--gold)' : 'rgba(255,255,255,0.3)'}`,
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                        userSelect: 'none',
                                        direction: 'rtl'
                                    }}>
                                        <span>{el.icon}</span>
                                        <span>{el.label}</span>
                                        <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>⠿</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
