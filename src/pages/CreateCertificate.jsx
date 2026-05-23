/**
 * 📝 CreateCertificate.jsx — Enterprise MoH Healthcare Dashboard
 * Creator's Workspace: Template + Form = Certificate (No Canvas allowed)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSerial } from '../hooks/useSerial';
import { dbService, auditService, notificationService } from '../services/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Send, LayoutTemplate, QrCode } from 'lucide-react';
import TemplateRenderer from '../engine/TemplateRenderer/TemplateRenderer';
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';

function useScaleFactor(containerRef) {
    const [width, setWidth] = useState(800);
    useEffect(() => {
        function measure() {
            const el = containerRef.current;
            if (!el) return;
            const containerW = el.clientWidth - 48; // padding offset
            const containerH = el.clientHeight - 80; // header and padding offset
            
            // A4 aspect ratio
            const A4_ASPECT = 297 / 210;
            
            // Calculate width based on constraining to either width or height
            let finalWidth = containerW;
            let expectedHeight = containerW / A4_ASPECT;
            
            if (expectedHeight > containerH && containerH > 0) {
                // Constrain by height
                finalWidth = containerH * A4_ASPECT;
            }
            
            setWidth(finalWidth);
        }
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        measure();
        return () => ro.disconnect();
    }, [containerRef]);
    return width;
}

export default function CreateCertificate() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');
    const { getNextSerial, consumeSerial } = useSerial();
    const previewContainerRef = useRef(null);
    const renderWidth = useScaleFactor(previewContainerRef);

    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [formData, setFormData] = useState({
        recipientName: '',
        event: '',
        date: new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' }),
        reason: '',
        showQR: true
    });
    const [serialInput, setSerialInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!editId);

    // Load official templates
    useEffect(() => {
        const stored = localStorage.getItem('official_templates');
        if (stored) {
            const parsed = JSON.parse(stored);
            setTemplates(parsed.filter(t => t.status === 'OFFICIAL'));
            if (parsed.length > 0 && !editId) {
                setSelectedTemplateId(parsed[0].id);
            }
        }
    }, []);

    // Load edit data
    useEffect(() => {
        if (editId) {
            dbService.getById(editId).then(cert => {
                if (cert) {
                    setFormData({
                        recipientName: cert.recipientName,
                        event: cert.event,
                        date: cert.date,
                        reason: cert.reasonText || cert.reason || cert.event,
                        showQR: cert.showQR !== false
                    });
                    setSerialInput(cert.serial);
                    if (cert.templateId) setSelectedTemplateId(cert.templateId);
                }
                setInitialLoading(false);
            }).catch(e => {
                console.error(e);
                setInitialLoading(false);
            });
        }
    }, [editId]);

    const activeTemplate = templates.find(t => t.id === selectedTemplateId) || null;

    const handleSave = async (submitForApproval = false) => {
        if (!formData.recipientName || !formData.event || !formData.reason) {
            alert('الرجاء إكمال جميع الحقول الإلزامية.');
            return;
        }

        setLoading(true);
        try {
            const finalSerial = serialInput.trim() || consumeSerial();
            const payload = {
                recipientName: formData.recipientName,
                event: formData.event,
                reasonText: formData.reason,
                date: formData.date,
                serial: finalSerial,
                showQR: formData.showQR,
                templateId: selectedTemplateId,
                status: 'DRAFT',
                createdBy: user.id,
                creatorName: user.name,
                workflowHistory: []
            };

            let certId = editId;
            if (editId) {
                await dbService.update(editId, payload);
            } else {
                const newCert = await dbService.create(payload);
                certId = newCert.id;
            }

            if (submitForApproval) {
                await dbService.submitForApproval(certId, user);
                await auditService.log('CREATE_CERTIFICATE', user, `إنشاء ورفع معاملة للاعتماد: ${formData.recipientName}`);
                await notificationService.create({
                    userId: 'usr-2',
                    message: `شهادة جديدة بانتظار مراجعتك: ${formData.recipientName}`,
                    type: 'pending',
                    link: `/approvals/${certId}`
                });
                alert('تم رفع المعاملة بنجاح.');
                navigate('/my-certificates');
            } else {
                await auditService.log('UPDATE_CERTIFICATE', user, `حفظ مسودة: ${formData.recipientName}`);
                alert('تم حفظ المسودة بنجاح.');
                navigate('/my-certificates');
            }
        } catch (e) {
            alert('خطأ: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div>جارٍ التحميل...</div>;

    const dataContext = {
        recipient_name: formData.recipientName,
        certificate_title: 'شهادة شكر وتقدير',
        reason: formData.reason,
        date: formData.date,
        serial_number: serialInput || getNextSerial(),
        qr_code: formData.showQR ? `CERT:${serialInput || getNextSerial()}|${formData.recipientName}` : ''
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            
            <PageHeader
                title={editId ? 'تعديل المعاملة' : 'إنشاء معاملة جديدة'}
                subtitle="قم باختيار القالب الرسمي وتعبئة النموذج وسيتم دمج البيانات آلياً."
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
                
                {/* FORM PANEL */}
                <Card style={{ position: 'sticky', top: '20px' }}>
                    <CardHeader>
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>نموذج إدخال البيانات</h3>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <LayoutTemplate size={14} /> القالب المؤسسي المعتمد
                            </label>
                            <select
                                value={selectedTemplateId}
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                style={{
                                    padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', outline: 'none'
                                }}
                            >
                                <option value="" disabled>اختر قالباً...</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>اسم المستفيد الكامل *</label>
                            <input
                                type="text" value={formData.recipientName} onChange={e => setFormData(p => ({ ...p, recipientName: e.target.value }))}
                                placeholder="الاسم الثلاثي أو الرباعي"
                                style={{ padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>عنوان المناسبة *</label>
                            <input
                                type="text" value={formData.event} onChange={e => setFormData(p => ({ ...p, event: e.target.value }))}
                                placeholder="دورة تدريبية، مشروع..."
                                style={{ padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>سبب التكريم الأساسي *</label>
                            <textarea
                                rows={3} value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                                placeholder="نظير جهودكم وتفانيكم في..."
                                style={{ padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', outline: 'none', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>التاريخ المطبوع</label>
                                <input
                                    type="text" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                                    style={{ padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', outline: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>رقم المعاملة</label>
                                <input
                                    type="text" value={serialInput} onChange={e => setSerialInput(e.target.value)} placeholder={`تلقائي: ${getNextSerial()}`}
                                    style={{ padding: '10px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 700, fontFamily: 'monospace', background: 'var(--bg-muted)', outline: 'none', direction: 'ltr', textAlign: 'right' }}
                                />
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                            <input type="checkbox" checked={formData.showQR} onChange={e => setFormData(p => ({ ...p, showQR: e.target.checked }))} style={{ accentColor: 'var(--color-primary-600)' }} />
                            <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><QrCode size={14} /> تضمين رمز الاستجابة (QR)</span>
                        </label>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <Button variant="outline" style={{ flex: 1 }} onClick={() => handleSave(false)} disabled={loading} leftIcon={Save}>
                                حفظ مسودة
                            </Button>
                            <Button variant="primary" style={{ flex: 1.5 }} onClick={() => handleSave(true)} disabled={loading} leftIcon={Send}>
                                إرسال للاعتماد
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* LIVE PREVIEW PANEL */}
                <div ref={previewContainerRef} style={{ flex: 1, background: 'var(--bg-muted)', borderRadius: 'var(--radius-xl)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-default)', minHeight: 'calc(100vh - 150px)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--text-muted)' }}>المعاينة الحية التلقائية</h3>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-primary-600)', background: 'var(--color-success-bg)', padding: '4px 8px', borderRadius: '4px' }}>Smart Preview Active</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
                        <TemplateRenderer template={activeTemplate} dataContext={dataContext} width={renderWidth} />
                    </div>
                </div>

            </div>
        </div>
    );
}
