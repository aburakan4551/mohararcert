/**
 * 📊 Dashboard.jsx
 * Premium SaaS Executive Analytics Hub for mohararcert.
 * Upgrades SVG layout to dynamic, RTL-aligned Recharts dashboards.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Link, useNavigate } from 'react-router-dom';
import { Award, FileText, Hourglass, CheckCircle2, AlertTriangle, Search, Eye, Filter, Sparkles, Inbox, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

// Import Recharts components
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

    // Filter transactions dynamically
    const filteredCerts = useMemo(() => {
        return certs.filter(c => {
            const matchesSearch = 
                (c.recipientName || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.event || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.serial || '').includes(search);
            
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

            const isCreatorOnly = user.role === 'CREATOR';
            const matchesUser = !isCreatorOnly || c.createdBy === user.id;

            return matchesSearch && matchesStatus && matchesUser;
        });
    }, [certs, search, statusFilter, user]);

    // Computed Stats
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

    // Custom Recharts RTL Activity Dataset
    const chartData = useMemo(() => {
        return [
            { name: 'الأحد', 'الطلبات الصادرة': 4, 'الاعتمادات النهائية': 2 },
            { name: 'الإثنين', 'الطلبات الصادرة': 7, 'الاعتمادات النهائية': 5 },
            { name: 'الثلاثاء', 'الطلبات الصادرة': 5, 'الاعتمادات النهائية': 3 },
            { name: 'الأربعاء', 'الطلبات الصادرة': 9, 'الاعتمادات النهائية': 8 },
            { name: 'الخميس', 'الطلبات الصادرة': 6, 'الاعتمادات النهائية': 4 },
            { name: 'الجمعة', 'الطلبات الصادرة': 1, 'الاعتمادات النهائية': 1 },
            { name: 'السبت', 'الطلبات الصادرة': 2, 'الاعتمادات النهائية': 2 }
        ];
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'DRAFT':
                return <span className="badge-premium badge-premium-warning">مسودة</span>;
            case 'PENDING_APPROVAL':
                return <span className="badge-premium badge-premium-warning font-black">بانتظار تأشير المساعد</span>;
            case 'APPROVED_BY_ASSISTANT':
                return <span className="badge-premium badge-premium-success font-black">معتمد من المساعد</span>;
            case 'FINAL_APPROVED':
                return <span className="badge-premium badge-premium-success font-black">معتمد نهائياً</span>;
            case 'RETURNED_FOR_EDIT':
                return <span className="badge-premium badge-premium-danger font-black">مُعاد للتعديل</span>;
            case 'REJECTED':
                return <span className="badge-premium badge-premium-danger font-black">مرفوض</span>;
            case 'ARCHIVED':
                return <span className="badge-premium badge-premium-success">مؤرشف</span>;
            default:
                return null;
        }
    };

    // Premium Skeleton Loading States
    if (loading) {
        return (
            <div className="space-y-8 py-2">
                <div className="h-40 rounded-3xl skeleton" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="h-28 rounded-2xl skeleton" />
                    <div className="h-28 rounded-2xl skeleton" />
                    <div className="h-28 rounded-2xl skeleton" />
                    <div className="h-28 rounded-2xl skeleton" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 h-72 rounded-2xl skeleton" />
                    <div className="lg:col-span-4 h-72 rounded-2xl skeleton" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 py-2 text-right">
            
            {/* Elegant MoH Header Card Banner */}
            <div className="bg-gradient-to-l from-[#0f213b] via-[#132a4a] to-[#071020] text-white p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/5 shadow-2xl premium-card">
                {/* Background Ambient Blobs */}
                <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-30%] left-[-10%] w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none animate-pulse" />
                
                <div className="space-y-3 z-10">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs tracking-wider uppercase">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span>منصة الاعتمادات والتميز المؤسسي الرسمية</span>
                    </div>
                    <h2 className="text-2xl font-black bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                        أهلاً بك، {user.name} 👋
                    </h2>
                    <p className="text-xs text-slate-350 max-w-2xl leading-relaxed font-semibold">
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
                        className="btn-premium btn-premium-accent py-4 font-black flex-shrink-0 z-10 hover:scale-105 active:scale-95"
                    >
                        📝 إنشاء شهادة جديدة
                    </Link>
                )}
            </div>

            {/* Performance Statistics Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'إجمالي المعاملات', val: stats.total, icon: FileText, style: 'text-[#0d9488] bg-teal-500/10' },
                    { label: 'بانتظار الاعتماد', val: stats.pending, icon: Hourglass, style: 'text-amber-500 bg-amber-500/10' },
                    { label: 'معتمد نهائياً', val: stats.approved, icon: CheckCircle2, style: 'text-emerald-500 bg-emerald-500/10' },
                    { label: 'مُرجَع / مرفوض', val: stats.returned, icon: AlertTriangle, style: 'text-rose-500 bg-rose-500/10' }
                ].map((item, index) => {
                    const IconComp = item.icon;
                    return (
                        <motion.div
                            key={item.label}
                            whileHover={{ y: -4 }}
                            className="premium-card p-6 flex items-center justify-between relative group cursor-pointer"
                        >
                            <div className="flex flex-col gap-1.5 text-right">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">{item.label}</span>
                                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{item.val}</span>
                            </div>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.style}`}>
                                <IconComp className="w-5.5 h-5.5" />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Analytical Panels: Recharts Line Chart & Shortcuts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Recharts Analytics Activity Chart */}
                <div className="lg:col-span-8 premium-card p-6 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                            مؤشر نشاط إصدار الشهادات الأسبوعي المباشر
                        </h3>
                        <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">تفاعلي بالكامل</span>
                    </div>
                    
                    {/* Interactive AreaChart */}
                    <div className="w-full h-52 rounded-2xl relative overflow-hidden flex items-center justify-center p-2 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200/40 dark:border-slate-800/30">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorCerts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ca9f22" stopOpacity={0.18}/>
                                        <stop offset="95%" stopColor="#ca9f22" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorApprovals" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.18}/>
                                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Cairo', fontWeight: 'bold' }} 
                                    axisLine={false}
                                    tickLine={false}
                                    reversed={true} // RTL alignment
                                />
                                <YAxis 
                                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Cairo', fontWeight: 'bold' }} 
                                    axisLine={false}
                                    tickLine={false}
                                    orientation="right" // RTL orientation
                                />
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#0a1122', 
                                        borderColor: 'rgba(255,255,255,0.05)', 
                                        borderRadius: '16px',
                                        color: '#f8fafc',
                                        fontSize: '11px',
                                        fontFamily: 'Cairo',
                                        direction: 'rtl',
                                        textAlign: 'right',
                                        boxShadow: 'var(--shadow-premium)'
                                    }} 
                                />
                                <Area type="monotone" dataKey="الطلبات الصادرة" stroke="#ca9f22" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCerts)" />
                                <Area type="monotone" dataKey="الاعتمادات النهائية" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApprovals)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Shortcuts Panel */}
                <div className="lg:col-span-4 premium-card p-6 flex flex-col gap-6 justify-between">
                    <div className="space-y-2">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">الوصول الإجرائي السريع</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">تابع سجل التوثيق الإداري المباشر، تحقق من طلبات الاعتماد القائمة، أو انتقل للأرشيف المصادق والمحمي.</p>
                    </div>

                    <div className="space-y-2">
                        {user.role !== 'CREATOR' && (
                            <Link 
                                to="/pending" 
                                onClick={() => logger.nav('الانتقال الموجه إلى المعاملات المعلقة بانتظار الاعتماد.')}
                                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#0c1626] dark:hover:bg-[#0e1d35] rounded-xl transition-all border border-slate-100 dark:border-slate-850"
                            >
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2">
                                    <Icons.Inbox className="w-4 h-4 text-amber-500" />
                                    المعاملات المعلقة الموكلة لي
                                </span>
                                <span className="px-2.5 py-0.5 text-[9px] font-black bg-amber-500 text-slate-950 rounded-full shadow-sm">{stats.pending}</span>
                            </Link>
                        )}
                        <Link 
                            to="/archive" 
                            onClick={() => logger.nav('الانتقال الموجه إلى شاشة الأرشيف العام.')}
                            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#0c1626] dark:hover:bg-[#0e1d35] rounded-xl transition-all border border-slate-100 dark:border-slate-850"
                        >
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2">
                                <Icons.Archive className="w-4 h-4 text-teal-500" />
                                استعراض السجل المعتمد
                            </span>
                            <span className="text-[10px] font-black text-slate-450 dark:text-slate-500">📂 {stats.approved}</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Core Workflow Transactions Data Table */}
            <div className="premium-card p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">سجل المعاملات والاعتمادات القائمة</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">جدول تفاعلي متطور لمراقبة حالات تدقيق وتوقيع المعاملات.</p>
                    </div>

                    {/* Filter and Search Bar Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search input with interactive icon focus */}
                        <div className="relative group">
                            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="ابحث باسم المستفيد، السيريال..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-4 pr-10 py-2.5 input-premium w-64 focus:border-teal-500"
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
                                className="pl-8 pr-10 py-2.5 input-premium w-64 cursor-pointer appearance-none focus:border-teal-500"
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
                <div className="overflow-x-auto border border-slate-200/50 dark:border-slate-800/40 rounded-2xl custom-scrollbar bg-white dark:bg-[#070e1b]/40">
                    <table className="w-full text-right text-xs">
                        <thead>
                            <tr className="border-b border-slate-200/50 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/20 text-slate-450 dark:text-slate-400 font-black">
                                <th className="p-4.5 text-center w-24">الرقم التسلسلي</th>
                                <th className="p-4.5">اسم صاحب المعاملة</th>
                                <th className="p-4.5">العنوان والمناسبة</th>
                                <th className="p-4.5 w-32">تاريخ التقديم</th>
                                <th className="p-4.5 text-center w-40">حالة التوقيع</th>
                                <th className="p-4.5 text-center w-28">العمليات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {filteredCerts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8">
                                        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-550">
                                            <Inbox className="w-12 h-12 mb-3 text-amber-500/60 stroke-[1.5] animate-bounce" />
                                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-250">لا توجد معاملات متوافقة</h4>
                                            <p className="text-[10px] mt-1 text-slate-500">جرب فرز المعاملات باستخدام شروط أخرى أو ابحث بقيم مختلفة.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCerts.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-all">
                                        <td className="p-4.5 text-center font-mono font-bold text-slate-500 dark:text-slate-450">{c.serial}</td>
                                        <td className="p-4.5 font-black text-slate-800 dark:text-slate-200">{c.recipientName}</td>
                                        <td className="p-4.5 font-bold text-slate-500 dark:text-slate-450">{c.event}</td>
                                        <td className="p-4.5 font-bold text-slate-450 dark:text-slate-550">
                                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : '—'}
                                        </td>
                                        <td className="p-4.5 text-center">{getStatusBadge(c.status)}</td>
                                        <td className="p-4.5 text-center">
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
