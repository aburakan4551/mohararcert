/**
 * 🛡️ RolePermissions.jsx — Enterprise MoH Healthcare Dashboard
 * Interactive Access Control Matrix (RBAC Matrix) visualizer.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Check, X, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'framer-motion';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import PageHeader from '../ui/layouts/PageHeader';

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
    { id: 'CREATOR', label: 'منشئ المعاملات', color: 'var(--color-info)' },
    { id: 'ASSISTANT_MANAGER', label: 'المراجع الإداري (المساعد)', color: 'var(--color-primary-600)' },
    { id: 'GENERAL_MANAGER', label: 'المصادق النهائي (المدير)', color: 'var(--color-warning)' },
    { id: 'SUPER_ADMIN', label: 'مدير النظام الفيدرالي', color: 'var(--color-success)' }
];

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <PageHeader
                title="مصفوفة الصلاحيات العامة (RBAC)"
                subtitle="جدول يوضح سياسات التحكم بالوصول ومسارات العمليات لكل دور وظيفي في النظام."
            />

            <div style={{
                padding: '12px 16px', background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.18)', borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'flex-start', gap: '10px'
            }}>
                <ShieldAlert size={16} style={{ color: 'var(--color-warning)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--color-warning)' }}>ملاحظة أمنية هامة</span>
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.5 }}>
                        يتم فرض مصفوفة التحكم في الوصول (ACLs) على مستوى مسارات التطبيق وقواعد البيانات. أي محاولة وصول غير مصرحة يتم حظرها وتسجيلها فوراً في سجل التدقيق الأمني.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={16} style={{ color: 'var(--color-primary-600)' }} />
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            جدول العمليات والصلاحيات الممنوحة
                        </h3>
                    </div>
                </CardHeader>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>العملية الإجرائية</th>
                                {ROLES.map(r => (
                                    <th key={r.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <div style={{ fontSize: 'var(--text-micro)', fontWeight: 800, color: r.color }}>{r.label}</div>
                                        <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>{r.id}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {OPERATIONS.map((op, i) => (
                                <motion.tr
                                    key={op.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '16px' }}>
                                        <h4 style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--text-primary)' }}>{op.label}</h4>
                                        <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: '2px' }}>{op.desc}</p>
                                    </td>
                                    {ROLES.map(role => {
                                        const hasPerm = PERMISSIONS_MATRIX[op.id][role.id];
                                        const isActive = user.role === role.id;
                                        return (
                                            <td key={role.id} style={{ padding: '16px', textAlign: 'center', background: isActive ? 'rgba(15,169,88,0.02)' : 'transparent' }}>
                                                {hasPerm ? (
                                                    <div style={{ width: 24, height: 24, margin: '0 auto', borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-success-border)' }}>
                                                        <Check size={12} style={{ color: 'var(--color-success)' }} />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: 24, height: 24, margin: '0 auto', borderRadius: '50%', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-default)' }}>
                                                        <X size={12} style={{ color: 'var(--text-tertiary)' }} />
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
}
