/**
 * 🎨 FormRenderer.jsx
 * Interactive glassmorphic form input overlay over template background.
 * Validates, maps fields, and submits certificate with versioned snapshots.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ShieldCheck, Play, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formService, dbService, templateService } from '../services/db';
import { Button } from '../ui/components/Button';
import { logger } from '../utils/debug';

const A4_LANDSCAPE_W = 1122.5;
const A4_LANDSCAPE_H = 793.7;
const A4_PORTRAIT_W  = 793.7;
const A4_PORTRAIT_H  = 1122.5;

export default function FormRenderer({ formId, isPreview = false, onBack }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [template, setTemplate] = useState(null);
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Canvas scaling
    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(800);

    const isPortrait = form?.orientation === 'portrait';
    const baseW = isPortrait ? A4_PORTRAIT_W : A4_LANDSCAPE_W;
    const baseH = isPortrait ? A4_PORTRAIT_H : A4_LANDSCAPE_H;
    const containerHeight = containerWidth * (baseH / baseW);
    const scale = containerWidth / baseW;

    useEffect(() => {
        loadFormAndTemplate();
    }, [formId]);

    useEffect(() => {
        const measure = () => {
            const el = containerRef.current;
            if (el) setContainerWidth(el.clientWidth);
        };
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        measure();
        return () => ro.disconnect();
    }, [loading]);

    const loadFormAndTemplate = async () => {
        setLoading(true);
        try {
            const f = await formService.getById(formId);
            if (!f) {
                alert('النموذج غير موجود');
                if (onBack) onBack();
                return;
            }
            setForm(f);
            
            // Set default initial values
            const initialVals = {};
            (f.fields || []).forEach(field => {
                initialVals[field.name] = '';
            });
            setValues(initialVals);

            // Load from frozenTemplate snapshot if published, or load active template as fallback
            if (f.frozenTemplate) {
                setTemplate(f.frozenTemplate);
            } else {
                const t = await templateService.getById(f.templateId);
                setTemplate(t);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (name, val) => {
        setValues(prev => ({
            ...prev,
            [name]: val
        }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (isPreview) {
            alert('أنت في وضع المعاينة. تم التحقق من الحقول بنجاح.');
            return;
        }

        // Validate required fields
        const missingFields = (form.fields || []).filter(f => f.required && !values[f.name]);
        if (missingFields.length > 0) {
            const labels = missingFields.map(f => f.label).join('، ');
            return alert(`الرجاء إدخال الحقول الإلزامية التالية: ${labels}`);
        }

        setSubmitting(true);
        try {
            // ── Copy mapped field values to top-level certificate properties ──
            let recipientName = '';
            let event = 'معاملة نموذج الإدخال';
            let reasonText = '';
            let date = new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' });
            let serial = `2026${Date.now().toString().slice(-5)}`;
            let prefix = '';

            (form.fields || []).forEach(f => {
                const val = values[f.name];
                if (f.certificateMapping === 'recipientName') recipientName = val;
                if (f.certificateMapping === 'eventName') event = val;
                if (f.certificateMapping === 'reasonText') reasonText = val;
                if (f.certificateMapping === 'issueDate') date = val;
                if (f.certificateMapping === 'certificateNumber') serial = val;
            });

            // If no recipientName mapped, fallback to first text field
            if (!recipientName) {
                const textFields = (form.fields || []).filter(f => f.type === 'text');
                if (textFields.length > 0) recipientName = values[textFields[0].name];
            }
            if (!recipientName) recipientName = 'مستفيد نموذج';

            const payload = {
                internalTitle: `${form.name} - ${recipientName}`,
                recipientName: recipientName,
                event: event,
                reasonText: reasonText,
                date: date,
                serial: serial,
                showQR: true,
                templateId: form.templateId,
                formId: form.id,
                
                // Immutability snapshots
                formFields: form.fields,
                formValues: values,
                frozenTemplate: form.frozenTemplate || template,
                
                status: 'DRAFT',
                createdBy: user.id,
                creatorName: user.name,
                prefix: prefix,
                rawName: recipientName,

                // Audit trail
                submissionDetails: {
                    formId: form.id,
                    formVersion: form.version,
                    submittedBy: user.id,
                    submittedAt: new Date().toISOString()
                }
            };

            await dbService.create(payload);
            await formService.incrementUsage(form.id);
            alert('تم توليد الشهادة وحفظها كمسودة بنجاح.');
            navigate('/my-certificates');
        } catch (err) {
            alert('خطأ أثناء تقديم النموذج: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontWeight: 700 }}>جاري تحميل النموذج...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            
            {/* Header toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                    <ShieldCheck size={18} style={{ color: 'var(--color-success)' }} />
                    <span style={{ fontWeight: 800, fontSize: '14px' }}>{form.name}</span>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px' }}>إصدار v{form.version}</span>
                </div>
                {onBack && (
                    <button 
                        onClick={onBack}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}
                    >
                        <ArrowLeft size={14} />
                        العودة للقائمة
                    </button>
                )}
            </div>

            {/* Canvas Form Area */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                
                <div 
                    ref={containerRef}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: `${containerHeight}px`,
                        background: '#1e293b',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        border: '1.5px solid rgba(255,255,255,0.08)'
                    }}
                >
                    {/* Template Background Image */}
                    {template?.backgroundUrl && (
                        <img
                            src={template.backgroundUrl}
                            alt="Form layout template"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'fill',
                                zIndex: 0,
                                pointerEvents: 'none'
                            }}
                        />
                    )}

                    {/* Inputs Overlay */}
                    {(form.fields || []).map((field) => {
                        const inputStyle = {
                            width: '100%',
                            height: '100%',
                            background: 'rgba(255, 255, 255, 0.88)', // premium glassmorphic background
                            border: '1px solid rgba(15, 169, 88, 0.25)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: `${Math.max(11, 13 * scale)}px`,
                            fontWeight: 700,
                            color: '#0f172a',
                            outline: 'none',
                            fontFamily: 'Cairo, sans-serif',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            transition: 'all 0.15s',
                            direction: 'rtl'
                        };

                        const handleFocus = (e) => {
                            e.target.style.borderColor = 'var(--color-primary-500)';
                            e.target.style.boxShadow = '0 0 0 3px rgba(15,169,88,0.2)';
                            e.target.style.background = '#ffffff';
                        };

                        const handleBlur = (e) => {
                            e.target.style.borderColor = 'rgba(15, 169, 88, 0.25)';
                            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                            e.target.style.background = 'rgba(255, 255, 255, 0.88)';
                        };

                        const val = values[field.name] || '';

                        return (
                            <div
                                key={field.id}
                                style={{
                                    position: 'absolute',
                                    left: `${field.x * scale}px`,
                                    top: `${field.y * scale}px`,
                                    width: `${field.width * scale}px`,
                                    height: `${field.height * scale}px`,
                                    zIndex: 10
                                }}
                                title={`${field.label} ${field.required ? '*' : ''}`}
                            >
                                {/* Render appropriate input type */}
                                {field.type === 'textarea' ? (
                                    <textarea
                                        value={val}
                                        required={field.required}
                                        placeholder={`${field.label} ${field.required ? '*' : ''}`}
                                        onChange={e => handleValueChange(field.name, e.target.value)}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        style={{ ...inputStyle, resize: 'none' }}
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        value={val}
                                        required={field.required}
                                        onChange={e => handleValueChange(field.name, e.target.value)}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        style={inputStyle}
                                    >
                                        <option value="">{field.label} {field.required ? '*' : ''}</option>
                                        {(field.options || []).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : field.type === 'date' ? (
                                    <input
                                        type="date"
                                        value={val}
                                        required={field.required}
                                        onChange={e => handleValueChange(field.name, e.target.value)}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        style={inputStyle}
                                    />
                                ) : field.type === 'number' ? (
                                    <input
                                        type="number"
                                        value={val}
                                        required={field.required}
                                        placeholder={`${field.label} ${field.required ? '*' : ''}`}
                                        onChange={e => handleValueChange(field.name, e.target.value)}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        style={inputStyle}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={val}
                                        required={field.required}
                                        placeholder={`${field.label} ${field.required ? '*' : ''}`}
                                        onChange={e => handleValueChange(field.name, e.target.value)}
                                        onFocus={handleFocus}
                                        onBlur={handleBlur}
                                        style={inputStyle}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Submission button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={submitting} 
                        leftIcon={Send}
                        style={{ padding: '12px 28px' }}
                    >
                        {submitting ? 'جاري الإصدار والتوليد...' : isPreview ? 'تحقق من صحة الإدخال' : 'إصدار وتوليد الشهادة الرسمية'}
                    </Button>
                </div>
            </form>

        </div>
    );
}
