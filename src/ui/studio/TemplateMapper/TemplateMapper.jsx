/**
 * 🗺️ TemplateMapper.jsx
 * Field Mapping Mode: SUPER_ADMIN interface to place Dynamic Fields over a template background.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Image as ImageIcon, Type, Plus } from 'lucide-react';
import { SUPPORTED_FIELDS, getFieldMeta } from '../../../engine/FieldEngine/FieldEngine';
import { Card, CardHeader, CardContent } from '../../cards/Card';
import { Button } from '../../components/Button';
import PageHeader from '../../layouts/PageHeader';

export default function TemplateMapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef(null);

    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [selectedFieldIdx, setSelectedFieldIdx] = useState(null);

    useEffect(() => {
        // Load template
        const stored = localStorage.getItem('official_templates');
        if (stored) {
            const parsed = JSON.parse(stored);
            const found = parsed.find(t => t.id === id);
            if (found) {
                setTemplate(found);
                setFields(found.fields || []);
            } else {
                navigate('/studio');
            }
        }
    }, [id, navigate]);

    const handleSave = () => {
        const stored = localStorage.getItem('official_templates');
        if (stored) {
            const parsed = JSON.parse(stored);
            const updated = parsed.map(t => {
                if (t.id === id) {
                    return { ...t, fields };
                }
                return t;
            });
            localStorage.setItem('official_templates', JSON.stringify(updated));
            alert('تم حفظ إعدادات القالب بنجاح.');
            navigate('/studio');
        }
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setTemplate(p => ({ ...p, backgroundUrl: ev.target.result }));
            reader.readAsDataURL(file);
        }
    };

    const addField = (fieldId) => {
        const meta = getFieldMeta(fieldId);
        if (!meta) return;

        // Check if already added
        if (fields.some(f => f.fieldId === fieldId)) {
            alert('هذا الحقل مضاف مسبقاً.');
            return;
        }

        const newField = {
            fieldId,
            x: 50, // Center X (percentage)
            y: 50, // Center Y (percentage)
            fontSize: meta.defaultFontSize || 24,
            color: meta.defaultColor || '#000000',
            fontFamily: meta.defaultFontFamily || 'Cairo',
            align: 'center',
            width: meta.defaultWidth || null,
            height: meta.defaultHeight || null
        };
        
        setFields(p => [...p, newField]);
        setSelectedFieldIdx(fields.length);
    };

    const removeField = (idx) => {
        setFields(p => p.filter((_, i) => i !== idx));
        setSelectedFieldIdx(null);
    };

    const updateField = (idx, changes) => {
        setFields(p => p.map((f, i) => i === idx ? { ...f, ...changes } : f));
    };

    const handleCanvasClick = (e) => {
        // Simple positioning logic (click to place selected field)
        if (selectedFieldIdx === null) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        updateField(selectedFieldIdx, { x: xPct, y: yPct });
    };

    if (!template) return <div>جاري التحميل...</div>;

    const A4_ASPECT = 297 / 210;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '16px 24px', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => navigate('/studio')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-title)', fontWeight: 800, color: 'var(--text-primary)' }}>مصمم القوالب (Field Mapping Mode)</h2>
                        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>{template.name}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ cursor: 'pointer' }}>
                        <input type="file" accept="image/png, image/jpeg, image/svg+xml" style={{ display: 'none' }} onChange={handleBackgroundUpload} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <ImageIcon size={16} /> تغيير خلفية القالب
                        </div>
                    </label>
                    <Button variant="primary" onClick={handleSave} leftIcon={Save}>
                        حفظ القالب الرسمي
                    </Button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flex: 1, padding: '0 24px 24px', overflow: 'hidden' }}>
                {/* Tools Panel */}
                <Card style={{ width: '300px', flexShrink: 0, overflowY: 'auto' }}>
                    <CardHeader>
                        <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800 }}>الحقول المتاحة (Variables)</h3>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                        {SUPPORTED_FIELDS.map(f => {
                            const isAdded = fields.some(field => field.fieldId === f.id);
                            return (
                                <button
                                    key={f.id}
                                    disabled={isAdded}
                                    onClick={() => addField(f.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', background: isAdded ? 'var(--bg-muted)' : 'var(--bg-surface)',
                                        border: `1px solid ${isAdded ? 'transparent' : 'var(--border-strong)'}`,
                                        borderRadius: 'var(--radius-sm)', cursor: isAdded ? 'not-allowed' : 'pointer',
                                        opacity: isAdded ? 0.5 : 1
                                    }}
                                >
                                    <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--text-primary)' }}>{f.label}</span>
                                    {!isAdded && <Plus size={14} style={{ color: 'var(--color-primary-600)' }} />}
                                </button>
                            );
                        })}

                        {selectedFieldIdx !== null && fields[selectedFieldIdx] && (
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px dashed var(--border-strong)' }}>
                                <h4 style={{ fontSize: 'var(--text-label)', fontWeight: 800, marginBottom: '12px' }}>خصائص الحقل المحدد</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        حجم الخط (px)
                                        <input type="number" value={fields[selectedFieldIdx].fontSize || 24} onChange={e => updateField(selectedFieldIdx, { fontSize: Number(e.target.value) })} style={{ padding: '6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                                    </label>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        اللون
                                        <input type="color" value={fields[selectedFieldIdx].color || '#000000'} onChange={e => updateField(selectedFieldIdx, { color: e.target.value })} style={{ width: '100%', height: '32px', border: '1px solid var(--border-default)', borderRadius: '4px', cursor: 'pointer' }} />
                                    </label>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        نوع الخط
                                        <select value={fields[selectedFieldIdx].fontFamily || 'Cairo'} onChange={e => updateField(selectedFieldIdx, { fontFamily: e.target.value })} style={{ padding: '6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                            <option value="Cairo">Cairo</option>
                                            <option value="Amiri">Amiri (رسمي)</option>
                                            <option value="Tajawal">Tajawal</option>
                                        </select>
                                    </label>
                                    <Button variant="outline" size="sm" onClick={() => removeField(selectedFieldIdx)} style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)', marginTop: '8px' }}>حذف الحقل</Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Live Mapper Canvas */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div 
                        ref={containerRef}
                        onClick={handleCanvasClick}
                        style={{
                            width: '100%', maxWidth: '800px',
                            aspectRatio: `${A4_ASPECT}`,
                            background: template.backgroundUrl ? `url(${template.backgroundUrl}) center/contain no-repeat` : '#ffffff',
                            position: 'relative',
                            boxShadow: 'var(--shadow-floating)',
                            cursor: 'crosshair',
                            border: '1px solid var(--border-default)'
                        }}
                    >
                        {!template.backgroundUrl && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-disabled)', fontWeight: 800 }}>الرجاء رفع خلفية القالب (A4 Landscape)</div>}

                        {fields.map((f, idx) => {
                            const meta = getFieldMeta(f.fieldId);
                            const isSelected = idx === selectedFieldIdx;
                            return (
                                <div
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); setSelectedFieldIdx(idx); }}
                                    style={{
                                        position: 'absolute',
                                        left: `${f.x}%`,
                                        top: `${f.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        border: `2px ${isSelected ? 'solid' : 'dashed'} ${isSelected ? 'var(--color-primary-600)' : 'rgba(0,0,0,0.2)'}`,
                                        padding: '4px 8px',
                                        background: isSelected ? 'rgba(15,169,88,0.1)' : 'rgba(255,255,255,0.4)',
                                        color: f.color || '#000',
                                        fontFamily: f.fontFamily || 'Cairo',
                                        fontSize: 'min(1.5vw, 24px)', // Responsive text for mapper
                                        textAlign: f.align || 'center',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(2px)'
                                    }}
                                >
                                    {meta?.label || f.fieldId}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
