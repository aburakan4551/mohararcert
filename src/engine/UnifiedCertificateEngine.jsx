/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           UnifiedCertificateEngine                              ║
 * ║  Single source of truth for ALL certificate rendering.          ║
 * ║  Fully Integrated with Enterprise Workflow & Versioned Stamps.  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import React, { forwardRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import EditorCanvas from '../components/EditorCanvas'
import { resolveDynamicField, getLayerZIndex } from './FieldEngine/FieldEngine'

/* ── A4 reference dimensions at 96 dpi ── */
const A4_LANDSCAPE_W_PX = 297 * (96 / 25.4)  // ≈ 1122.5 px
const A4_LANDSCAPE_H_PX = 210 * (96 / 25.4)  // ≈ 793.7  px
const A4_PORTRAIT_W_PX  = 210 * (96 / 25.4)  // ≈ 793.7  px
const A4_PORTRAIT_H_PX  = 297 * (96 / 25.4)  // ≈ 1122.5 px

const DEFAULT_LABELS = {
    'name': 'اسم المستفيد',
    'reason': 'سبب التكريم',
    'event': 'المناسبة',
    'date': 'التاريخ',
    'serial': 'الرقم التسلسلي',
    'director-name': 'اسم المدير',
    'visa-name': 'اسم صاحب التأشيرة',
}

function LayerRenderer({ layer, contentMap, imageMap, showQR, canvasWidth, orientation }) {
    if (!layer.visible) return null

    const s = layer.style || {}
    const isPortrait = (orientation || 'portrait') === 'portrait'
    const refW = isPortrait ? A4_PORTRAIT_W_PX : A4_LANDSCAPE_W_PX
    const refH = isPortrait ? A4_PORTRAIT_H_PX : A4_LANDSCAPE_H_PX
    const canvasHeight = canvasWidth * (refH / refW)
    const scale = refW / canvasWidth

    const widthPct = (layer.width / canvasWidth) * 100
    const heightPct = (layer.height / canvasHeight) * 100

    const wrapperStyle = {
        position: 'absolute',
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: getLayerZIndex(layer),
        width: `${widthPct}%`,
        pointerEvents: 'none',
    }

    /* ── TEXT ── */
    if (layer.type === 'text') {
        let displayText

        if (layer.content !== undefined && layer.content !== '') {
            displayText = layer.content
        } else if (layer.dataKey) {
            displayText = contentMap[layer.dataKey] ?? layer.label
        } else if (
            layer.id in DEFAULT_LABELS &&
            layer.label === DEFAULT_LABELS[layer.id]
        ) {
            displayText = contentMap[layer.id] ?? layer.label
        } else {
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
    } = settings || {}

    const {
        recipientName = '',
        event = '',
        date = '',
        serial = '',
        status = 'DRAFT',
        assistantSnapshot = null,
        managerSnapshot = null
    } = data || {}

    const orientation = template?.orientation || 'portrait';
    const isPortrait = orientation === 'portrait';
    const mmW = isPortrait ? '210mm' : '297mm';
    const mmH = isPortrait ? '297mm' : '210mm';

    // Use versioned snapshot values if they exist on the certificate (prevents retroactive modifications)
    const activeVisaName = assistantSnapshot?.visaName || visaName || visaLabel;
    const activeVisaLabel = assistantSnapshot?.visaLabel || visaLabel || 'مساعد المدير العام للتخطيط';
    const activeVisaSignature = assistantSnapshot?.visaSignature || visaSignature;
    
    const activeDirectorName = managerSnapshot?.directorName || directorName;
    const activeDirectorTitle = managerSnapshot?.directorTitle || 'المدير العام للمنصة';
    const activeDirectorSignature = managerSnapshot?.directorSignature || directorSignature;
    const activeStamp = managerSnapshot?.stamp || stamp;
    const activeStampSize = managerSnapshot?.stampSize || stampSize;
    const activeStampRotation = managerSnapshot?.stampRotation || stampRotation;

    const contentMap = {
        name: recipientName,
        event: event,
        date: date,
        serial: serial,
        reason: reasonText || event,
        'director-name': activeDirectorName,
        'visa-name': activeVisaName,
    }

    const imageMap = {
        'director-sig': activeDirectorSignature,
        'visa-sig': activeVisaSignature,
        stamp: activeStamp,
    }

    const sorted = [...(layers || [])].sort((a, b) => a.zIndex - b.zIndex)

    // Render conditions
    const hasVisa = status === 'APPROVED_BY_ASSISTANT' || status === 'FINAL_APPROVED' || status === 'ARCHIVED';
    const isFinalApproved = status === 'FINAL_APPROVED' || status === 'ARCHIVED';

    return (
        <div
            ref={certRef}
            className="certificate-a4 certificate-wrapper select-none"
            id="certificate-print-wrapper"
            data-orientation={orientation}
            style={{
                position: 'relative',
                width: mmW,
                height: mmH,
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

            {/* Static Certificate Title (Always programmatically present at top center) */}
            <div style={{
                position: 'absolute',
                top: '12%',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                width: '60%',
                pointerEvents: 'none',
                zIndex: 50
            }}>
                <h1 style={{
                    fontSize: '34px',
                    fontWeight: 900,
                    color: settings.primaryColor || '#0d1f3c',
                    fontFamily: 'Cairo',
                    letterSpacing: '1px',
                    margin: 0,
                    textShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    شهادة شكر وتقدير
                </h1>
            </div>

            {/* Layers */}
            {sorted.map(layer => (
                <LayerRenderer
                    key={layer.id}
                    layer={layer}
                    contentMap={contentMap}
                    imageMap={imageMap}
                    showQR={showQR}
                    canvasWidth={canvasWidth}
                    orientation={orientation}
                />
            ))}

            {/* Dynamic Assistant Visa Overlay (Bottom Left) */}
            {hasVisa && (
                <div style={{
                    position: 'absolute',
                    bottom: '12%',
                    left: '8%',
                    width: '240px',
                    padding: '10px 14px',
                    border: '1.5px dashed rgba(201, 162, 39, 0.4)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
                    zIndex: 40,
                    direction: 'rtl',
                    textAlign: 'center'
                }}>
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        color: '#c9a227',
                        display: 'block',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '4px'
                    }}>
                         تأشيرة مراجعة واعتماد
                    </span>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0d1f3c',
                        display: 'block'
                    }}>
                        {activeVisaLabel}
                    </span>
                    
                    {/* Assistant digital signature */}
                    <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                        {activeVisaSignature ? (
                            <img src={activeVisaSignature} alt="توقيع المساعد" style={{ maxHeight: '100%', maxWidth: '80%', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ fontFamily: 'Amiri', fontStyle: 'italic', fontSize: '13px', color: '#c9a227', fontWeight: 'bold' }}>{activeVisaName}</span>
                        )}
                    </div>

                    <span style={{
                        fontSize: '9px',
                        color: '#7f8c8d',
                        display: 'block',
                        fontWeight: 700
                    }}>
                        بتاريخ: {assistantSnapshot?.approvedAt ? new Date(assistantSnapshot.approvedAt).toLocaleDateString('ar-SA') : new Date().toLocaleDateString('ar-SA')}
                    </span>
                </div>
            )}

            {/* Dynamic General Manager Approval Overlay (Bottom Right) */}
            {isFinalApproved && (
                <div style={{
                    position: 'absolute',
                    bottom: '12%',
                    right: '8%',
                    width: '240px',
                    padding: '10px 14px',
                    border: '2px solid #0d1f3c',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                    zIndex: 40,
                    direction: 'rtl',
                    textAlign: 'center'
                }}>
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 900,
                        color: '#0d1f3c',
                        display: 'block',
                        letterSpacing: '0.5px',
                        marginBottom: '4px'
                    }}>
                        👑 مصادقة واعتماد نهائي
                    </span>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0d1f3c',
                        display: 'block'
                    }}>
                        {activeDirectorTitle}
                    </span>
                    
                    {/* GM Signature */}
                    <div style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
                        {activeDirectorSignature ? (
                            <img src={activeDirectorSignature} alt="توقيع المدير" style={{ maxHeight: '100%', maxWidth: '80%', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ fontFamily: 'Amiri', fontStyle: 'italic', fontSize: '14px', color: '#0d1f3c', fontWeight: 'bold' }}>{activeDirectorName}</span>
                        )}
                    </div>

                    <span style={{
                        fontSize: '10px',
                        color: '#0d1f3c',
                        display: 'block',
                        fontWeight: 800
                    }}>
                        {activeDirectorName}
                    </span>
                </div>
            )}

            {/* Dynamic stamp (rendered absolutely under GM or center bottom) */}
            {isFinalApproved && activeStamp && (
                <img
                    src={activeStamp}
                    alt="ختم المصادقة"
                    style={{
                        position: 'absolute',
                        right: '18%',
                        bottom: '9%',
                        transform: `rotate(${activeStampRotation}deg)`,
                        width: `${activeStampSize}px`,
                        opacity: stampOpacity,
                        objectFit: 'contain',
                        pointerEvents: 'none',
                        zIndex: 30
                    }}
                />
            )}

            {/* Classic QR Code (Bottom Left-Center) */}
            {showQR && serial && (
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '8%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    background: '#fff',
                    padding: '4px',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    zIndex: 60
                }}>
                    <QRCodeSVG value={`CERT:${serial}|${recipientName}|STATUS:${status}`} size={54} />
                </div>
            )}

            {/* Dynamic Form Fields Overlay */}
            {(data?.formFields || []).map((field) => {
                const isDynamic = ['signer_name', 'signer_title', 'approver_name', 'approver_title', 'signature_1', 'signature_2', 'signature_3', 'official_stamp'].includes(field.dynamicType || field.name);
                
                let value = '';
                if (isDynamic) {
                    value = resolveDynamicField(field.dynamicType || field.name, data, settings);
                } else {
                    const valuesSource = data?.formValues || {};
                    value = valuesSource[field.name] ?? '';
                }

                if (!value) return null;

                const isPortrait = (orientation || 'portrait') === 'portrait';
                const refW = isPortrait ? A4_PORTRAIT_W_PX : A4_LANDSCAPE_W_PX;
                const refH = isPortrait ? A4_PORTRAIT_H_PX : A4_LANDSCAPE_H_PX;
                const scale = canvasWidth / refW;

                const pctX = (field.x / refW) * 100;
                const pctY = (field.y / refH) * 100;
                const pctW = (field.width / refW) * 100;
                const pctH = (field.height / refH) * 100;

                const isImageField = field.type === 'signature' || field.type === 'stamp' || field.type === 'image';

                if (isImageField) {
                    return (
                        <img
                            key={field.id}
                            src={value}
                            alt={field.label}
                            style={{
                                position: 'absolute',
                                left: `${pctX}%`,
                                top: `${pctY}%`,
                                width: `${pctW}%`,
                                height: `${pctH}%`,
                                objectFit: 'contain',
                                zIndex: getLayerZIndex(field)
                            }}
                        />
                    );
                }

                const fontSize = 14 * scale;

                return (
                    <div
                        key={field.id}
                        style={{
                            position: 'absolute',
                            left: `${pctX}%`,
                            top: `${pctY}%`,
                            width: `${pctW}%`,
                            height: `${pctH}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            textAlign: 'right',
                            color: '#1e293b',
                            fontFamily: 'Cairo, sans-serif',
                            fontSize: `${fontSize}px`,
                            fontWeight: 700,
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden',
                            zIndex: getLayerZIndex(field),
                            direction: 'rtl'
                        }}
                    >
                        {value}
                    </div>
                );
            })}
        </div>
    )
}

const UnifiedCertificateEngine = forwardRef(function UnifiedCertificateEngine({
    template = null,
    layers = [],
    canvasWidth = 800,
    data = {},
    settings = {},
    mode = 'preview',
    showQR = true,

    selectedId,
    onSelect,
    onMove,
    onResize,
    onDragStart,
    onCanvasReady,
    showGrid = false,
    showGuides = true,
}, ref) {

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
