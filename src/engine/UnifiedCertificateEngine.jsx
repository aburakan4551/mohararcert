/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           UnifiedCertificateEngine                              ║
 * ║  Single source of truth for ALL certificate rendering.          ║
 * ║                                                                  ║
 * ║  Modes:                                                          ║
 * ║   "editor"  → wraps EditorCanvas (drag/resize, no scale)        ║
 * ║   "preview" → scaled A4 display (read-only)                     ║
 * ║   "print"   → mm layout, no transform, @page friendly           ║
 * ║   "pdf"     → same as preview but intended for html2canvas      ║
 * ║                                                                  ║
 * ║  Props:                                                          ║
 * ║   templateId  – active template ID (reads layers internally)    ║
 * ║   template    – template object {image, ...}                    ║
 * ║   data        – { recipientName, event, date, serial }          ║
 * ║   settings    – { orgName, directorName, ... }                  ║
 * ║   mode        – "editor" | "preview" | "print" | "pdf"         ║
 * ║   showQR      – boolean (default true)                          ║
 * ║   certRef     – forwarded ref for the certificate DOM node      ║
 * ║                                                                  ║
 * ║  Editor-only props (passed through to EditorCanvas):            ║
 * ║   layers, selectedId, onSelect, onMove, onResize,               ║
 * ║   onDragStart, onCanvasReady, showGrid, showGuides              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import EditorCanvas from '../components/EditorCanvas'

/* ── A4 landscape reference (96 dpi) ── */
const A4_WIDTH_PX = 297 * (96 / 25.4)  // ≈ 1122.5 px
const A4_HEIGHT_PX = 210 * (96 / 25.4)  // ≈ 793.7  px

/*
 * DEFAULT_LABELS – exact default label strings from useLayers.js
 *
 * These are the PLACEHOLDER labels that useLayers.js assigns to
 * semantic layers when first created.
 *
 * Decision rule:
 *   layer.label === DEFAULT_LABELS[layer.id]
 *     → user never customized it → show DYNAMIC data from contentMap
 *
 *   layer.label !== DEFAULT_LABELS[layer.id]
 *     → user typed custom static text → show layer.label AS-IS
 *
 * This mirrors exactly what EditorCanvas shows:
 *   it always renders layer.label as the visible text.
 */
const DEFAULT_LABELS = {
    'name': 'اسم المستفيد',
    'reason': 'سبب التكريم',
    'event': 'المناسبة',
    'date': 'التاريخ',
    'serial': 'الرقم التسلسلي',
    'director-name': 'اسم المدير',
    'visa-name': 'اسم صاحب التأشيرة',
}

/* ─────────────────────────────────────────────────────────────────
   LayerRenderer  –  renders ONE layer in preview/print/pdf modes.

   All px dimensions (width, height, fontSize…) are stored relative
   to the EditorCanvas rendered width (canvasWidth).
   We scale to A4_WIDTH_PX so every layer lands at the same
   physical position regardless of screen resolution.
───────────────────────────────────────────────────────────────── */
function LayerRenderer({ layer, contentMap, imageMap, showQR, canvasWidth }) {
    if (!layer.visible) return null

    const s = layer.style || {}
    const canvasHeight = canvasWidth * (A4_HEIGHT_PX / A4_WIDTH_PX)
    const scale = A4_WIDTH_PX / canvasWidth

    /* px → % of A4 container */
    const widthPct = (layer.width / canvasWidth) * 100
    const heightPct = (layer.height / canvasHeight) * 100

    const wrapperStyle = {
        position: 'absolute',
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: layer.zIndex,
        width: `${widthPct}%`,
        pointerEvents: 'none',
    }

    /* ── TEXT ── */
    if (layer.type === 'text') {
        /*
         * Content resolution priority:
         *
         * 1. layer.content  – explicit static override (future)
         * 2. layer.dataKey  – explicit dynamic binding  e.g. dataKey="name"
         *                     → reads contentMap[dataKey] set by /create form
         * 3. DEFAULT_LABELS  – legacy: if label still matches placeholder
         *                     → reads contentMap[layer.id]
         * 4. layer.label    – static text the user typed in the editor
         *
         * Rule of thumb:
         *   Set dataKey  = "name" / "event" / "date" / "serial" / "reason"
         *   in PropertiesPanel to make a layer dynamic.
         *   Leave dataKey empty to keep the label as-is (static).
         */
        let displayText

        if (layer.content !== undefined && layer.content !== '') {
            displayText = layer.content

        } else if (layer.dataKey) {
            // Explicit data binding → always dynamic
            displayText = contentMap[layer.dataKey] ?? layer.label

        } else if (
            layer.id in DEFAULT_LABELS &&
            layer.label === DEFAULT_LABELS[layer.id]
        ) {
            // Legacy fallback: label still == default placeholder → dynamic
            displayText = contentMap[layer.id] ?? layer.label

        } else {
            // Static: user typed custom text in the label field
            displayText = layer.label
        }


        return (
            <div style={wrapperStyle}>
                <div style={{
                    fontSize: `${(s.fontSize || 16) * scale}px`,
                    fontWeight: s.fontWeight || 'normal',
                    color: s.color || '#000',
                    fontFamily: s.fontFamily || 'Cairo',
                    textAlign: s.textAlign || 'center',
                    width: '100%',
                    lineHeight: 1.4,
                    direction: 'rtl',
                    wordBreak: 'break-word',
                }}>
                    {displayText}
                </div>
            </div>
        )
    }

    /* ── IMAGE ── */
    if (layer.type === 'image') {
        const imgSrc = imageMap[layer.id] || null
        if (!imgSrc) return null
        return (
            <div style={{
                ...wrapperStyle,
                height: `${heightPct}%`,
                overflow: 'hidden',
            }}>
                <img
                    src={imgSrc}
                    alt={layer.label}
                    style={{
                        width: '100%', height: '100%',
                        objectFit: 'contain',
                        opacity: s.opacity ?? 1,
                        transform: s.rotation ? `rotate(${s.rotation}deg)` : 'none',
                    }}
                />
            </div>
        )
    }

    /* ── QR CODE ── */
    if (layer.type === 'qr') {
        if (!showQR) return null
        const qrSize = layer.width * scale
        const qrValue = contentMap['qr-value'] || `CERT:${contentMap.serial}|${contentMap.name}`
        return (
            <div style={{ ...wrapperStyle, height: `${heightPct}%` }}>
                <QRCodeSVG value={qrValue} size={qrSize} />
            </div>
        )
    }

    /* ── SHAPE ── */
    if (layer.type === 'shape') {
        const scaledBorder = (s.borderWidth || 1) * scale
        return (
            <div style={{
                ...wrapperStyle,
                height: `${heightPct}%`,
                background: s.fill || 'rgba(201,162,39,0.15)',
                border: `${scaledBorder}px solid ${s.borderColor || '#c9a227'}`,
                borderRadius: s.borderRadius || '0',
            }} />
        )
    }

    return null
}

/* ─────────────────────────────────────────────────────────────────
   CertificatePreview  –  renders the A4 certificate (non-editor).

   Uses position:absolute layers on a 297mm × 210mm container so
   the output is IDENTICAL whether displayed, printed, or exported.
───────────────────────────────────────────────────────────────── */
function CertificatePreview({ template, layers, canvasWidth, data, settings, showQR, certRef }) {
    const {
        directorName = '',
        directorSignature = null,
        visaLabel = '',
        visaName = '',
        visaSignature = null,
        stamp = null,
        stampSize = 120,
        stampOpacity = 0.85,
        stampRotation = -8,
        reasonText = '',
        reasonPrefix = '',
    } = settings || {}

    const {
        recipientName = '',
        event = '',
        date = '',
        serial = '',
    } = data || {}

    // Full content map — dataKey values are keys in this object
    const contentMap = {
        name: recipientName,
        event: event,
        date: date,
        serial: serial,
        reason: reasonText || event,   // long reason/body text
        reasonPrefix: reasonPrefix,
        'director-name': directorName,
        'visa-name': visaName || visaLabel,
    }

    const imageMap = {
        'director-sig': directorSignature,
        'visa-sig': visaSignature,
        stamp: stamp,
    }

    const sorted = [...(layers || [])].sort((a, b) => a.zIndex - b.zIndex)

    return (
        <div
            ref={certRef}
            className="certificate-a4 certificate-wrapper"
            style={{
                position: 'relative',
                width: '297mm',
                height: '210mm',
                overflow: 'hidden',
                background: '#fff',
                fontFamily: "'Cairo', 'Amiri', serif",
                direction: 'rtl',
                flexShrink: 0,
            }}
        >
            {/* Background image */}
            {template?.image && (
                <img
                    src={template.image}
                    alt="certificate background"
                    style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'fill',
                        pointerEvents: 'none',
                        display: 'block',
                    }}
                />
            )}

            {/* Layers */}
            {sorted.map(layer => (
                <LayerRenderer
                    key={layer.id}
                    layer={layer}
                    contentMap={contentMap}
                    imageMap={imageMap}
                    showQR={showQR}
                    canvasWidth={canvasWidth}
                />
            ))}

            {/* Classic stamp (if no stamp layer) */}
            {stamp && !sorted.some(l => l.id === 'stamp') && (
                <img
                    src={stamp}
                    alt="ختم"
                    style={{
                        position: 'absolute',
                        left: '50%', bottom: '12%',
                        transform: `translateX(-50%) rotate(${stampRotation}deg)`,
                        width: `${stampSize}px`,
                        opacity: stampOpacity,
                        objectFit: 'contain',
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* Classic QR (if no qr layer) */}
            {showQR && serial && !sorted.some(l => l.type === 'qr') && (
                <div style={{
                    position: 'absolute',
                    right: '6%', bottom: '8%',
                    pointerEvents: 'none',
                }}>
                    <QRCodeSVG value={`CERT:${serial}|${recipientName}`} size={64} />
                </div>
            )}
        </div>
    )
}

/* ─────────────────────────────────────────────────────────────────
   UnifiedCertificateEngine  –  the public API
───────────────────────────────────────────────────────────────── */
const UnifiedCertificateEngine = forwardRef(function UnifiedCertificateEngine({
    /* shared */
    template = null,
    layers = [],
    canvasWidth = 800,
    data = {},
    settings = {},
    mode = 'preview',  // 'editor' | 'preview' | 'print' | 'pdf'
    showQR = true,

    /* editor-mode props (passed through to EditorCanvas) */
    selectedId,
    onSelect,
    onMove,
    onResize,
    onDragStart,
    onCanvasReady,
    showGrid = false,
    showGuides = true,
}, ref) {

    /* ── EDITOR MODE: delegate entirely to EditorCanvas ── */
    if (mode === 'editor') {
        return (
            <EditorCanvas
                layers={layers}
                backgroundImage={template?.image || null}
                selectedId={selectedId}
                onSelect={onSelect}
                onMove={onMove}
                onResize={onResize}
                onDragStart={onDragStart}
                onCanvasReady={onCanvasReady}
                showGrid={showGrid}
                showGuides={showGuides}
            />
        )
    }

    /* ── PREVIEW / PRINT / PDF MODES ── */
    return (
        <CertificatePreview
            certRef={ref}
            template={template}
            layers={layers}
            canvasWidth={canvasWidth}
            data={data}
            settings={settings}
            showQR={showQR}
        />
    )
})

export default UnifiedCertificateEngine
