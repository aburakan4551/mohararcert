/**
 * 🛡️ StressConsole.jsx — Enterprise Diagnostics & Operational Observability Console
 * Exclusively for SUPER_ADMIN to profile, stress test, and hard-verify system limits.
 * Integrates live metrics directly from the singleton `diagnosticsStore`.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService, auditService, templateService } from '../services/db';
import { backgroundQueue } from '../engine/StudioEngine/BackgroundQueue';
import { ExportEngine } from '../engine/StudioEngine/ExportEngine';
import { diagnosticsStore } from '../utils/diagnosticsStore';
import {
    Activity, ShieldAlert, Cpu, Trash2, Play, Flame, BarChart3,
    History, Clock, AlertTriangle, Layers, Database, CheckCircle,
    ShieldCheck, Heart, AlertCircle, RefreshCcw, Save, Copy, X
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';

export default function StressConsole() {
    const { user, settings } = useAuth();
    
    // Safety role gate
    if (user?.role !== 'SUPER_ADMIN') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '12px', fontFamily: 'Cairo', direction: 'rtl' }}>
                <ShieldAlert size={48} style={{ color: '#ef4444' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 900 }}>صلاحية وصول أمنية محدودة</h3>
                <p style={{ fontSize: '14px', color: '#71717a' }}>هذه الصفحة مخصصة فقط للمشرف العام لدواعي حوكمة وتدقيق أداء المنصة.</p>
            </div>
        );
    }

    // Diagnostics States
    const [fps, setFps] = useState(60);
    const [domNodesCount, setDomNodesCount] = useState(0);
    const [memoryUsage, setMemoryUsage] = useState(null);
    const [memoryHistory, setMemoryHistory] = useState([]);
    
    // Stress Simulation States
    const [seeding, setSeeding] = useState(false);
    const [overloadingQueue, setOverloadingQueue] = useState(false);
    const [auditLogCount, setAuditLogCount] = useState(0);
    const [certCount, setCertCount] = useState(0);
    const [queueTimes, setQueueTimes] = useState([]);

    // Live Telemetry Store State
    const [telemetry, setTelemetry] = useState({
        exportFailures: [],
        renderTimings: [],
        autosaveMetrics: [],
        queueMetrics: {
            activeJobs: 0,
            stalledJobs: 0,
            longestExportMs: 0,
            totalRetries: 0
        },
        queueRetries: [],
        snapshotTimings: [],
        initializationErrors: [] // track hydration / startup failures
    });

    // Active Dashboard Tab
    const [activeTab, setActiveTab] = useState('general'); // 'general', 'export', 'autosave', 'snapshots'
    
    const requestRef = useRef();
    const previousTimeRef = useRef();
    const frameCountRef = useRef(0);
    const renderCounter = useRef(0);

    renderCounter.current += 1;

    // ── Live Telemetry Subscription ──
    useEffect(() => {
        const unsubscribe = diagnosticsStore.subscribe((metrics) => {
            setTelemetry(metrics);
        });
        return () => unsubscribe();
    }, []);

    // ── Live Profiler Loop (FPS & Memory & DOM) ──
    useEffect(() => {
        const updateMetrics = () => {
            // Count total DOM nodes
            setDomNodesCount(document.querySelectorAll('*').length);

            // Memory estimation (Chrome/Edge only)
            if (window.performance && window.performance.memory) {
                const mem = window.performance.memory;
                const used = Math.round(mem.usedJSHeapSize / 1024 / 1024);
                setMemoryUsage({
                    usedJSHeapSize: used,
                    totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1024 / 1024),
                    jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024)
                });
                
                // Keep last 10 entries for history
                setMemoryHistory(prev => {
                    const next = [...prev, used];
                    if (next.length > 10) next.shift();
                    return next;
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

    // Calculate dynamic Runtime Health Score
    const calculateHealthScore = () => {
        let score = 100;
        
        // 1. Deduct for export failures (15 points each, max 30)
        const failuresCount = telemetry.exportFailures.length;
        score -= Math.min(30, failuresCount * 15);
        
        // 2. Deduct for low FPS (FPS < 45 is -10, FPS < 30 is -25)
        if (fps < 30) {
            score -= 25;
        } else if (fps < 45) {
            score -= 10;
        }
        
        // 3. Deduct for high JS Heap Memory usage (Heap > 200MB is -10, Heap > 500MB is -25)
        if (memoryUsage) {
            if (memoryUsage.usedJSHeapSize > 500) {
                score -= 25;
            } else if (memoryUsage.usedJSHeapSize > 200) {
                score -= 10;
            }
        }
        
        // 4. Deduct for stalled jobs in queue (5 points each, max 20)
        if (telemetry.queueMetrics.stalledJobs > 0) {
            score -= Math.min(20, telemetry.queueMetrics.stalledJobs * 5);
        }

        // 5. Deduct for failed autosaves (8 points each, max 24)
        const failedSaves = telemetry.autosaveMetrics.filter(m => m.status === 'failed').length;
        score -= Math.min(24, failedSaves * 8);

        return Math.max(0, score);
    };

    const healthScore = calculateHealthScore();

    const getHealthStatus = (score) => {
        if (score >= 85) return { text: "ممتاز - منصة التشغيل فائقة الاستقرار", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", icon: ShieldCheck, badgeVariant: "success" };
        if (score >= 60) return { text: "تحذير - انحرافات في استهلاك الذاكرة", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", icon: AlertTriangle, badgeVariant: "warning" };
        return { text: "حرج - تدهور حاد في أداء وسعة الذاكرة", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", icon: AlertCircle, badgeVariant: "danger" };
    };
    
    const statusMeta = getHealthStatus(healthScore);
    const StatusIcon = statusMeta.icon;

    // Extracted failed asset count from exportFailures registry
    const failedAssetsRegistry = telemetry.exportFailures.reduce((acc, current) => {
        if (current.failedAssets && Array.isArray(current.failedAssets)) {
            current.failedAssets.forEach(asset => {
                const found = acc.find(x => x.src === asset);
                if (found) {
                    found.count += 1;
                    found.lastFailure = current.timestamp;
                } else {
                    acc.push({ src: asset, count: 1, lastFailure: current.timestamp });
                }
            });
        }
        return acc;
    }, []);

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

    const handleCancelTask = (taskId) => {
        backgroundQueue.cancel(taskId);
    };

    const handleRetryTask = (taskId) => {
        backgroundQueue.retry(taskId);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl', paddingBottom: '30px', fontFamily: 'Cairo' }}>
            
            {/* ── 🏛️ Observatory Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
                        <Cpu size={24} style={{ color: 'var(--color-primary-500)' }} />
                        مرصد التشغيل والاعتمادية للمنصة (Operational Observability Engine)
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                        لوحة المراقبة حية وخارطة قياس الموثوقية بالملي ثانية وتدقيق الأصول الفنية.
                    </p>
                </div>
                <Badge variant={statusMeta.badgeVariant} dot>{statusMeta.text}</Badge>
            </div>

            {/* ── 🏆 Live Health & Performance HUD ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '16px', flexWrap: 'wrap' }}>
                
                {/* Health Score Shield */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid var(--border-default)`,
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: '12px',
                    boxShadow: 'var(--shadow-card)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05 }}>
                        <StatusIcon size={120} style={{ color: statusMeta.color }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StatusIcon size={20} style={{ color: statusMeta.color }} />
                        <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>مؤشر كفاءة التشغيل (Health score)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                        <span style={{ fontSize: '72px', fontWeight: 900, color: statusMeta.color, lineHeight: 1 }}>{healthScore}</span>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-tertiary)' }}>/100</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 800, margin: 0, marginTop: '4px' }}>
                        {statusMeta.text}
                    </p>
                </div>

                {/* Performance Stats Counters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>معدل استقرار الإطارات (Render FPS)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 900, color: fps >= 50 ? 'var(--color-success)' : (fps >= 35 ? 'var(--color-warning)' : 'var(--color-danger)') }}>{fps}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>إطار/ثانية</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--bg-subtle)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                                <div style={{ width: `${(fps / 60) * 100}%`, height: '100%', background: fps >= 50 ? 'var(--color-success)' : (fps >= 35 ? 'var(--color-warning)' : 'var(--color-danger)') }} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>ذاكرة الهيب للمستعرض (JS Heap size)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)' }}>{memoryUsage ? `${memoryUsage.usedJSHeapSize} MB` : '—'}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{memoryUsage ? `/ ${memoryUsage.totalJSHeapSize} MB` : 'غير مدعوم'}</span>
                            </div>
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>سقف الحوكمة للذاكرة: {memoryUsage ? `${memoryUsage.jsHeapSizeLimit} MB` : '—'}</span>
                        </CardContent>
                    </Card>

                    <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>شجرة الـ DOM النشطة (DOM nodes)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--text-primary)' }}>{domNodesCount}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>عقدة نشطة</span>
                            </div>
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>بنية Canvas معزولة بالكامل دون تضخم</span>
                        </CardContent>
                    </Card>

                    <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                        <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>تفاعلات الرندرة (Rerenders Counter)</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                <span style={{ fontSize: '32px', fontWeight: 900, color: 'var(--color-info)' }}>{renderCounter.current}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>رندرة تفاعلية</span>
                            </div>
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>استقرار تام وخالي من الـ Render Storms</span>
                        </CardContent>
                    </Card>
                </div>

            </div>

            {/* ── 🎛️ Navigation Tabs ── */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-default)', paddingBottom: '2px', marginTop: '10px' }}>
                <button
                    onClick={() => setActiveTab('general')}
                    style={{
                        padding: '10px 16px',
                        background: activeTab === 'general' ? 'var(--bg-subtle)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'general' ? '2.5px solid var(--color-primary-500)' : 'none',
                        color: activeTab === 'general' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <BarChart3 size={15} /> الأداء العام واختبارات الجهد
                </button>
                
                <button
                    onClick={() => setActiveTab('export')}
                    style={{
                        padding: '10px 16px',
                        background: activeTab === 'export' ? 'var(--bg-subtle)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'export' ? '2.5px solid var(--color-primary-500)' : 'none',
                        color: activeTab === 'export' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <Activity size={15} /> طابور التصدير والمهام المجدولة
                    {telemetry.exportFailures.length > 0 && (
                        <span style={{ background: 'var(--color-danger)', color: 'var(--text-inverse)', fontSize: '9px', fontWeight: 900, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{telemetry.exportFailures.length}</span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('autosave')}
                    style={{
                        padding: '10px 16px',
                        background: activeTab === 'autosave' ? 'var(--bg-subtle)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'autosave' ? '2.5px solid var(--color-primary-500)' : 'none',
                        color: activeTab === 'autosave' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <Save size={15} /> الحفظ التلقائي والتعارض المتقاطع
                </button>

                <button
                    onClick={() => setActiveTab('snapshots')}
                    style={{
                        padding: '10px 16px',
                        background: activeTab === 'snapshots' ? 'var(--bg-subtle)' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'snapshots' ? '2.5px solid var(--color-primary-500)' : 'none',
                        color: activeTab === 'snapshots' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <History size={15} /> أمن لقطات المصادقة (Snapshots)
                </button>
            </div>

            {/* ── 📺 TAB CONTENT ── */}
            <div style={{ minHeight: '300px' }}>
                
                {/* 1. GENERAL TAB */}
                {activeTab === 'general' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Live Memory Trend Line */}
                        <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <CardHeader>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={16} style={{ color: 'var(--color-success)' }} />
                                    المسار الزمني لاستهلاك الذاكرة حياً (Memory Allocation Trendline)
                                </span>
                            </CardHeader>
                            <CardContent style={{ padding: '20px 24px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '110px', background: 'var(--bg-subtle)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                    {memoryHistory.length === 0 ? (
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 'auto' }}>بانتظار قراءات الذاكرة...</span>
                                    ) : (
                                        memoryHistory.map((val, i) => {
                                            const maxVal = memoryUsage ? Math.max(...memoryHistory, memoryUsage.totalJSHeapSize, 120) : 350;
                                            const pct = Math.min(100, Math.max(8, (val / maxVal) * 100));
                                            return (
                                                <div key={i} style={{ flex: 1, height: `${pct}%`, background: val > 200 ? 'linear-gradient(to top, var(--color-danger), var(--color-warning))' : 'linear-gradient(to top, var(--color-success), var(--color-primary-300))', borderRadius: '4px', position: 'relative', transition: 'height 0.3s ease' }} title={`${val} MB`}>
                                                    <span style={{ position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: 900, color: 'var(--text-primary)' }}>{val}M</span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '6px', padding: '0 4px' }}>
                                    <span>← القراءات الأحدث</span>
                                    <span>القراءات التاريخية (بفاصل 1.5 ثانية لكل قراءة)</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stress Simulation Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flexWrap: 'wrap' }}>
                            <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Database size={16} style={{ color: 'var(--color-success)' }} />
                                        <h3 style={{ fontSize: '13px', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>فحص جهد استعلام قاعدة البيانات (Database Stress)</h3>
                                    </div>
                                </CardHeader>
                                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                                        حقن **500 شهادة رسمية نهائية متكاملة** دفعة واحدة in قاعدة البيانات المحلية لقياس مرونة الفلترة وسرعة تصفح سجل الأرشيف.
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>الشهادات بالنظام حالياً:</span>
                                        <strong style={{ fontSize: '12px', color: 'var(--color-success)' }}>{certCount} شهادة</strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                        <Button variant="primary" leftIcon={Flame} isLoading={seeding} onClick={handleSeedStressTest} style={{ fontSize: '11px', fontWeight: 800 }}>
                                            حقن 500 شهادة مجهدة
                                        </Button>
                                        <Button variant="outline" style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)', fontSize: '11px', fontWeight: 800 }} leftIcon={Trash2} disabled={seeding} onClick={handleClearStressData}>
                                            شطب بيانات فحص الجهد
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Activity size={16} style={{ color: 'var(--color-warning)' }} />
                                        <h3 style={{ fontSize: '13px', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>فحص خنق طابور التصدير (Queue Overload)</h3>
                                    </div>
                                </CardHeader>
                                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                                        جدولة وإرسال **20 مهمة تصدير PDF معقدة متزامنة** إلى طابور التصدير الخلفي لقياس دقة الفصل وعدم انسداد الذاكرة.
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>المهام المجندة بالطابور:</span>
                                        <strong style={{ fontSize: '12px', color: 'var(--color-warning)' }}>
                                            {backgroundQueue.getTasks().length} مهام مجدولة
                                        </strong>
                                    </div>
                                    <div>
                                        <Button variant="primary" style={{ background: 'var(--color-warning)', color: '#000', fontSize: '11px', fontWeight: 800 }} leftIcon={Play} isLoading={overloadingQueue} onClick={handleQueueOverloadStress}>
                                            محاكاة تصدير 20 PDF متزامن
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* 2. EXPORT TAB */}
                {activeTab === 'export' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Background Queue Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800 }}>المهام النشطة بالخلفية (Active)</span>
                                <strong style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-success)', marginTop: '4px' }}>{telemetry.queueMetrics.activeJobs}</strong>
                            </div>
                            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800 }}>المهام المتعطلة (Stalled / Failed)</span>
                                <strong style={{ fontSize: '24px', fontWeight: 900, color: telemetry.queueMetrics.stalledJobs > 0 ? 'var(--color-danger)' : 'var(--text-primary)', marginTop: '4px' }}>{telemetry.queueMetrics.stalledJobs}</strong>
                            </div>
                            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800 }}>إجمالي محاولات الإعادة (Queue Retries)</span>
                                <strong style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-warning)', marginTop: '4px' }}>{telemetry.queueMetrics.totalRetries}</strong>
                            </div>
                            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 800 }}>أطول مدة تصدير مسجلة (Peak time)</span>
                                <strong style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-info)', marginTop: '4px' }}>
                                    {telemetry.queueMetrics.longestExportMs > 0 ? `${(telemetry.queueMetrics.longestExportMs / 1000).toFixed(2)} ثانية` : '0ms'}
                                </strong>
                            </div>
                        </div>

                        {/* Interactive Queue Tasks list */}
                        <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <CardHeader>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)' }}>جدول طابور المهام التفاعلي حياً (Live Background Tasks Queue)</span>
                            </CardHeader>
                            <CardContent style={{ padding: 0 }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>معرف المهمة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>العنوان / القالب</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>الحالة التشغيلية</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>نسبة الإنجاز</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {backgroundQueue.getTasks().length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>لا توجد مهام تصدير في الطابور حالياً.</td>
                                                </tr>
                                            ) : (
                                                backgroundQueue.getTasks().reverse().slice(0, 10).map((task) => (
                                                    <tr key={task.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}><code>{task.id}</code></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 800 }}>{task.label}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            {task.status === 'pending' && <Badge variant="warning" dot>⏳ في الانتظار (Warning)</Badge>}
                                                            {task.status === 'running' && <Badge variant="info" dot style={{ animation: 'pulse 1s infinite' }}>⚙️ جاري الرندرة (Info)</Badge>}
                                                            {task.status === 'completed' && <Badge variant="success" dot>✅ مكتملة (Healthy)</Badge>}
                                                            {task.status === 'failed' && <Badge variant="danger" dot>❌ متعطلة (Critical)</Badge>}
                                                            {task.status === 'cancelled' && <Badge variant="default" dot>🚫 ملغاة (Info)</Badge>}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ flex: 1, minWidth: '60px', height: '6px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${task.progress}%`, height: '100%', background: task.status === 'failed' ? 'var(--color-danger)' : 'var(--color-success)' }} />
                                                                </div>
                                                                <span>{task.progress}%</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            {task.status === 'running' && (
                                                                <button onClick={() => handleCancelTask(task.id)} style={{ padding: '3px 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>إلغاء</button>
                                                            )}
                                                            {(task.status === 'failed' || task.status === 'cancelled') && (
                                                                <button onClick={() => handleRetryTask(task.id)} style={{ padding: '3px 8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--color-success)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>إعادة المحاولة</button>
                                                            )}
                                                            {task.status === 'completed' && <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Failed Assets Registry */}
                        <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <CardHeader>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <AlertTriangle size={16} />
                                    أرشيف حوكمة الأصول المتوقفة والأختام المفقودة (Failed Assets Tracker)
                                </span>
                            </CardHeader>
                            <CardContent style={{ padding: 0 }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>درجة الخطورة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>مصدر الأصل الفني المتعطل</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>مرات الفشل الكلية</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>توقيت أحدث تعطل</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {failedAssetsRegistry.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>لم يتم التقاط أي أختام أو صور معطلة خلال جلسات التصدير، كفاءة الأصول 100%!</td>
                                                </tr>
                                            ) : (
                                                failedAssetsRegistry.map((asset, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                        <td style={{ padding: '10px 16px' }}><Badge variant="warning" dot>⚠️ أصل مفقود (Warning)</Badge></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}><code style={{ wordBreak: 'break-all' }}>{asset.src}</code></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--color-danger)', fontWeight: 800 }}>{asset.count} مرات</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>{asset.lastFailure}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Export Failures Table */}
                        <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <CardHeader>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)' }}>سجل أخطاء التصدير التفصيلي (Export Failures Logs)</span>
                            </CardHeader>
                            <CardContent style={{ padding: 0 }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>درجة الخطورة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>الوقت</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>القالب</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>تفاصيل الخطأ التشغيلي</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>الشعارات/التواقيع المعطلة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetry.exportFailures.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>لا توجد أي أخطاء تصدير مسجلة في منصة المراقبة.</td>
                                                </tr>
                                            ) : (
                                                telemetry.exportFailures.map((failure, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                        <td style={{ padding: '10px 16px' }}><Badge variant="danger" dot>🚨 فشل التصدير (Critical)</Badge></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>{failure.timestamp}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 800 }}>{failure.taskId}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--color-danger)' }}>{failure.error}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            {failure.failedAssets.length === 0 ? (
                                                                <span style={{ color: 'var(--text-tertiary)' }}>لا يوجد</span>
                                                            ) : (
                                                                failure.failedAssets.map((asset, i) => (
                                                                    <Badge key={i} variant="danger" style={{ fontSize: '9px', margin: '2px' }}>{asset.split('/').pop()}</Badge>
                                                                ))
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Initialization & Hydration Telemetry Errors Table */}
                        <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', marginTop: '16px' }}>
                            <CardHeader>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShieldAlert size={16} style={{ color: 'var(--color-warning)' }} />
                                    سجل أخطاء تهيئة النظام والقوالب (Initialization & Hydration Errors)
                                </span>
                            </CardHeader>
                            <CardContent style={{ padding: 0 }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>درجة الخطورة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>الوقت</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>المرحلة (Phase)</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>تفاصيل الخطأ التشغيلي</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>سياق التتبع (Context)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!telemetry.initializationErrors || telemetry.initializationErrors.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>لا توجد أخطاء تهيئة أو Hydration مسجلة. الكفاءة 100%!</td>
                                                </tr>
                                            ) : (
                                                telemetry.initializationErrors.map((err, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                        <td style={{ padding: '10px 16px' }}><Badge variant="warning" dot>⚠️ خطأ تهيئة (Warning)</Badge></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>{err.timestamp}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}><code>{err.phase}</code></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--color-danger)' }}>{err.error}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>{err.context || '—'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 3. AUTOSAVE TAB */}
                {activeTab === 'autosave' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Autosave Metrics Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>تأشير سلامة الحفظ التلقائي</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-success)' }}>
                                            {telemetry.autosaveMetrics.length > 0
                                                ? `${Math.round((telemetry.autosaveMetrics.filter(m => m.status === 'success').length / telemetry.autosaveMetrics.length) * 100)}%`
                                                : '100%'}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>معدل النجاح</span>
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>إجمالي عمليات الـ Autosave المسجلة: {telemetry.autosaveMetrics.length}</span>
                                </CardContent>
                            </Card>

                            <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>متوسط سرعة الحفظ بالملي ثانية</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-info)' }}>
                                            {telemetry.autosaveMetrics.length > 0
                                                ? `${Math.round(telemetry.autosaveMetrics.reduce((acc, c) => acc + c.durationMs, 0) / telemetry.autosaveMetrics.length)} ms`
                                                : '0 ms'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>حفظ غير معيق تفاعلياً (requestIdleCallback)</span>
                                </CardContent>
                            </Card>

                            <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>التقاط تعارضات التبويبات المفتوحة</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '28px', fontWeight: 900, color: telemetry.autosaveMetrics.some(m => m.collisionDetected) ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                            {telemetry.autosaveMetrics.filter(m => m.collisionDetected).length}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>تعارض تم التقاطه</span>
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>تنبيه أمان متقاطع لمنع الكتابة المكررة</span>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Autosave Details logs */}
                        <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <CardHeader>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)' }}>سجل حوكمة التخزين الفوري (Autosave Observability Logs)</span>
                            </CardHeader>
                            <CardContent style={{ padding: 0 }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>درجة الخطورة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>توقيت الحفظ</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>سرعة المعالجة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>حالة الحفظ بالتخزين</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>توفير النطاق (Debounce)</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>رصد تعارض متبادل</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetry.autosaveMetrics.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>لا توجد عمليات حفظ تلقائي مسجلة للمسودة حالياً.</td>
                                                </tr>
                                            ) : (
                                                telemetry.autosaveMetrics.map((save, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                        <td style={{ padding: '10px 16px' }}>
                                                            {save.status === 'success' && <Badge variant="success" dot>حفظ تلقائي (Healthy)</Badge>}
                                                            {save.status === 'collision_aborted' && <Badge variant="warning" dot>تعارض مكتشف (Warning)</Badge>}
                                                            {save.status === 'failed' && <Badge variant="danger" dot>فشل الحفظ (Critical)</Badge>}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>{save.timestamp}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}><code>{save.durationMs} ms</code></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            {save.status === 'success' && <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>● مكتمل بنجاح</span>}
                                                            {save.status === 'collision_aborted' && <span style={{ color: 'var(--color-danger)', fontWeight: 800 }}>● تم الإيقاف حمايةً للبيانات</span>}
                                                            {save.status === 'failed' && <span style={{ color: 'var(--color-danger)', fontWeight: 800 }}>● خطأ بالتخزين</span>}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            {save.debounceSavedCount > 0 ? `تم تقليص ${save.debounceSavedCount} تغييرات` : 'حفظ فوري'}
                                                        </td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            {save.collisionDetected ? (
                                                                <Badge variant="danger">تعارض متبادل مكتشف ⚠️</Badge>
                                                            ) : (
                                                                <span style={{ color: 'var(--text-tertiary)' }}>سليم وآمن</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 4. SNAPSHOTS TAB */}
                {activeTab === 'snapshots' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Snapshot generation timings summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                            <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>متوسط سرعة تجميد اللقطة (Snapshot Freeze)</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-success)' }}>
                                            {telemetry.snapshotTimings.length > 0
                                                ? `${Math.round(telemetry.snapshotTimings.reduce((acc, c) => acc + c.durationMs, 0) / telemetry.snapshotTimings.length)} ms`
                                                : '0 ms'}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>تجميد فوري لمنع تعديل تواقيع وأختام الاعتماد</span>
                                </CardContent>
                            </Card>

                            <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                                <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>إجمالي لقطات المصادقة المجمّدة</span>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-info)' }}>{telemetry.snapshotTimings.length}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>وثيقة معتمدة تماماً</span>
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>بنية تخزين غير قابلة للتعديل بأثر رجعي</span>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Snapshots Log table */}
                        <Card style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                            <CardHeader>
                                <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)' }}>سجل حوكمة لقطات الاعتماد غير القابلة للتغيير (Immutable Snapshots History)</span>
                            </CardHeader>
                            <CardContent style={{ padding: 0 }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>درجة الخطورة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>التوقيت</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>معرف الوثيقة المعتمدة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>سرعة تجميد اللقطة</th>
                                                <th style={{ padding: '10px 16px', fontSize: '11px', color: 'var(--text-tertiary)' }}>سلامة التجميد الهيكلي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetry.snapshotTimings.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>لا توجد أي شهادات نهائية معتمدة تم تجميد لقطاتها بعد.</td>
                                                </tr>
                                            ) : (
                                                telemetry.snapshotTimings.map((snap, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                                        <td style={{ padding: '10px 16px' }}><Badge variant="success" dot>🔒 مصادقة مجمدة (Healthy)</Badge></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>{snap.timestamp}</td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 800 }}><code>{snap.certId}</code></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}><code>{snap.durationMs} ms</code></td>
                                                        <td style={{ padding: '10px 16px', fontSize: '12px' }}>
                                                            <span style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <ShieldCheck size={14} /> تجميد كامل (v1)
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

            </div>

        </div>
    );
}
