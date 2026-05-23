/**
 * 📝 CreateCertificate.jsx — Enterprise MoH Healthcare Dashboard
 * Certificate Creation Workspace with Split View: Form vs Preview
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import { useAuth } from '../context/AuthContext';
import { useSerial } from '../hooks/useSerial';
import { useTemplates } from '../hooks/useTemplates';
import { useLayers } from '../hooks/useLayers';
import { dbService, auditService, notificationService } from '../services/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Save, Send, ShieldAlert, FileText, QrCode,
    Calendar, Type, LayoutTemplate, X, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';
import { Badge } from '../ui/feedback/Badge';

const BRANCH_TEMPLATE_NAME = 'شهادة شكر وتقدير الفرع';

function useScaleFactor(containerRef) {
    const [scale, setScale] = useState(0.45);
    useEffect(() => {
        function measure() {
            const el = containerRef.current;
            if (!el) return;
            const A4W = 297 * (96 / 25.4);
            const A4H = 210 * (96 / 25.4);
            setScale(Math.min(el.clientWidth / A4W, el.clientHeight / A4H) * 0.94);
        }
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        measure();
        return () => ro.disconnect();
    }, [containerRef]);
    return scale;
}

const DataForm = memo(function DataForm({
    formData, setFormData, serialInput, setSerialInput, autoSerial,
    templates, selectedTemplateId, setSelectedTemplateId, locked
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Template selector */}
            {templates.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LayoutTemplate size={14} />
                        نموذج وتصميم الشهادة
                    </label>
                    <select
                        disabled={locked}
                        value={selectedTemplateId || ''}
                        onChange={e => setSelectedTemplateId(e.target.value || null)}
                        style={{
                            padding: '10px 14px',
                            border: '1.5px solid var(--border-strong)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-label)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            background: 'var(--bg-surface)',
                            outline: 'none',
                            fontFamily: 'var(--font-sans)',
                            opacity: locked ? 0.6 : 1,
                        }}
                    >
                        <option value="">التصميم الكلاسيكي (بدون قالب)</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.isDefault ? '⭐ ' : ''}{t.name === 'قالب شهادة' ? BRANCH_TEMPLATE_NAME : t.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Recipient */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    اسم المستفيد الكامل <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                    type="text"
                    disabled={locked}
                    value={formData.recipientName}
                    onChange={e => setFormData(p => ({ ...p, recipientName: e.target.value }))}
                    placeholder="الاسم الثلاثي أو الرباعي"
                    style={{
                        padding: '10px 14px',
                        border: '1.5px solid var(--border-strong)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-label)',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        background: 'var(--bg-surface)',
                        outline: 'none',
                        fontFamily: 'var(--font-sans)',
                        opacity: locked ? 0.6 : 1,
                    }}
                />
            </div>

            {/* Event & Date row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        عنوان المناسبة <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                        type="text"
                        disabled={locked}
                        value={formData.event}
                        onChange={e => setFormData(p => ({ ...p, event: e.target.value }))}
                        placeholder="حفل التميز، دورة تدريبية..."
                        style={{ padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', fontFamily: 'var(--font-sans)', opacity: locked ? 0.6 : 1 }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        التاريخ المطبوع <span style={{ color: 'var(--color-danger)' }}>*</span>
                    </label>
                    <input
                        type="text"
                        disabled={locked}
                        value={formData.date}
                        onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                        style={{ padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', fontFamily: 'var(--font-sans)', opacity: locked ? 0.6 : 1 }}
                    />
                </div>
            </div>

            {/* Reason */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    سبب التكريم والتقدير <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <textarea
                    rows="3"
                    disabled={locked}
                    value={formData.reasonText}
                    onChange={e => setFormData(p => ({ ...p, reasonText: e.target.value }))}
                    placeholder="نظير جهودكم المتميزة في إنجاح..."
                    style={{
                        padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)',
                        fontFamily: 'var(--font-sans)', opacity: locked ? 0.6 : 1, resize: 'vertical'
                    }}
                />
            </div>

            {/* Serial code & QR Toggle row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        الرقم التسلسلي
                    </label>
                    <input
                        type="text"
                        disabled={locked}
                        placeholder={`تلقائي: ${autoSerial}`}
                        value={serialInput}
                        onChange={e => setSerialInput(e.target.value)}
                        style={{
                            padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-label)', fontWeight: 700, background: 'var(--bg-muted)',
                            fontFamily: 'monospace', opacity: locked ? 0.6 : 1, direction: 'ltr', textAlign: 'right'
                        }}
                    />
                </div>

                <label style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    background: 'var(--bg-subtle)', border: '1.5px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    opacity: locked ? 0.6 : 1,
                }}>
                    <input
                        type="checkbox"
                        disabled={locked}
                        checked={formData.showQR}
                        onChange={e => setFormData(p => ({ ...p, showQR: e.target.checked }))}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-primary-600)' }}
                    />
                    <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <QrCode size={14} /> تضمين رمز التحقق QR
                    </span>
                </label>
            </div>
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

    const isLocked = formData.status !== 'DRAFT' && formData.status !== 'RETURNED_FOR_EDIT';

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
                    if (existing.templateId) setActiveTemplateId(existing.templateId);
                }
            } catch (e) {
                logger.error('فشل تحميل الشهادة', e);
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
        event: formData.event || 'عنوان المناسبة أو الموضوع',
        date: formData.date,
        serial: previewSerial,
        status: formData.status
    };

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
                await auditService.log('UPDATE_CERTIFICATE', user, `تحديث المسودة: ${previewSerial}`, editId);
            } else {
                const newCert = await dbService.create(payload);
                await auditService.log('CREATE_CERTIFICATE', user, `مسودة جديدة: ${previewSerial}`, newCert.id);
                navigate(`/create?id=${newCert.id}`, { replace: true });
            }
            logger.api('تم حفظ المسودة');
        } catch (e) {
            alert('خطأ أثناء حفظ المسودة: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitApproval = async () => {
        if (!formData.recipientName.trim()) return alert('الرجاء كتابة اسم المستفيد');
        if (!formData.event.trim())         return alert('الرجاء كتابة المناسبة');
        if (!formData.reasonText.trim())    return alert('الرجاء كتابة سبب التكريم');

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

            await auditService.log('CREATE_CERTIFICATE', user, `رفع للاعتماد: ${serial}`, certId);
            await notificationService.create({
                userId: 'usr-2',
                message: `شهادة جديدة بانتظار المراجعة: ${formData.recipientName}`,
                type: 'pending'
            });

            logger.api('تم الرفع للاعتماد');
            navigate('/dashboard');
        } catch (e) {
            alert('خطأ أثناء تقديم الطلب: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <span className="spinner spinner-lg" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <PageHeader
                title={editId ? 'تعديل المعاملة' : 'إنشاء شهادة جديدة'}
                subtitle="صياغة البيانات واعتماد النموذج قبل الرفع للتدقيق الإداري"
                actions={
                    !isLocked && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Button variant="outline" size="sm" onClick={handleSaveDraft} isLoading={saving} leftIcon={Save}>
                                مسودة
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleSubmitApproval} isLoading={saving} leftIcon={Send}>
                                تقديم للاعتماد
                            </Button>
                        </div>
                    )
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '20px', alignItems: 'start' }}>
                
                {/* ── Left: Form Panel ── */}
                <Card>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Type size={15} style={{ color: 'var(--color-primary-600)' }} />
                                <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    بيانات التكريم
                                </h3>
                            </div>
                            {formData.status && formData.status !== 'DRAFT' && (
                                <Badge variant="warning" dot>{formData.status}</Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLocked && (
                            <div style={{
                                padding: '12px 16px', marginBottom: '20px',
                                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', gap: '10px',
                            }}>
                                <ShieldAlert size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                                <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    هذه المعاملة في مسار المراجعة ولا يمكن تعديلها حالياً.
                                </span>
                            </div>
                        )}

                        <DataForm
                            formData={formData} setFormData={setFormData}
                            serialInput={serialInput} setSerialInput={setSerialInput}
                            autoSerial={autoSerial} templates={templates}
                            selectedTemplateId={selectedTemplateId} setSelectedTemplateId={setSelectedTemplateId}
                            locked={isLocked} settings={settings}
                        />
                    </CardContent>
                </Card>

                {/* ── Right: Preview Panel ── */}
                <div style={{ position: 'sticky', top: '80px' }}>
                    <Card>
                        <div style={{
                            padding: '12px 16px',
                            background: '#0D1117',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.6)', animation: 'pulse 2s infinite' }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                                    المعاينة المباشرة (Live)
                                </span>
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
                                {(scale * 100).toFixed(0)}% ZOOM
                            </span>
                        </div>

                        <div
                            ref={previewContainerRef}
                            style={{
                                background: '#1a1f2e',
                                minHeight: '480px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden', position: 'relative',
                                padding: '20px',
                                borderBottomLeftRadius: 'var(--radius-xl)', borderBottomRightRadius: 'var(--radius-xl)',
                            }}
                        >
                            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                            <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: '297mm', height: '210mm', flexShrink: 0, position: 'relative', zIndex: 2 }}>
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
                    </Card>
                </div>

            </div>
        </div>
    );
}
