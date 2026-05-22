/**
 * 🗄️ Archive.jsx
 * Official Immutable Approved Certificates Vault for mohararcert.
 * Exposes finalized templates, secure filters, and optimized batch printing.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService, templateService, auditService } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { exportSinglePDF, printElements } from '../utils/pdfExport';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import { Archive, Search, FileText, Download, Printer, ShieldCheck, Eye, Sparkles } from 'lucide-react';
import { useLayers } from '../hooks/useLayers';

export default function ArchivePage() {
    const { user, settings } = useAuth();
    const navigate = useNavigate();
    const [certs, setCerts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeCert, setActiveCert] = useState(null);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [scale, setScale] = useState(0.45);
    const [exporting, setExporting] = useState(false);

    const certRef = useRef();
    const previewContainerRef = useRef();

    const loadArchive = async () => {
        setLoading(true);
        try {
            const allCerts = await dbService.getAll();
            // Filter only final approved
            setCerts(allCerts.filter(c => c.status === 'FINAL_APPROVED' || c.status === 'ARCHIVED'));

            const allTpls = await templateService.getAll();
            setTemplates(allTpls);
        } catch (e) {
            console.error('Failed to load archive vault: ', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadArchive();
    }, []);

    // Responsive scaling observer
    useEffect(() => {
        if (!activeCert) return;
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
    }, [activeCert]);

    // Editor layers logic
    const { layers: editorLayers, canvasWidth } = useLayers(activeCert?.templateId || 'default');

    const filteredCerts = useMemo(() => {
        return certs.filter(c => 
            c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
            c.event.toLowerCase().includes(search.toLowerCase()) ||
            c.serial.includes(search)
        );
    }, [certs, search]);

    const handleInspect = async (c) => {
        setActiveCert(c);
        const tpl = templates.find(t => t.id === c.templateId);
        setActiveTemplate(tpl || null);
    };

    const handleExport = async () => {
        if (!activeCert) return;
        setExporting(true);
        try {
            await auditService.log('EXPORT_PDF', user, `تنزيل مستند رسمي للأرشيف للشهادة رقم: ${activeCert.serial}`, activeCert.id);
            await exportSinglePDF(certRef.current, `شهادة_معتمدة_${activeCert.recipientName}.pdf`);
        } catch (e) {
            alert('خطأ أثناء التصدير: ' + e.message);
        }
        setExporting(false);
    };

    const handlePrint = () => {
        if (!activeCert) return;
        auditService.log('PRINT_CERTIFICATE', user, `طباعة مستند رسمي من الأرشيف للشهادة رقم: ${activeCert.serial}`, activeCert.id);
        printElements([certRef.current], `طباعة الشهادة الرسمية - ${activeCert.recipientName}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
            </div>
        );
    }

    const certData = activeCert ? {
        recipientName: activeCert.recipientName,
        event: activeCert.event,
        date: activeCert.date,
        serial: activeCert.serial
    } : null;

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <Archive className="w-5 h-5 text-amber-500" />
                    أرشيف الشهادات الرسمي المقفل
                </h2>
                <p className="text-xs text-slate-400">مستندات رسمية غير قابلة للتعديل وموثقة بالتواقيع والأختام المعيارية.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Right: Table list of all approved certs */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">المستندات المؤرشفة</h3>
                        
                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ابحث بالاسم، الرقم، المناسبة..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-4 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-56"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-bold">
                                    <th className="pb-3 text-center w-14">الرقم</th>
                                    <th className="pb-3">المستفيد</th>
                                    <th className="pb-3">الموضوع/المناسبة</th>
                                    <th className="pb-3 text-center w-20">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {filteredCerts.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                                            لا توجد أي شهادات معتمدة نهائياً في الأرشيف حالياً.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCerts.map((c) => (
                                        <tr key={c.id} className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all ${activeCert?.id === c.id ? 'bg-amber-500/5 dark:bg-amber-500/5' : ''}`}>
                                            <td className="py-3.5 text-center font-mono font-bold text-slate-500">{c.serial}</td>
                                            <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">{c.recipientName}</td>
                                            <td className="py-3.5 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{c.event}</td>
                                            <td className="py-3.5 text-center flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleInspect(c)}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                                                    title="معاينة سريعة"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/approvals/${c.id}`)}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                                                    title="تفاصيل الاعتماد الكاملة"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Left: Quick preview and print tools */}
                <div className="lg:col-span-5">
                    {activeCert ? (
                        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    المعاينة المعتمدة الرسمية
                                </h3>
                                <span className="font-mono font-bold text-slate-500 text-[10px]">#{activeCert.serial}</span>
                            </div>

                            {/* Scale preview */}
                            <div className="w-full flex items-center justify-center overflow-hidden h-[180px] bg-slate-950 rounded-xl relative" ref={previewContainerRef}>
                                <div className="flex items-center justify-center" style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: '297mm', height: '210mm', flexShrink: 0 }}>
                                    <UnifiedCertificateEngine
                                        ref={certRef}
                                        mode="preview"
                                        template={activeTemplate}
                                        layers={editorLayers}
                                        canvasWidth={canvasWidth}
                                        data={certData}
                                        settings={activeCert.managerSnapshot || activeCert.assistantSnapshot || {}}
                                        showQR={activeCert.showQR}
                                    />
                                </div>
                            </div>

                            {/* Details meta box */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                <div className="flex justify-between">
                                    <span>المستلم:</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-bold">{activeCert.recipientName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>تاريخ المصادقة:</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                                        {activeCert.managerSnapshot ? new Date(activeCert.managerSnapshot.approvedAt).toLocaleDateString('ar-SA') : new Date(activeCert.updatedAt).toLocaleDateString('ar-SA')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>المصادق المعتمد:</span>
                                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                                        {activeCert.managerSnapshot?.directorName || settings?.directorName || ''} (المدير العام)
                                    </span>
                                </div>
                            </div>

                            {/* Interactive export bar */}
                            <div className="grid grid-cols-2 gap-3.5">
                                <button
                                    onClick={handlePrint}
                                    className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>طباعة المعاملة</span>
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className="py-2.5 px-4 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>{exporting ? '⏳ تصدير...' : 'تصدير عالي الجودة'}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                            <Sparkles className="w-8 h-8 text-amber-500 mx-auto opacity-75 animate-pulse" />
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">حدد شهادة لعرضها</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[250px] mx-auto">
                                انقر فوق رمز العين لأي معاملة في الجدول الأيمن لعرض بطاقة المعاينة والوصول الفوري لأدوات الطباعة الورقية والتنزيل المباشر.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
