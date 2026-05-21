/**
 * 📝 CreateCertificate.jsx
 * Enterprise-grade Certificate Creation Workspace for mohararcert.
 * Integrates directly with the Repository workflow service.
 * Supports: draft caching, returned modifications, field-locking, and automated reviewer notifications.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import { useAuth } from '../context/AuthContext';
import { useSerial } from '../hooks/useSerial';
import { useTemplates } from '../hooks/useTemplates';
import { useLayers } from '../hooks/useLayers';
import { dbService, auditService, notificationService } from '../services/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Send, ShieldAlert, Sparkles, HelpCircle, FileText, ArrowLeft } from 'lucide-react';

const BRANCH_TEMPLATE_NAME = 'شهادة شكر وتقدير الفرع';

function useScaleFactor(containerRef) {
    const [scale, setScale] = useState(0.45);

    useEffect(() => {
        function measure() {
            const el = containerRef.current;
            if (!el) return;
            const A4_W_PX = 297 * (96 / 25.4); // ≈ 1122.5
            const A4_H_PX = 210 * (96 / 25.4); // ≈ 793.7
            const scaleW = el.clientWidth / A4_W_PX;
            const scaleH = el.clientHeight / A4_H_PX;
            setScale(Math.min(scaleW, scaleH));
        }

        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        measure();
        return () => ro.disconnect();
    }, [containerRef]);

    return scale;
}

const DataTab = memo(function DataTab({ 
    formData, setFormData, serialInput, setSerialInput, autoSerial, 
    templates, selectedTemplateId, setSelectedTemplateId, locked, settings 
}) {
    return (
        <div className="space-y-4">
            {/* Template selector */}
            {templates.length > 0 && (
                <div className="form-group">
                    <label className="form-label">📄 نموذج وتصميم الشهادة</label>
                    <select 
                        className="form-control"
                        disabled={locked}
                        value={selectedTemplateId || ''}
                        onChange={e => setSelectedTemplateId(e.target.value || null)}
                    >
                        <option value="">🎨 التصميم الكلاسيكي (بدون قالب)</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.isDefault ? '⭐ ' : ''}{t.name === 'قالب شهادة' ? BRANCH_TEMPLATE_NAME : t.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Recipient name */}
            <div className="form-group">
                <label className="form-label">اسم المستفيد الكامل *</label>
                <input
                    type="text"
                    disabled={locked}
                    className="form-control"
                    placeholder="اسم الموظف أو المستلم"
                    value={formData.recipientName}
                    onChange={e => setFormData(p => ({ ...p, recipientName: e.target.value }))}
                />
            </div>

            {/* Reason text */}
            <div className="form-group">
                <label className="form-label">سبب التكريم والتقدير *</label>
                <textarea
                    rows="3"
                    disabled={locked}
                    className="form-control resize-none"
                    placeholder="نظير جهودكم المتميزة في إنجاح أعمال مبادرة التحول الرقمي وحوكمة البيانات..."
                    value={formData.reasonText}
                    onChange={e => setFormData(p => ({ ...p, reasonText: e.target.value }))}
                />
            </div>

            {/* Event */}
            <div className="form-group">
                <label className="form-label">عنوان المناسبة / الحفل *</label>
                <input
                    type="text"
                    disabled={locked}
                    className="form-control"
                    placeholder="مثال: حفل التميز السنوي الأول لعام 2026"
                    value={formData.event}
                    onChange={e => setFormData(p => ({ ...p, event: e.target.value }))}
                />
            </div>

            {/* Date */}
            <div className="form-group">
                <label className="form-label">تاريخ التكريم المكتوب *</label>
                <input
                    type="text"
                    disabled={locked}
                    className="form-control"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
            </div>

            {/* Serial code */}
            <div className="form-group">
                <label className="form-label">الرقم التسلسلي</label>
                <input
                    type="text"
                    disabled={locked}
                    className="form-control text-left font-mono font-bold"
                    placeholder={`تلقائي: ${autoSerial}`}
                    value={serialInput}
                    onChange={e => setSerialInput(e.target.value)}
                    style={{ direction: 'ltr' }}
                />
                {!locked && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        اتركه فارغاً ليقوم النظام بتعيين رقم تسلسلي تلقائي ({autoSerial})
                    </p>
                )}
            </div>

            {/* QR Checkbox toggle */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl cursor-pointer border border-slate-100 dark:border-slate-800/40 select-none">
                <input
                    type="checkbox"
                    disabled={locked}
                    checked={formData.showQR}
                    onChange={e => setFormData(p => ({ ...p, showQR: e.target.checked }))}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تضمين رمز QR للتحقق الرقمي</span>
            </label>
        </div>
    );
});

export default function CreateCertificate() {
    const { user, settings } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');

    const { getNextSerial, consumeSerial } = useSerial();
    const { templates, getTemplate, activeTemplateId, setActiveTemplateId, updateTemplate } = useTemplates();

    const selectedTemplateId = activeTemplateId;
    const setSelectedTemplateId = setActiveTemplateId;
    const activeTemplate = selectedTemplateId ? getTemplate(selectedTemplateId) : null;
    const { layers: editorLayers, canvasWidth } = useLayers(selectedTemplateId || 'default');

    const [formData, setFormData] = useState({
        recipientName: '',
        event: '',
        reasonText: '',
        date: new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' }),
        showQR: true,
        status: 'DRAFT'
    });
    const [serialInput, setSerialInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const certRef = useRef();
    const previewContainerRef = useRef();

    // Check if form fields should be locked
    const isLocked = formData.status !== 'DRAFT' && formData.status !== 'RETURNED_FOR_EDIT';

    // Load existing certificate if in edit/revision mode
    useEffect(() => {
        if (!editId) return;
        
        const loadExistingCert = async () => {
            setLoading(true);
            try {
                const existing = await dbService.getById(editId);
                if (existing) {
                    setFormData({
                        recipientName: existing.recipientName,
                        event: existing.event,
                        reasonText: existing.reasonText || existing.event,
                        date: existing.date,
                        showQR: existing.showQR ?? true,
                        status: existing.status
                    });
                    setSerialInput(existing.serial);
                    if (existing.templateId) {
                        setActiveTemplateId(existing.templateId);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        loadExistingCert();
    }, [editId, setActiveTemplateId]);

    // Handle template renaming fallback
    useEffect(() => {
        const currentTemplate = activeTemplateId ? getTemplate(activeTemplateId) : null;
        if (currentTemplate?.name === 'قالب شهادة') {
            updateTemplate(currentTemplate.id, { name: BRANCH_TEMPLATE_NAME });
        }
    }, [activeTemplateId, getTemplate, updateTemplate]);

    const autoSerial = getNextSerial();
    const previewSerial = serialInput.trim() || autoSerial;
    const scale = useScaleFactor(previewContainerRef);

    const certData = {
        recipientName: formData.recipientName || 'اسم المستفيد الكامل',
        event: formData.event || 'عنوان المناسبة أو المحفل التكريمي',
        date: formData.date,
        serial: previewSerial,
        status: formData.status
    };

    // Save as local draft
    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const payload = {
                recipientName: formData.recipientName || 'مسودة شهادة',
                event: formData.event || 'موضوع التكريم',
                reasonText: formData.reasonText,
                date: formData.date,
                serial: previewSerial,
                showQR: formData.showQR,
                status: 'DRAFT',
                templateId: selectedTemplateId,
                createdBy: user.id,
                creatorName: user.name
            };

            if (editId) {
                await dbService.update(editId, payload);
                await auditService.log('UPDATE_CERTIFICATE', user, `تحديث مسودة الشهادة رقم: ${previewSerial}`, editId);
            } else {
                const newCert = await dbService.create(payload);
                await auditService.log('CREATE_CERTIFICATE', user, `حفظ مسودة شهادة جديدة برقم: ${previewSerial}`, newCert.id);
                navigate(`/create?id=${newCert.id}`);
            }

            alert('تم حفظ المسودة بنجاح في سجلاتك المحلية!');
        } catch (e) {
            alert('خطأ أثناء حفظ المسودة: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    // Submit for official approval queue
    const handleSubmitApproval = async () => {
        if (!formData.recipientName.trim()) return alert('الرجاء كتابة اسم المستفيد أولاً');
        if (!formData.event.trim()) return alert('الرجاء كتابة عنوان المناسبة أو الحفل');
        if (!formData.reasonText.trim()) return alert('الرجاء كتابة سبب التكريم');

        setSaving(true);
        try {
            const serial = serialInput.trim() ? serialInput.trim() : consumeSerial();
            const payload = {
                recipientName: formData.recipientName,
                event: formData.event,
                reasonText: formData.reasonText,
                date: formData.date,
                serial: serial,
                showQR: formData.showQR,
                status: 'PENDING_APPROVAL',
                templateId: selectedTemplateId,
                createdBy: user.id,
                creatorName: user.name
            };

            let certId = editId;
            if (editId) {
                await dbService.update(editId, payload);
                await dbService.submitForApproval(editId, user);
            } else {
                const newCert = await dbService.create(payload);
                await dbService.submitForApproval(newCert.id, user);
                certId = newCert.id;
            }

            // Log secure event
            await auditService.log('CREATE_CERTIFICATE', user, `رفع وتقديم شهادة لاعتماد المراجع برقم: ${serial}`, certId);
            
            // Notify Assistant Manager
            await notificationService.create({
                userId: 'usr-2', // Assistant Manager
                message: `شهادة جديدة بانتظار المراجعة والاعتماد: ${formData.recipientName}`,
                type: 'pending'
            });

            alert('تم تقديم طلب الاعتماد بنجاح وتمريره إلى درج المراجع الإداري!');
            navigate('/dashboard');
        } catch (e) {
            alert('خطأ أثناء رفع طلب الاعتماد: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="editor-layout">
            
            {/* ══════════ FORM PANEL ══════════ */}
            <div className="editor-form-panel">
                <div className="editor-form-header flex items-center justify-between">
                    <span>📜 صياغة شهادة تقدير</span>
                    {formData.status && formData.status !== 'DRAFT' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase">
                            {formData.status}
                        </span>
                    )}
                </div>

                <div className="editor-section overflow-y-auto custom-scrollbar flex-1 p-5">
                    
                    {/* Lock state advisory */}
                    {isLocked && (
                        <div className="p-3 mb-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span>المعاملة في حالة مراجعة إدارية نشطة ومغلقة ضد أي تعديل.</span>
                        </div>
                    )}

                    <DataTab
                        formData={formData}
                        setFormData={setFormData}
                        serialInput={serialInput}
                        setSerialInput={setSerialInput}
                        autoSerial={autoSerial}
                        templates={templates}
                        selectedTemplateId={selectedTemplateId}
                        setSelectedTemplateId={setSelectedTemplateId}
                        locked={isLocked}
                        settings={settings}
                    />
                </div>

                {/* Footer Action buttons */}
                {!isLocked && (
                    <div className="editor-action-bar grid grid-cols-2 gap-3.5 border-t border-slate-200 dark:border-slate-800/80 p-4">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleSaveDraft}
                            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <Save className="w-4 h-4" />
                            <span>حفظ كمسودة</span>
                        </button>
                        <button
                            type="button"
                            disabled={saving || !formData.recipientName}
                            onClick={handleSubmitApproval}
                            className="py-2.5 px-4 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10"
                        >
                            <Send className="w-4 h-4" />
                            <span>تقديم للاعتماد</span>
                        </button>
                    </div>
                )}
            </div>

            {/* ══════════ PREVIEW PANEL ══════════ */}
            <div className="editor-preview-panel bg-[#141517]">
                
                {/* Toolbar */}
                <div className="editor-preview-toolbar flex items-center justify-between">
                    <div className="editor-preview-toolbar-title flex items-center gap-1.5">
                        <span>👁️</span>
                        <span>معاينة حية للمستند الرسمي</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <span className="bg-[#1e2023] px-2 py-0.5 rounded text-[10px]">A4 landscape</span>
                        <span>تكبير: {Math.round(scale * 100)}%</span>
                    </div>
                </div>

                {/* Canvas preview scale host */}
                <div className="editor-preview-canvas" ref={previewContainerRef}>
                    <div className="cert-scale-wrapper">
                        <div className="cert-scale-inner">
                            <div
                                className="cert-transform-host"
                                style={{ '--cert-scale': scale }}
                            >
                                <UnifiedCertificateEngine
                                    ref={certRef}
                                    mode="preview"
                                    template={activeTemplate}
                                    layers={editorLayers}
                                    canvasWidth={canvasWidth}
                                    data={certData}
                                    settings={settings}
                                    showQR={formData.showQR}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
