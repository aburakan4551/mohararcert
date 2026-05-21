/**
 * 🛡️ RolePermissions.jsx
 * Interactive Access Control Matrix (RBAC Matrix) visualizer for mohararcert.
 * Details operations and checkmarks demonstrating the security hierarchy.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Check, X, ShieldAlert, Award } from 'lucide-react';

const OPERATIONS = [
    { id: 'create', label: 'إنشاء المعاملات وصياغة المسودات', desc: 'حق صياغة وتعديل مسودات الشهادات وربطها بالقوالب.' },
    { id: 'bulk_excel', label: 'استيراد Excel والتوليد الجماعي', desc: 'رفع ملفات البيانات وإصدار الشهادات دفعة واحدة كمسودات.' },
    { id: 'visa_review', label: 'مراجعة وتأشير المعاملات المرفوعة', desc: 'حق معاينة الطلبات، إرجاعها للمنشئ أو تأشيرها إدارياً.' },
    { id: 'final_approve', label: 'المصادقة والاعتماد النهائي الفردي', desc: 'حق قفل المستند وإصدار التوقيع والختم النهائي.' },
    { id: 'bulk_approve', label: 'الاعتماد والختم الجماعي السريع', desc: 'حق المصادقة على عدد من المعاملات في ثوانٍ بضغطة زر.' },
    { id: 'archive_access', label: 'الوصول للأرشيف المقفل والطباعة', desc: 'حق استعراض الأوراق المعتمدة وتحميل الـ PDF والطباعة.' },
    { id: 'audit_trail', label: 'الوصول الكامل لسجل التدقيق الأمني', desc: 'حق استعراض المعاملات التاريخية وحركات دخول Operators.' },
    { id: 'identity_settings', label: 'تحديث الهوية وأسماء المسؤولين والأختام', desc: 'حق تخصيص اللوجو والشعارات، الألوان، أختام المدير والمساعد.' },
    { id: 'rbac_mgmt', label: 'إدارة أدوار المشغلين وتعديل الصلاحيات', desc: 'حق تعديل مراتب المعرفين وإصدار الصلاحيات.' }
];

const ROLES = [
    { id: 'CREATOR', label: 'منشئ المعاملات', color: 'text-blue-500' },
    { id: 'ASSISTANT_MANAGER', label: 'المراجع الإداري (المساعد)', color: 'text-purple-500' },
    { id: 'GENERAL_MANAGER', label: 'المصادق النهائي (المدير)', color: 'text-amber-500' },
    { id: 'SUPER_ADMIN', label: 'مدير النظام الفيدرالي', color: 'text-emerald-500' }
];

// Matrix representing true/false permissions
const PERMISSIONS_MATRIX = {
    create: { CREATOR: true, ASSISTANT_MANAGER: false, GENERAL_MANAGER: false, SUPER_ADMIN: true },
    bulk_excel: { CREATOR: true, ASSISTANT_MANAGER: false, GENERAL_MANAGER: false, SUPER_ADMIN: true },
    visa_review: { CREATOR: false, ASSISTANT_MANAGER: true, GENERAL_MANAGER: false, SUPER_ADMIN: true },
    final_approve: { CREATOR: false, ASSISTANT_MANAGER: false, GENERAL_MANAGER: true, SUPER_ADMIN: true },
    bulk_approve: { CREATOR: false, ASSISTANT_MANAGER: true, GENERAL_MANAGER: true, SUPER_ADMIN: true },
    archive_access: { CREATOR: true, ASSISTANT_MANAGER: true, GENERAL_MANAGER: true, SUPER_ADMIN: true },
    audit_trail: { CREATOR: false, ASSISTANT_MANAGER: false, GENERAL_MANAGER: false, SUPER_ADMIN: true },
    identity_settings: { CREATOR: false, ASSISTANT_MANAGER: false, GENERAL_MANAGER: false, SUPER_ADMIN: true },
    rbac_mgmt: { CREATOR: false, ASSISTANT_MANAGER: false, GENERAL_MANAGER: false, SUPER_ADMIN: true }
};

export default function RolePermissions() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-500" />
                        جدول الصلاحيات العام والتحكم بالوصول (RBAC Matrix)
                    </h2>
                    <p className="text-xs text-slate-400">مصفوفة الصلاحيات المطبقة في النظام لعزل العمليات وحماية المسارات.</p>
                </div>
            </div>

            {/* Info Alerts */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <span className="font-bold block">ملاحظة أمنية هامة:</span>
                    <p className="leading-relaxed">
                        يتم فرض مصفوفة التحكم في الوصول (Access Control Lists) على طبقة الخادم وطبقة المكونات (React Router Guard).
                        أي محاولة للوصول المباشر أو تعديل المسارات البرمجية يتم حظرها تلقائياً وتسجيلها في سجل المراقبة (Audit Logs) كحركة غير مصرح بها.
                    </p>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                <table className="w-full text-right text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-bold">
                            <th className="pb-3 w-72">العملية والعملية الإجرائية</th>
                            {ROLES.map(r => (
                                <th key={r.id} className="pb-3 text-center w-36">
                                    <div className={`font-black ${r.color}`}>{r.label}</div>
                                    <span className="text-[9px] text-slate-400 font-mono font-medium block mt-0.5">{r.id}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                        {OPERATIONS.map((op) => (
                            <tr key={op.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all">
                                <td className="py-4">
                                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{op.label}</h4>
                                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium mt-0.5">{op.desc}</p>
                                </td>
                                {ROLES.map(role => {
                                    const hasPerm = PERMISSIONS_MATRIX[op.id][role.id];
                                    const isActive = user.role === role.id;

                                    return (
                                        <td key={role.id} className={`py-4 text-center ${isActive ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.02]' : ''}`}>
                                            <div className="flex items-center justify-center">
                                                {hasPerm ? (
                                                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </span>
                                                ) : (
                                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-300 dark:text-slate-800 flex items-center justify-center border border-slate-200/20 dark:border-slate-800/40">
                                                        <X className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
