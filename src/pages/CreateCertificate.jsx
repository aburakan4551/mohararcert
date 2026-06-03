/**
 * 📝 CreateCertificate.jsx — Enterprise Bulk Certificate Management System
 * Creator's Workspace: Dual Mode (Single Certificate & Bulk Excel Import)
 * No Canvas tools allowed here, just Forms + Live Preview.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSerial } from '../hooks/useSerial';
import { dbService, auditService, notificationService, templateService } from '../services/db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Save, Send, LayoutTemplate, QrCode, FileSpreadsheet, UserPlus, Database, ChevronLeft, ChevronRight, AlertTriangle, FileText } from 'lucide-react';
import TemplateRenderer from '../engine/TemplateRenderer/TemplateRenderer';
import ExcelImporter from '../components/ExcelImporter';
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';

function useScaleFactor(containerRef, aspect) {
    const [width, setWidth] = useState(800);
    useEffect(() => {
        function measure() {
            const el = containerRef.current;
            if (!el) return;
            const containerW = el.clientWidth - 48; // padding
            const containerH = el.clientHeight - 48; // padding
            
            let finalWidth = containerW;
            let expectedHeight = containerW / aspect;
            
            if (expectedHeight > containerH && containerH > 0) {
                finalWidth = containerH * aspect;
            }
            setWidth(finalWidth);
        }
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        measure();
        return () => ro.disconnect();
    }, [containerRef, aspect]);
    return width;
}


export default function CreateCertificate() {
    const { user, settings } = useAuth();

    // ── Official Titles: read from system-settings (Single Source of Truth) ──
    // Reads settings.official_titles (new key) or settings.prefixes (legacy alias)
    const officialTitles = settings?.official_titles || settings?.prefixes || [];
    console.log('[CreateCertificate] officialTitles from settings:', officialTitles);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('id');
    const { getNextSerial, consumeSerial, consumeMultiple } = useSerial();
    
    const previewContainerRef = useRef(null);

    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const [mode, setMode] = useState('single'); // 'single' | 'bulk'

    // Form State (Single & Common Bulk Fields)
    const [formData, setFormData] = useState({
        internalTitle: '',
        prefix: '',
        recipientName: '',
        event: '',
        date: new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' }),
        reason: '',
        showQR: true
    });

    const [serialInput, setSerialInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!editId);

    // Bulk State
    const [bulkNames, setBulkNames] = useState([]);
    const [bulkPreviewIndex, setBulkPreviewIndex] = useState(0);
    const [bulkProgress, setBulkProgress] = useState(0);

    // Compute orientation-aware aspect ratio for the preview container
    const activeTemplate = templates.find(t => t.id === selectedTemplateId) || null;
    const templateOrientation = activeTemplate?.orientation || 'portrait';
    // Landscape: 297/210 ≈ 1.414, Portrait: 210/297 ≈ 0.707
    const a4Aspect = templateOrientation === 'landscape' ? (297 / 210) : (210 / 297);
    const renderWidth = useScaleFactor(previewContainerRef, a4Aspect);

    // Load templates from unified database provider
    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const data = await templateService.getAll();
                const officials = (data || []).filter(t => t.status === 'OFFICIAL');
                setTemplates(officials);
                if (officials.length > 0 && !editId) {
                    setSelectedTemplateId(officials[0].id);
                }
            } catch (e) {
                console.error("Failed to load official templates:", e);
            }
        };
        fetchTemplates();
    }, [editId]);

    // Load edit data if single
    useEffect(() => {
        if (editId) {
            dbService.getById(editId).then(cert => {
                if (cert) {
                    const getRawName = (c) => {
                        if (c.rawName) return c.rawName;
                        let name = c.recipientName || '';
                        if (c.prefix) {
                            if (name.startsWith(`${c.prefix}/ `)) return name.substring(c.prefix.length + 2);
                            if (name.startsWith(`${c.prefix} `)) return name.substring(c.prefix.length + 1);
                        }
                        return name;
                    };
                    setFormData({
                        internalTitle: cert.internalTitle || '',
                        prefix: cert.prefix || '',
                        recipientName: getRawName(cert),
                        event: cert.event || '',
                        date: cert.date || '',
                        reason: cert.reasonText || cert.reason || cert.event || '',
                        showQR: cert.showQR !== false
                    });
                    setSerialInput(cert.serial || '');
                    if (cert.templateId) setSelectedTemplateId(cert.templateId);
                }
                setInitialLoading(false);
            }).catch(() => setInitialLoading(false));
        }
    }, [editId]);


    const handleSaveSingle = async (submitForApproval = false) => {
        if (!formData.recipientName || !formData.event || !formData.reason) {
            return alert('الرجاء إكمال الحقول الإلزامية للمستفيد والمناسبة.');
        }

        setLoading(true);
        try {
            const finalSerial = serialInput.trim() || consumeSerial();
            const fullName = formData.prefix ? `${formData.prefix} ${formData.recipientName}` : formData.recipientName;
            
            const payload = {
                internalTitle: formData.internalTitle,
                recipientName: formData.recipientName, // Stored without prefix as requested
                event: formData.event,
                reasonText: formData.reason,
                date: formData.date,
                serial: finalSerial,
                showQR: formData.showQR,
                templateId: selectedTemplateId,
                status: 'DRAFT',
                createdBy: user.id,
                creatorName: user.name,
                prefix: formData.prefix,
                rawName: formData.recipientName
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
                await auditService.log('CREATE_CERTIFICATE', user, `إنشاء ورفع معاملة: ${fullName}`);
                alert('تم إرسال الشهادة للاعتماد بنجاح.');
            } else {
                await auditService.log('UPDATE_CERTIFICATE', user, `حفظ مسودة: ${fullName}`);
                alert('تم حفظ المسودة بنجاح.');
            }
            navigate('/my-certificates');
        } catch (e) {
            alert('خطأ: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSave = async (submitForApproval = false) => {
        if (!formData.event || !formData.reason) return alert('الرجاء تعبئة بيانات المناسبة المشتركة');
        if (bulkNames.length === 0) return alert('لا يوجد أسماء مستوردة للدفعة');

        setLoading(true);
        setBulkProgress(0);

        try {
            const serials = consumeMultiple(bulkNames.length);
            const targetStatus = submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT';

            for (let i = 0; i < bulkNames.length; i++) {
                const row = bulkNames[i];
                // Assume row can have prefix column, else use global prefix, or no prefix
                const rowPrefix = row.prefix || formData.prefix;
                const finalName = rowPrefix ? `${rowPrefix} ${row.name}` : row.name;

                const payload = {
                    internalTitle: formData.internalTitle ? `${formData.internalTitle} - ${i+1}` : '',
                    recipientName: row.name, // Stored without prefix as requested
                    event: formData.event,
                    reasonText: formData.reason,
                    date: formData.date,
                    serial: serials[i],
                    showQR: formData.showQR,
                    templateId: selectedTemplateId,
                    status: targetStatus,
                    createdBy: user.id,
                    creatorName: user.name,
                    prefix: rowPrefix,
                    rawName: row.name
                };

                const newCert = await dbService.create(payload);
                if (submitForApproval) {
                    await dbService.submitForApproval(newCert.id, user);
                }
                setBulkProgress(Math.round(((i + 1) / bulkNames.length) * 100));
                await new Promise(r => setTimeout(r, 10)); // Prevent thread lock
            }

            await auditService.log('BULK_CREATE', user, `إنشاء دفعة من ${bulkNames.length} شهادة (${targetStatus})`);
            alert(`تم ${submitForApproval ? 'إرسال' : 'حفظ'} الدفعة بنجاح!`);
            navigate('/my-certificates');
        } catch (e) {
            alert('خطأ أثناء الحفظ الجماعي: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) return <div>جارٍ التحميل...</div>;

    // Resolve context for live preview
    const previewName = mode === 'single' 
        ? (formData.prefix ? `${formData.prefix} ${formData.recipientName}` : formData.recipientName)
        : (bulkNames.length > 0 ? (bulkNames[bulkPreviewIndex].prefix || formData.prefix ? `${bulkNames[bulkPreviewIndex].prefix || formData.prefix} ${bulkNames[bulkPreviewIndex].name}` : bulkNames[bulkPreviewIndex].name) : '[الاسم]');

    const dataContext = {
        recipient_name: previewName,
        certificate_title: 'شهادة شكر وتقدير',
        reason: formData.reason,
        date: formData.date,
        serial_number: serialInput || getNextSerial(),
        qr_code: formData.showQR ? `CERT:${serialInput || getNextSerial()}|${previewName}` : ''
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
            
            <PageHeader
                title="مساحة عمل إصدار الشهادات"
                subtitle="إصدار الشهادات واعتمادها بناءً على قوالب المؤسسة الرسمية."
                actions={
                    !editId && (
                        <div style={{ display: 'flex', background: 'var(--bg-muted)', borderRadius: 'var(--radius-lg)', padding: '4px', gap: '4px' }}>
                            <Button variant={mode === 'single' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('single')} leftIcon={UserPlus}>مستفيد واحد</Button>
                            <Button variant={mode === 'bulk' ? 'primary' : 'ghost'} size="sm" onClick={() => setMode('bulk')} leftIcon={FileSpreadsheet}>دفعة مستفيدين (Excel)</Button>
                        </div>
                    )
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px', alignItems: 'start' }}>
                
                {/* 📝 FORM PANEL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Template Selection */}
                    <Card>
                        <CardHeader><h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>بيانات القالب والتصنيف</h3></CardHeader>
                        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>القالب المؤسسي المعتمد</label>
                                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', outline: 'none' }}>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FileText size={14} /> التصنيف الداخلي للملف (لا يُطبع)
                                </label>
                                <input
                                    type="text" value={formData.internalTitle} onChange={e => setFormData(p => ({ ...p, internalTitle: e.target.value }))}
                                    placeholder="مثال: دورة الجودة بجدة الدفعة الأولى"
                                    style={{ padding: '8px 12px', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)' }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Common Data */}
                    <Card>
                        <CardHeader><h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>البيانات المطبوعة المشتركة</h3></CardHeader>
                        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>عنوان المناسبة *</label>
                                <input type="text" value={formData.event} onChange={e => setFormData(p => ({ ...p, event: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>نص التكريم (Appreciation Text) *</label>
                                <textarea rows={4} value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>التاريخ المطبوع</label>
                                <input type="text" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} style={{ padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                                <input type="checkbox" checked={formData.showQR} onChange={e => setFormData(p => ({ ...p, showQR: e.target.checked }))} style={{ accentColor: 'var(--color-primary-600)' }} />
                                <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}><QrCode size={14} /> إدراج رمز الاستجابة السريع (QR)</span>
                            </label>
                        </CardContent>
                    </Card>

                    {/* Single Mode Specific */}
                    {mode === 'single' && (
                        <Card>
                            <CardHeader><h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>بيانات المستفيد</h3></CardHeader>
                            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>اللقب</label>
                                        <select
                                            value={formData.prefix}
                                            onChange={e => setFormData(p => ({ ...p, prefix: e.target.value }))}
                                            style={{ padding: '8px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}
                                        >
                                            <option value="">بدون</option>
                                            {officialTitles.map(title => (
                                                <option key={title} value={title}>{title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>الاسم الكامل *</label>
                                        <input type="text" value={formData.recipientName} onChange={e => setFormData(p => ({ ...p, recipientName: e.target.value }))} style={{ padding: '8px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: 'var(--text-micro)', fontWeight: 700 }}>رقم المعاملة (Serial)</label>
                                    <input type="text" value={serialInput} onChange={e => setSerialInput(e.target.value)} placeholder={`تلقائي: ${getNextSerial()}`} style={{ padding: '8px', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', direction: 'ltr', textAlign: 'right', fontFamily: 'monospace' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                    <Button variant="outline" style={{ flex: 1 }} onClick={() => handleSaveSingle(false)} disabled={loading} leftIcon={Save}>مسودة</Button>
                                    <Button variant="primary" style={{ flex: 1.5 }} onClick={() => handleSaveSingle(true)} disabled={loading} leftIcon={Send}>إرسال واعتماد</Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Bulk Mode Specific */}
                    {mode === 'bulk' && (
                        <Card>
                            <CardHeader><h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>استيراد الدفعة (Excel)</h3></CardHeader>
                            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                                <ExcelImporter onImport={(data) => { setBulkNames(data); setBulkPreviewIndex(0); }} />
                                {bulkNames.length > 0 && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontWeight: 800, fontSize: 'var(--text-micro)' }}>
                                            <span>تم استيراد {bulkNames.length} سجل بنجاح.</span>
                                            <Database size={14} />
                                        </div>
                                        {loading ? (
                                            <div style={{ background: 'var(--bg-muted)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: 'var(--text-label)', fontWeight: 800, marginBottom: '8px' }}>جاري الإصدار... {bulkProgress}%</div>
                                                <div style={{ width: '100%', height: '4px', background: 'var(--border-default)', borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${bulkProgress}%`, height: '100%', background: 'var(--color-primary-600)', transition: 'width 0.1s' }} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <Button variant="outline" style={{ flex: 1 }} onClick={() => handleBulkSave(false)} disabled={loading} leftIcon={Save}>حفظ الدفعة (مسودة)</Button>
                                                <Button variant="primary" style={{ flex: 1.5 }} onClick={() => handleBulkSave(true)} disabled={loading} leftIcon={Send}>إرسال الدفعة للاعتماد</Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* 👁️ LIVE PREVIEW PANEL */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                    
                    {mode === 'bulk' && bulkNames.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Button variant="outline" size="sm" disabled={bulkPreviewIndex === 0} onClick={() => setBulkPreviewIndex(i => i - 1)}><ChevronRight size={16} /></Button>
                                <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, minWidth: '80px', textAlign: 'center' }}>سجل {bulkPreviewIndex + 1} من {bulkNames.length}</span>
                                <Button variant="outline" size="sm" disabled={bulkPreviewIndex === bulkNames.length - 1} onClick={() => setBulkPreviewIndex(i => i + 1)}><ChevronLeft size={16} /></Button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(previewName.length > 50 || formData.reason.length > 300) && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-warning)', fontSize: 'var(--text-micro)', fontWeight: 700, background: 'rgba(245,158,11,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                        <AlertTriangle size={14} /> نص طويل جداً
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <div 
                        ref={previewContainerRef} 
                        style={{ flex: 1, background: '#101826', borderRadius: 'var(--radius-xl)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--border-default)', overflow: 'hidden', position: 'sticky', top: '20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--text-muted)' }}>المعاينة الحية التلقائية (Live Fidelity)</h3>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-primary-600)', background: 'var(--color-success-bg)', padding: '4px 10px', borderRadius: '6px' }}>Print Ready A4</span>
                        </div>

                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <div style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transition: 'all 0.2s' }}>
                                <TemplateRenderer template={activeTemplate} dataContext={dataContext} width={renderWidth} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
