/**
 * 📊 Dashboard.jsx
 * Executive Analytics & Action Center for mohararcert.
 * Integrates styled status metrics, animated stats cards, custom skeleton loaders,
 * a Vercel-style activity chart, responsive data tables, and debug API logs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Link, useNavigate } from 'react-router-dom';
import { Award, FileText, Hourglass, CheckCircle2, AlertTriangle, Search, Eye, Filter, Sparkles, Inbox, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import { logger } from '../utils/debug';

export default function Dashboard() {
    const { user, canPerform } = useAuth();
    const navigate = useNavigate();
    const [certs, setCerts] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        logger.api('بدء استدعاء البيانات من المستودع لتغذية مؤشرات الأداء...');
        try {
            const list = await dbService.getAll();
            setCerts(list);
            logger.api(`تم استرجاع سجلات المعاملات بنجاح. إجمالي السجلات: ${list.length}`);
        } catch (e) {
            logger.error('فشل استرداد بيانات لوحة التحكم من مستودع البيانات المحلي', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter certificates dynamically based on role, status, and search query
    const filteredCerts = useMemo(() => {
        return certs.filter(c => {
            const matchesSearch = 
                (c.recipientName || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.event || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.serial || '').includes(search);
            
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

            // Creator only sees their own transactions, unless they are admin/reviewer/assistant
            const isCreatorOnly = user.role === 'CREATOR';
            const matchesUser = !isCreatorOnly || c.createdBy === user.id;

            return matchesSearch && matchesStatus && matchesUser;
        });
    }, [certs, search, statusFilter, user]);

    // Computed Performance Statistics
    const stats = useMemo(() => {
        const userCerts = user.role === 'CREATOR' ? certs.filter(c => c.createdBy === user.id) : certs;
        
        return {
            total: userCerts.length,
            pending: userCerts.filter(c => c.status === 'PENDING_APPROVAL' || c.status === 'APPROVED_BY_ASSISTANT').length,
            approved: userCerts.filter(c => c.status === 'FINAL_APPROVED' || c.status === 'ARCHIVED').length,
            returned: userCerts.filter(c => c.status === 'RETURNED_FOR_EDIT' || c.status === 'REJECTED').length,
            drafts: userCerts.filter(c => c.status === 'DRAFT').length
        };
    }, [certs, user]);

    // Vercel-style Activity chart points
    const chartPoints = "10,120 120,80 240,110 360,40 480,90 600,30 720,50";

    const getStatusBadge = (status) => {
        switch (status) {
            case 'DRAFT':
                return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-slate-100 dark:bg-[#131f31] text-slate-600 dark:text-slate-400">مسودة</span>;
            case 'PENDING_APPROVAL':
                return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.05)]">بانتظار تأشير المساعد</span>;
            case 'APPROVED_BY_ASSISTANT':
                return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.05)]">معتمد من المساعد</span>;
            case 'FINAL_APPROVED':
                return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.05)]">معتمد نهائياً</span>;
            case 'RETURNED_FOR_EDIT':
                return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.05)]">مُعاد للتعديل</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.05)]">مرفوض</span>;
            case 'ARCHIVED':
                return <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">مؤرشف</span>;
            default:
                return null;
        }
    };

    // Premium Skeleton Loaders layout
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Greeting Card Skeleton */}
                <div className="h-36 rounded-3xl skeleton" />
                
                {/* Stats Grid Skeletons */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="h-28 rounded-2xl skeleton" />
                    <div className="h-28 rounded-2xl skeleton" />
                    <div className="h-28 rounded-2xl skeleton" />
                    <div className="h-28 rounded-2xl skeleton" />
                </div>

                {/* Analytical Panels Skeletons */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 h-64 rounded-2xl skeleton" />
                    <div className="lg:col-span-4 h-64 rounded-2xl skeleton" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 select-none">
            
            {/* Elegant Luxury MoH Welcome Card */}
            <div className="bg-gradient-to-l from-[#0f213b] via-[#132a4a] to-[#071020] text-white p-7 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-white/5 premium-card">
                <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-30%] left-[-10%] w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="space-y-2 z-10 text-right">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span>منصة الاعتمادات الرسمية الموثوقة</span>
                    </div>
                    <h2 className="text-2xl font-black bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                        أهلاً بك، {user.name} 👋
                    </h2>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        {user.role === 'CREATOR' 
                            ? 'يمكنك البدء بإنشاء شهادات ومعاملات رقمية جديدة، وتتبع مسار مراجعتها واعتمادها الإداري خطوة بخطوة.'
                            : 'لديك معاملات جديدة معلقة بانتظار استعراض وتوقيع تأشيرات المراجعة أو الاعتماد النهائي العام.'
                        }
                    </p>
                </div>
                {canPerform('CREATE_CERTIFICATE') && (
                    <Link 
                        to="/create" 
                        onClick={() => logger.nav('الانتقال الموجه إلى شاشة تحرير شهادة جديدة.')}
                        className="px-6 py-3.5 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs transition-all duration-300 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/25 text-center z-10 active:scale-[0.98]"
                    >
                        📝 إنشاء شهادة جديدة
                    </Link>
                )}
            </div>

            {/* Metrics Statistics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'إجمالي المعاملات', val: stats.total, icon: FileText, style: 'text-slate-500 bg-slate-100 dark:bg-slate-900/60 dark:text-slate-400' },
                    { label: 'بانتظار الاعتماد', val: stats.pending, icon: Hourglass, style: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/5' },
                    { label: 'معتمد نهائياً', val: stats.approved, icon: CheckCircle2, style: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/5' },
                    { label: 'مُرجَع / مرفوض', val: stats.returned, icon: AlertTriangle, style: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/5' }
                ].map((item, index) => {
                    const IconComp = item.icon;
                    return (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="bg-white dark:bg-[#070e1b]/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-850/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300 premium-card"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.style}`}>
                                <IconComp className="w-5.5 h-5.5" />
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 dark:text-slate-550 font-black block tracking-wide">{item.label}</span>
                                <span className="text-2xl font-black mt-1 inline-block">{item.val}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Analytical Panels: Trend Chart & Shortcuts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* SVG Activity Trend Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-[#070e1b]/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850/60 shadow-sm flex flex-col gap-4 premium-card">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                            مؤشر نشاط إصدار الشهادات الأسبوعي
                        </h3>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">آخر 7 أيام عمل</span>
                    </div>
                    
                    {/* Glowing Vector Chart container */}
                    <div className="w-full h-44 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl relative overflow-hidden flex items-end border border-slate-100 dark:border-slate-800/30">
                        <svg className="w-full h-full absolute inset-0 text-amber-500/[0.04] dark:text-amber-500/[0.02]" viewBox="0 0 740 160" preserveAspectRatio="none">
                            <path d={`M10,160 L${chartPoints} L730,160 Z`} fill="currentColor" />
                            <polyline fill="none" stroke="#ca9f22" strokeWidth="2.5" points={chartPoints} />
                        </svg>
                        <div className="w-full flex justify-between px-6 text-[9px] font-black text-slate-400 py-3 relative z-10 border-t border-slate-100/60 dark:border-slate-800/40 bg-white/20 dark:bg-slate-950/20">
                            <span>الأحد</span>
                            <span>الإثنين</span>
                            <span>الثلاثاء</span>
                            <span>الأربعاء</span>
                            <span>الخميس</span>
                            <span>الجمعة</span>
                            <span>السبت</span>
                        </div>
                    </div>
                </div>

                {/* Quick Shortcuts Panel */}
                <div className="lg:col-span-4 bg-white dark:bg-[#070e1b]/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850/60 shadow-sm flex flex-col gap-4 justify-between premium-card">
                    <div>
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-2">الوصول الإجرائي السريع</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">تابع سجل التوثيق الإداري المباشر، تحقق من طلبات الاعتماد القائمة، أو انتقل للأرشيف المصادق والمحمي.</p>
                    </div>

                    <div className="space-y-2">
                        {user.role !== 'CREATOR' && (
                            <Link 
                                to="/pending" 
                                onClick={() => logger.nav('الانتقال الموجه إلى المعاملات المعلقة بانتظار الاعتماد.')}
                                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#0c1626] dark:hover:bg-[#0e1d35] rounded-xl transition-all border border-slate-100 dark:border-slate-800/40"
                            >
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Inbox className="w-4 h-4 text-amber-500" />
                                    المعاملات المعلقة الموكلة لي
                                </span>
                                <span className="px-2 py-0.5 text-[9px] font-black bg-amber-500 text-slate-950 rounded-full shadow-sm">{stats.pending}</span>
                            </Link>
                        )}
                        <Link 
                            to="/archive" 
                            onClick={() => logger.nav('الانتقال الموجه إلى شاشة الأرشيف العام.')}
                            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#0c1626] dark:hover:bg-[#0e1d35] rounded-xl transition-all border border-slate-100 dark:border-slate-800/40"
                        >
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Archive className="w-4 h-4 text-emerald-500" />
                                استعراض السجل المعتمد
                            </span>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">📂 {stats.approved}</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Core Workflow Transactions Data Table */}
            <div className="bg-white dark:bg-[#070e1b]/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850/60 shadow-sm space-y-5 premium-card">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="text-right">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">سجل المعاملات والاعتمادات القائمة</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">جدول تفاعلي متطور لمراقبة حالات تدقيق وتوقيع المعاملات.</p>
                    </div>

                    {/* Filter and Search Bar Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search input with interactive icon focus */}
                        <div className="relative group">
                            <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="ابحث باسم المستفيد، السيريال..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-[#0f1d35] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-64 focus:border-amber-500 transition-colors"
                            />
                        </div>

                        {/* Status Select Filter Dropdown */}
                        <div className="relative flex items-center">
                            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 pointer-events-none" />
                            <select
                                value={statusFilter}
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    logger.api(`تصفية المعاملات بحسب الحالة: ${e.target.value}`);
                                }}
                                className="pl-6 pr-9 py-2.5 bg-slate-50 dark:bg-[#0f1d35] border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 cursor-pointer appearance-none focus:border-amber-500 transition-colors"
                            >
                                <option value="ALL">جميع الحالات الإجرائية</option>
                                <option value="DRAFT">مسودة تحرير</option>
                                <option value="PENDING_APPROVAL">بانتظار تأشير المساعد</option>
                                <option value="APPROVED_BY_ASSISTANT">معتمد من المساعد</option>
                                <option value="FINAL_APPROVED">معتمد نهائياً</option>
                                <option value="RETURNED_FOR_EDIT">مُعاد للتعديل مع التنبيهات</option>
                                <option value="REJECTED">مرفوض</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Fully Responsive Scrollable Table Wrapper */}
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/40 rounded-2xl custom-scrollbar">
                    <table className="w-full text-right text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/20 text-slate-450 dark:text-slate-400 font-black">
                                <th className="p-4 text-center w-24">الرقم التسلسلي</th>
                                <th className="p-4">اسم صاحب المعاملة</th>
                                <th className="p-4">العنوان والمناسبة</th>
                                <th className="p-4 w-32">تاريخ التقديم</th>
                                <th className="p-4 text-center w-40">حالة التوقيع</th>
                                <th className="p-4 text-center w-28">العمليات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredCerts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 dark:text-slate-500 font-bold">
                                        لا توجد معاملات متوافقة مع محددات البحث الحالية.
                                    </td>
                                </tr>
                            ) : (
                                filteredCerts.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-all">
                                        <td className="p-4 text-center font-mono font-bold text-slate-500 dark:text-slate-450">{c.serial}</td>
                                        <td className="p-4 font-black text-slate-800 dark:text-slate-200">{c.recipientName}</td>
                                        <td className="p-4 font-bold text-slate-500 dark:text-slate-450">{c.event}</td>
                                        <td className="p-4 font-bold text-slate-450 dark:text-slate-550">
                                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : '—'}
                                        </td>
                                        <td className="p-4 text-center">{getStatusBadge(c.status)}</td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => {
                                                    logger.nav(`توجيه المعاينة للمعاملة ذات الرقم: ${c.serial}`);
                                                    navigate(`/approvals/${c.id}`);
                                                }}
                                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-250 dark:bg-[#0f1d35] dark:hover:bg-[#152a4e] text-slate-700 dark:text-slate-350 font-black transition-all inline-flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                                                title="معاينة المعاملة والمستندات الحيوية"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>معاينة</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
