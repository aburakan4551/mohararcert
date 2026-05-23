/**
 * 🗃️ BatchCreate.jsx — Enterprise MoH Healthcare Dashboard
 * Import Excel records and batch-generate certificates using the new Template System.
 */

import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TemplateRenderer from '../engine/TemplateRenderer/TemplateRenderer';
import ExcelImporter from '../components/ExcelImporter';
import { useSerial } from '../hooks/useSerial';
import { useAuth } from '../context/AuthContext';
import { dbService, auditService, notificationService } from '../services/db';
import {
    Save, Database, FileText, CheckCircle2, ChevronRight,
    AlertCircle, Sparkles, LayoutTemplate, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';

export default function BatchCreate() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('official_templates');
        if (stored) {
            const parsed = JSON.parse(stored).filter(t => t.status === 'OFFICIAL');
            setTemplates(parsed);
            if (parsed.length > 0) setSelectedTemplateId(parsed[0].id);
        }
    }, []);

    const activeTemplate = templates.find(t => t.id === selectedTemplateId) || null;

    const { consumeMultiple } = useSerial();

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
                // Artificial delay to show progress and avoid overwhelming IndexedDB too fast in batch
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
        } catch (e) {
            alert('حدث خطأ أثناء الحفظ: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const StepIndicator = () => (
        <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
            {[
                { s: 1, label: 'القالب' },
                { s: 2, label: 'الأسماء' },
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
                subtitle="استيراد قوائم المستفيدين وإصدار الشهادات دفعة واحدة على قالب موحد."
            />
            <StepIndicator />

            <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    
                    {step === 1 && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <LayoutTemplate size={16} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>اختر قالب الشهادة للدفعة</h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                                    <select
                                        value={selectedTemplateId}
                                        onChange={e => setSelectedTemplateId(e.target.value)}
                                        style={{ padding: '12px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-label)', fontWeight: 600, background: 'var(--bg-surface)', outline: 'none' }}
                                    >
                                        <option value="" disabled>اختر قالباً...</option>
                                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <Button variant="primary" onClick={() => setStep(2)} rightIcon={ChevronRight} disabled={!selectedTemplateId}>
                                        التالي: استيراد الأسماء
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {step === 2 && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Database size={16} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>استيراد الأسماء من ملف Excel</h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ maxWidth: '600px' }}>
                                    <ExcelImporter onImport={handleImport} />
                                    
                                    {names.length > 0 && (
                                        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontWeight: 800 }}>
                                                <CheckCircle2 size={18} />
                                                تم استيراد {names.length} اسم بنجاح.
                                            </div>
                                            <Button variant="primary" onClick={() => setStep(3)} rightIcon={ChevronRight}>التالي: تعبئة البيانات الموحدة</Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {step === 3 && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={16} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>البيانات الموحدة للدفعة</h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>عنوان المناسبة الموحد *</label>
                                        <input type="text" value={commonData.event} onChange={e => setCommonData(p => ({ ...p, event: e.target.value }))} style={{ padding: '12px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>سبب التكريم الموحد *</label>
                                        <textarea rows={3} value={commonData.reasonText} onChange={e => setCommonData(p => ({ ...p, reasonText: e.target.value }))} style={{ padding: '12px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', resize: 'vertical' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>التاريخ المطبوع</label>
                                        <input type="text" value={commonData.date} onChange={e => setCommonData(p => ({ ...p, date: e.target.value }))} style={{ padding: '12px', border: '1.5px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Button variant="outline" onClick={() => setStep(2)}>رجوع</Button>
                                        <Button variant="primary" onClick={handleGenerateSerials} rightIcon={ChevronRight} style={{ flex: 1 }}>توليد الأرقام التسلسلية والمراجعة</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {step === 4 && (
                        <Card>
                            <CardHeader>
                                <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>مراجعة الدفعة النهائية</h3>
                            </CardHeader>
                            <CardContent>
                                {saveDone ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0', textAlign: 'center' }}>
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                                            <Sparkles size={40} />
                                        </motion.div>
                                        <div>
                                            <h2 style={{ fontSize: 'var(--text-title)', fontWeight: 900 }}>تم الاستيراد بنجاح!</h2>
                                            <p style={{ color: 'var(--text-muted)' }}>تم إنشاء {names.length} معاملة {commonData.directSubmit ? 'وإرسالها للاعتماد' : 'كمسودات'}.</p>
                                        </div>
                                        <Button variant="primary" onClick={() => navigate('/my-certificates')}>الانتقال إلى المعاملات</Button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 700 }}>عدد الشهادات</span>
                                                <span style={{ fontSize: 'var(--text-title)', fontWeight: 900 }}>{names.length}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 700 }}>الإجراء المطلوب</span>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={commonData.directSubmit} onChange={e => setCommonData(p => ({ ...p, directSubmit: e.target.checked }))} style={{ accentColor: 'var(--color-primary-600)' }} />
                                                    <span style={{ fontWeight: 800 }}>رفع فوري للاعتماد بدلاً من مسودة</span>
                                                </label>
                                            </div>
                                        </div>
                                        
                                        {saving ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '24px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                                                <span style={{ fontWeight: 800 }}>جاري معالجة الدفعة... {saveProgress}%</span>
                                                <div style={{ width: '100%', height: '8px', background: 'var(--border-default)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${saveProgress}%`, height: '100%', background: 'var(--color-primary-600)', transition: 'width 0.2s' }} />
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <Button variant="outline" onClick={() => setStep(3)}>تعديل البيانات</Button>
                                                <Button variant="primary" style={{ flex: 1 }} onClick={handleBulkSave} leftIcon={commonData.directSubmit ? Send : Save}>
                                                    {commonData.directSubmit ? 'رفع دفعة كاملة للاعتماد الآن' : 'حفظ دفعة المسودات'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
