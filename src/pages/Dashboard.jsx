/**
 * 📊 Dashboard.jsx
 * Executive Dashboard & Metrics Visualizer for mohararcert.
 * Renders statistical indicators, interactive filters, and an SVG progress chart.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Link, useNavigate } from 'react-router-dom';
import { Award, FileText, Hourglass, CheckCircle2, AlertTriangle, Search, Eye, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
    const { user, canPerform } = useAuth();
    const navigate = useNavigate();
    const [certs, setCerts] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const list = await dbService.getAll();
            setCerts(list);
        } catch (e) {
            console.error('Error fetching dashboard stats: ', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter certificates based on role and query
    const filteredCerts = useMemo(() => {
        return certs.filter(c => {
            // Search query matches name or event or serial
            const matchesSearch = 
                c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
                c.event.toLowerCase().includes(search.toLowerCase()) ||
                c.serial.includes(search);
            
            // Status matches filter
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

            // Creator only sees their own, unless they are admin/assistant/gm
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

    // SVG Chart points calculation
    const chartPoints = "10,120 120,80 240,110 360,40 480,90 600,30 720,50";

    const getStatusBadge = (status) => {
        switch (status) {
            case 'DRAFT':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">مسودة</span>;
            case 'PENDING_APPROVAL':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/10">بانتظار تأشير المساعد</span>;
            case 'APPROVED_BY_ASSISTANT':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/10">معتمد من المساعد</span>;
            case 'FINAL_APPROVED':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">معتمد نهائياً</span>;
            case 'RETURNED_FOR_EDIT':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/10">مُعاد للتعديل</span>;
            case 'REJECTED':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/10">مرفوض</span>;
            case 'ARCHIVED':
                return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/10">مؤرشف</span>;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* Greeting */}
            <div className="bg-gradient-to-l from-[#0f1f38] to-[#122749] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="space-y-1 z-10">
                    <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">أهلاً بك، {user.name} 👋</h2>
                    <p className="text-xs text-slate-300">
                        {user.role === 'CREATOR' 
                            ? 'يمكنك البدء بإنشاء شهادات جديدة وإرسالها للمراجعة والاعتماد مباشرة من المنصة.'
                            : 'لديك معاملات جديدة بانتظار اتخاذ القرار الإداري المناسب، يرجى مراجعة القائمة أدناه.'
                        }
                    </p>
                </div>
                {canPerform('CREATE_CERTIFICATE') && (
                    <Link 
                        to="/create" 
                        className="px-5 py-2.5 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all duration-300 shadow-md text-center z-10"
                    >
                        📝 إنشاء شهادة جديدة
                    </Link>
                )}
            </div>

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 font-bold block">إجمالي المعاملات</span>
                        <span className="text-2xl font-black">{stats.total}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Hourglass className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] text-amber-500/80 font-bold block">بانتظار الاعتماد</span>
                        <span className="text-2xl font-black text-amber-500">{stats.pending}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] text-emerald-500/80 font-bold block">معتمد نهائياً</span>
                        <span className="text-2xl font-black text-emerald-500">{stats.approved}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
                    <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="text-[10px] text-rose-500/80 font-bold block">مُرجَع / مرفوض</span>
                        <span className="text-2xl font-black text-rose-500">{stats.returned}</span>
                    </div>
                </div>
            </div>

            {/* Dashboard Visual Grid: Chart & Quick Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Right: SVG Trend Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            مؤشر نشاط إصدار الشهادات الأسبوعي
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400">آخر 7 أيام</span>
                    </div>
                    
                    {/* Glowing SVG Chart */}
                    <div className="w-full h-44 bg-slate-50 dark:bg-slate-900/40 rounded-xl relative overflow-hidden flex items-end">
                        <svg className="w-full h-full absolute inset-0 text-amber-500/15" viewBox="0 0 740 160" preserveAspectRatio="none">
                            <path d={`M10,160 L${chartPoints} L730,160 Z`} fill="currentColor" />
                            <polyline fill="none" stroke="#eab308" strokeWidth="3" points={chartPoints} />
                        </svg>
                        <div className="w-full flex justify-between px-6 text-[10px] font-bold text-slate-400 py-2 relative z-10 border-t border-slate-100 dark:border-slate-800/80 bg-white/20 dark:bg-slate-950/20">
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

                {/* Left: Quick Actions Panel */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 justify-between">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-2">إجراءات الوصول السريع</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">تصفح مسارات العمل، قم بمراجعة واعتماد الطلبات المعلقة، أو تحقق من سجل التدقيق الأمني الخاص بالنظام.</p>
                    </div>

                    <div className="space-y-2">
                        {user.role !== 'CREATOR' && (
                            <Link to="/pending" className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 rounded-xl transition-all border border-slate-100 dark:border-slate-800/50">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">📥 المعاملات المعلقة بانتظاري</span>
                                <span className="px-2 py-0.5 text-[9px] font-black bg-amber-500 text-slate-950 rounded-full">{stats.pending}</span>
                            </Link>
                        )}
                        <Link to="/archive" className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900 rounded-xl transition-all border border-slate-100 dark:border-slate-800/50">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">🗄️ استعراض الأرشيف المعتمد</span>
                            <span className="text-[10px] font-bold text-slate-400">📂 {stats.approved}</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Core Workflow Transactions Table */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">سجل المعاملات والاعتمادات</h3>
                        <p className="text-xs text-slate-400">قائمة تفاعلية بالشهادات المصدرة ومتابعة حالتها الإجرائية.</p>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ابحث باسم المستفيد، المناسبة..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-4 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-60"
                            />
                        </div>

                        {/* Status Select Filter */}
                        <div className="relative flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3" />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="pl-4 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 cursor-pointer appearance-none"
                            >
                                <option value="ALL">جميع الحالات</option>
                                <option value="DRAFT">مسودة</option>
                                <option value="PENDING_APPROVAL">بانتظار تأشير المساعد</option>
                                <option value="APPROVED_BY_ASSISTANT">معتمد من المساعد</option>
                                <option value="FINAL_APPROVED">معتمد نهائياً</option>
                                <option value="RETURNED_FOR_EDIT">مُعاد للتعديل</option>
                                <option value="REJECTED">مرفوض</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Body */}
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-bold">
                                <th className="pb-3 text-center w-14">الرقم</th>
                                <th className="pb-3">اسم المستفيد</th>
                                <th className="pb-3">المناسبة</th>
                                <th className="pb-3">تاريخ التقديم</th>
                                <th className="pb-3 text-center">حالة الاعتماد</th>
                                <th className="pb-3 text-center w-20">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredCerts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                                        لا توجد معاملات متوافقة مع شروط الفرز الحالية.
                                    </td>
                                </tr>
                            ) : (
                                filteredCerts.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all">
                                        <td className="py-3.5 text-center font-mono font-bold text-slate-500">{c.serial}</td>
                                        <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">{c.recipientName}</td>
                                        <td className="py-3.5 text-slate-500 dark:text-slate-400">{c.event}</td>
                                        <td className="py-3.5 text-slate-400 dark:text-slate-500">
                                            {new Date(c.createdAt).toLocaleDateString('ar-SA')}
                                        </td>
                                        <td className="py-3.5 text-center">{getStatusBadge(c.status)}</td>
                                        <td className="py-3.5 text-center">
                                            {/* Action view/approve button depending on status and role */}
                                            <button
                                                onClick={() => navigate(`/approvals/${c.id}`)}
                                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                                title="معاينة تفاصيل المعاملة والاعتمادات"
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
