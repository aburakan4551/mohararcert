import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService, templateService, auditService, notificationService } from '../services/db';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import { exportSinglePDF, printElements } from '../utils/pdfExport';
import { ExportEngine } from '../engine/StudioEngine/ExportEngine';
import { getRecipientDisplayName } from '../engine/FieldEngine/FieldEngine';
import {
    ArrowRight, CheckCircle, AlertTriangle, FileText, Clock,
    MessageSquare, ShieldAlert, Sparkles, Printer, Download,
    ShieldCheck, XCircle,
} from 'lucide-react';
import { useLayers } from '../hooks/useLayers';
import { logger } from '../utils/debug';
import { motion } from 'framer-motion';

// Presentation imports
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import { Textarea, Label } from '../ui/forms/Input';

const STATUS_MAP = {
    DRAFT:                { label: 'مسودة',                variant: 'neutral' },
    PENDING_APPROVAL:     { label: 'انتظار تأشير المساعد', variant: 'warning' },
    APPROVED_BY_ASSISTANT:{ label: 'معتمد من المساعد',     variant: 'info'    },
    FINAL_APPROVED:       { label: 'معتمد نهائياً',         variant: 'success' },
    RETURNED_FOR_EDIT:    { label: 'مُعاد للتعديل',         variant: 'danger'  },
    REJECTED:             { label: 'مرفوض',                 variant: 'danger'  },
    ARCHIVED:             { label: 'مؤرشف',                 variant: 'neutral' },
};

const getStatusBadge = (status) => {
    const s = STATUS_MAP[status] || { label: '—', variant: 'neutral' };
    return <Badge variant={s.variant} dot>{s.label}</Badge>;
};

export default function ApprovalDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, settings } = useAuth();

    const [cert,       setCert]       = useState(null);
    const [template,   setTemplate]   = useState(null);
    const [comments,   setComments]   = useState('');
    const [loading,    setLoading]    = useState(true);
    const [processing, setProcessing] = useState(false);
    const [exporting,  setExporting]  = useState(false);
    const [scale,      setScale]      = useState(0.5);

    const certRef            = useRef();
    const previewContainerRef = useRef();

    /* ── Auto Scale for A4 ── */
    useEffect(() => {
        if (loading || !cert) return;
        const measure = () => {
            const el = previewContainerRef.current;
            if (!el) return;
            const A4_W = 297 * (96 / 25.4);
            const A4_H = 210 * (96 / 25.4);
            setScale(Math.min(el.clientWidth / A4_W, el.clientHeight / A4_H) * 0.94);
        };
        const ro = new ResizeObserver(measure);
        if (previewContainerRef.current) ro.observe(previewContainerRef.current);
        measure();
        return () => ro.disconnect();
    }, [loading, cert]);

    const loadCertDetails = async () => {
        setLoading(true);
        try {
            const data = await dbService.getById(id);
            if (!data) { alert('المعاملة غير موجودة'); navigate('/dashboard'); return; }
            setCert(data);
            if (data.frozenTemplate) {
                setTemplate(data.frozenTemplate);
            } else if (data.templateId) {
                const tpl = await templateService.getById(data.templateId);
                setTemplate(tpl);
            }
        } catch (e) {
            logger.error('خطأ في تحميل بيانات المعاملة', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadCertDetails(); }, [id]);

    const { layers: editorLayers, canvasWidth } = useLayers(cert?.templateId || 'default');

    const canTakeDecision = () => {
        if (!cert) return false;
        if (cert.status === 'PENDING_APPROVAL'      && (user.role === 'ASSISTANT_MANAGER' || user.role === 'SUPER_ADMIN')) return true;
        if (cert.status === 'APPROVED_BY_ASSISTANT' && (user.role === 'GENERAL_MANAGER'  || user.role === 'SUPER_ADMIN')) return true;
        return false;
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            const dispName = getRecipientDisplayName(cert);
            if (user.role === 'ASSISTANT_MANAGER' || (user.role === 'SUPER_ADMIN' && cert.status === 'PENDING_APPROVAL')) {
                await dbService.approveByAssistant(cert.id, user, comments || 'تم الاعتماد والتأشير بالقبول.');
                await auditService.log('APPROVE_CERTIFICATE', user, `تأشير المعاملة: ${cert.serial}`, cert.id);
                await notificationService.create({ userId: 'usr-3', message: `تأشيرة جديدة بانتظار اعتمادك: ${dispName}`, type: 'approve' });
            } else {
                await dbService.approveFinal(cert.id, user, comments || 'تم الاعتماد النهائي والمصادقة الرسمية.');
                await auditService.log('APPROVE_CERTIFICATE', user, `اعتماد نهائي: ${cert.serial}`, cert.id);
                await notificationService.create({ userId: cert.createdBy, message: `تمت المصادقة النهائية لشهادة: ${dispName}`, type: 'approve' });
            }
            setComments('');
            await loadCertDetails();
        } catch (e) {
            alert('خطأ أثناء الاعتماد: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReturnForEdit = async () => {
        if (!comments) { alert('يرجى كتابة سبب الإعادة'); return; }
        setProcessing(true);
        try {
            await dbService.returnForEdit(cert.id, user, comments);
            await auditService.log('RETURN_FOR_EDIT', user, `إعادة: ${cert.serial}`, cert.id);
            await notificationService.create({ userId: cert.createdBy, message: `تمت إعادة المعاملة ${cert.serial} للتعديل. الملاحظة: ${comments}`, type: 'pending' });
            setComments('');
            await loadCertDetails();
        } catch (e) {
            alert('خطأ أثناء الإعادة: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!comments) { alert('يرجى كتابة سبب الرفض'); return; }
        if (!window.confirm('هل أنت متأكد من رفض هذا الطلب نهائياً؟')) return;
        setProcessing(true);
        try {
            await dbService.reject(cert.id, user, comments);
            await auditService.log('REJECT_CERTIFICATE', user, `رفض: ${cert.serial}`, cert.id);
            await notificationService.create({ userId: cert.createdBy, message: `تم رفض طلب اعتماد شهادة: ${getRecipientDisplayName(cert)}`, type: 'reject' });
            setComments('');
            await loadCertDetails();
        } catch (e) {
            alert('خطأ أثناء الرفض: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const getApprovedSettings = () => {
        if (!cert) return settings;
        return {
            ...settings,
            directorName: cert.managerSnapshot?.directorName || settings?.directorName,
            directorTitle: cert.managerSnapshot?.directorTitle || settings?.directorTitle,
            directorSignature: cert.managerSnapshot?.directorSignature || settings?.directorSignature,
            visaName: cert.assistantSnapshot?.visaName || settings?.visaName,
            visaLabel: cert.assistantSnapshot?.visaLabel || settings?.visaLabel,
            visaSignature: cert.assistantSnapshot?.visaSignature || settings?.visaSignature,
            stamp: cert.managerSnapshot?.stamp || settings?.stamp,
            stampSize: cert.managerSnapshot?.stampSize || settings?.stampSize,
            stampRotation: cert.managerSnapshot?.stampRotation || settings?.stampRotation
        };
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await auditService.log('EXPORT_PDF', user, `تصدير PDF عبر محرك التصدير الافتراضي: ${cert.serial}`, cert.id);
            
            const previewName = getRecipientDisplayName(cert);
            const dataContext = {
                recipient_name: previewName,
                certificate_title: 'شهادة شكر وتقدير',
                reason: cert.reasonText || cert.reason || '',
                date: cert.date || '',
                serial_number: cert.serial,
                qr_code: cert.showQR ? `CERT:${cert.serial}|${previewName}` : ''
            };

            await ExportEngine.exportHeadless(
                template,
                dataContext,
                getApprovedSettings(),
                {
                    filename: `شهادة-${previewName}.pdf`,
                    format: 'pdf'
                }
            );
        } catch (e) {
            alert('فشل تصدير PDF: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = () => {
        auditService.log('PRINT_CERTIFICATE', user, `طباعة: ${cert.serial}`, cert.id);
        printElements([certRef.current], `شهادة - ${getRecipientDisplayName(cert)}`);
    };

    /* ── Loading Skeleton ── */
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton" style={{ height: '56px', borderRadius: '14px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px' }}>
                    <div className="skeleton" style={{ height: '480px', borderRadius: '20px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div className="skeleton" style={{ height: '160px', borderRadius: '20px' }} />
                        <div className="skeleton" style={{ height: '160px', borderRadius: '20px' }} />
                        <div className="skeleton" style={{ height: '120px', borderRadius: '20px' }} />
                    </div>
                </div>
            </div>
        );
    }

    const certData = {
        recipientName: getRecipientDisplayName(cert),
        event: cert.event,
        date: cert.date,
        serial: cert.serial,
    };

    const isFinalOrArchived = cert.status === 'FINAL_APPROVED' || cert.status === 'ARCHIVED';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Header Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '16px',
                padding: '14px 20px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-surface)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            width: 36, height: 36,
                            borderRadius: '10px',
                            border: '1.5px solid var(--border-strong)',
                            background: 'var(--bg-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    >
                        <ArrowRight size={16} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: 'var(--text-subtitle)', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                            تفاصيل المعاملة #{cert.serial}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            {getStatusBadge(cert.status)}
                        </div>
                    </div>
                </div>

                {isFinalOrArchived && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={Printer}>
                            طباعة
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleExport} isLoading={exporting} leftIcon={Download}>
                            تنزيل PDF
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Split Layout: 7/5 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '20px', alignItems: 'start' }}>

                {/* LEFT: Certificate Preview */}
                <div style={{ position: 'sticky', top: '80px' }}>
                    <Card>
                        {/* Toolbar */}
                        <div style={{
                            padding: '12px 16px',
                            background: '#0D1117',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: '#10B981',
                                    animation: 'spin 2s linear infinite',
                                    animationName: 'pulse',
                                    boxShadow: '0 0 6px rgba(16,185,129,0.6)',
                                }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                                    معاينة المستند المباشر
                                </span>
                            </div>
                            <span style={{
                                fontSize: '10px', fontWeight: 700,
                                color: 'rgba(15,169,88,0.9)',
                                background: 'rgba(15,169,88,0.12)',
                                border: '1px solid rgba(15,169,88,0.20)',
                                padding: '2px 10px',
                                borderRadius: '999px',
                                letterSpacing: '0.05em',
                            }}>
                                A4 LANDSCAPE
                            </span>
                        </div>

                        {/* Preview Canvas */}
                        <div
                            ref={previewContainerRef}
                            style={{
                                background: '#1a1f2e',
                                minHeight: '360px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden',
                                position: 'relative',
                                padding: '20px',
                            }}
                        >
                            {/* dot pattern */}
                            <div style={{
                                position: 'absolute', inset: 0,
                                backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
                                backgroundSize: '20px 20px',
                                pointerEvents: 'none',
                            }} />
                            <div style={{
                                transform: `scale(${scale})`,
                                transformOrigin: 'center center',
                                width: '297mm', height: '210mm',
                                flexShrink: 0,
                                position: 'relative', zIndex: 2,
                            }}>
                                <UnifiedCertificateEngine
                                    ref={certRef}
                                    mode="preview"
                                    template={template}
                                    layers={editorLayers}
                                    canvasWidth={canvasWidth}
                                    data={certData}
                                    settings={getApprovedSettings()}
                                    showQR={cert.showQR}
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: Info + Timeline + Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* ── Metadata ── */}
                    <Card>
                        <CardHeader>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: 32, height: 32,
                                    borderRadius: '10px',
                                    background: 'rgba(15,169,88,0.10)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <FileText size={15} color="#0FA958" />
                                </div>
                                <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    بيانات المعاملة
                                </h3>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {[
                                    { label: 'اسم صاحب الطلب', value: getRecipientDisplayName(cert) },
                                    { label: 'المناسبة / الموضوع', value: cert.event },
                                    { label: 'التاريخ المطبوع', value: cert.date, mono: true },
                                    { label: 'منشئ المعاملة', value: cert.creatorName || 'مستخدم النظام' },
                                    { label: 'الحالة الإجرائية', value: getStatusBadge(cert.status), isNode: true },
                                ].map((row, i, arr) => (
                                    <div
                                        key={row.label}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 0',
                                            borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                            gap: '16px',
                                        }}
                                    >
                                        <span style={{ fontSize: 'var(--text-label)', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                                            {row.label}
                                        </span>
                                        {row.isNode ? row.value : (
                                            <span style={{
                                                fontSize: 'var(--text-label)',
                                                fontWeight: 700,
                                                color: 'var(--text-primary)',
                                                textAlign: 'left',
                                                fontFamily: row.mono ? 'monospace' : 'inherit',
                                            }}>
                                                {row.value}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Timeline ── */}
                    <Card>
                        <CardHeader>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: 32, height: 32,
                                    borderRadius: '10px',
                                    background: 'rgba(245,158,11,0.10)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Clock size={15} color="#F59E0B" />
                                </div>
                                <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    مسار الموافقات
                                </h3>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div style={{ position: 'relative' }}>
                                {/* Vertical line */}
                                {(cert.workflowHistory || []).length > 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        right: '15px', top: '28px', bottom: '28px',
                                        width: '2px',
                                        background: 'var(--border-default)',
                                    }} />
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {(cert.workflowHistory || []).map((step, idx) => {
                                        const isLast = idx === (cert.workflowHistory.length - 1);
                                        const stageLabels = {
                                            DRAFT:               '📝 صياغة المسودة',
                                            PENDING_APPROVAL:    '📤 رفع للاعتماد',
                                            APPROVED_BY_ASSISTANT:'🔏 تأشير المساعد',
                                            FINAL_APPROVED:      '✅ اعتماد نهائي',
                                            RETURNED_FOR_EDIT:   '⚠️ إعادة للتعديل',
                                            REJECTED:            '❌ رفض نهائي',
                                        };

                                        return (
                                            <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                {/* Dot */}
                                                <div style={{
                                                    width: 32, height: 32,
                                                    borderRadius: '50%',
                                                    background: isLast ? 'rgba(15,169,88,0.10)' : 'var(--bg-muted)',
                                                    border: `2px solid ${isLast ? 'var(--color-primary-500)' : 'var(--border-default)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                    position: 'relative', zIndex: 2,
                                                }}>
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: isLast ? 'var(--color-primary-500)' : 'var(--border-strong)',
                                                    }} />
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
                                                    <div style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                                        gap: '8px', marginBottom: '4px',
                                                    }}>
                                                        <h4 style={{
                                                            fontSize: 'var(--text-label)', fontWeight: 800,
                                                            color: isLast ? 'var(--color-primary-700)' : 'var(--text-secondary)',
                                                        }}>
                                                            {stageLabels[step.stage] || step.stage}
                                                        </h4>
                                                        <span style={{
                                                            fontSize: 'var(--text-micro)', color: 'var(--text-muted)',
                                                            fontWeight: 600, flexShrink: 0,
                                                        }}>
                                                            {new Date(step.timestamp).toLocaleDateString('ar-SA')}
                                                        </span>
                                                    </div>
                                                    <p style={{
                                                        fontSize: 'var(--text-micro)', color: 'var(--text-muted)',
                                                        fontWeight: 600, marginBottom: step.comments ? '6px' : 0,
                                                    }}>
                                                        {step.user}
                                                    </p>
                                                    {step.comments && (
                                                        <div style={{
                                                            padding: '8px 12px',
                                                            background: 'var(--bg-subtle)',
                                                            border: '1px solid var(--border-default)',
                                                            borderRadius: '10px',
                                                            fontSize: 'var(--text-micro)',
                                                            color: 'var(--text-tertiary)',
                                                            fontWeight: 500,
                                                            lineHeight: 1.6,
                                                        }}>
                                                            {step.comments}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Decision Panel ── */}
                    {canTakeDecision() ? (
                        <div style={{
                            background: 'linear-gradient(145deg, #0d1117, #161b22)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                            overflow: 'hidden',
                        }}>
                            {/* Panel header */}
                            <div style={{
                                padding: '14px 20px',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                                <Sparkles size={15} color="#F59E0B" />
                                <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: '#F59E0B' }}>
                                    لوحة القرار الإداري
                                </span>
                            </div>

                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Comments Textarea */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{
                                        fontSize: 'var(--text-label)', fontWeight: 700,
                                        color: 'rgba(255,255,255,0.55)',
                                    }}>
                                        الملاحظات والمرئيات (تظهر في السجل):
                                    </label>
                                    <textarea
                                        value={comments}
                                        onChange={e => setComments(e.target.value)}
                                        rows={3}
                                        placeholder="اكتب ملاحظاتك أو سبب الإعادة هنا..."
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1.5px solid rgba(255,255,255,0.10)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            color: 'rgba(255,255,255,0.85)',
                                            fontSize: 'var(--text-label)',
                                            fontFamily: 'var(--font-sans)',
                                            outline: 'none',
                                            resize: 'vertical',
                                            lineHeight: 1.6,
                                            direction: 'rtl',
                                        }}
                                        onFocus={e => { e.target.style.borderColor = '#0FA958'; e.target.style.boxShadow = '0 0 0 3px rgba(15,169,88,0.12)'; }}
                                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'none'; }}
                                    />
                                </div>

                                {/* Secondary actions */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <button
                                        onClick={handleReturnForEdit}
                                        disabled={processing}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1.5px solid rgba(245,158,11,0.25)',
                                            background: 'rgba(245,158,11,0.08)',
                                            color: '#F59E0B',
                                            fontSize: 'var(--text-label)', fontWeight: 800,
                                            cursor: processing ? 'not-allowed' : 'pointer',
                                            fontFamily: 'var(--font-sans)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!processing) { e.currentTarget.style.background = 'rgba(245,158,11,0.14)'; }}}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; }}
                                    >
                                        <AlertTriangle size={13} />
                                        إعادة للتعديل
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={processing}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '10px',
                                            border: '1.5px solid rgba(239,68,68,0.25)',
                                            background: 'rgba(239,68,68,0.08)',
                                            color: '#EF4444',
                                            fontSize: 'var(--text-label)', fontWeight: 800,
                                            cursor: processing ? 'not-allowed' : 'pointer',
                                            fontFamily: 'var(--font-sans)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { if (!processing) { e.currentTarget.style.background = 'rgba(239,68,68,0.14)'; }}}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                    >
                                        <XCircle size={13} />
                                        رفض الطلب
                                    </button>
                                </div>

                                {/* Primary Approve */}
                                <button
                                    onClick={handleApprove}
                                    disabled={processing}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        background: processing ? 'rgba(15,169,88,0.5)' : 'linear-gradient(135deg, #0d7a3e, #0FA958)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: 'var(--text-body-sm)', fontWeight: 900,
                                        cursor: processing ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: processing ? 'none' : '0 8px 20px rgba(15,169,88,0.30)',
                                        transition: 'all 0.2s',
                                        fontFamily: 'var(--font-sans)',
                                    }}
                                    onMouseEnter={e => { if (!processing) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,169,88,0.40)'; }}}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = processing ? 'none' : '0 8px 20px rgba(15,169,88,0.30)'; }}
                                >
                                    {processing ? (
                                        <>
                                            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                            جارٍ المعالجة...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={16} />
                                            {user.role === 'ASSISTANT_MANAGER'
                                                ? 'التأشير والرفع للمدير العام'
                                                : 'المصادقة والاعتماد النهائي'
                                            }
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '24px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '20px',
                            textAlign: 'center',
                            boxShadow: 'var(--shadow-card)',
                        }}>
                            <div style={{
                                width: 48, height: 48,
                                borderRadius: '14px',
                                background: 'var(--bg-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 12px',
                            }}>
                                <ShieldCheck size={22} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
                            </div>
                            <h4 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                                القرار الإداري مقفل
                            </h4>
                            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.6 }}>
                                {cert.status === 'FINAL_APPROVED'        && 'هذا المستند معتمد نهائياً ومحمي.'}
                                {cert.status === 'REJECTED'              && 'هذا الطلب مرفوض وملفه مغلق.'}
                                {cert.status === 'DRAFT'                 && 'الطلب لا يزال في مرحلة المسودة.'}
                                {cert.status === 'PENDING_APPROVAL'      && user.role === 'GENERAL_MANAGER' && 'بانتظار تأشير المساعد أولاً.'}
                                {cert.status === 'APPROVED_BY_ASSISTANT' && user.role === 'CREATOR'         && 'بانتظار اعتماد المدير العام.'}
                                {cert.status === 'RETURNED_FOR_EDIT'     && 'أُعيد الطلب للمنشئ للتعديل.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Responsive */}
            <style>{`
                @media (max-width: 1024px) {
                    .approval-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
}
