/**
 * 🔍 ApprovalDetails.jsx
 * Premium SaaS Split-Panel Certificate Inspector & Workflow Decision Center.
 * Desktop: Enforces a split-view grid (Right: Obsidian Preview Container, Left: Action Dashboard, Timeline, Audit).
 * Mobile: Stacks columns first-preview, second-actions smoothly.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService, templateService, auditService, notificationService } from '../services/db';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import { exportSinglePDF, printElements } from '../utils/pdfExport';
import { ArrowLeft, CheckCircle, AlertTriangle, FileText, Send, Clock, User, MessageSquare, ShieldAlert, Sparkles, Printer, Download, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { useLayers } from '../hooks/useLayers';
import { logger } from '../utils/debug';
import { motion, AnimatePresence } from 'framer-motion';

export default function ApprovalDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, settings } = useAuth();
    
    const [cert, setCert] = useState(null);
    const [template, setTemplate] = useState(null);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [scale, setScale] = useState(0.5);

    const certRef = useRef();
    const previewContainerRef = useRef();

    // Auto A4 Scale Observer
    useEffect(() => {
        if (loading || !cert) return;
        
        function measure() {
            const el = previewContainerRef.current;
            if (!el) return;
            const A4_W_PX = 297 * (96 / 25.4); 
            const A4_H_PX = 210 * (96 / 25.4); 
            const scaleW = el.clientWidth / A4_W_PX;
            const scaleH = el.clientHeight / A4_H_PX;
            setScale(Math.min(scaleW, scaleH) * 0.95); // 95% safety margin
        }

        const ro = new ResizeObserver(measure);
        if (previewContainerRef.current) ro.observe(previewContainerRef.current);
        measure();
        return () => ro.disconnect();
    }, [loading, cert]);

    const loadCertDetails = async () => {
        setLoading(true);
        logger.api(`جلب تفاصيل المعاملة ذات الرقم التعريفي: ${id}`);
        try {
            const data = await dbService.getById(id);
            if (!data) {
                logger.error(`المستند المطلوب غير موجود بقاعدة البيانات: ${id}`);
                alert('الشهادة المطلوبة غير موجودة');
                navigate('/dashboard');
                return;
            }
            setCert(data);
            logger.api(`تم استرداد بيانات المعاملة #${data.serial} بنجاح.`);

            if (data.templateId) {
                const tpl = await templateService.getById(data.templateId);
                setTemplate(tpl);
                logger.api(`تم تحميل القالب المرتبط: ${tpl.name}`);
            }
        } catch (e) {
            logger.error('حدث خطأ أثناء تحميل بيانات الشهادة وتفاصيل الاعتماد', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCertDetails();
    }, [id]);

    const { layers: editorLayers, canvasWidth } = useLayers(cert?.templateId || 'default');

    const handleApprove = async () => {
        setProcessing(true);
        logger.workflow(`بدء اتخاذ قرار الاعتماد الإداري للمعاملة: ${cert.serial}`);
        try {
            if (user.role === 'ASSISTANT_MANAGER' || user.role === 'SUPER_ADMIN') {
                await dbService.approveByAssistant(cert.id, user, comments || 'تم الاعتماد والتأشير بالقبول بعد التحقق من صحة المعطيات.');
                await auditService.log('APPROVE_CERTIFICATE', user, `موافقة وتأشير المعاملة رقم: ${cert.serial}`, cert.id);
                
                await notificationService.create({
                    userId: 'usr-3', 
                    message: `تأشيرة جديدة بانتظار اعتمادك النهائي: ${cert.recipientName}`,
                    type: 'approve'
                });
                logger.workflow(`تم التأشير والرفع للمدير العام بنجاح للمعاملة: ${cert.serial}`);
            } else if (user.role === 'GENERAL_MANAGER' || user.role === 'SUPER_ADMIN') {
                await dbService.approveFinal(cert.id, user, comments || 'تم الاعتماد النهائي والمصادقة الرقمية للمستند الرسمي.');
                await auditService.log('APPROVE_CERTIFICATE', user, `اعتماد نهائي ومصادقة للشهادة رقم: ${cert.serial}`, cert.id);
                
                await notificationService.create({
                    userId: cert.createdBy,
                    message: `🎉 تهانينا! تمت المصادقة والاعتماد النهائي لشهادتك: ${cert.recipientName}`,
                    type: 'approve'
                });
                logger.workflow(`تم الاعتماد النهائي والمصادقة للمعاملة: ${cert.serial}`);
            }

            alert('تم اعتماد المعاملة بنجاح وتمريرها للمرحلة التالية!');
            setComments('');
            await loadCertDetails();
        } catch (e) {
            logger.error(`فشل تمرير قرار الاعتماد للمعاملة: ${cert.serial}`, e);
            alert('خطأ أثناء الاعتماد: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReturnForEdit = async () => {
        if (!comments) return alert('الرجاء كتابة ملاحظات التوجيه أو سبب الإعادة للمنشئ');
        setProcessing(true);
        logger.workflow(`إعادة المعاملة لإعادة التعديل: ${cert.serial}`);
        try {
            await dbService.returnForEdit(cert.id, user, comments);
            await auditService.log('RETURN_FOR_EDIT', user, `إرجاع المعاملة رقم: ${cert.serial} لإعادة التعديل`, cert.id);
            
            await notificationService.create({
                userId: cert.createdBy,
                message: `⚠️ تمت إعادة المعاملة رقم ${cert.serial} للتعديل. الملاحظة: ${comments}`,
                type: 'pending'
            });

            logger.workflow(`تمت إعادة المعاملة للمنشئ مع تدوين مرئيات المراجعة: ${cert.serial}`);
            alert('تمت إعادة المعاملة للمنشئ مع تدوين الملاحظات.');
            setComments('');
            await loadCertDetails();
        } catch (e) {
            logger.error(`فشل تمرير أمر الإعادة للمعاملة: ${cert.serial}`, e);
            alert('خطأ أثناء إرجاع الطلب: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!comments) return alert('الرجاء كتابة سبب الرفض الإداري');
        if (!window.confirm('هل أنت متأكد من رغبتك في رفض هذا الطلب نهائياً وإغلاق المعاملة؟')) return;
        
        setProcessing(true);
        logger.workflow(`رفض المعاملة وإغلاق الملف نهائياً: ${cert.serial}`);
        try {
            await dbService.reject(cert.id, user, comments);
            await auditService.log('REJECT_CERTIFICATE', user, `رفض المعاملة رقم: ${cert.serial}`, cert.id);
            
            await notificationService.create({
                userId: cert.createdBy,
                message: `❌ تم رفض طلب اعتماد شهادة: ${cert.recipientName}. السبب: ${comments}`,
                type: 'reject'
            });

            logger.workflow(`تم إغلاق ورفض الملف الإداري للمعاملة: ${cert.serial}`);
            alert('تم رفض المعاملة وإغلاق الطلب نهائياً.');
            setComments('');
            await loadCertDetails();
        } catch (e) {
            logger.error(`فشل تمرير قرار الرفض الإداري للمعاملة: ${cert.serial}`, e);
            alert('خطأ أثناء الرفض: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        logger.api(`تصدير المعاملة رقم ${cert.serial} بصيغة مستند PDF...`);
        try {
            await auditService.log('EXPORT_PDF', user, `تصدير وتحميل PDF للشهادة رقم: ${cert.serial}`, cert.id);
            await exportSinglePDF(certRef.current, `شهادة-${cert.recipientName}.pdf`);
            logger.api('اكتمل تصدير الملف بنجاح وتنزيله لدى جهاز المستخدم.');
        } catch (e) {
            logger.error('حدث عطل أثناء تنزيل أو طباعة ملف PDF للشهادة', e);
            alert('فشل تصدير PDF: ' + e.message);
        }
        setExporting(false);
    };

    const handlePrint = () => {
        logger.api(`تشغيل أمر الطباعة المباشرة للمعاملة: ${cert.serial}`);
        auditService.log('PRINT_CERTIFICATE', user, `طباعة ورقية للشهادة رقم: ${cert.serial}`, cert.id);
        printElements([certRef.current], `طباعة الشهادة - ${cert.recipientName}`);
    };

    const canTakeDecision = () => {
        if (cert.status === 'PENDING_APPROVAL' && (user.role === 'ASSISTANT_MANAGER' || user.role === 'SUPER_ADMIN')) return true;
        if (cert.status === 'APPROVED_BY_ASSISTANT' && (user.role === 'GENERAL_MANAGER' || user.role === 'SUPER_ADMIN')) return true;
        return false;
    };

    if (loading) {
        return (
            <div className="space-y-8 py-2">
                <div className="h-14 rounded-2xl skeleton" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 h-96 rounded-3xl skeleton" />
                    <div className="lg:col-span-4 h-96 rounded-3xl skeleton" />
                </div>
            </div>
        );
    }

    const certData = {
        recipientName: cert.recipientName,
        event: cert.event,
        date: cert.date,
        serial: cert.serial
    };

    return (
        <div className="space-y-6 py-2 text-right">
            
            {/* Header & Sticky Actions Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/40 pb-5">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0f1d35] dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 active:scale-95"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">تفاصيل واعتماد المعاملة #{cert.serial}</h2>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">تتبع خطوات الاعتماد والموافقة الإجرائية للمستند الإداري.</p>
                    </div>
                </div>

                {/* Print/Download Shortcuts */}
                {(cert.status === 'FINAL_APPROVED' || cert.status === 'ARCHIVED') && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="btn-premium btn-premium-outline py-2.5 px-4 font-bold text-xs"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة ورقية</span>
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="btn-premium btn-premium-accent py-2.5 px-4 font-black text-xs"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>{exporting ? '⏳ تصدير...' : 'تنزيل PDF'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Split Enterprise Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Right: Live scale preview container (A4 Landscape Obsidian Frame) */}
                <div className="lg:col-span-8 space-y-4 lg:sticky lg:top-24">
                    <div className="bg-[#0b1322] rounded-3xl border border-white/5 p-5 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5 text-[10px] font-black text-slate-500 tracking-wider">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                👁️ معاينة المستند المعتمد والطبقات المباشرة
                            </span>
                            <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/15 uppercase font-bold">A4 landscape</span>
                        </div>

                        <div className="w-full flex items-center justify-center overflow-hidden min-h-[360px] bg-[#070e1b]/90 rounded-2xl relative" ref={previewContainerRef}>
                            <div className="flex items-center justify-center" style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: '297mm', height: '210mm', flexShrink: 0 }}>
                                <UnifiedCertificateEngine
                                    ref={certRef}
                                    mode="preview"
                                    template={template}
                                    layers={editorLayers}
                                    canvasWidth={canvasWidth}
                                    data={certData}
                                    settings={settings}
                                    showQR={cert.showQR}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left: Info details, Timeline trackers, Actions panel */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* Metadata Card */}
                    <div className="premium-card p-6 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-450 dark:text-slate-500 tracking-widest uppercase flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
                            <FileText className="w-3.5 h-3.5 text-teal-500" />
                            بيانات المعاملة الأساسية
                        </h3>
                        
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs font-bold">
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">اسم صاحب الطلب:</span>
                                <span className="text-slate-800 dark:text-slate-200">{cert.recipientName}</span>
                            </div>
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">المناسبة/الموضوع:</span>
                                <span className="text-slate-800 dark:text-slate-200">{cert.event}</span>
                            </div>
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">التاريخ المطبوع:</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200">{cert.date}</span>
                            </div>
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">منشئ المعاملة:</span>
                                <span className="text-slate-800 dark:text-slate-200">{cert.creatorName || 'مستخدم النظام'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="premium-card p-6 space-y-5">
                        <h3 className="text-[10px] font-black text-slate-450 dark:text-slate-500 tracking-widest uppercase flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            خط الزمن ومسار الموافقات
                        </h3>
                        
                        <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:right-3.5 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-850">
                            {(cert.workflowHistory || []).map((step, idx) => (
                                <div key={idx} className="flex gap-4 relative">
                                    <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-[#0c1626] border border-slate-200/60 dark:border-slate-800 flex items-center justify-center z-10 flex-shrink-0">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 text-[9px] font-black">
                                            <span className="text-slate-650 dark:text-slate-350">{step.user}</span>
                                            <span className="text-slate-400">{new Date(step.timestamp).toLocaleDateString('ar-SA')}</span>
                                        </div>
                                        <h4 className="text-[11px] font-black text-amber-600 dark:text-amber-400 mt-0.5">
                                            {step.stage === 'DRAFT' && '📝 صياغة مسودة المعاملة'}
                                            {step.stage === 'PENDING_APPROVAL' && '📤 الرفع للاعتماد الرسمي'}
                                            {step.stage === 'APPROVED_BY_ASSISTANT' && '🔏 مراجعة وتأشير المساعد'}
                                            {step.stage === 'FINAL_APPROVED' && '👑 مصادقة واعتماد نهائي'}
                                            {step.stage === 'RETURNED_FOR_EDIT' && '⚠️ إرجاع للتعديل وإضافة الملاحظات'}
                                            {step.stage === 'REJECTED' && '❌ رفض نهائي للمستند'}
                                        </h4>
                                        {step.comments && (
                                            <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100/60 dark:border-slate-800/30 mt-2 font-semibold">
                                                {step.comments}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Decisions Control Board */}
                    {canTakeDecision() ? (
                        <div className="bg-gradient-to-br from-slate-900 to-[#070e1b] text-white p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                            <h3 className="text-xs font-black text-amber-400 tracking-wider uppercase flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                                لوحة القرار الإداري المعتمد
                            </h3>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 block">مرئيات وتوجيهات اللجنة (تظهر في السجل):</label>
                                <textarea
                                    rows="3"
                                    value={comments}
                                    onChange={e => setComments(e.target.value)}
                                    placeholder="اكتب ملاحظاتك، مرئياتك، أو سبب الإرجاع للمنشئ هنا..."
                                    className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 text-xs font-semibold outline-none text-slate-200 transition-all placeholder-slate-700 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleReturnForEdit}
                                    disabled={processing}
                                    className="py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/30 rounded-xl text-xs font-black transition-all cursor-pointer text-center active:scale-95"
                                >
                                    ⚠️ إرجاع للتعديل
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-xs font-black transition-all cursor-pointer text-center active:scale-95"
                                >
                                    ❌ رفض الطلب
                                </button>
                            </div>

                            <button
                                onClick={handleApprove}
                                disabled={processing}
                                className="w-full py-3 px-4 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                            >
                                <CheckCircle className="w-4 h-4" />
                                <span>{user.role === 'ASSISTANT_MANAGER' ? 'التأشير والرفع للمدير العام' : 'المصادقة والاعتماد النهائي'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="premium-card p-6 text-center space-y-3">
                            <ShieldCheck className="w-10 h-10 text-slate-400 dark:text-slate-650 mx-auto stroke-[1.5]" />
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">القرار الإداري مقفل</h4>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed font-semibold">
                                {cert.status === 'FINAL_APPROVED' && 'هذا المستند معتمد وموقع نهائياً ومحمي بالكامل ضد التعديل أو التغيير بأثر رجعي.'}
                                {cert.status === 'REJECTED' && 'هذا الطلب تم رفضه وإغلاق المعاملة من قبل الإدارة.'}
                                {cert.status === 'DRAFT' && 'الطلب لا يزال في مرحلة صياغة المسودة لدى المنشئ.'}
                                {cert.status === 'PENDING_APPROVAL' && user.role === 'GENERAL_MANAGER' && 'المعاملة بانتظار مراجعة وتأشير المساعد أولاً.'}
                                {cert.status === 'APPROVED_BY_ASSISTANT' && user.role === 'CREATOR' && 'المعاملة معتمدة من المساعد وبانتظار اعتماد المدير العام.'}
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
