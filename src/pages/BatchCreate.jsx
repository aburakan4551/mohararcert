/**
 * 🗃️ BatchCreate.jsx — Enterprise MoH Healthcare Dashboard
 * Import Excel records and batch-generate certificates.
 */

import React, { useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import ExcelImporter from '../components/ExcelImporter';
import { useTemplates } from '../hooks/useTemplates';
import { useLayers } from '../hooks/useLayers';
import { useSerial } from '../hooks/useSerial';
import { useAuth } from '../context/AuthContext';
import { dbService, auditService, notificationService } from '../services/db';
import {
    Save, Database, FileText, CheckCircle2, ChevronRight,
    AlertCircle, Sparkles, LayoutTemplate, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';

const BRANCH_TEMPLATE_NAME = 'شهادة شكر وتقدير الفرع';

export default function BatchCreate() {
    const { user, settings } = useAuth();
    const navigate = useNavigate();
    const { templates, getTemplate, activeTemplateId } = useTemplates();
    const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplateId || (templates[0]?.id));
    
    const { layers, canvasWidth } = useLayers(selectedTemplateId || 'default');
    const activeTemplate = useMemo(() => getTemplate(selectedTemplateId), [selectedTemplateId, getTemplate]);

    const { getNextSerial, consumeMultiple } = useSerial();

    const [names, setNames] = useState([]);
    const [commonData, setCommonData] = useState({
        event: '',
        reasonText: '',
        date: new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' }),
        showQR: true,
        directSubmit: false
    });
    const [serials, setSerials] = useState([]);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [saveDone, setSaveDone] = useState(false);

    const certRefs = useRef({});

    const handleImport = (importedNames) => {
        setNames(importedNames);
        setSerials([]);
        setSaveDone(false);
    };

    const handleGenerateSerials = () => {
        if (!commonData.event.trim()) return alert('الرجاء إدخال عنوان المناسبة');
        if (!commonData.reasonText.trim()) return alert('الرجاء إدخال سبب التكريم');
        
        const newSerials = consumeMultiple(names.length);
        setSerials(newSerials);
        setStep(4);
    };

    const handleBulkSave = async () => {
        if (names.length === 0 || serials.length === 0) return;
        setSaving(true);
        setSaveProgress(0);
        
        const targetStatus = commonData.directSubmit ? 'PENDING_APPROVAL' : 'DRAFT';
        
        try {
            for (let i = 0; i < names.length; i++) {
                const nameItem = names[i];
                const serial = serials[i];
                
                const payload = {
                    recipientName: nameItem.name,
                    event: commonData.event,
                    reasonText: commonData.reasonText,
                    date: commonData.date,
                    serial: serial,
                    showQR: commonData.showQR,
                    status: targetStatus,
                    templateId: selectedTemplateId,
                    createdBy: user.id,
                    creatorName: user.name,
                    comments: targetStatus === 'PENDING_APPROVAL' ? 'مستورد — مرفوع فوري' : 'مستورد — مسودة',
                };
                
                const newCert = await dbService.create(payload);
                if (targetStatus === 'PENDING_APPROVAL') {
                    await dbService.submitForApproval(newCert.id, user);
                }
                
                setSaveProgress(Math.round(((i + 1) / names.length) * 100));
                await new Promise(r => setTimeout(r, 40));
            }
            
            await auditService.log('CREATE_CERTIFICATE', user, `استيراد دفعة: ${names.length} شهادة (${targetStatus})`);
            
            if (targetStatus === 'PENDING_APPROVAL') {
                await notificationService.create({
                    userId: 'usr-2',
                    message: `دفعة شهادات جديدة (${names.length}) بانتظار المراجعة`,
                    type: 'pending'
                });
            }
            
            setSaveDone(true);
            logger.api('اكتمل حفظ الدفعة');
        } catch (e) {
            logger.error('خطأ الدفعة', e);
            alert('حدث خطأ أثناء الحفظ: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const StepIndicator = () => (
        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            {[
                { s: 1, label: 'القالب' },
                { s: 2, label: 'استيراد الأسماء' },
                { s: 3, label: 'البيانات' },
                { s: 4, label: 'مراجعة واعتماد' }
            ].map(({ s, label }, i) => (
                <div key={s} style={{
                    flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: step === s ? 'var(--color-primary-600)' : step > s ? 'var(--bg-subtle)' : 'transparent',
                    color: step === s ? 'white' : step > s ? 'var(--color-success)' : 'var(--text-tertiary)',
                    borderRight: i < 3 ? '1px solid var(--border-default)' : 'none',
                    transition: 'all 0.2s',
                    fontWeight: 800, fontSize: 'var(--text-micro)'
                }}>
                    <span style={{
                        width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: step === s ? 'rgba(255,255,255,0.2)' : step > s ? 'var(--color-success-bg)' : 'var(--bg-muted)',
                        color: step === s ? 'white' : step > s ? 'var(--color-success)' : 'var(--text-muted)'
                    }}>{s}</span>
                    <span className="hidden sm:inline">{label}</span>
                </div>
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <PageHeader
                title="إنشاء دفعة شهادات (Excel)"
                subtitle="استيراد قوائم المستفيدين وإصدار الشهادات دفعة واحدة بضغطة زر"
            />

            <StepIndicator />

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* ── Step 1 ── */}
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <LayoutTemplate size={16} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>اختر قالب الشهادة للدفعة</h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                                    <select
                                        value={selectedTemplateId || ''}
                                        onChange={e => setSelectedTemplateId(e.target.value || null)}
                                        style={{
                                            padding: '12px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', fontFamily: 'var(--font-sans)', outline: 'none'
                                        }}
                                    >
                                        <option value="">التصميم الكلاسيكي</option>
                                        {templates.map(t => (
                                            <option key={t.id} value={t.id}>{t.name === 'قالب شهادة' ? BRANCH_TEMPLATE_NAME : t.name}</option>
                                        ))}
                                    </select>
                                    <Button variant="primary" onClick={() => setStep(2)} rightIcon={ChevronRight} disabled={!selectedTemplateId}>
                                        التالي: استيراد الأسماء
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Step 2 ── */}
                    {step === 2 && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Database size={16} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>استيراد الأسماء من Excel</h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ExcelImporter onImport={handleImport} />
                                {names.length > 0 && (
                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                                        <Button variant="outline" onClick={() => setStep(1)}>السابق</Button>
                                        <Button variant="primary" onClick={() => setStep(3)} rightIcon={ChevronRight}>
                                            التالي: صياغة البيانات
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Step 3 ── */}
                    {step === 3 && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={16} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>البيانات المشتركة للدفعة ({names.length} مستفيد)</h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>عنوان المناسبة</label>
                                        <input type="text" value={commonData.event} onChange={e => setCommonData(p => ({ ...p, event: e.target.value }))} style={{ padding: '10px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>سبب التكريم</label>
                                        <textarea rows="3" value={commonData.reasonText} onChange={e => setCommonData(p => ({ ...p, reasonText: e.target.value }))} style={{ padding: '10px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', outline: 'none', resize: 'vertical' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>التاريخ المطبوع</label>
                                        <input type="text" value={commonData.date} onChange={e => setCommonData(p => ({ ...p, date: e.target.value }))} style={{ padding: '10px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={commonData.showQR} onChange={e => setCommonData(p => ({ ...p, showQR: e.target.checked }))} style={{ accentColor: 'var(--color-primary-600)' }} />
                                            <span style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>تضمين رمز QR</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={commonData.directSubmit} onChange={e => setCommonData(p => ({ ...p, directSubmit: e.target.checked }))} style={{ accentColor: 'var(--color-warning)' }} />
                                            <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--color-warning)' }}>الرفع فوراً للاعتماد (تخطي المسودة)</span>
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                        <Button variant="outline" onClick={() => setStep(2)}>السابق</Button>
                                        <Button variant="primary" onClick={handleGenerateSerials} rightIcon={ChevronRight} disabled={!commonData.event || !commonData.reasonText}>
                                            توليد الأرقام التسلسلية والمراجعة
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ── Step 4 ── */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <Card>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={16} style={{ color: 'var(--color-warning)' }} />
                                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            مراجعة واعتماد الدفعة
                                        </h3>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {saving && (
                                        <div style={{ padding: '20px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: 'var(--text-micro)', fontWeight: 800 }}>
                                                <span>جاري الاعتماد والإدراج...</span>
                                                <span style={{ color: 'var(--color-primary-600)' }}>{saveProgress}%</span>
                                            </div>
                                            <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', background: 'var(--color-primary-600)', width: `${saveProgress}%`, transition: 'width 0.2s' }} />
                                            </div>
                                        </div>
                                    )}

                                    {saveDone && (
                                        <div style={{ padding: '20px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)', fontWeight: 800, fontSize: 'var(--text-body-sm)' }}>
                                                <CheckCircle2 size={18} /> تم إدراج وإصدار الدفعة بنجاح!
                                            </div>
                                            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                تم إنشاء {names.length} شهادة (من #{serials[0]} إلى #{serials[serials.length - 1]}).
                                            </p>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                                <Button variant="primary" onClick={() => navigate('/registry')} size="sm">الذهاب للسجل</Button>
                                                <Button variant="outline" onClick={() => navigate('/dashboard')} size="sm">الرئيسية</Button>
                                            </div>
                                        </div>
                                    )}

                                    {!saving && !saveDone && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ padding: '16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)' }}>
                                                <p style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--color-warning)' }}>
                                                    أنت على وشك إصدار {names.length} شهادة دفعة واحدة وحالتها ستكون: {commonData.directSubmit ? 'مرفوعة للاعتماد مباشرة' : 'مسودة محلية'}.
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Button variant="outline" onClick={() => setStep(3)}>السابق للبيانات</Button>
                                                <Button variant="primary" onClick={handleBulkSave} leftIcon={commonData.directSubmit ? Send : Save}>
                                                    {commonData.directSubmit ? 'توليد وتقديم الدفعة' : 'حفظ كمسودات'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Batch Preview Grid */}
                            {!saving && !saveDone && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                    {names.map((item, i) => (
                                        <div key={i} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
                                            <div style={{ padding: '8px 12px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>شهادة {i + 1}</span>
                                                <code style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)' }}>#{serials[i]}</code>
                                            </div>
                                            <div style={{ height: '140px', background: '#1a1f2e', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ transform: 'scale(0.18)', transformOrigin: 'center center', width: '297mm', height: '210mm', position: 'absolute' }}>
                                                    <UnifiedCertificateEngine
                                                        ref={el => { certRefs.current[`cert-${i}`] = el; }}
                                                        mode="preview" template={activeTemplate} layers={layers} canvasWidth={canvasWidth} settings={settings} showQR={commonData.showQR}
                                                        data={{ recipientName: item.name, event: commonData.event, date: commonData.date, serial: serials[i], status: commonData.directSubmit ? 'PENDING_APPROVAL' : 'DRAFT' }}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ padding: '12px', borderTop: '1px solid var(--border-default)', fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.name}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

        </div>
    );
}
