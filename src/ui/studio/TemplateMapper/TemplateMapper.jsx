/**
 * 🗺️ TemplateMapper.jsx — Advanced Visual Certificate Template Builder (SUPER_ADMIN)
 * A Figma-like editor to map dynamic variables and add static shapes/images to an official template.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Save, ArrowLeft, Image as ImageIcon, Type, Plus, Layers, 
    MousePointer2, Move, ZoomIn, ZoomOut, Maximize, Eye, EyeOff, Lock, Unlock, Trash2, Copy
} from 'lucide-react';
import { SUPPORTED_FIELDS, getFieldMeta } from '../../../engine/FieldEngine/FieldEngine';
import { Card, CardHeader, CardContent } from '../../cards/Card';
import { Button } from '../../components/Button';

// A4 Ratio
const A4_ASPECT = 297 / 210;

export default function TemplateMapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const workspaceRef = useRef(null);
    const canvasRef = useRef(null);

    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [zoom, setZoom] = useState(1);
    
    // Drag State
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const stored = localStorage.getItem('official_templates');
        if (stored) {
            const parsed = JSON.parse(stored);
            const found = parsed.find(t => t.id === id);
            if (found) {
                setTemplate(found);
                // Ensure all fields have a unique id for the builder
                setFields((found.fields || []).map(f => ({ ...f, _uid: f._uid || `uid_${Math.random().toString(36).substr(2, 9)}`, hidden: false, locked: false })));
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
                if (t.id === id) return { ...t, fields };
                return t;
            });
            localStorage.setItem('official_templates', JSON.stringify(updated));
            alert('تم حفظ القالب بنجاح.');
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

        const newField = {
            _uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
            fieldId,
            x: 50, y: 50,
            fontSize: meta.defaultFontSize || 24,
            color: meta.defaultColor || '#000000',
            fontFamily: meta.defaultFontFamily || 'Cairo',
            align: 'center',
            width: meta.defaultWidth || 20,
            height: meta.defaultHeight || 10,
            opacity: 1,
            rotation: 0,
            hidden: false,
            locked: false
        };
        
        setFields(p => [...p, newField]);
        setSelectedId(newField._uid);
    };

    const updateField = (uid, changes) => {
        setFields(p => p.map(f => f._uid === uid ? { ...f, ...changes } : f));
    };

    const removeField = (uid) => {
        setFields(p => p.filter(f => f._uid !== uid));
        if (selectedId === uid) setSelectedId(null);
    };

    const duplicateField = (uid) => {
        const field = fields.find(f => f._uid === uid);
        if (!field) return;
        const newField = { ...field, _uid: `uid_${Math.random().toString(36).substr(2, 9)}`, x: field.x + 2, y: field.y + 2 };
        setFields(p => [...p, newField]);
        setSelectedId(newField._uid);
    };

    const moveLayer = (index, direction) => {
        if (index + direction < 0 || index + direction >= fields.length) return;
        const newFields = [...fields];
        const temp = newFields[index];
        newFields[index] = newFields[index + direction];
        newFields[index + direction] = temp;
        setFields(newFields);
    };

    // Mouse Dragging Logic
    const handlePointerDown = (e, field) => {
        if (field.locked) return;
        e.stopPropagation();
        setSelectedId(field._uid);
        setIsDragging(true);

        const rect = canvasRef.current.getBoundingClientRect();
        // Calculate offset from center of element
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        setDragOffset({
            x: xPct - field.x,
            y: yPct - field.y
        });
    };

    const handlePointerMove = (e) => {
        if (!isDragging || !selectedId) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;

        // Snap to grid (e.g. 1%)
        const snap = 0.5;
        const rawX = xPct - dragOffset.x;
        const rawY = yPct - dragOffset.y;

        updateField(selectedId, {
            x: Math.round(rawX / snap) * snap,
            y: Math.round(rawY / snap) * snap
        });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        } else {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, selectedId, dragOffset]);


    if (!template) return <div>جاري التحميل...</div>;

    const selectedField = fields.find(f => f._uid === selectedId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>
            {/* ─── TOP NAVBAR ─── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '12px 24px', borderBottom: '1px solid var(--border-default)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/studio')} style={{ background: 'var(--bg-muted)', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '8px', borderRadius: '8px' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{template.name}</h2>
                        <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-primary-600)', fontWeight: 700 }}>Advanced Visual Builder</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-muted)', padding: '4px', borderRadius: '8px' }}>
                    <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomOut size={16} /></button>
                    <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomIn size={16} /></button>
                    <button onClick={() => setZoom(1)} style={{ padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><Maximize size={16} /></button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ cursor: 'pointer' }}>
                        <input type="file" accept="image/png, image/jpeg, image/pdf" style={{ display: 'none' }} onChange={handleBackgroundUpload} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <ImageIcon size={16} /> تغيير القالب الأساسي
                        </div>
                    </label>
                    <Button variant="primary" onClick={handleSave} leftIcon={Save}>حفظ التغييرات</Button>
                </div>
            </div>

            {/* ─── MAIN WORKSPACE ─── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* 👈 LEFT PANEL: LAYERS & TOOLS */}
                <div style={{ width: '280px', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)' }}>
                        <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> إضافة حقل جديد</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {SUPPORTED_FIELDS.map(f => (
                                <button key={f.id} onClick={() => addField(f.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer', textAlign: 'right', fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-primary)', transition: 'all 0.1s' }}>
                                    <Type size={14} style={{ color: 'var(--color-primary-600)' }} /> {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                        <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={16} /> الطبقات (Layers)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '4px' }}>
                            {fields.map((f, idx) => {
                                const meta = getFieldMeta(f.fieldId);
                                const isSelected = selectedId === f._uid;
                                return (
                                    <div key={f._uid} onClick={() => setSelectedId(f._uid)} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: isSelected ? 'var(--color-primary-600)' : 'var(--bg-muted)', color: isSelected ? '#fff' : 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer', gap: '8px' }}>
                                        <div style={{ flex: 1, fontSize: 'var(--text-micro)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta?.label || f.fieldId}</div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { hidden: !f.hidden }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}><Eye size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { locked: !f.locked }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.7 }}>{f.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {fields.length === 0 && <div style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>لا يوجد طبقات مضافة.</div>}
                        </div>
                    </div>
                </div>

                {/* 🎛️ CENTER PANEL: CANVAS */}
                <div ref={workspaceRef} style={{ flex: 1, background: '#1e1e1e', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} onClick={() => setSelectedId(null)}>
                    <div 
                        ref={canvasRef}
                        style={{
                            width: '1122.5px', // Base A4 width at 96dpi (Landscape)
                            height: '793.7px',
                            background: template.backgroundUrl ? `url(${template.backgroundUrl}) center/contain no-repeat` : '#ffffff',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: isDragging ? 'none' : 'transform 0.1s ease',
                            overflow: 'hidden'
                        }}
                    >
                        {!template.backgroundUrl && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-disabled)', fontWeight: 800, fontSize: '24px' }}>No Background Provided</div>}

                        {fields.map((f, idx) => {
                            if (f.hidden) return null;
                            const meta = getFieldMeta(f.fieldId);
                            const isSelected = selectedId === f._uid;
                            
                            return (
                                <div
                                    key={f._uid}
                                    onPointerDown={(e) => handlePointerDown(e, f)}
                                    style={{
                                        position: 'absolute',
                                        left: `${f.x}%`,
                                        top: `${f.y}%`,
                                        transform: `translate(-50%, -50%) rotate(${f.rotation || 0}deg)`,
                                        zIndex: 10 + idx,
                                        opacity: f.opacity || 1,
                                        cursor: f.locked ? 'default' : (isDragging && isSelected ? 'grabbing' : 'grab'),
                                        border: isSelected ? '2px solid #0EA5E9' : '1px dashed rgba(0,0,0,0.1)',
                                        padding: meta?.type === 'text' ? '0' : '4px',
                                        color: f.color || '#000',
                                        fontFamily: f.fontFamily || 'Cairo',
                                        fontSize: `${f.fontSize}px`,
                                        textAlign: f.align || 'center',
                                        whiteSpace: 'nowrap',
                                        userSelect: 'none'
                                    }}
                                >
                                    {meta?.type === 'text' ? (
                                        <span style={{ fontWeight: 700 }}>[{meta.label}]</span>
                                    ) : (
                                        <div style={{ width: `${f.width}px`, height: `${f.height}px`, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '12px' }}>
                                            {meta?.label}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 👉 RIGHT PANEL: PROPERTIES INSPECTOR */}
                <div style={{ width: '320px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)' }}>
                        <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800 }}>خصائص العنصر (Properties)</h3>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                        {selectedField ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Position & Size */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)' }}>X (%)
                                        <input type="number" step="0.5" value={selectedField.x} onChange={e => updateField(selectedId, { x: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                    </label>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)' }}>Y (%)
                                        <input type="number" step="0.5" value={selectedField.y} onChange={e => updateField(selectedId, { y: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                    </label>
                                </div>

                                {/* Typography */}
                                {getFieldMeta(selectedField.fieldId)?.type === 'text' && (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)' }}>حجم الخط (px)
                                                <input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedId, { fontSize: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                            </label>
                                            <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)' }}>لون النص
                                                <input type="color" value={selectedField.color} onChange={e => updateField(selectedId, { color: e.target.value })} style={{ width: '100%', height: '30px', border: 'none', marginTop: '4px', cursor: 'pointer' }} disabled={selectedField.locked} />
                                            </label>
                                        </div>
                                        <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)' }}>نوع الخط
                                            <select value={selectedField.fontFamily} onChange={e => updateField(selectedId, { fontFamily: e.target.value })} style={{ width: '100%', padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked}>
                                                <option value="Cairo">Cairo (عصري)</option>
                                                <option value="Amiri">Amiri (كلاسيكي رسمي)</option>
                                                <option value="Tajawal">Tajawal</option>
                                            </select>
                                        </label>
                                    </>
                                )}

                                {/* Opacity & Rotation */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)' }}>الشفافية (0-1)
                                        <input type="number" step="0.1" min="0" max="1" value={selectedField.opacity} onChange={e => updateField(selectedId, { opacity: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                    </label>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-secondary)' }}>التدوير (درجة)
                                        <input type="number" step="1" value={selectedField.rotation} onChange={e => updateField(selectedId, { rotation: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                    </label>
                                </div>

                                <div style={{ borderTop: '1px solid var(--border-default)', margin: '16px 0' }} />
                                
                                {/* Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <Button variant="outline" size="sm" onClick={() => duplicateField(selectedId)} leftIcon={Copy}>تكرار العنصر</Button>
                                    <Button variant="outline" size="sm" onClick={() => removeField(selectedId)} leftIcon={Trash2} style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}>حذف العنصر</Button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', textAlign: 'center', gap: '8px' }}>
                                <MousePointer2 size={32} style={{ opacity: 0.5 }} />
                                <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>قم بتحديد أي عنصر من مساحة العمل لتعديل خصائصه</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
