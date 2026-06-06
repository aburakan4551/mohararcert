/**
 * 🖼️ TemplateRenderer.jsx
 * The core engine that renders a Smart Template using predefined fields and runtime data.
 * Does NOT allow moving or editing. It simply displays the result.
 *
 * Dynamic Binding System:
 *   All field values are resolved via resolveFieldValue() from FieldEngine.
 *   Fields with a bindingKey read their value from system-settings at render time.
 *   This means: changing identity settings in SystemSettings instantly updates ALL templates.
 */

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getFieldMeta, resolveFieldValue, resolveDynamicField } from '../FieldEngine/FieldEngine';
import { useAuth } from '../../context/AuthContext';

/* A4 Paper Dimensions at 96dpi */
const A4_LANDSCAPE_W = 1122.5; // 297mm at 96dpi
const A4_LANDSCAPE_H = 793.7;  // 210mm at 96dpi
const A4_PORTRAIT_W  = 793.7;  // 210mm at 96dpi
const A4_PORTRAIT_H  = 1122.5; // 297mm at 96dpi

const TemplateRenderer = forwardRef(({ template, dataContext, width = 800, settings: customSettings }, ref) => {
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);

    let authSettings = null;
    try {
        const auth = useAuth();
        authSettings = auth ? auth.settings : null;
    } catch (e) {
        // Safe fallback in headless off-screen exports
    }
    const settings = customSettings || authSettings || {};

    // Orientation-aware sizing
    const orientation = template?.orientation || 'portrait';
    const isPortrait = orientation === 'portrait';
    const BASE_WIDTH = isPortrait ? A4_PORTRAIT_W : A4_LANDSCAPE_W;
    const aspectRatio = isPortrait ? (A4_PORTRAIT_W / A4_PORTRAIT_H) : (A4_LANDSCAPE_W / A4_LANDSCAPE_H);
    const height = width / aspectRatio;

    useEffect(() => {
        setScale(width / BASE_WIDTH);
    }, [width, BASE_WIDTH]);

    if (!template) {
        return (
            <div style={{ width, height, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا يوجد قالب محدد
            </div>
        );
    }

    // ── Resolve fields for the current page ───────────────────────────────
    const activeFields = (() => {
        if (template.pages && template.pages.length > 0) {
            // Multi-page: flatten all pages (for single-page preview just use page 0)
            return template.pages[0]?.fields || template.fields || [];
        }
        return template.fields || [];
    })();

    return (
        <div
            ref={(node) => {
                containerRef.current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
            }}
            id="certificate-print-wrapper"
            data-orientation={orientation}
            style={{
                width: `${width}px`,
                height: `${height}px`,
                position: 'relative',
                background: '#ffffff',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-card)',
                direction: 'rtl',
                userSelect: 'none'
            }}
        >
            {/* Background Image — supports both background (base64) and backgroundUrl */}
            {(template.background || template.backgroundUrl) && (
                <img
                    src={template.background || template.backgroundUrl}
                    alt="Template Background"
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'fill',
                        zIndex: 0,
                        pointerEvents: 'none'
                    }}
                />
            )}

            {/* Dynamic Fields */}
            {activeFields.map((field, idx) => {
                const meta = getFieldMeta(field.fieldId);
                if (!meta) return null;
                if (field.hidden) return null;

                // ── Unified value resolution via FieldEngine ──────────────
                const value = resolveFieldValue(field, meta, dataContext, settings);

                // Base positioning style
                const baseStyle = {
                    position: 'absolute',
                    top: `${field.y}%`,
                    left: `${field.x}%`,
                    transform: `translate(-50%, -50%) rotate(${field.rotation || 0}deg)`,
                    opacity: field.opacity || 1,
                    zIndex: 10 + (activeFields.length - 1 - idx),
                };

                // ── Render Text or Textarea ───────────────────────────────
                if (meta.type === 'text' || meta.type === 'textarea') {
                    const fontSize = (field.fontSize || meta.defaultFontSize) * scale;
                    const letterSpacing = field.letterSpacing ? `${field.letterSpacing * scale}px` : 'normal';
                    const displayValue = value || `[${meta.label}]`;
                    return (
                        <div key={field._uid || idx} style={{
                            ...baseStyle,
                            color: field.color || meta.defaultColor,
                            fontFamily: field.fontFamily || meta.defaultFontFamily,
                            fontWeight: field.fontWeight || meta.defaultWeight,
                            fontSize: `${fontSize}px`,
                            textAlign: field.align || 'center',
                            whiteSpace: 'pre-wrap',
                            width: field.width ? `${field.width * scale}px` : '100%',
                            lineHeight: field.lineHeight || 1.6,
                            letterSpacing: letterSpacing
                        }}>
                            {displayValue}
                        </div>
                    );
                }

                // ── Render Image (Signature/Stamp/Seal) ───────────────────
                if (meta.type === 'image') {
                    const imgWidth  = (field.width  || meta.defaultWidth)  * scale;
                    const imgHeight = (field.height || meta.defaultHeight) * scale;

                    if (!value) return null; // Don't render empty image zones

                    return (
                        <img
                            key={field._uid || idx}
                            src={value}
                            alt={meta.label}
                            style={{
                                ...baseStyle,
                                width: `${imgWidth}px`,
                                height: `${imgHeight}px`,
                                objectFit: 'contain'
                            }}
                        />
                    );
                }

                // ── Render QR Code ────────────────────────────────────────
                if (meta.type === 'qr') {
                    const qrSize = (field.width || meta.defaultWidth) * scale;
                    if (!value) return null;
                    return (
                        <div key={field._uid || idx} style={{ ...baseStyle, background: '#fff', padding: '4px', borderRadius: '8px' }}>
                            <QRCodeSVG value={value} size={qrSize} />
                        </div>
                    );
                }

                return null;
            })}

            {/* Dynamic Form Fields Overlay */}
            {(dataContext?.formFields || []).map((field) => {
                const isDynamic = ['signer_name', 'signer_title', 'approver_name', 'approver_title', 'signature_1', 'signature_2', 'signature_3', 'official_stamp'].includes(field.dynamicType || field.name);
                
                let value = '';
                if (isDynamic) {
                    value = resolveDynamicField(field.dynamicType || field.name, dataContext, settings);
                } else {
                    const valuesSource = dataContext?.formValues || dataContext || {};
                    value = valuesSource[field.name] ?? '';
                }

                if (!value) return null;

                const baseW = isPortrait ? 793.7 : 1122.5;
                const baseH = isPortrait ? 1122.5 : 793.7;

                const pctX = (field.x / baseW) * 100;
                const pctY = (field.y / baseH) * 100;
                const pctW = (field.width / baseW) * 100;
                const pctH = (field.height / baseH) * 100;

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
                                zIndex: 30
                            }}
                        />
                    );
                }

                // Font size scaling (base 14px, or if field height is taller we can scale slightly)
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
                            color: '#1e293b', // Sleek dark slate color for premium print look
                            fontFamily: 'Cairo, sans-serif',
                            fontSize: `${fontSize}px`,
                            fontWeight: 700,
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden',
                            zIndex: 30,
                            direction: 'rtl'
                        }}
                    >
                        {value}
                    </div>
                );
            })}
        </div>
    );
});

export default TemplateRenderer;
