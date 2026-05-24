/**
 * 🖼️ TemplateRenderer.jsx
 * The core engine that renders a Smart Template using predefined fields and runtime data.
 * Does NOT allow moving or editing. It simply displays the result.
 */

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getFieldMeta } from '../FieldEngine/FieldEngine';
import { useAuth } from '../../context/AuthContext';

/* A4 Paper Ratio (Landscape) */
const A4_ASPECT = 297 / 210;

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
    
    const height = width / A4_ASPECT;

    useEffect(() => {
        // Base width assumption: The fields were mapped on a canvas of width 1122.5px (A4 at 96dpi)
        const BASE_WIDTH = 1122.5;
        setScale(width / BASE_WIDTH);
    }, [width]);

    if (!template) {
        return (
            <div style={{ width, height, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                لا يوجد قالب محدد
            </div>
        );
    }

    return (
        <div
            ref={(node) => {
                containerRef.current = node;
                if (typeof ref === 'function') ref(node);
                else if (ref) ref.current = node;
            }}
            id="certificate-print-wrapper"
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
            {/* Background Image */}
            {template.backgroundUrl && (
                <img
                    src={template.backgroundUrl}
                    alt="Template Background"
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'contain',
                        zIndex: 0,
                        pointerEvents: 'none'
                    }}
                />
            )}

            {/* Dynamic Fields */}
            {(template.fields || []).map((field, idx) => {
                const meta = getFieldMeta(field.fieldId);
                if (!meta) return null;

                // Dynamic Identity Resolution
                let value = dataContext?.[field.fieldId];
                
                // Fallbacks to System Settings for official fields
                if (field.fieldId === 'manager_name') value = value || settings?.directorName;
                if (field.fieldId === 'assistant_name') value = value || settings?.visaName;
                if (field.fieldId === 'manager_signature') value = value || settings?.directorSignature;
                if (field.fieldId === 'assistant_signature') value = value || settings?.visaSignature;
                if (field.fieldId === 'official_stamp') value = value || settings?.stamp;

                // Since field.x and field.y are percentages
                const baseStyle = {
                    position: 'absolute',
                    top: `${field.y}%`,
                    left: `${field.x}%`,
                    transform: `translate(-50%, -50%) rotate(${field.rotation || 0}deg)`,
                    opacity: field.opacity || 1,
                    zIndex: 10 + (template.fields.length - 1 - idx),
                };

                // Render Text or Textarea
                if (meta.type === 'text' || meta.type === 'textarea') {
                    const fontSize = (field.fontSize || meta.defaultFontSize) * scale;
                    const letterSpacing = field.letterSpacing ? `${field.letterSpacing * scale}px` : 'normal';
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
                            {value || field.textContent || `[${meta.label}]`}
                        </div>
                    );
                }

                // Render Image (Signature/Stamp)
                if (meta.type === 'image') {
                    const imgWidth = (field.width || meta.defaultWidth) * scale;
                    const imgHeight = (field.height || meta.defaultHeight) * scale;
                    
                    if (!value) return null; // Don't show anything if no signature/stamp is provided

                    return (
                        <img
                            key={field.id || idx}
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

                // Render QR Code
                if (meta.type === 'qr') {
                    const qrSize = (field.width || meta.defaultWidth) * scale;
                    if (!value) return null; // Wait for real value
                    return (
                        <div key={field.id || idx} style={{ ...baseStyle, background: '#fff', padding: '4px', borderRadius: '8px' }}>
                            <QRCodeSVG value={value} size={qrSize} />
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
});

export default TemplateRenderer;
