/**
 * 🛡️ AuditLogs.jsx — Enterprise MoH Healthcare Dashboard
 * Compliance & Security Audit Trail Visualizer.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { auditService } from '../services/db';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import PageHeader from '../ui/layouts/PageHeader';
import { Badge } from '../ui/feedback/Badge';

export default function AuditLogs() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            navigate('/dashboard');
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
                log.userName?.toLowerCase().includes(search.toLowerCase()) ||
                log.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
                log.details?.toLowerCase().includes(search.toLowerCase()) ||
                log.action?.toLowerCase().includes(search.toLowerCase());
            
            const matchesFilter = actionFilter === 'ALL' || log.action === actionFilter;

            return matchesSearch && matchesFilter;
        });
    }, [logs, search, actionFilter]);

    const getActionTheme = (action) => {
        switch (action) {
            case 'LOGIN':               return { variant: 'success', label: 'تسجيل دخول' };
            case 'LOGOUT':              return { variant: 'neutral', label: 'تسجيل خروج' };
            case 'CREATE_CERTIFICATE':  return { variant: 'info',    label: 'إنشاء شهادة' };
            case 'UPDATE_CERTIFICATE':  return { variant: 'warning', label: 'تحديث شهادة' };
            case 'APPROVE_CERTIFICATE': return { variant: 'success', label: 'اعتماد إداري' };
            case 'REJECT_CERTIFICATE':  return { variant: 'danger',  label: 'رفض المعاملة' };
            case 'RETURN_FOR_EDIT':     return { variant: 'danger',  label: 'إرجاع للتعديل' };
            case 'EXPORT_PDF':          return { variant: 'info',    label: 'تصدير PDF' };
            case 'PRINT_CERTIFICATE':   return { variant: 'primary', label: 'طباعة ورقية' };
            case 'UNAUTHORIZED_ACCESS': return { variant: 'danger',  label: 'وصول غير مصرح' };
            default:                    return { variant: 'neutral', label: action };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <PageHeader
                title="سجل التدقيق الأمني (Audit Trail)"
                subtitle="سجل غير قابل للتعديل يوثق جميع العمليات والحركات الأمنية للمشغلين."
            />

            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                    { label: 'إجمالي الحركات', value: logs.length, color: 'var(--text-primary)' },
                    { label: 'تسجيل الدخول', value: logs.filter(c => c.action === 'LOGIN').length, color: 'var(--color-success)' },
                    { label: 'الاعتمادات', value: logs.filter(c => c.action === 'APPROVE_CERTIFICATE').length, color: 'var(--color-primary-600)' },
                    { label: 'محاولات غير مصرحة', value: logs.filter(c => c.action === 'UNAUTHORIZED_ACCESS').length, color: 'var(--color-danger)' },
                ].map(stat => (
                    <div key={stat.label} style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-lg)', padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: '4px',
                        boxShadow: 'var(--shadow-surface)',
                    }}>
                        <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)' }}>{stat.label}</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: stat.color }}>{stat.value}</span>
                    </div>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={16} style={{ color: 'var(--color-primary-600)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                سجل الحركات التاريخية
                            </h3>
                        </div>

                        {/* Filters */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="بحث سريع..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{
                                        padding: '8px 10px 8px 30px', border: '1.5px solid var(--border-strong)', borderRadius: '8px',
                                        fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-surface)'
                                    }}
                                />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Filter size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <select
                                    value={actionFilter}
                                    onChange={e => setActionFilter(e.target.value)}
                                    style={{
                                        padding: '8px 10px 8px 30px', border: '1.5px solid var(--border-strong)', borderRadius: '8px',
                                        fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-surface)', cursor: 'pointer'
                                    }}
                                >
                                    <option value="ALL">جميع الحركات</option>
                                    <option value="LOGIN">تسجيل دخول</option>
                                    <option value="CREATE_CERTIFICATE">إنشاء شهادة</option>
                                    <option value="APPROVE_CERTIFICATE">اعتماد إداري</option>
                                    <option value="EXPORT_PDF">تصدير PDF</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>البصمة الزمنية</th>
                                <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center' }}>نوع الحركة</th>
                                <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>فاعل الإجراء</th>
                                <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>الدور الوظيفي</th>
                                <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>التفاصيل الفنية</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '24px' }}>
                                        <div className="skeleton" style={{ height: '30px', borderRadius: '4px' }} />
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        لا توجد سجلات تدقيق متطابقة.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, i) => {
                                    const theme = getActionTheme(log.action);
                                    return (
                                        <motion.tr
                                            key={log.id}
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '12px 16px', fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                {new Date(log.timestamp).toLocaleString('ar-SA')}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Badge variant={theme.variant} dot>{theme.label}</Badge>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-primary)' }}>{log.userName}</div>
                                                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', fontFamily: 'monospace', marginTop: '2px' }}>{log.userEmail}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <code style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {log.userRole}
                                                </code>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                {log.details}
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

        </div>
    );
}
