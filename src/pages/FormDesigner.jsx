/**
 * 🎨 FormDesigner.jsx
 * Advanced Visual Canvas Builder for mohararcert Forms.
 * Integrates:
 *  - Auto-Save & BeforeUnload dirty checks.
 *  - Coordinate Scaling Engine (A4 aspect-ratio resolution pixels).
 *  - Multi-select canvas fields (Ctrl/Shift click).
 *  - Alignment toolbar (Align Left, Right, Top, Bottom, Equal Spacing).
 *  - Duplicate selected fields with offsets.
 *  - Template Snapshot serialization.
 *  - Versioning clone triggers.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Save, ArrowRight, Type, Plus, Eye, Sliders, CheckCircle, Trash2, 
    EyeOff, Clipboard, Layers, Sparkles, RefreshCcw, Copy, 
    AlignLeft, AlignRight, AlignVerticalSpaceAround, AlignHorizontalSpaceAround, 
    Minimize, Maximize, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formService, templateService } from '../services/db';
import { resolveDynamicField, getLayerZIndex } from '../engine/FieldEngine/FieldEngine';
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';
import FormRenderer from '../components/FormRenderer';

const A4_LANDSCAPE_W = 1122.5;
const A4_LANDSCAPE_H = 793.7;
const A4_PORTRAIT_W  = 793.7;
const A4_PORTRAIT_H  = 1122.5;

const MAPPING_OPTIONS = [
    { value: '', label: 'بدون (حقل مخصص)' },
    { value: 'recipientName', label: 'اسم صاحب المعاملة' },
    { value: 'eventName', label: 'عنوان المناسبة' },
    { value: 'reasonText', label: 'نص التكريم الرئيسي' },
    { value: 'issuerName', label: 'اسم الجهة المصدرة' },
    { value: 'certificateNumber', label: 'الرقم التسلسلي للشهادة' },
    { value: 'issueDate', label: 'التاريخ المطبوع' }
];

export default function FormDesigner() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, settings } = useAuth();

    const [form, setForm] = useState(null);
    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    
    // Multi-selection state
    const [selectedFieldIds, setSelectedFieldIds] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Canvas sizing
    const canvasContainerRef = useRef(null);
    const [canvasWidth, setCanvasWidth] = useState(800);
    
    // Drag state
    const [dragState, setDragState] = useState({
        isActive: false,
        fieldId: null,
        startX: 0,
        startY: 0,
        initialFieldsState: [],
        mode: 'drag' // 'drag' | 'resize'
    });

    const isPortrait = form?.orientation === 'portrait';
    const baseW = isPortrait ? A4_PORTRAIT_W : A4_LANDSCAPE_W;
    const baseH = isPortrait ? A4_PORTRAIT_H : A4_LANDSCAPE_H;
    const canvasHeight = canvasWidth * (baseH / baseW);
    const scale = canvasWidth / baseW;

    useEffect(() => {
        loadFormAndTemplate();
    }, [id]);

    // Measure canvas scale dynamically
    useEffect(() => {
        if (loading || previewMode) return;
        const measure = () => {
            const el = canvasContainerRef.current;
            if (el) setCanvasWidth(el.clientWidth - 32);
        };
        const ro = new ResizeObserver(measure);
        if (canvasContainerRef.current) ro.observe(canvasContainerRef.current);
        measure();
        return () => ro.disconnect();
    }, [loading, previewMode]);

    // ── AUTO SAVE ENGINE ──
    useEffect(() => {
        if (!hasUnsavedChanges || isImmutable) return;
        const timer = setTimeout(() => {
            handleSave(false);
        }, 8000); // Autosave every 8 seconds
        return () => clearTimeout(timer);
    }, [hasUnsavedChanges, fields]);

    // ── BEFORE UNLOAD WARNING ──
    useEffect(() => {
        const warn = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'لديك تغييرات غير محفوظة في لوحة النموذج. هل أنت متأكد من المغادرة؟';
            }
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [hasUnsavedChanges]);

    const loadFormAndTemplate = async () => {
        setLoading(true);
        try {
            const f = await formService.getById(id);
            if (!f) {
                alert('النموذج غير موجود.');
                navigate('/forms-builder');
                return;
            }
            setForm(f);
            setFields(f.fields || []);
            
            const t = await templateService.getById(f.templateId);
            setTemplate(t);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setHasUnsavedChanges(false);
        }
    };

    const handleSave = async (showNotification = true) => {
        if (isImmutable) return;
        setSaving(true);
        try {
            await formService.update(id, { fields });
            setHasUnsavedChanges(false);
            if (showNotification) alert('تم حفظ تصميم النموذج وحقوله بنجاح.');
        } catch (e) {
            alert('فشل حفظ التغييرات: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handlePublishToggle = async () => {
        if (fields.length === 0) {
            return alert('لا يمكن نشر نموذج فارغ بدون أي حقول إدخال.');
        }
        
        const nextStatus = form.status === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED';
        const confirmMsg = nextStatus === 'PUBLISHED' 
            ? 'هل أنت متأكد من نشر هذا النموذج؟ سيصبح متاحاً فوراً للمنشئين.' 
            : 'هل أنت متأكد من أرشفة هذا النموذج؟ لن يظهر للمستخدمين مجدداً.';
            
        if (!window.confirm(confirmMsg)) return;

        try {
            // Enforce snapshot template on publish
            const updated = await formService.update(id, { 
                status: nextStatus,
                fields,
                frozenTemplate: template // Freeze template version snapshot!
            });
            setForm(updated);
            setHasUnsavedChanges(false);
            alert(`تم تغيير حالة النموذج إلى: ${nextStatus === 'PUBLISHED' ? 'منشور' : 'مؤرشف'}.`);
        } catch (e) {
            alert('خطأ أثناء النشر: ' + e.message);
        }
    };

    const handleCreateNewVersion = async () => {
        if (hasUnsavedChanges) {
            if (!window.confirm('لديك تعديلات غير محفوظة. هل تريد المتابعة وإنشاء إصدار جديد بدون حفظها؟')) return;
        }

        try {
            const nextVersion = (form.version || 1) + 1;
            const newFormId = `${form.id.split('_v')[0]}_v${nextVersion}`;

            const cloned = await formService.create({
                id: newFormId,
                name: form.name.split(' v')[0] + ` v${nextVersion}`,
                templateId: form.templateId,
                templateName: form.templateName,
                orientation: form.orientation,
                version: nextVersion,
                fields: fields.map(f => ({ 
                    ...f, 
                    id: `fld-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` 
                }))
            });

            alert(`تم إنشاء الإصدار ${nextVersion} بنجاح كمسودة.`);
            navigate(`/forms-builder/designer/${cloned.id}`);
        } catch (e) {
            alert('فشل إنشاء نسخة جديدة: ' + e.message);
        }
    };

    // Add field
    const handleAddField = (type) => {
        if (isImmutable) return;

        const typeLabels = { text: 'حقل نصي', textarea: 'حقل نصي طويل', select: 'قائمة خيارات', date: 'تاريخ', number: 'رقم' };
        const newField = {
            id: `fld-${Date.now()}`,
            name: `field_${fields.length + 1}`,
            label: typeLabels[type] || 'حقل جديد',
            type: type,
            x: 100,
            y: 100,
            width: 200,
            height: 42,
            baseWidth: baseW,
            baseHeight: baseH,
            required: false,
            options: type === 'select' ? ['خيار ١', 'خيار ٢'] : [],
            certificateMapping: ''
        };
        setFields(prev => [...prev, newField]);
        setSelectedFieldIds([newField.id]);
        setHasUnsavedChanges(true);
    };

    const handleAddDynamicField = (type, label, fieldType, defaultWidth, defaultHeight) => {
        if (isImmutable) return;

        const newField = {
            id: `fld-${Date.now()}`,
            name: type,
            label: label,
            type: fieldType,
            dynamicType: type,
            x: Math.round(baseW / 2 - defaultWidth / 2),
            y: Math.round(baseH / 2 - defaultHeight / 2),
            width: defaultWidth,
            height: defaultHeight,
            baseWidth: baseW,
            baseHeight: baseH,
            required: false,
            options: [],
            certificateMapping: ''
        };
        setFields(prev => [...prev, newField]);
        setSelectedFieldIds([newField.id]);
        setHasUnsavedChanges(true);
    };

    const handleCanvasDrop = (e) => {
        if (isImmutable) return;
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData('application/json');
            if (!dataStr) return;
            const dragData = JSON.parse(dataStr);
            
            const rect = e.currentTarget.getBoundingClientRect();
            const dropX = (e.clientX - rect.left) / scale;
            const dropY = (e.clientY - rect.top) / scale;
            
            if (dragData.isDynamic) {
                const w = dragData.w || 150;
                const h = dragData.h || 40;
                const newField = {
                    id: `fld-${Date.now()}`,
                    name: dragData.type,
                    label: dragData.label,
                    type: dragData.fieldType,
                    dynamicType: dragData.type,
                    x: Math.round(Math.max(0, Math.min(baseW - w, dropX - w / 2))),
                    y: Math.round(Math.max(0, Math.min(baseH - h, dropY - h / 2))),
                    width: w,
                    height: h,
                    baseWidth: baseW,
                    baseHeight: baseH,
                    required: false,
                    options: [],
                    certificateMapping: ''
                };
                setFields(prev => [...prev, newField]);
                setSelectedFieldIds([newField.id]);
                setHasUnsavedChanges(true);
            } else {
                const w = 200;
                const h = 42;
                const typeLabels = { text: 'حقل نصي', textarea: 'حقل نصي طويل', select: 'قائمة خيارات', date: 'تاريخ', number: 'رقم' };
                const newField = {
                    id: `fld-${Date.now()}`,
                    name: `field_${fields.length + 1}`,
                    label: typeLabels[dragData.type] || 'حقل جديد',
                    type: dragData.type,
                    x: Math.round(Math.max(0, Math.min(baseW - w, dropX - w / 2))),
                    y: Math.round(Math.max(0, Math.min(baseH - h, dropY - h / 2))),
                    width: w,
                    height: h,
                    baseWidth: baseW,
                    baseHeight: baseH,
                    required: false,
                    options: dragData.type === 'select' ? ['خيار ١', 'خيار ٢'] : [],
                    certificateMapping: ''
                };
                setFields(prev => [...prev, newField]);
                setSelectedFieldIds([newField.id]);
                setHasUnsavedChanges(true);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    // Delete fields
    const handleDeleteFields = () => {
        if (isImmutable || selectedFieldIds.length === 0) return;
        if (!window.confirm(`هل أنت متأكد من حذف الحقول المحددة (${selectedFieldIds.length})؟`)) return;

        setFields(prev => prev.filter(f => !selectedFieldIds.includes(f.id)));
        setSelectedFieldIds([]);
        setHasUnsavedChanges(true);
    };

    // Canvas mouse events
    const handleCanvasMouseDown = (e, field, mode = 'drag') => {
        if (isImmutable || previewMode) return;
        e.stopPropagation();
        e.preventDefault();

        // Multi-select toggle via Shift/Ctrl key
        if (e.shiftKey || e.ctrlKey) {
            setSelectedFieldIds(prev => {
                if (prev.includes(field.id)) {
                    return prev.filter(id => id !== field.id);
                } else {
                    return [...prev, field.id];
                }
            });
        } else {
            if (!selectedFieldIds.includes(field.id)) {
                setSelectedFieldIds([field.id]);
            }
        }

        setDragState({
            isActive: true,
            fieldId: field.id,
            startX: e.clientX,
            startY: e.clientY,
            initialFieldsState: fields.map(f => ({ ...f })),
            mode: mode
        });
    };

    const handleCanvasMouseMove = (e) => {
        if (!dragState.isActive) return;

        const deltaX = (e.clientX - dragState.startX) / scale;
        const deltaY = (e.clientY - dragState.startY) / scale;

        const updated = fields.map(f => {
            const initial = dragState.initialFieldsState.find(initF => initF.id === f.id);
            if (!initial) return f;

            // Resize mode (only apply to the direct handle target)
            if (dragState.mode === 'resize' && f.id === dragState.fieldId) {
                const nextW = Math.max(80, Math.min(baseW - f.x, initial.width + deltaX));
                const nextH = Math.max(30, Math.min(baseH - f.y, initial.height + deltaY));
                return { ...f, width: Math.round(nextW), height: Math.round(nextH) };
            }

            // Drag mode (apply offset to all selected fields)
            if (dragState.mode === 'drag' && selectedFieldIds.includes(f.id)) {
                const nextX = Math.max(0, Math.min(baseW - f.width, initial.x + deltaX));
                const nextY = Math.max(0, Math.min(baseH - f.height, initial.y + deltaY));
                return { ...f, x: Math.round(nextX), y: Math.round(nextY) };
            }

            return f;
        });

        setFields(updated);
        setHasUnsavedChanges(true);
    };

    const handleCanvasMouseUp = () => {
        if (dragState.isActive) {
            setDragState(p => ({ ...p, isActive: false }));
        }
    };

    const handleFieldPropertyChange = (fieldId, prop, val) => {
        if (isImmutable) return;
        
        const updated = fields.map(f => {
            if (f.id === fieldId) {
                let cleanVal = val;
                if (prop === 'name') cleanVal = val.replace(/[^a-zA-Z0-9_]/g, '');
                return { ...f, [prop]: cleanVal };
            }
            return f;
        });
        setFields(updated);
        setHasUnsavedChanges(true);
    };

    const handleOptionsChange = (fieldId, val) => {
        if (isImmutable) return;
        const opts = val.split(',').map(o => o.trim());
        const updated = fields.map(f => {
            if (f.id === fieldId) {
                return { ...f, options: opts };
            }
            return f;
        });
        setFields(updated);
        setHasUnsavedChanges(true);
    };

    // ── BULK ALIGNMENT OPERATIONS ──
    const handleAlign = (alignment) => {
        if (selectedFieldIds.length <= 1 || isImmutable) return;

        const selectedFields = fields.filter(f => selectedFieldIds.includes(f.id));
        
        let targetVal = 0;
        
        if (alignment === 'left') {
            targetVal = Math.min(...selectedFields.map(f => f.x));
        } else if (alignment === 'right') {
            targetVal = Math.max(...selectedFields.map(f => f.x + f.width));
        } else if (alignment === 'top') {
            targetVal = Math.min(...selectedFields.map(f => f.y));
        } else if (alignment === 'bottom') {
            targetVal = Math.max(...selectedFields.map(f => f.y + f.height));
        }

        const updated = fields.map(f => {
            if (selectedFieldIds.includes(f.id)) {
                if (alignment === 'left') return { ...f, x: targetVal };
                if (alignment === 'right') return { ...f, x: targetVal - f.width };
                if (alignment === 'top') return { ...f, y: targetVal };
                if (alignment === 'bottom') return { ...f, y: targetVal - f.height };
            }
            return f;
        });

        setFields(updated);
        setHasUnsavedChanges(true);
    };

    // ── EQUAL SPACING DISTRIBUTIONS ──
    const handleDistribute = (direction) => {
        if (selectedFieldIds.length <= 2 || isImmutable) return;

        const selected = fields.filter(f => selectedFieldIds.includes(f.id));
        
        if (direction === 'horizontal') {
            // Sort by X coordinate
            selected.sort((a, b) => a.x - b.x);
            const first = selected[0];
            const last = selected[selected.length - 1];
            
            // Total space between first X and last X
            const totalWidth = last.x - first.x;
            const step = totalWidth / (selected.length - 1);
            
            const updated = fields.map(f => {
                const idx = selected.findIndex(sel => sel.id === f.id);
                if (idx !== -1) {
                    return { ...f, x: Math.round(first.x + idx * step) };
                }
                return f;
            });
            setFields(updated);
        } else {
            // Vertical distribution
            selected.sort((a, b) => a.y - b.y);
            const first = selected[0];
            const last = selected[selected.length - 1];
            
            const totalHeight = last.y - first.y;
            const step = totalHeight / (selected.length - 1);
            
            const updated = fields.map(f => {
                const idx = selected.findIndex(sel => sel.id === f.id);
                if (idx !== -1) {
                    return { ...f, y: Math.round(first.y + idx * step) };
                }
                return f;
            });
            setFields(updated);
        }
        setHasUnsavedChanges(true);
    };

    // ── DUPLICATE SELECTED FIELDS ──
    const handleDuplicateSelected = () => {
        if (selectedFieldIds.length === 0 || isImmutable) return;

        const clones = fields.filter(f => selectedFieldIds.includes(f.id)).map(f => ({
            ...f,
            id: `fld-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: `${f.name}_copy`,
            label: `${f.label} (نسخة)`,
            x: Math.min(baseW - f.width, f.x + 24),
            y: Math.min(baseH - f.height, f.y + 24)
        }));

        setFields(prev => [...prev, ...clones]);
        setSelectedFieldIds(clones.map(c => c.id));
        setHasUnsavedChanges(true);
    };

    const isImmutable = form?.usageCount > 0;
    const selectedField = fields.find(f => f.id === selectedFieldIds[0]) || null;

    if (loading) return <div style={{ padding: '24px', textAlign: 'center', fontWeight: 800 }}>جاري تحميل مصمم النماذج...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Cairo, sans-serif' }}>
            
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Button variant="outline" size="sm" onClick={() => {
                        if (hasUnsavedChanges) {
                            if (!window.confirm('لديك تعديلات غير محفوظة. هل تريد المتابعة والمغادرة بدون حفظها؟')) return;
                        }
                        navigate('/forms-builder');
                    }} leftIcon={ArrowRight}>الرجوع للمصفوفة</Button>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-primary)' }}>
                            تعديل وتصميم: {form.name}
                        </h2>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>
                            إصدار: v{form.version} · الاستخدام: {form.usageCount} معاملة
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Auto-save/unsaved indicator */}
                    {hasUnsavedChanges && !isImmutable && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-warning)', fontWeight: 800 }}>
                            <AlertCircle size={13} />
                            تعديلات غير محفوظة (جارِ الحفظ تلقائياً...)
                        </div>
                    )}

                    {isImmutable && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px', fontSize: '11px', color: 'var(--color-danger)', fontWeight: 700 }}>
                            🔒 نموذج مقفل: يحتوي على معاملات نشطة. الرجاء الترقية لنسخة جديدة للتعديل.
                        </div>
                    )}

                    <button
                        onClick={() => setPreviewMode(!previewMode)}
                        style={{
                            padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--border-strong)',
                            background: previewMode ? 'var(--color-primary-500)' : 'var(--bg-surface)',
                            color: previewMode ? 'white' : 'var(--text-primary)',
                            fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
                        {previewMode ? 'خروج من المعاينة' : 'معاينة النموذج ورقم الإدخال'}
                    </button>

                    {isImmutable && (
                        <Button variant="outline" size="sm" style={{ color: 'var(--color-info)', borderColor: 'rgba(37,99,235,0.3)' }} leftIcon={RefreshCcw} onClick={handleCreateNewVersion}>
                            ترقية لإصدار جديد (v{form.version + 1})
                        </Button>
                    )}

                    {!isImmutable && (
                        <Button variant="primary" size="sm" onClick={() => handleSave(true)} disabled={saving} leftIcon={Save}>
                            حفظ التصميم
                        </Button>
                    )}

                    <Button
                        variant={form.status === 'PUBLISHED' ? 'secondary' : 'primary'}
                        size="sm"
                        style={{
                            background: form.status === 'PUBLISHED' ? 'var(--color-warning-bg)' : undefined,
                            color: form.status === 'PUBLISHED' ? 'var(--color-warning)' : undefined,
                            borderColor: form.status === 'PUBLISHED' ? 'var(--color-warning-border)' : undefined
                        }}
                        onClick={handlePublishToggle}
                        leftIcon={CheckCircle}
                    >
                        {form.status === 'PUBLISHED' ? 'أرشفة النموذج' : 'نشر واعتماد النموذج'}
                    </Button>
                </div>
            </div>

            {/* Visual Workspace */}
            {previewMode ? (
                <Card>
                    <CardHeader>
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>المعاينة الحية لتجربة تعبئة النموذج للمستخدم</h3>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', justifyContent: 'center', padding: '24px', background: '#0f172a', borderRadius: '12px' }}>
                        <div style={{ maxWidth: '900px', width: '100%' }}>
                            <FormRenderer
                                formId={form.id}
                                isPreview={true}
                                onBack={() => setPreviewMode(false)}
                            />
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', minWidth: 0 }}>
                    
                    {/* Visual Editor Canvas */}
                    <div 
                        ref={canvasContainerRef}
                        style={{
                            background: '#0f172a',
                            borderRadius: '16px',
                            border: '1px solid var(--border-default)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            minHeight: '600px',
                            overflow: 'hidden',
                            userSelect: 'none',
                            gap: '12px'
                        }}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                    >
                        {/* Alignments and Multi-select controls */}
                        {selectedFieldIds.length > 1 && !isImmutable && (
                            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '6px 12px', borderRadius: '10px', zIndex: 100, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <span style={{ fontSize: '11px', color: '#fff', alignSelf: 'center', marginLeft: '8px', fontWeight: 700 }}>محاذاة العناصر ({selectedFieldIds.length}):</span>
                                <button onClick={() => handleAlign('left')} title="محاذاة لليسار" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><AlignLeft size={16} /></button>
                                <button onClick={() => handleAlign('right')} title="محاذاة لليمين" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><AlignRight size={16} /></button>
                                <button onClick={() => handleAlign('top')} title="محاذاة للأعلى" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', transform: 'rotate(90deg)' }}><AlignLeft size={16} /></button>
                                <button onClick={() => handleAlign('bottom')} title="محاذاة للأسفل" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', transform: 'rotate(90deg)' }}><AlignRight size={16} /></button>
                                <button onClick={() => handleDistribute('horizontal')} title="توزيع أفقي متساوي" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><AlignHorizontalSpaceAround size={16} /></button>
                                <button onClick={() => handleDistribute('vertical')} title="توزيع عمودي متساوي" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}><AlignVerticalSpaceAround size={16} /></button>
                                <button onClick={handleDuplicateSelected} title="مضاعفة الحقول" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px', marginRight: '6px', borderRight: '1px solid rgba(255,255,255,0.2)' }}><Copy size={16} /></button>
                                <button onClick={handleDeleteFields} title="حذف الحقول المحددة" style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                            </div>
                        )}

                        {/* Canvas Frame */}
                        <div
                            id="form-design-canvas"
                            onDragOver={(e) => {
                                if (isImmutable) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                            }}
                            onDrop={handleCanvasDrop}
                            style={{
                                width: `${canvasWidth}px`,
                                height: `${canvasHeight}px`,
                                position: 'relative',
                                background: '#ffffff',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* A4 template background image */}
                            {template?.backgroundUrl && (
                                <img
                                    src={template.backgroundUrl}
                                    alt="Background template preview"
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'fill',
                                        pointerEvents: 'none',
                                        zIndex: 0
                                    }}
                                />
                            )}

                            {/* Forms Fields overlay layout */}
                            {fields.map(field => {
                                const isSelected = selectedFieldIds.includes(field.id);
                                const fieldStyle = {
                                    position: 'absolute',
                                    left: `${field.x * scale}px`,
                                    top: `${field.y * scale}px`,
                                    width: `${field.width * scale}px`,
                                    height: `${field.height * scale}px`,
                                    border: isSelected ? '2px solid var(--color-primary-500)' : '1px dashed rgba(0,0,0,0.38)',
                                    background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.7)',
                                    boxShadow: isSelected ? '0 0 8px rgba(16, 185, 129, 0.3)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isImmutable ? 'not-allowed' : 'move',
                                    zIndex: getLayerZIndex(field)
                                };

                                const isDynamic = ['signer_name', 'signer_title', 'approver_name', 'approver_title', 'signature_1', 'signature_2', 'signature_3', 'official_stamp'].includes(field.dynamicType || field.name);
                                const resolvedVal = isDynamic ? resolveDynamicField(field.dynamicType || field.name, {}, settings) : '';

                                return (
                                    <div
                                        key={field.id}
                                        style={fieldStyle}
                                        onMouseDown={(e) => handleCanvasMouseDown(e, field, 'drag')}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', pointerEvents: 'none', direction: 'rtl', padding: '4px', width: '100%', height: '100%', justifyContent: 'center', overflow: 'hidden' }}>
                                            {isDynamic ? (
                                                (field.type === 'signature' || field.type === 'stamp' || field.type === 'image') ? (
                                                    resolvedVal ? (
                                                        <img src={resolvedVal} alt={field.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800 }}>{field.label} (غير متوفر)</span>
                                                    )
                                                ) : (
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textAlign: 'center', whiteSpace: 'pre-wrap' }}>
                                                        {resolvedVal || `[${field.label}]`}
                                                    </span>
                                                )
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                                                        {field.label}
                                                    </span>
                                                    <span style={{ fontSize: '8.5px', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                        {field.name}
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Resize anchor */}
                                        {isSelected && !isImmutable && (
                                            <div
                                                onMouseDown={(e) => handleCanvasMouseDown(e, field, 'resize')}
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    bottom: 0,
                                                    width: '10px',
                                                    height: '10px',
                                                    background: 'var(--color-primary-500)',
                                                    cursor: 'se-resize',
                                                    borderTopLeftRadius: '3px',
                                                    borderBottomRightRadius: '5px',
                                                    zIndex: getLayerZIndex(field) + 5
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sidebar tools */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Field Toolbox */}
                        <Card>
                            <CardHeader>
                                <h3 style={{ fontSize: '12px', fontWeight: 800 }}>أدوات التصميم (Toolbox)</h3>
                            </CardHeader>
                            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                                {[
                                    { type: 'text', label: 'حقل نصي (Text)' },
                                    { type: 'textarea', label: 'ملاحظات (Textarea)' },
                                    { type: 'select', label: 'خيارات منسدلة (Select)' },
                                    { type: 'date', label: 'محدد تاريخ (Date)' },
                                    { type: 'number', label: 'حقل أرقام (Number)' }
                                ].map(btn => (
                                    <button
                                        key={btn.type}
                                        onClick={() => handleAddField(btn.type)}
                                        disabled={isImmutable}
                                        draggable={!isImmutable}
                                        onDragStart={(e) => {
                                            if (isImmutable) return;
                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                isDynamic: false,
                                                type: btn.type
                                            }));
                                        }}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: '8px',
                                            border: '1.5px solid var(--border-default)', background: 'var(--bg-subtle)',
                                            color: 'var(--text-primary)', fontSize: '12px', fontWeight: 800,
                                            cursor: isImmutable ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => { if (!isImmutable) e.currentTarget.style.borderColor = 'var(--color-primary-400)'; }}
                                        onMouseLeave={e => { if (!isImmutable) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                                    >
                                        <Plus size={14} />
                                        {btn.label}
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Dynamic Fields Toolbox */}
                        <Card>
                            <CardHeader>
                                <h3 style={{ fontSize: '12px', fontWeight: 800 }}>حقول ديناميكية (Dynamic Fields)</h3>
                            </CardHeader>
                            <CardContent style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px' }}>
                                {[
                                    { type: 'signer_name', label: '👤 اسم مساعد المدير', fieldType: 'title', w: 180, h: 35 },
                                    { type: 'signer_title', label: '🏷️ مسمى مساعد المدير', fieldType: 'title', w: 180, h: 35 },
                                    { type: 'approver_name', label: '👤 اسم المدير العام', fieldType: 'title', w: 180, h: 35 },
                                    { type: 'approver_title', label: '🏷️ مسمى المدير العام', fieldType: 'title', w: 180, h: 35 },
                                    { type: 'signature_1', label: '✍️ توقيع المدير العام', fieldType: 'signature', w: 140, h: 70 },
                                    { type: 'signature_2', label: '✍️ توقيع مساعد المدير', fieldType: 'signature', w: 140, h: 70 },
                                    { type: 'signature_3', label: '✍️ التوقيع العام', fieldType: 'signature', w: 140, h: 70 },
                                    { type: 'official_stamp', label: '🔷 الختم الرسمي', fieldType: 'stamp', w: 110, h: 110 }
                                ].map(btn => {
                                    const previewVal = resolveDynamicField(btn.type, {}, settings);
                                    const isImg = btn.fieldType === 'signature' || btn.fieldType === 'stamp';
                                    return (
                                        <button
                                            key={btn.type}
                                            onClick={() => handleAddDynamicField(btn.type, btn.label.substring(3), btn.fieldType, btn.w, btn.h)}
                                            disabled={isImmutable}
                                            draggable={!isImmutable}
                                            onDragStart={(e) => {
                                                if (isImmutable) return;
                                                e.dataTransfer.setData('application/json', JSON.stringify({
                                                    isDynamic: true,
                                                    type: btn.type,
                                                    label: btn.label.substring(3),
                                                    fieldType: btn.fieldType,
                                                    w: btn.w,
                                                    h: btn.h
                                                }));
                                            }}
                                            style={{
                                                padding: '8px', borderRadius: '8px',
                                                border: '1.5px solid var(--border-default)', background: 'var(--bg-subtle)',
                                                color: 'var(--text-primary)', fontSize: '11px', fontWeight: 800,
                                                cursor: isImmutable ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                                transition: 'all 0.15s', minHeight: '80px', justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={e => { if (!isImmutable) e.currentTarget.style.borderColor = 'var(--color-primary-400)'; }}
                                            onMouseLeave={e => { if (!isImmutable) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                                        >
                                            <span style={{ textAlign: 'center', fontSize: '10px' }}>{btn.label}</span>
                                            
                                            {/* Visual Live Preview */}
                                            <div style={{ width: '100%', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'rgba(255,255,255,0.4)', borderRadius: '4px', border: '1px solid var(--border-subtle)', padding: '2px' }}>
                                                {isImg ? (
                                                    previewVal ? (
                                                        <img src={previewVal} alt="preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>لا يوجد</span>
                                                    )
                                                ) : (
                                                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                                                        {previewVal || 'غير معين'}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* Selected Field Configuration form */}
                        {selectedField ? (
                            <Card>
                                <CardHeader>
                                    <h3 style={{ fontSize: '12px', fontWeight: 800 }}>تعديل خصائص الحقل</h3>
                                </CardHeader>
                                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
                                    {['signer_name', 'signer_title', 'approver_name', 'approver_title', 'signature_1', 'signature_2', 'signature_3', 'official_stamp'].includes(selectedField.dynamicType || selectedField.name) ? (
                                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '10px', border: '1.5px dashed rgba(59, 130, 246, 0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--color-info)' }}>✨ حقل ديناميكي مركزي</span>
                                            <p style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                                                هذا الحقل مرتبط بتوقيعات وتواقيع الهوية الرسمية المعدة مسبقاً في النظام.
                                            </p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-default)', paddingTop: '8px', marginTop: '4px' }}>
                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800 }}>الاسم المعروض (Label):</span>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedField.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800 }}>المتغير البرمجي:</span>
                                                <code style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--color-primary-600)', direction: 'ltr', textAlign: 'right' }}>{selectedField.name}</code>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Label */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)' }}>الاسم المعروض (Label):</label>
                                                <input
                                                    type="text"
                                                    value={selectedField.label}
                                                    disabled={isImmutable}
                                                    onChange={e => handleFieldPropertyChange(selectedField.id, 'label', e.target.value)}
                                                    style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-page)', fontFamily: 'Cairo' }}
                                                />
                                            </div>

                                            {/* Key Name */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)' }}>الاسم البرمجي (Key Name):</label>
                                                <input
                                                    type="text"
                                                    value={selectedField.name}
                                                    disabled={isImmutable}
                                                    onChange={e => handleFieldPropertyChange(selectedField.id, 'name', e.target.value)}
                                                    placeholder="e.g. employeeId"
                                                    style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-page)', fontFamily: 'monospace', direction: 'ltr', textAlign: 'right' }}
                                                />
                                            </div>

                                            {/* Field Mapping */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)' }}>ربط الحقل مع أعمدة الشهادة:</label>
                                                <select
                                                    value={selectedField.certificateMapping || ''}
                                                    disabled={isImmutable}
                                                    onChange={e => handleFieldPropertyChange(selectedField.id, 'certificateMapping', e.target.value)}
                                                    style={{ padding: '6px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-page)', fontFamily: 'Cairo', cursor: 'pointer' }}
                                                >
                                                    {MAPPING_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Required toggle */}
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: 'var(--bg-muted)', borderRadius: '6px', cursor: isImmutable ? 'not-allowed' : 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedField.required}
                                                    disabled={isImmutable}
                                                    onChange={e => handleFieldPropertyChange(selectedField.id, 'required', e.target.checked)}
                                                    style={{ accentColor: 'var(--color-primary-600)' }}
                                                />
                                                <span style={{ fontSize: '11px', fontWeight: 800 }}>حقل إلزامي</span>
                                            </label>

                                            {/* Dropdown Options */}
                                            {selectedField.type === 'select' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)' }}>خيارات القائمة (مفصولة بفاصلة):</label>
                                                    <textarea
                                                        value={(selectedField.options || []).join(', ')}
                                                        disabled={isImmutable}
                                                        onChange={e => handleOptionsChange(selectedField.id, e.target.value)}
                                                        rows={3}
                                                        placeholder="خيار ١, خيار ٢, خيار ٣"
                                                        style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-page)', fontFamily: 'Cairo', resize: 'vertical' }}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Coordinate parameters */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-default)', paddingTop: '10px', marginTop: '6px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>الموقع X (بكسل):</span>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedField.x}px</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>الموقع Y (بكسل):</span>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedField.y}px</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>العرض W (بكسل):</span>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedField.width}px</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700 }}>الارتفاع H (بكسل):</span>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedField.height}px</span>
                                        </div>
                                    </div>

                                    {/* Delete field */}
                                    {!isImmutable && (
                                        <button
                                            onClick={() => handleDeleteFields()}
                                            style={{
                                                marginTop: '8px', padding: '10px', borderRadius: '8px',
                                                border: '1.5px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)',
                                                color: 'var(--color-danger)', fontSize: '12px', fontWeight: 800,
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; }}
                                        >
                                            <Trash2 size={14} />
                                            حذف الحقل المحدد
                                        </button>
                                    )}

                                </CardContent>
                            </Card>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px dashed var(--border-strong)', borderRadius: '16px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700 }}>
                                حدد حقل إدخال على لوحة الرسم للتحكم بإعداداته وتنسيقه وإحداثياته.
                            </div>
                        )}
                    </div>

                </div>
            )}

        </div>
    );
}
