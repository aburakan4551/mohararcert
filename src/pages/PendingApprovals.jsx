/**
 * 📥 PendingApprovals.jsx
 * Workflow queues for higher management authorities (Assistant & General Manager).
 * Supports search, batch actions, individual inspection, and GM Bulk Approval.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService, auditService, notificationService } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { Hourglass, Eye, CheckSquare, Square, ThumbsUp, AlertCircle, Sparkles, MessageCircle } from 'lucide-react';

export default function PendingApprovals() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [certs, setCerts] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [decisionNotes, setDecisionNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const all = await dbService.getAll();
            setCerts(all);
        } catch (e) {
            console.error('Failed to load pending queue: ', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
    }, []);

    // Filter certificates that require action by the current role
    const pendingCerts = useMemo(() => {
        return certs.filter(c => {
            if (user.role === 'ASSISTANT_MANAGER') {
                return c.status === 'PENDING_APPROVAL';
            }
            if (user.role === 'GENERAL_MANAGER') {
                return c.status === 'APPROVED_BY_ASSISTANT';
            }
            if (user.role === 'SUPER_ADMIN') {
                return c.status === 'PENDING_APPROVAL' || c.status === 'APPROVED_BY_ASSISTANT';
            }
            return false;
        });
    }, [certs, user]);

    // Handle Selection toggles
    const handleSelectToggle = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === pendingCerts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendingCerts.map(c => c.id));
        }
    };

    // Bulk Approval Handler
    const handleBulkApprove = async () => {
        if (selectedIds.length === 0) return alert('الرجاء تحديد معاملة واحدة على الأقل');
        if (!window.confirm(`هل أنت متأكد من رغبتك في اعتماد عدد (${selectedIds.length}) معاملة دفعة واحدة؟`)) return;

        setProcessing(true);
        try {
            for (const id of selectedIds) {
                const cert = certs.find(x => x.id === id);
                if (user.role === 'ASSISTANT_MANAGER' || user.role === 'SUPER_ADMIN') {
                    // If assistant, approve with visa
                    await dbService.approveByAssistant(id, user, decisionNotes || 'تم الاعتماد الجماعي والتأشير بالقبول');
                    await auditService.log('APPROVE_CERTIFICATE', user, `تأشيرة ومراجعة جماعية للشهادة رقم: ${cert.serial}`, id);
                    
                    // Notify General Manager
                    await notificationService.create({
                        userId: 'usr-3', // General Manager
                        message: `تأشيرة جديدة مكتملة بانتظار اعتمادك النهائي: ${cert.recipientName}`,
                        type: 'approve'
                    });
                } 
                
                if (user.role === 'GENERAL_MANAGER' || user.role === 'SUPER_ADMIN') {
                    // If general manager, finalize and lock
                    await dbService.approveFinal(id, user, decisionNotes || 'تم الاعتماد النهائي والمصادقة الجماعية');
                    await auditService.log('APPROVE_CERTIFICATE', user, `مصادقة واعتماد نهائي جماعي للشهادة رقم: ${cert.serial}`, id);
                    
                    // Notify Creator
                    await notificationService.create({
                        userId: cert.createdBy,
                        message: `🎉 تهانينا! تمت المصادقة والاعتماد النهائي لشهادتك: ${cert.recipientName}`,
                        type: 'approve'
                    });
                }
            }

            alert('تم إنهاء الاعتماد الجماعي لجميع المعاملات المحددة بنجاح!');
            setSelectedIds([]);
            setDecisionNotes('');
            await loadQueue();
        } catch (e) {
            alert('فشلت العملية الجماعية: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <Hourglass className="w-5 h-5 text-amber-500 animate-spin" />
                        المعاملات المعلقة بانتظار القرار الإداري
                    </h2>
                    <p className="text-xs text-slate-400">
                        {user.role === 'ASSISTANT_MANAGER' && 'قم بمراجعة المعاملات المرفوعة وتأشيرها لنقلها للمدير العام.'}
                        {user.role === 'GENERAL_MANAGER' && 'قم بالمصادقة النهائية والاعتماد الرقمي للشهادات لإقفالها وترحيلها للأرشيف.'}
                        {user.role === 'SUPER_ADMIN' && 'إدارة الحالات وتوجيه مسار المعاملات المتوقفة في النظام.'}
                    </p>
                </div>
            </div>

            {pendingCerts.length === 0 ? (
                <div className="bg-white dark:bg-slate-950 p-12 text-center border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl mx-auto space-y-4">
                    <ThumbsUp className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">الدرج خالٍ تماماً!</h3>
                    <p className="text-xs text-slate-400">
                        عمل رائع، تم الانتهاء من حوكمة ومراجعة كافة الطلبات الموجهة إلى منصتك حالياً. لا توجد أي شهادات معلقة بانتظار قرارك.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    
                    {/* Bulk Decision Controls */}
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSelectAll}
                                className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                            >
                                {selectedIds.length === pendingCerts.length ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4" />}
                                <span>{selectedIds.length === pendingCerts.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</span>
                            </button>
                            <span className="text-xs text-slate-500 font-bold">المعاملات المحددة: {selectedIds.length} من أصل {pendingCerts.length}</span>
                        </div>

                        {selectedIds.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 lg:max-w-2xl justify-end">
                                <div className="relative w-full sm:max-w-xs">
                                    <MessageCircle className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                                    <input
                                        type="text"
                                        placeholder="توجيه أو ملاحظة جماعية (اختياري)..."
                                        value={decisionNotes}
                                        onChange={e => setDecisionNotes(e.target.value)}
                                        className="pl-4 pr-9 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none text-slate-700 dark:text-slate-200 w-full"
                                    />
                                </div>

                                <button
                                    onClick={handleBulkApprove}
                                    disabled={processing}
                                    className="px-5 py-2 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
                                >
                                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                    <span>اعتماد جماعي ({selectedIds.length})</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Table of Pending Certs */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                        <table className="w-full text-right text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-bold">
                                    <th className="pb-3 text-center w-12">اختر</th>
                                    <th className="pb-3 text-center w-16">الرقم</th>
                                    <th className="pb-3">اسم المستفيد</th>
                                    <th className="pb-3">المناسبة والموضوع</th>
                                    <th className="pb-3">منشئ الطلب</th>
                                    <th className="pb-3 text-center w-24">الحالة</th>
                                    <th className="pb-3 text-center w-20">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {pendingCerts.map((c) => {
                                    const isSelected = selectedIds.includes(c.id);
                                    return (
                                        <tr key={c.id} className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all ${isSelected ? 'bg-amber-500/5 dark:bg-amber-500/5' : ''}`}>
                                            <td className="py-3.5 text-center">
                                                <button
                                                    onClick={() => handleSelectToggle(c.id)}
                                                    className="text-slate-400 hover:text-amber-500 transition-all cursor-pointer inline-block"
                                                >
                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="py-3.5 text-center font-mono font-bold text-slate-500">{c.serial}</td>
                                            <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">{c.recipientName}</td>
                                            <td className="py-3.5 text-slate-500 dark:text-slate-400">
                                                <span>{c.event}</span>
                                            </td>
                                            <td className="py-3.5 text-slate-400 dark:text-slate-500 font-medium">
                                                {c.creatorName || 'منشئ النظام'}
                                            </td>
                                            <td className="py-3.5 text-center">
                                                {c.status === 'PENDING_APPROVAL' ? (
                                                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/10">مراجعة المساعد</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/10">اعتماد المدير</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 text-center">
                                                <button
                                                    onClick={() => navigate(`/approvals/${c.id}`)}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>مراجعة</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                </div>
            )}

        </div>
    );
}
