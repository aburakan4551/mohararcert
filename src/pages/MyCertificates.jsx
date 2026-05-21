/**
 * 📝 MyCertificates.jsx
 * Creator's certification records and workflow status tracker.
 * Displays personal logs, feedback warnings, and easy redirection to edit returned certificates.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowLeft, Hourglass, CheckCircle, HelpCircle, FileEdit, Trash2, MessageCircle } from 'lucide-react';

export default function MyCertificates() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myCerts, setMyCerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadMyCerts = async () => {
        setLoading(true);
        try {
            const all = await dbService.getAll();
            // Filter by current creator id
            setMyCerts(all.filter(c => c.createdBy === user.id));
        } catch (e) {
            console.error('Failed to load certificates queue: ', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMyCerts();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً؟')) return;
        try {
            await dbService.delete(id);
            setMyCerts(p => p.filter(c => c.id !== id));
        } catch (e) {
            alert('فشل الحذف: ' + e.message);
        }
    };

    const getStatusTheme = (status) => {
        switch (status) {
            case 'DRAFT':
                return { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600', label: 'مسودة لم ترسل' };
            case 'PENDING_APPROVAL':
                return { bg: 'bg-blue-500/10 text-blue-500 border border-blue-500/10', label: 'بانتظار مراجعة المساعد' };
            case 'APPROVED_BY_ASSISTANT':
                return { bg: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/10', label: 'معتمد من المساعد وبانتظار المدير العام' };
            case 'FINAL_APPROVED':
                return { bg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10', label: 'معتمد وموثق نهائياً' };
            case 'RETURNED_FOR_EDIT':
                return { bg: 'bg-amber-500/10 text-amber-500 border border-amber-500/12', label: 'مُعاد للتعديل (ملاحظات معلقة)' };
            case 'REJECTED':
                return { bg: 'bg-rose-500/10 text-rose-500 border border-rose-500/10', label: 'مرفوض إدارياً' };
            case 'ARCHIVED':
                return { bg: 'bg-slate-500/10 text-slate-400 border border-slate-500/10', label: 'مؤرشف ومقفل' };
            default:
                return { bg: 'bg-slate-100 text-slate-500', label: 'غير معروف' };
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
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">سجل شهاداتي الخاصة</h2>
                    <p className="text-xs text-slate-400">تتبع الحالات، واقرأ الملاحظات الإدارية، وعدّل الطلبات المسترجعة.</p>
                </div>
                <Link 
                    to="/create" 
                    className="px-5 py-2.5 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all duration-300 shadow-md text-center inline-flex items-center gap-2 cursor-pointer"
                >
                    <span>➕ إنشاء معاملة جديدة</span>
                </Link>
            </div>

            {/* Queue List Grid */}
            <div className="grid grid-cols-1 gap-4">
                {myCerts.length === 0 ? (
                    <div className="bg-white dark:bg-slate-950 p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl mx-auto space-y-4">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto opacity-60" />
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">لا توجد معاملات منشأة حالياً</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            لم تقم بإنشاء أو رفع أي شهادات حتى الآن. يمكنك النقر على الزر أعلاه للبدء في صياغة أول طلب اعتماد رسمي.
                        </p>
                    </div>
                ) : (
                    myCerts.map((c) => {
                        const style = getStatusTheme(c.status);
                        const isEditable = c.status === 'DRAFT' || c.status === 'RETURNED_FOR_EDIT';

                        return (
                            <div key={c.id} className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                
                                {/* Info Area */}
                                <div className="space-y-2 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="font-mono font-bold text-slate-400 text-xs">#{c.serial}</span>
                                        <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full ${style.bg}`}>{style.label}</span>
                                    </div>
                                    
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{c.recipientName}</h3>
                                    <p className="text-xs text-slate-400 truncate">{c.event}</p>
                                    
                                    {/* Date */}
                                    <span className="text-[10px] text-slate-400 block font-semibold">تاريخ الإنشاء: {new Date(c.createdAt).toLocaleDateString('ar-SA')}</span>

                                    {/* Decision notes overlay warning */}
                                    {c.comments && (c.status === 'RETURNED_FOR_EDIT' || c.status === 'REJECTED') && (
                                        <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                                            <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold text-[10px] block mb-0.5">ملاحظات اللجنة الإدارية:</span>
                                                <p className="text-xs leading-relaxed">{c.comments}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Area */}
                                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0">
                                    <button
                                        onClick={() => navigate(`/approvals/${c.id}`)}
                                        className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>👀 تفاصيل</span>
                                    </button>

                                    {isEditable && (
                                        <button
                                            onClick={() => navigate(`/create?id=${c.id}`)}
                                            className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-black hover:bg-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10"
                                        >
                                            <FileEdit className="w-3.5 h-3.5" />
                                            <span>تعديل</span>
                                        </button>
                                    )}

                                    {c.status === 'DRAFT' && (
                                        <button
                                            onClick={() => handleDelete(c.id)}
                                            className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/20 rounded-xl transition-all cursor-pointer"
                                            title="حذف المسودة"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                            </div>
                        );
                    })
                )}
            </div>

        </div>
    );
}
