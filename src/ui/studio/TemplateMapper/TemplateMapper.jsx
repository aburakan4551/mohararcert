/**
 * 🗺️ TemplateMapper.jsx — Advanced Visual Government Template Studio
 * Enterprise architecture for precise dragging, zooming, and saving.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Save, ArrowLeft, Image as ImageIcon, Type, Plus, Layers, 
    MousePointer2, Move, ZoomIn, ZoomOut, Maximize, Eye, EyeOff, Lock, Unlock, Trash2, Copy, AlertTriangle, CheckCircle
} from 'lucide-react';
import { SUPPORTED_FIELDS, getFieldMeta } from '../../../engine/FieldEngine/FieldEngine';
import { Card, CardHeader, CardContent } from '../../cards/Card';
import { Button } from '../../components/Button';

// Utility for deep cloning
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

export default function TemplateMapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const workspaceRef = useRef(null);
    const canvasRef = useRef(null);

    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [zoom, setZoom] = useState(1);
    
    // Save State
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(Date.now());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Pointer Interaction State (separated Click from Drag)
    const [isDragging, setIsDragging] = useState(false);
    const dragData = useRef({
        active: false,
        fieldUid: null,
        startX: 0,
        startY: 0,
        initialFieldX: 0,
        initialFieldY: 0,
        moved: false
    });

    useEffect(() => {
        loadTemplate();
    }, [id]);

    const loadTemplate = () => {
        const stored = localStorage.getItem('official_templates');
        if (stored) {
            const parsed = JSON.parse(stored);
            const found = parsed.find(t => t.id === id);
            if (found) {
                setTemplate(found);
                const loadedFields = (found.fields || []).map(f => ({
                    ...f,
                    _uid: f._uid || `uid_${Math.random().toString(36).substr(2, 9)}`,
                    hidden: f.hidden || false,
                    locked: f.locked || false,
                    lineHeight: f.lineHeight || 1.6,
                    letterSpacing: f.letterSpacing || 0
                }));
                setFields(loadedFields);
                setHasUnsavedChanges(false);
            } else {
                navigate('/studio');
            }
        }
    };

    const handleSave = async (showToast = true) => {
        setIsSaving(true);
        try {
            const stored = localStorage.getItem('official_templates');
            if (stored) {
                let parsed = JSON.parse(stored);
                parsed = parsed.map(t => {
                    if (t.id === id) {
                        return { 
                            ...t, 
                            backgroundUrl: template.backgroundUrl,
                            fields: deepClone(fields) 
                        };
                    }
                    return t;
                });
                localStorage.setItem('official_templates', JSON.stringify(parsed));
                
                // Persistence Verification
                const verification = JSON.parse(localStorage.getItem('official_templates'));
                const savedTemplate = verification.find(t => t.id === id);
                
                if (savedTemplate && savedTemplate.fields.length === fields.length) {
                    setHasUnsavedChanges(false);
                    setLastSaved(Date.now());
                    if (showToast) alert('تم الحفظ بنجاح وتأكيد تخزين البيانات.');
                } else {
                    throw new Error("Persistence verification failed.");
                }
            }
        } catch (e) {
            console.error(e);
            alert('فشل الحفظ: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const timer = setTimeout(() => {
            handleSave(false);
        }, 15000); // Auto save every 15s if dirty
        return () => clearTimeout(timer);
    }, [fields, template, hasUnsavedChanges]);

    const markDirty = (newFields) => {
        setFields(newFields);
        setHasUnsavedChanges(true);
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTemplate(p => ({ ...p, backgroundUrl: ev.target.result }));
                setHasUnsavedChanges(true);
            };
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
            lineHeight: 1.6,
            letterSpacing: 0,
            hidden: false,
            locked: false
        };
        
        // Add to top of list (newest first)
        const updated = [newField, ...fields];
        markDirty(updated);
        setSelectedId(newField._uid);
    };

    const updateField = (uid, changes) => {
        const updated = fields.map(f => f._uid === uid ? { ...f, ...changes } : f);
        markDirty(updated);
    };

    const removeField = (uid) => {
        const updated = fields.filter(f => f._uid !== uid);
        markDirty(updated);
        if (selectedId === uid) setSelectedId(null);
    };

    const duplicateField = (uid) => {
        const field = fields.find(f => f._uid === uid);
        if (!field) return;
        const newField = { ...deepClone(field), _uid: `uid_${Math.random().toString(36).substr(2, 9)}`, x: field.x + 2, y: field.y + 2 };
        const updated = [newField, ...fields];
        markDirty(updated);
        setSelectedId(newField._uid);
    };

    // --- INTERACTION ARCHITECTURE --- //
    const handlePointerDown = (e, field) => {
        if (field.locked) return;
        // Don't stop propagation immediately so we can select, but we manage drag state manually
        e.preventDefault(); 
        
        // Instant Selection
        setSelectedId(field._uid);

        dragData.current = {
            active: true,
            fieldUid: field._uid,
            startX: e.clientX,
            startY: e.clientY,
            initialFieldX: field.x,
            initialFieldY: field.y,
            moved: false
        };
    };

    const handleGlobalPointerMove = (e) => {
        if (!dragData.current.active) return;

        const dx = e.clientX - dragData.current.startX;
        const dy = e.clientY - dragData.current.startY;

        // Drag Threshold
        if (!dragData.current.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) {
            return;
        }

        if (!dragData.current.moved) {
            dragData.current.moved = true;
            setIsDragging(true);
        }

        const rect = canvasRef.current.getBoundingClientRect();
        // Convert pixel delta to percentage
        const xPctDelta = (dx / rect.width) * 100;
        const yPctDelta = (dy / rect.height) * 100;

        const snap = 0.5; // 0.5% grid snapping
        const newX = Math.round((dragData.current.initialFieldX + xPctDelta) / snap) * snap;
        const newY = Math.round((dragData.current.initialFieldY + yPctDelta) / snap) * snap;

        // Optimistic state update without full react cycle for performance if needed, 
        // but react handles this well if it's localized.
        updateField(dragData.current.fieldUid, { x: newX, y: newY });
    };

    const handleGlobalPointerUp = () => {
        if (dragData.current.active) {
            dragData.current.active = false;
            setIsDragging(false);
        }
    };

    useEffect(() => {
        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
        };
    }, [fields]); // Bind fresh fields for updates

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{template.name}</h2>
                            {hasUnsavedChanges ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-warning)', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '4px' }}><AlertTriangle size={12}/> مسودة غير محفوظة</span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px' }}><CheckCircle size={12}/> محفوظ</span>
                            )}
                        </div>
                        <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-primary-600)', fontWeight: 700 }}>Enterprise Template Studio</span>
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
                            <ImageIcon size={16} /> تغيير الخلفية
                        </div>
                    </label>
                    <Button variant="primary" onClick={() => handleSave(true)} disabled={isSaving} leftIcon={Save}>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</Button>
                </div>
            </div>

            {/* ─── MAIN WORKSPACE ─── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* 👈 LEFT PANEL: LAYERS & TOOLS */}
                <div style={{ width: '280px', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
                        <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> إضافة حقل جديد</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {SUPPORTED_FIELDS.map(f => (
                                <button key={f.id} onClick={() => addField(f.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', transition: 'all 0.1s' }}>
                                    {f.label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 2 }}>
                            <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}><Layers size={16} /> الطبقات (Layers)</h3>
                        </div>
                        {/* Newest first rendering (flex-direction: column naturally, fields are unshifted) */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {fields.map((f, idx) => {
                                const meta = getFieldMeta(f.fieldId);
                                const isSelected = selectedId === f._uid;
                                return (
                                    <div key={f._uid} onClick={() => setSelectedId(f._uid)} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: isSelected ? 'var(--color-primary-600)' : 'var(--bg-muted)', color: isSelected ? '#fff' : 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', gap: '8px', border: isSelected ? '1px solid var(--color-primary-600)' : '1px solid transparent', boxShadow: isSelected ? '0 4px 12px rgba(14, 165, 233, 0.2)' : 'none', transition: 'all 0.1s' }}>
                                        <div style={{ flex: 1, fontSize: 'var(--text-micro)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta?.label || f.fieldId}</div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { hidden: !f.hidden }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: f.hidden ? 0.4 : 0.8 }}><Eye size={14} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { locked: !f.locked }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: f.locked ? 0.8 : 0.4 }}>{f.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {fields.length === 0 && <div style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>مساحة العمل فارغة.</div>}
                        </div>
                    </div>
                </div>

                {/* 🎛️ CENTER PANEL: CANVAS */}
                <div ref={workspaceRef} style={{ flex: 1, background: '#1e1e1e', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} onClick={(e) => { if (e.target === workspaceRef.current || e.target.parentElement === workspaceRef.current) setSelectedId(null) }}>
                    <div 
                        ref={canvasRef}
                        style={{
                            width: '1122.5px', // Base A4 width at 96dpi (Landscape)
                            height: '793.7px',
                            background: template.backgroundUrl ? `url(${template.backgroundUrl}) center/contain no-repeat` : '#ffffff',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: isDragging ? 'none' : 'transform 0.1s ease',
                            overflow: 'hidden'
                        }}
                    >
                        {!template.backgroundUrl && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-disabled)', fontWeight: 800, fontSize: '24px' }}>No Background Provided</div>}

                        {/* Reverse fields for rendering so top layer (first in array) renders last (highest z-index implicitly) */}
                        {[...fields].reverse().map((f, reverseIdx) => {
                            if (f.hidden) return null;
                            const meta = getFieldMeta(f.fieldId);
                            const isSelected = selectedId === f._uid;
                            // Real zIndex calculation: fields array is newest first (0 = top). Reversed array makes newest last.
                            const zIndex = 10 + reverseIdx;
                            
                            return (
                                <div
                                    key={f._uid}
                                    onPointerDown={(e) => handlePointerDown(e, f)}
                                    style={{
                                        position: 'absolute',
                                        left: `${f.x}%`,
                                        top: `${f.y}%`,
                                        transform: `translate(-50%, -50%) rotate(${f.rotation || 0}deg)`,
                                        zIndex: zIndex,
                                        opacity: f.opacity || 1,
                                        cursor: f.locked ? 'default' : (isDragging && isSelected ? 'grabbing' : 'grab'),
                                        border: isSelected ? '2px solid #0EA5E9' : '1px dashed rgba(0,0,0,0.1)',
                                        padding: meta?.type === 'text' || meta?.type === 'textarea' ? '0' : '4px',
                                        color: f.color || '#000',
                                        fontFamily: f.fontFamily || 'Cairo',
                                        fontSize: `${f.fontSize}px`,
                                        textAlign: f.align || 'center',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: f.lineHeight || 1.6,
                                        letterSpacing: `${f.letterSpacing || 0}px`,
                                        width: f.width ? `${f.width}px` : '100%',
                                        userSelect: 'none'
                                    }}
                                >
                                    {meta?.type === 'text' || meta?.type === 'textarea' ? (
                                        <span style={{ fontWeight: f.fontWeight || meta.defaultWeight || 'bold' }}>[{meta.label}]</span>
                                    ) : (
                                        <div style={{ width: '100%', height: `${f.height}px`, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '12px' }}>
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
                    
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {selectedField ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px' }}>
                                
                                {/* 📐 Geometry Group */}
                                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                    <h4 style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '12px' }}>الأبعاد والموقع (Geometry)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>X (%)
                                            <input type="number" step="0.5" value={selectedField.x} onChange={e => updateField(selectedId, { x: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>Y (%)
                                            <input type="number" step="0.5" value={selectedField.y} onChange={e => updateField(selectedId, { y: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>العرض (px)
                                            <input type="number" step="10" value={selectedField.width || 0} onChange={e => updateField(selectedId, { width: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>الارتفاع (px)
                                            <input type="number" step="10" value={selectedField.height || 0} onChange={e => updateField(selectedId, { height: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                    </div>
                                </div>

                                {/* 🖋️ Typography Group */}
                                {(getFieldMeta(selectedField.fieldId)?.type === 'text' || getFieldMeta(selectedField.fieldId)?.type === 'textarea') && (
                                    <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)', marginTop: '10px' }}>
                                        <h4 style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '12px' }}>النصوص (Typography)</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>حجم الخط (px)
                                                <input type="number" value={selectedField.fontSize} onChange={e => updateField(selectedId, { fontSize: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                            </label>
                                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>اللون
                                                <input type="color" value={selectedField.color} onChange={e => updateField(selectedId, { color: e.target.value })} style={{ width: '100%', height: '30px', border: '1px solid var(--border-default)', borderRadius: '4px', marginTop: '4px', cursor: 'pointer', padding: '0' }} disabled={selectedField.locked} />
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '8px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>نوع الخط
                                                <select value={selectedField.fontFamily} onChange={e => updateField(selectedId, { fontFamily: e.target.value })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked}>
                                                    <option value="Cairo">Cairo (عصري)</option>
                                                    <option value="Amiri">Amiri (كلاسيكي رسمي)</option>
                                                    <option value="Tajawal">Tajawal</option>
                                                </select>
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>ارتفاع السطر
                                                <input type="number" step="0.1" value={selectedField.lineHeight || 1.6} onChange={e => updateField(selectedId, { lineHeight: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                            </label>
                                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>تباعد الأحرف
                                                <input type="number" step="1" value={selectedField.letterSpacing || 0} onChange={e => updateField(selectedId, { letterSpacing: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* 🎨 Appearance Group */}
                                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)', marginTop: '10px' }}>
                                    <h4 style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '12px' }}>المظهر (Appearance)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>الشفافية (0-1)
                                            <input type="number" step="0.1" min="0" max="1" value={selectedField.opacity} onChange={e => updateField(selectedId, { opacity: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>التدوير (درجة)
                                            <input type="number" step="1" value={selectedField.rotation || 0} onChange={e => updateField(selectedId, { rotation: Number(e.target.value) })} style={{ width: '100%', padding: '6px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                    </div>
                                </div>

                                {/* ⚡ Actions Group */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                    <Button variant="outline" size="sm" onClick={() => duplicateField(selectedId)} leftIcon={Copy} style={{ flex: 1, fontSize: '11px' }}>تكرار</Button>
                                    <Button variant="outline" size="sm" onClick={() => removeField(selectedId)} leftIcon={Trash2} style={{ flex: 1, fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}>حذف</Button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', textAlign: 'center', gap: '8px', padding: '24px' }}>
                                <MousePointer2 size={32} style={{ opacity: 0.5 }} />
                                <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>حدد أي عنصر من مساحة العمل لتعديل خصائصه بدقة.</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
