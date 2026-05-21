/**
 * 🛡️ AuditLogs.jsx
 * Compliance & Security Audit Trail Visualizer for mohararcert.
 * Exposes detailed tracking grids, searchable actions, and role badges.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditService } from '../services/db';
import { ShieldCheck, Search, ShieldAlert, Clock, Filter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AuditLogs() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            alert('عذراً، لا تمتلك الصلاحيات الكافية للوصول لسجل التدقيق الأمني.');
            navigate('/');
            return;
        }

        const fetchLogs = async () => {
            setLoading(true);
            try {
                const list = await auditService.getAll();
                setLogs(list);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [user, navigate]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                log.userName.toLowerCase().includes(search.toLowerCase()) ||
                log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
                log.details.toLowerCase().includes(search.toLowerCase()) ||
                log.action.toLowerCase().includes(search.toLowerCase());
            
            const matchesFilter = actionFilter === 'ALL' || log.action === actionFilter;

            return matchesSearch && matchesFilter;
        });
    }, [logs, search, actionFilter]);

    const getActionBadge = (action) => {
        switch (action) {
            case 'LOGIN':
                return <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/15">تسجيل دخول</span>;
            case 'LOGOUT':
                return <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/15">تسجيل خروج</span>;
            case 'CREATE_CERTIFICATE':
                return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/15">إنشاء شهادة</span>;
            case 'UPDATE_CERTIFICATE':
                return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/15">تعديل شهادة</span>;
            case 'APPROVE_CERTIFICATE':
                return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/15">اعتماد إداري</span>;
            case 'REJECT_CERTIFICATE':
                return <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/15">رفض المعاملة</span>;
            case 'RETURN_FOR_EDIT':
                return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/15">إرجاع للتعديل</span>;
            case 'EXPORT_PDF':
                return <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/15">تصدير PDF</span>;
            case 'PRINT_CERTIFICATE':
                return <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-500 border border-teal-500/15">طباعة ورقية</span>;
            case 'UNAUTHORIZED_ACCESS':
                return <span className="px-2 py-0.5 rounded-full bg-rose-600/15 text-rose-400 border border-rose-500/20 animate-pulse font-black">محاولة غير مصرحة</span>;
            default:
                return <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{action}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                    سجل التدقيق الأمني ومراقبة النظام (Audit Trail)
                </h2>
                <p className="text-xs text-slate-400">سجل غير قابل للتعديل يوثق جميع العمليات، المداخلات، الحركات الأمنية وتوقيتها الدقيق.</p>
            </div>

            {/* Table wrapper */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase">سجل الحركات التاريخية</h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="ابحث بالفاعل، الإجراء، التفاصيل..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-4 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-60"
                            />
                        </div>

                        {/* Action select filter */}
                        <div className="relative flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3" />
                            <select
                                value={actionFilter}
                                onChange={e => setActionFilter(e.target.value)}
                                className="pl-4 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 cursor-pointer appearance-none animate-none"
                            >
                                <option value="ALL">جميع الحركات</option>
                                <option value="LOGIN">تسجيل دخول</option>
                                <option value="CREATE_CERTIFICATE">إنشاء شهادة</option>
                                <option value="APPROVE_CERTIFICATE">اعتماد</option>
                                <option value="RETURN_FOR_EDIT">إرجاع للتعديل</option>
                                <option value="REJECT_CERTIFICATE">رفض</option>
                                <option value="EXPORT_PDF">تصدير PDF</option>
                                <option value="UNAUTHORIZED_ACCESS">محاولات مرفوضة</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Logs table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-bold">
                                <th className="pb-3 w-40">البصمة الزمنية</th>
                                <th className="pb-3 text-center w-28">نوع الحركة</th>
                                <th className="pb-3">فاعل الإجراء</th>
                                <th className="pb-3 w-28">الدور الوظيفي</th>
                                <th className="pb-3">التفاصيل الفنية</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-slate-400 dark:text-slate-500">
                                        لا توجد سجلات تدقيق متطابقة مع شروط البحث والفلترة.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all">
                                        <td className="py-3 text-slate-400 font-mono font-bold">
                                            {new Date(log.timestamp).toLocaleString('ar-SA')}
                                        </td>
                                        <td className="py-3 text-center">{getActionBadge(log.action)}</td>
                                        <td className="py-3 text-slate-800 dark:text-slate-200">
                                            <div>{log.userName}</div>
                                            <div className="text-[10px] text-slate-400 font-mono font-medium">{log.userEmail}</div>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-[10px] text-slate-500 font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800/40">
                                                {log.userRole}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                                            {log.details}
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
