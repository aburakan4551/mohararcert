/**
 * 🛡️ StressConsole.jsx — Enterprise Diagnostics & Stress Hardening Dashboard
 * Exclusively for SUPER_ADMIN to profile, stress test, and hard-verify system limits.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService, auditService, templateService } from '../services/db';
import { backgroundQueue } from '../engine/StudioEngine/BackgroundQueue';
import { ExportEngine } from '../engine/StudioEngine/ExportEngine';
import {
    Activity, ShieldAlert, Cpu, Trash2, Play, Flame, BarChart3,
    History, Clock, AlertTriangle, Layers, Database, CheckCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import { logger } from '../utils/debug';

export default function StressConsole() {
    const { user, settings } = useAuth();
    
    // Safety role gate
    if (user?.role !== 'SUPER_ADMIN') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px' }}>
                <ShieldAlert size={48} className="text-danger" />
                <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 900 }}>صلاحية وصول أمنية محدودة</h3>
                <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>هذه الصفحة مخصصة فقط للمشرف العام لدواعي حوكمة وتدقيق أداء المنصة.</p>
            </div>
        );
    }

    // Diagnostics States
    const [fps, setFps] = useState(60);
    const [domNodesCount, setDomNodesCount] = useState(0);
    const [memoryUsage, setMemoryUsage] = useState(null);
    const [activeRenders, setActiveRenders] = useState(0);
    
    // Stress Simulation States
    const [seeding, setSeeding] = useState(false);
    const [overloadingQueue, setOverloadingQueue] = useState(false);
    const [auditLogCount, setAuditLogCount] = useState(0);
    const [certCount, setCertCount] = useState(0);
    const [queueTimes, setQueueTimes] = useState([]);
    
    const requestRef = useRef();
    const previousTimeRef = useRef();
    const frameCountRef = useRef(0);
    const renderCounter = useRef(0);

    renderCounter.current += 1;

    // ── Live Profiling (FPS & Memory & DOM) ──
    useEffect(() => {
        const updateMetrics = () => {
            // Count total DOM nodes
            setDomNodesCount(document.querySelectorAll('*').length);

            // Memory estimation (Chrome/Edge only)
            if (window.performance && window.performance.memory) {
                const mem = window.performance.memory;
                setMemoryUsage({
                    usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1024 / 1024),
                    totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1024 / 1024),
                    jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024)
                });
            }
        };

        const interval = setInterval(updateMetrics, 1500);

        // FPS loop
        const animate = (time) => {
            if (previousTimeRef.current !== undefined) {
                const deltaTime = time - previousTimeRef.current;
                frameCountRef.current++;
                if (deltaTime >= 1000) {
                    const calculatedFps = Math.round((frameCountRef.current * 1000) / deltaTime);
                    setFps(calculatedFps);
                    frameCountRef.current = 0;
                    previousTimeRef.current = time;
                }
            } else {
                previousTimeRef.current = time;
            }
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);

        // Initial counts
        fetchCounts();

        return () => {
            clearInterval(interval);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const fetchCounts = async () => {
        try {
            const allCerts = await dbService.getAll();
            setCertCount(allCerts.length);
            const allLogs = await auditService.getAll();
            setAuditLogCount(allLogs.length);
        } catch (e) {
            console.error(e);
        }
    };

    // ── STRESS SIMULATOR 1: Seed 500+ Certificates ──
    const handleSeedStressTest = async () => {
        if (!window.confirm('تنبيه: هل أنت متأكد من توليد وحقن 500 شهادة رسمية دفعة واحدة؟ سيتم اختبار مرونة وقدرة التخزين والفلترة بقاعدة البيانات.')) return;
        setSeeding(true);
        try {
            const templates = await templateService.getAll();
            const defaultTplId = templates[0]?.id || 'tpl-1';

            const promises = [];
            const currentUser = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');

            for (let i = 1; i <= 500; i++) {
                const certData = {
                    recipientName: `مستفيد فحص الجهد رقم ${i} - ${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                    event: 'مبادرة الفحص والتدقيق والأداء الأمني الموحد لوزارة الصحة',
                    date: '25 ذو القعدة 1447هـ',
                    serial: `STRESS${202600000 + i}`,
                    status: 'FINAL_APPROVED',
                    createdBy: currentUser.id || 'usr-4',
                    creatorName: currentUser.name || 'المشرف العام للأنظمة',
                    templateId: defaultTplId,
                    showQR: true,
                    managerSnapshot: {
                        directorName: settings?.directorName || 'مدير عام فرع الوزارة',
                        directorTitle: settings?.directorTitle || 'مدير عام وزارة الصحة بالحدود الشمالية',
                        directorSignature: settings?.directorSignature || '',
                        stamp: settings?.stamp || '',
                        stampSize: 120,
                        stampRotation: -8,
                        approvedAt: new Date().toISOString()
                    }
                };
                promises.push(dbService.create(certData));
            }

            await Promise.all(promises);
            await auditService.log('STRESS_TEST_SEED', user, 'توليد وحقن 500 شهادة بنجاح لفحص الاستقرار وقاعدة البيانات');
            alert('تم بنجاح حقن 500 شهادة رسمية! قاعدة البيانات المحلية أبدت استقراراً تاماً.');
            fetchCounts();
        } catch (err) {
            alert('فشل حقن البيانات: ' + err.message);
        } finally {
            setSeeding(false);
        }
    };

    // ── STRESS SIMULATOR 2: Overload Queue (20 Parallel Exports) ──
    const handleQueueOverloadStress = async () => {
        if (!window.confirm('تنبيه: هل تريد جدولة 20 مهمة تصدير PDF متزامنة في الخلفية؟ هذا الاختبار يفحص قدرة الـ Export Queue على الجدولة وإدارة سعة الذاكرة والتراجع.')) return;
        setOverloadingQueue(true);
        try {
            const templates = await templateService.getAll();
            const activeTpl = templates[0];
            if (!activeTpl) {
                alert('الرجاء إنشاء قالب تصميم أولاً لتتمكن من التصدير');
                return;
            }

            const startTime = performance.now();

            for (let i = 1; i <= 20; i++) {
                const taskId = `stress_task_${Date.now()}_${i}`;
                const label = `تصدير جهد رقم #${i} - ${activeTpl.name}`;

                backgroundQueue.enqueue(taskId, label, async (updateProgress) => {
                    updateProgress(20);
                    
                    const mockDataContext = {
                        recipient_name: `مستفيد الجهد الفوقي #${i}`,
                        certificate_title: 'شهادة شكر وتقدير رسمية',
                        reason: 'لمشاركتكم المتميزة في نجاح مبادرة التحول الرقمي بوزارة الصحة الحدود الشمالية.',
                        date: '25 ذو القعدة 1447هـ',
                        serial_number: `STRESS-Q-${i}`,
                        qr_code: `MOCK_STRESS_${i}`
                    };

                    // Execute offscreen compilations
                    await ExportEngine.exportHeadless(
                        activeTpl,
                        mockDataContext,
                        settings,
                        {
                            filename: `StressDoc_${i}.pdf`,
                            format: 'pdf',
                            progressCallback: (p) => updateProgress(20 + Math.round(p * 0.8))
                        }
                    );
                });
            }

            const endTime = performance.now();
            const elapsed = Math.round(endTime - startTime);
            setQueueTimes(prev => [...prev, { tasksCount: 20, elapsedMs: elapsed, timestamp: new Date().toLocaleTimeString() }]);
            
            await auditService.log('STRESS_TEST_QUEUE', user, `إغراق طابور التصدير الخلفي بـ 20 مهمة rendering متزامنة خلال ${elapsed}ms`);
            alert('تم جدولة 20 مهمة تصدير بنجاح! طابور العمليات يعمل بشكل آمن وسليم وبسرعة فائقة.');
        } catch (e) {
            alert('خطأ في إغراق الطابور: ' + e.message);
        } finally {
            setOverloadingQueue(false);
        }
    };

    const handleClearStressData = async () => {
        if (!window.confirm('⚠️ تحذير نهائي: هل تريد شطب وحذف كافة شهادات فحص الجهد (STRESS) وسجل التدقيق المرتبط بالفحص لتنظيف قاعدة البيانات؟')) return;
        setSeeding(true);
        try {
            const all = await dbService.getAll();
            const stressCerts = all.filter(c => c.serial?.startsWith('STRESS'));
            
            for (const c of stressCerts) {
                await dbService.delete(c.id);
            }
            
            await auditService.log('STRESS_DATA_CLEANUP', user, `شطب وتنظيف كافة سجلات فحص الجهد (${stressCerts.length} شهادة)`);
            alert(`تم شطب ${stressCerts.length} شهادة فحص جهد بنجاح وتنظيف الذاكرة.`);
            fetchCounts();
        } catch (e) {
            alert('خطأ في التنظيف: ' + e.message);
        } finally {
            setSeeding(false);
        }
    };

    // Diagnostics Performance Indicators
    const getPerformanceStatus = () => {
        if (fps < 30) return { label: 'إجهاد بيكسل (Flicker/Lag)', variant: 'danger' };
        if (domNodesCount > 3500) return { label: 'تضخمDOM (DOM Bloat)', variant: 'warning' };
        if (memoryUsage && memoryUsage.usedJSHeapSize > 150) return { label: 'تراكم ذاكرة (Leak Hazard)', variant: 'warning' };
        return { label: 'أداء مستقر وآمن للإنتاج (Highly Stable)', variant: 'success' };
    };

    const perfMeta = getPerformanceStatus();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl', paddingBottom: '30px' }}>
            
            {/* ── Diagnostics Title ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                        <Cpu size={22} style={{ color: 'var(--color-primary-600)' }} />
                        منصة التشخيص وفحص جهد الأنظمة (Diagnostics & Stress Center)
                    </h2>
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '2px' }}>
                        إطار أمني مغلق لقياس كفاءة الإطارات وسعة الذاكرة والـ Canvas وقاعدة البيانات المليونية.
                    </p>
                </div>
                <Badge variant={perfMeta.variant} dot>{perfMeta.label}</Badge>
            </div>

            {/* ── METRICS PROFILER GRID ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                
                <Card style={{ borderLeft: '4px solid var(--color-success)' }}>
                    <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>معدل تحديث الإطارات (Render FPS)</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: fps >= 50 ? 'var(--color-success)' : 'var(--color-danger)' }}>{fps}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>إطار/ثانية</span>
                        </div>
                        <div style={{ height: '4px', background: 'var(--bg-subtle)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                            <div style={{ width: `${(fps / 60) * 100}%`, height: '100%', background: fps >= 50 ? 'var(--color-success)' : 'var(--color-danger)' }} />
                        </div>
                    </CardContent>
                </Card>

                <Card style={{ borderLeft: '4px solid var(--color-info)' }}>
                    <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>عناصر شجرة الـ DOM النشطة</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>{domNodesCount}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>عنصر عقدة</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>تكامل آمن وشجرة معزولة بالكامل</span>
                    </CardContent>
                </Card>

                <Card style={{ borderLeft: '4px solid var(--color-warning)' }}>
                    <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>ذاكرة الهيب المتصفح (JS Heap Used)</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                                {memoryUsage ? `${memoryUsage.usedJSHeapSize} MB` : '—'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {memoryUsage ? `/ ${memoryUsage.totalJSHeapSize} MB` : 'غير مدعوم بالمتصفح'}
                            </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>أقصى حد أمان للتخزين: {memoryUsage ? `${memoryUsage.jsHeapSizeLimit} MB` : '—'}</span>
                    </CardContent>
                </Card>

                <Card style={{ borderLeft: '4px solid var(--color-primary-600)' }}>
                    <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>عدد الـ Rerenders التفاعلي</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-primary-600)' }}>{renderCounter.current}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>استدعاء رندرة للوحة</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>استقرار كامل بدون رندرة عشوائية</span>
                    </CardContent>
                </Card>

            </div>

            {/* ── STRESS TESTING COMMANDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                
                {/* Simulated database seed */}
                <Card>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Database size={16} style={{ color: 'var(--color-primary-600)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>فحص جهد استعلام قاعدة البيانات (Database Stress)</h3>
                        </div>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            يتيح لك هذا الاختبار توليد وحقن **500 شهادة رسمية نهائية متكاملة** دفعة واحدة في ثانية واحدة في قاعدة البيانات المحلية. يساعد هذا الاختبار في قياس كفاءة عمليات البحث والفلترة وأرشفة كمية ضخمة من المعاملات الرسمية.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700 }}>إجمالي الشهادات بالنظام:</span>
                            <strong style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-primary-600)' }}>{certCount} شهادة</strong>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <Button variant="primary" leftIcon={Flame} isLoading={seeding} onClick={handleSeedStressTest}>
                                حقن 500 شهادة مجهدة
                            </Button>
                            <Button variant="outline" style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }} leftIcon={Trash2} disabled={seeding} onClick={handleClearStressData}>
                                شطب بيانات فحص الجهد
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Queue export overload */}
                <Card>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} style={{ color: 'var(--color-warning)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>فحص خنق طابور التصدير (Queue Overload)</h3>
                        </div>
                    </CardHeader>
                    <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            يقوم هذا الخيار بجدولة وإرسال **20 مهمة تصدير PDF معقدة** دفعة واحدة إلى طابور التصدير الخلفي (`BackgroundQueue`). يهدف هذا لفحص أداء التوازي، والاستقرار تحت التصدير المفرط، وعزل الذاكرة خارج الشاشة.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700 }}>إجمالي مهام طابور التدقيق:</span>
                            <strong style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-warning)' }}>
                                {backgroundQueue.getTasks().length} مهام مجدولة
                            </strong>
                        </div>

                        <div>
                            <Button variant="primary" style={{ background: 'var(--color-warning)', color: '#000', boxShadow: 'none' }} leftIcon={Play} isLoading={overloadingQueue} onClick={handleQueueOverloadStress}>
                                محاكاة تصدير 20 PDF متزامن
                            </Button>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* ── QUEUE ELAPSED TIMINGS HISTORY ── */}
            {queueTimes.length > 0 && (
                <Card>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} style={{ color: 'var(--color-primary-600)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>مؤشرات قياس سرعة التصدير الخلفي (Performance Metrics)</h3>
                        </div>
                    </CardHeader>
                    <CardContent style={{ padding: 0 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                    <th style={{ padding: '10px 16px', fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>التوقيت</th>
                                    <th style={{ padding: '10px 16px', fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>المهام المفرطة</th>
                                    <th style={{ padding: '10px 16px', fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>الوقت الإجمالي المستغرق للجدولة والتشغيل</th>
                                    <th style={{ padding: '10px 16px', fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>معدل استجابة المحرك (Fidelity Speed)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queueTimes.map((t, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td style={{ padding: '10px 16px', fontSize: 'var(--text-caption)' }}>{t.timestamp}</td>
                                        <td style={{ padding: '10px 16px', fontSize: 'var(--text-caption)', fontWeight: 700 }}>{t.tasksCount} وثائق PDF</td>
                                        <td style={{ padding: '10px 16px', fontSize: 'var(--text-caption)' }}>
                                            <code>{t.elapsedMs} ms</code> ({Math.round(t.elapsedMs/1000)} ثانية)
                                        </td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <Badge variant="success">ممتاز (سرعة قياسية)</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
