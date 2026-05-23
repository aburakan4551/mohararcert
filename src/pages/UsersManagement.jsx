/**
 * 👥 UsersManagement.jsx — Enterprise RBAC Management
 * Clean DataTable with role management dropdowns.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService, auditService } from '../services/db';
import {
    Shield, Users, Mail, Award, CheckCircle, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Badge } from '../ui/feedback/Badge';
import { Avatar } from '../ui/components/Avatar';
import PageHeader from '../ui/layouts/PageHeader';

const ROLE_META = {
    CREATOR: {
        label:   'منشئ المعاملات',
        variant: 'info',
        desc:    'يمكنه إنشاء الشهادات ورفعها للاعتماد',
    },
    ASSISTANT_MANAGER: {
        label:   'مساعد المدير',
        variant: 'neutral',
        desc:    'يراجع المعاملات ويُأشّر عليها ثم يرفعها',
    },
    GENERAL_MANAGER: {
        label:   'المدير العام',
        variant: 'warning',
        desc:    'المصادقة النهائية والاعتماد الرسمي',
    },
    SUPER_ADMIN: {
        label:   'المشرف العام',
        variant: 'success',
        desc:    'إدارة كاملة للنظام والمستخدمين',
    },
};

export default function UsersManagement() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [usersList,  setUsersList]  = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [feedback,   setFeedback]   = useState(null); // { id, type: 'success'|'error' }

    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            navigate('/dashboard');
            return;
        }
        loadUsers();
    }, [user, navigate]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const list = await authService.getUsers();
            setUsersList(list);
            logger.api(`تحميل المستخدمين: ${list.length}`);
        } catch (e) {
            logger.error('فشل تحميل المستخدمين', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingId(userId);
        setFeedback(null);
        try {
            const targetUser = usersList.find(u => u.id === userId);
            await authService.updateUserRole(userId, newRole);
            await auditService.log(
                'UPDATE_USER_ROLE',
                user,
                `تعديل دور: ${targetUser.name} → ${ROLE_META[newRole]?.label}`,
            );
            setFeedback({ id: userId, type: 'success' });
            await loadUsers();
            setTimeout(() => setFeedback(null), 2500);
        } catch (e) {
            logger.error('فشل تحديث الدور', e);
            setFeedback({ id: userId, type: 'error' });
            setTimeout(() => setFeedback(null), 2500);
        } finally {
            setUpdatingId(null);
        }
    };

    const totalByRole = (role) => usersList.filter(u => u.role === role).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Header ── */}
            <PageHeader
                title="إدارة الحسابات والصلاحيات"
                subtitle="تحديد أدوار المستخدمين وصلاحياتهم الوظيفية في النظام"
            />

            {/* ── Role Summary ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {Object.entries(ROLE_META).map(([role, meta]) => (
                    <div key={role} style={{
                        padding: '14px 16px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-surface)',
                    }}>
                        <p style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                            {meta.label}
                        </p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                            {totalByRole(role)}
                        </p>
                        <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500, lineHeight: 1.4 }}>
                            {meta.desc}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Users Table ── */}
            <Card>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={15} style={{ color: 'var(--color-primary-600)' }} />
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            المستخدمون المسجلون
                        </h3>
                        <span style={{
                            fontSize: 'var(--text-micro)', fontWeight: 700,
                            background: 'var(--bg-muted)', color: 'var(--text-muted)',
                            border: '1px solid var(--border-default)',
                            padding: '1px 8px', borderRadius: '999px',
                        }}>
                            {usersList.length}
                        </span>
                    </div>
                </CardHeader>

                {loading ? (
                    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[1,2,3,4].map(i => (
                            <div key={i} className="skeleton" style={{ height: '68px', borderRadius: '12px' }} />
                        ))}
                    </div>
                ) : (
                    <div style={{ overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                    {['المستخدم', 'البريد الإلكتروني', 'الدور الحالي', 'تعديل الصلاحية', 'الحالة'].map(h => (
                                        <th key={h} style={{
                                            padding: '10px 16px',
                                            fontSize: 'var(--text-micro)', fontWeight: 800,
                                            color: 'var(--text-muted)',
                                            textAlign: 'right',
                                            textTransform: 'uppercase', letterSpacing: '0.06em',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {usersList.map((usr, idx) => {
                                    const isSelf   = usr.id === user.id;
                                    const roleMeta = ROLE_META[usr.role] || { label: 'غير محدد', variant: 'neutral' };
                                    const isUpdating = updatingId === usr.id;
                                    const fb = feedback?.id === usr.id ? feedback.type : null;

                                    return (
                                        <motion.tr
                                            key={usr.id}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.04 }}
                                            style={{
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: isSelf ? 'rgba(15,169,88,0.02)' : 'transparent',
                                                transition: 'background var(--transition-fast)',
                                            }}
                                            onMouseEnter={e => { if (!isSelf) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = isSelf ? 'rgba(15,169,88,0.02)' : 'transparent'; }}
                                        >
                                            {/* User */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Avatar name={usr.name} size="sm" />
                                                    <div>
                                                        <p style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                            {usr.name}
                                                            {isSelf && (
                                                                <span style={{
                                                                    fontSize: '9px', fontWeight: 700,
                                                                    background: 'rgba(15,169,88,0.10)',
                                                                    color: 'var(--color-primary-600)',
                                                                    border: '1px solid rgba(15,169,88,0.15)',
                                                                    padding: '1px 6px', borderRadius: '999px',
                                                                    marginRight: '6px',
                                                                }}>
                                                                    أنت
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Mail size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontWeight: 500 }}>
                                                        {usr.email}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Current Role */}
                                            <td style={{ padding: '12px 16px' }}>
                                                <Badge variant={roleMeta.variant} dot>
                                                    {roleMeta.label}
                                                </Badge>
                                            </td>

                                            {/* Role Selector */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {isSelf ? (
                                                    <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 500 }}>
                                                        لا يمكن تعديل حسابك
                                                    </span>
                                                ) : (
                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                        {isUpdating && (
                                                            <div style={{
                                                                position: 'absolute', left: '-20px', top: '50%',
                                                                transform: 'translateY(-50%)',
                                                            }}>
                                                                <span className="spinner spinner-sm" />
                                                            </div>
                                                        )}
                                                        <select
                                                            value={usr.role}
                                                            disabled={isUpdating}
                                                            onChange={e => handleRoleChange(usr.id, e.target.value)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                border: '1.5px solid var(--border-strong)',
                                                                borderRadius: 'var(--radius-md)',
                                                                fontSize: 'var(--text-label)',
                                                                fontWeight: 600,
                                                                color: 'var(--text-primary)',
                                                                background: 'var(--bg-surface)',
                                                                cursor: isUpdating ? 'not-allowed' : 'pointer',
                                                                outline: 'none',
                                                                fontFamily: 'var(--font-sans)',
                                                                opacity: isUpdating ? 0.6 : 1,
                                                                transition: 'all 0.15s',
                                                            }}
                                                        >
                                                            {Object.entries(ROLE_META).map(([role, meta]) => (
                                                                <option key={role} value={role}>{meta.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '12px 16px' }}>
                                                {fb === 'success' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-success)', fontSize: 'var(--text-micro)', fontWeight: 700 }}
                                                    >
                                                        <CheckCircle size={13} />
                                                        تم التحديث
                                                    </motion.div>
                                                )}
                                                {fb === 'error' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-danger)', fontSize: 'var(--text-micro)', fontWeight: 700 }}
                                                    >
                                                        <AlertCircle size={13} />
                                                        فشل التحديث
                                                    </motion.div>
                                                )}
                                                {!fb && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
                                                        <span style={{ fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--text-muted)' }}>نشط</span>
                                                    </span>
                                                )}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Info Banner */}
            <div style={{
                padding: '12px 16px',
                background: 'rgba(30,136,229,0.05)',
                border: '1px solid rgba(30,136,229,0.15)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', alignItems: 'center', gap: '10px',
            }}>
                <Shield size={14} style={{ color: 'var(--color-accent-500)', flexShrink: 0 }} />
                <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', fontWeight: 500, lineHeight: 1.5 }}>
                    تغييرات الأدوار مُسجّلة في سجل التدقيق وتؤثر فوراً على صلاحيات المستخدم. لا يمكن تعديل حساب المشرف العام الخاص بك.
                </p>
            </div>
        </div>
    );
}
