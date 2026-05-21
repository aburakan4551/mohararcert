/**
 * 🔍 ApprovalDetails.jsx
 * High-fidelity Certificate Inspector & Workflow Action panel.
 * Computes responsive scaling to preview certificates, renders interactive timelines,
 * and processes approvals, rejections, and revisions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dbService, templateService, auditService, notificationService } from '../services/db';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import { exportSinglePDF, printElements } from '../utils/pdfExport';
import { ArrowLeft, CheckCircle, AlertTriangle, FileText, Send, Clock, User, MessageSquare, ShieldAlert, Sparkles, Printer, Download } from 'lucide-react';
import { useLayers } from '../hooks/useLayers';

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

    // Refs for PDF rendering
    const certRef = useRef();
    const previewContainerRef = useRef();

    // Responsive scaling observer
    useEffect(() => {
        if (loading || !cert) return;
        
        function measure() {
            const el = previewContainerRef.current;
            if (!el) return;
            const A4_W_PX = 297 * (96 / 25.4); // ≈ 1122.5
            const A4_H_PX = 210 * (96 / 25.4); // ≈ 793.7
            const scaleW = el.clientWidth / A4_W_PX;
            const scaleH = el.clientHeight / A4_H_PX;
            setScale(Math.min(scaleW, scaleH));
        }

        const ro = new ResizeObserver(measure);
        if (previewContainerRef.current) ro.observe(previewContainerRef.current);
        measure();
        return () => ro.disconnect();
    }, [loading, cert]);

    const loadCertDetails = async () => {
        setLoading(true);
        try {
            const data = await dbService.getById(id);
            if (!data) {
                alert('الشهادة المطلوبة غير موجودة');
                navigate('/');
                return;
            }
            setCert(data);

            // Fetch associated template
            if (data.templateId) {
                const tpl = await templateService.getById(data.templateId);
                setTemplate(tpl);
            }
        } catch (e) {
            console.error('Failed to load certificate details: ', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCertDetails();
    }, [id]);

    // Pull editor layers dynamically
    const { layers: editorLayers, canvasWidth } = useLayers(cert?.templateId || 'default');

    // Action Handlers
    const handleApprove = async () => {
        setProcessing(true);
        try {
            if (user.role === 'ASSISTANT_MANAGER' || user.role === 'SUPER_ADMIN') {
                // Assistant approves and visas the certificate
                await dbService.approveByAssistant(cert.id, user, comments || 'تم الاعتماد والتأشير بالقبول بعد التحقق من صحة المعطيات.');
                await auditService.log('APPROVE_CERTIFICATE', user, `موافقة وتأشير المعاملة رقم: ${cert.serial}`, cert.id);
                
                // Notify GM
                await notificationService.create({
                    userId: 'usr-3', // General Manager
                    message: `تأشيرة جديدة بانتظار اعتمادك النهائي: ${cert.recipientName}`,
                    type: 'approve'
                });
            } else if (user.role === 'GENERAL_MANAGER' || user.role === 'SUPER_ADMIN') {
                // GM finalizes and locks
                await dbService.approveFinal(cert.id, user, comments || 'تم الاعتماد النهائي والمصادقة الرقمية للمستند الرسمي.');
                await auditService.log('APPROVE_CERTIFICATE', user, `اعتماد نهائي ومصادقة للشهادة رقم: ${cert.serial}`, cert.id);
                
                // Notify Creator
                await notificationService.create({
                    userId: cert.createdBy,
                    message: `🎉 تهانينا! تمت المصادقة والاعتماد النهائي لشهادتك: ${cert.recipientName}`,
                    type: 'approve'
                });
            }

            alert('تم اعتماد المعاملة بنجاح وتمريرها للمرحلة التالية!');
            setComments('');
            await loadCertDetails();
        } catch (e) {
            alert('خطأ أثناء الاعتماد: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReturnForEdit = async () => {
        if (!comments) return alert('الرجاء كتابة ملاحظات التوجيه أو سبب الإعادة للمنشئ');
        setProcessing(true);
        try {
            await dbService.returnForEdit(cert.id, user, comments);
            await auditService.log('RETURN_FOR_EDIT', user, `إرجاع المعاملة رقم: ${cert.serial} لإعادة التعديل`, cert.id);
            
            // Notify Creator
            await notificationService.create({
                userId: cert.createdBy,
                message: `⚠️ تمت إعادة المعاملة رقم ${cert.serial} للتعديل. الملاحظة: ${comments}`,
                type: 'pending'
            });

            alert('تمت إعادة المعاملة للمنشئ مع تدوين الملاحظات.');
            setComments('');
            await loadCertDetails();
        } catch (e) {
            alert('خطأ أثناء إرجاع الطلب: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!comments) return alert('الرجاء كتابة سبب الرفض الإداري');
        if (!window.confirm('هل أنت متأكد من رغبتك في رفض هذا الطلب نهائياً وإغلاق المعاملة؟')) return;
        
        setProcessing(true);
        try {
            await dbService.reject(cert.id, user, comments);
            await auditService.log('REJECT_CERTIFICATE', user, `رفض المعاملة رقم: ${cert.serial}`, cert.id);
            
            // Notify Creator
            await notificationService.create({
                userId: cert.createdBy,
                message: `❌ تم رفض طلب اعتماد شهادة: ${cert.recipientName}. السبب: ${comments}`,
                type: 'reject'
            });

            alert('تم رفض المعاملة وإغلاق الطلب نهائياً.');
            setComments('');
            await loadCertDetails();
        } catch (e) {
            alert('خطأ أثناء الرفض: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await auditService.log('EXPORT_PDF', user, `تصدير وتحميل PDF للشهادة رقم: ${cert.serial}`, cert.id);
            await exportSinglePDF(certRef.current, `شهادة-${cert.recipientName}.pdf`);
        } catch (e) {
            alert('فشل تصدير PDF: ' + e.message);
        }
        setExporting(false);
    };

    const handlePrint = () => {
        auditService.log('PRINT_CERTIFICATE', user, `طباعة ورقية للشهادة رقم: ${cert.serial}`, cert.id);
        printElements([certRef.current], `طباعة الشهادة - ${cert.recipientName}`);
    };

    // Determine if current user can take decisions on this certificate
    const canTakeDecision = () => {
        if (cert.status === 'PENDING_APPROVAL' && (user.role === 'ASSISTANT_MANAGER' || user.role === 'SUPER_ADMIN')) return true;
        if (cert.status === 'APPROVED_BY_ASSISTANT' && (user.role === 'GENERAL_MANAGER' || user.role === 'SUPER_ADMIN')) return true;
        return false;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
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
        <div className="space-y-6">
            
            {/* Nav Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-500 hover:text-slate-800"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">تفاصيل المعاملة رقم #{cert.serial}</h2>
                        <p className="text-xs text-slate-400">تتبع خطوات الاعتماد والموافقة الإجرائية للمستند الإداري.</p>
                    </div>
                </div>

                {/* Final Approved printing shortcuts */}
                {(cert.status === 'FINAL_APPROVED' || cert.status === 'ARCHIVED') && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-800"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>طباعة ورقية</span>
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="px-4 py-2 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>{exporting ? '⏳ تصدير...' : 'تنزيل PDF'}</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Layout Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Right: Live scale preview container */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="bg-slate-950 rounded-3xl border border-slate-800 p-5 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 text-xs font-bold text-slate-500">
                            <span>👁️ معاينة المستند المعتمد والطبقات</span>
                            <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/15">A4 landscape</span>
                        </div>

                        <div className="w-full flex items-center justify-center overflow-hidden min-h-[300px] bg-[#141517] rounded-2xl relative" ref={previewContainerRef}>
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

                {/* Left: Info, Timeline, Actions */}
                <div className="lg:col-span-4 space-y-5">
                    
                    {/* Stats details info */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
                        <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">بيانات المعاملة الأساسية</h3>
                        
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">اسم المستفيد:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{cert.recipientName}</span>
                            </div>
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">المناسبة/الموضوع:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{cert.event}</span>
                            </div>
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">التاريخ المطبوع:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cert.date}</span>
                            </div>
                            <div className="py-2.5 flex justify-between gap-2">
                                <span className="text-slate-400">منشئ الطلب:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{cert.creatorName || 'سليمان الحربي'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">خط الزمن ومسار الموافقات</h3>
                        
                        <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:right-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                            {(cert.workflowHistory || []).map((step, idx) => (
                                <div key={idx} className="flex gap-4 relative">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center z-10 flex-shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 text-[10px]">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{step.user}</span>
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
                                            <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40 mt-1.5 font-semibold">
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
                        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                            <h3 className="text-xs font-black text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 animate-pulse" />
                                لوحة القرار الإداري المعتمد
                            </h3>

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 block">مرئيات وتوجيهات اللجنة (تظهر في السجل):</label>
                                <textarea
                                    rows="3"
                                    value={comments}
                                    onChange={e => setComments(e.target.value)}
                                    placeholder="اكتب ملاحظاتك، مرئياتك، أو سبب الإرجاع للمنشئ هنا..."
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 text-xs font-semibold outline-none text-slate-200 transition-all placeholder-slate-700 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3.5">
                                <button
                                    onClick={handleReturnForEdit}
                                    disabled={processing}
                                    className="py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/30 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
                                >
                                    ⚠️ إرجاع للتعديل
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={processing}
                                    className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/30 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
                                >
                                    ❌ رفض الطلب
                                </button>
                            </div>

                            <button
                                onClick={handleApprove}
                                disabled={processing}
                                className="w-full py-3 px-4 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                <CheckCircle className="w-4 h-4" />
                                <span>{user.role === 'ASSISTANT_MANAGER' ? 'التأشير والرفع للمدير العام' : 'المصادقة والاعتماد النهائي'}</span>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
                            <ShieldAlert className="w-8 h-8 text-slate-400 mx-auto opacity-75" />
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">القرار الإداري مقفل</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
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
