/**
 * 📝 MyCertificates.jsx — Enterprise MoH Healthcare Dashboard
 * Creator's certification records and workflow status tracker.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { getRecipientDisplayName } from '../engine/FieldEngine/FieldEngine';
import {
    FileText, ArrowLeft, Hourglass, CheckCircle,
    FileEdit, Trash2, MessageCircle, Eye, ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import PageHeader from '../ui/layouts/PageHeader';

export default function MyCertificates() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [myCerts, setMyCerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadMyCerts = async () => {
        setLoading(true);
        try {
            const all = await dbService.getAll();
            const filtered = all.filter(c => c.createdBy === user.id);
            const processed = filtered.map(c => ({
                ...c,
                fullDisplayName: getRecipientDisplayName(c)
            }));
            setMyCerts(processed);
            logger.api(`تحميل شهاداتي: ${processed.length}`);
        } catch (e) {
            logger.error('فشل تحميل شهاداتي', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMyCerts(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من رغبتك في حذف مسودة الشهادة نهائياً؟')) return;
        try {
            await dbService.delete(id);
            setMyCerts(p => p.filter(c => c.id !== id));
            logger.api(`حذف مسودة شهادة ${id}`);
        } catch (e) {
            alert('فشل الحذف: ' + e.message);
        }
    };

    const getStatusTheme = (status) => {
        switch (status) {
            case 'DRAFT':                 return { variant: 'neutral', label: 'مسودة محلية' };
            case 'PENDING_APPROVAL':      return { variant: 'info',    label: 'مراجعة المساعد' };
            case 'APPROVED_BY_ASSISTANT': return { variant: 'warning', label: 'اعتماد المدير' };
            case 'FINAL_APPROVED':        return { variant: 'success', label: 'معتمد نهائياً' };
            case 'RETURNED_FOR_EDIT':     return { variant: 'danger',  label: 'مُعاد للتعديل' };
            case 'REJECTED':              return { variant: 'danger',  label: 'مرفوض' };
            case 'ARCHIVED':              return { variant: 'neutral', label: 'مؤرشف' };
            default:                      return { variant: 'neutral', label: 'غير معروف' };
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <PageHeader
                title="سجل معاملاتي"
                subtitle="تتبع حالات الشهادات التي قمت بإنشائها أو رفعها، مع إمكانية تعديل المعاملات المسترجعة."
                actions={
                    <Button variant="primary" size="md" onClick={() => navigate('/create')} leftIcon={FileText}>
                        إنشاء معاملة جديدة
                    </Button>
                }
            />

            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                    { label: 'إجمالي المعاملات', value: myCerts.length, color: 'var(--text-primary)' },
                    { label: 'مسودات محلية', value: myCerts.filter(c => c.status === 'DRAFT').length, color: 'var(--text-secondary)' },
                    { label: 'بانتظار الاعتماد', value: myCerts.filter(c => c.status === 'PENDING_APPROVAL' || c.status === 'APPROVED_BY_ASSISTANT').length, color: 'var(--color-warning)' },
                    { label: 'معتمد نهائياً', value: myCerts.filter(c => c.status === 'FINAL_APPROVED' || c.status === 'ARCHIVED').length, color: 'var(--color-success)' },
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={15} style={{ color: 'var(--color-primary-600)' }} />
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            قائمة المعاملات المرفوعة
                        </h3>
                    </div>
                </CardHeader>
                
                {loading ? (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: '72px', borderRadius: '12px' }} />)}
                    </div>
                ) : myCerts.length === 0 ? (
                    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <FileText size={24} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
                        </div>
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>لا توجد معاملات بعد</h3>
                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>لم تقم بإنشاء أي شهادات. ابدأ الآن بإنشاء أول معاملة لك.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <AnimatePresence>
                            {myCerts.map((c, idx) => {
                                const theme = getStatusTheme(c.status);
                                const isEditable = c.status === 'DRAFT' || c.status === 'RETURNED_FOR_EDIT';

                                return (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                        transition={{ delay: idx * 0.05 }}
                                        style={{
                                            padding: '16px 20px',
                                            borderBottom: '1px solid var(--border-subtle)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            gap: '16px',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <code style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    #{c.serial}
                                                </code>
                                                <Badge variant={theme.variant} dot>{theme.label}</Badge>
                                            </div>
                                            
                                            <h4 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {c.fullDisplayName}
                                            </h4>
                                            
                                            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {c.event}
                                            </p>

                                            {c.comments && (c.status === 'RETURNED_FOR_EDIT' || c.status === 'REJECTED') && (
                                                <div style={{
                                                    marginTop: '6px', padding: '8px 12px',
                                                    background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)',
                                                    borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: '8px',
                                                }}>
                                                    <MessageCircle size={13} style={{ color: 'var(--color-danger)', marginTop: '2px', flexShrink: 0 }} />
                                                    <div>
                                                        <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-danger)', textTransform: 'uppercase' }}>ملاحظات اللجنة:</span>
                                                        <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '2px' }}>{c.comments}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Button variant="outline" size="sm" onClick={() => navigate(`/approvals/${c.id}`)} leftIcon={Eye}>
                                                التفاصيل
                                            </Button>

                                            {isEditable && (
                                                <Button variant="primary" size="sm" onClick={() => navigate(`/create?id=${c.id}`)} leftIcon={FileEdit}>
                                                    تعديل
                                                </Button>
                                            )}

                                            {c.status === 'DRAFT' && (
                                                <button
                                                    onClick={() => handleDelete(c.id)}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: '8px', border: 'none',
                                                        background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-border)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-danger-bg)'}
                                                    title="حذف المسودة"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </Card>
        </div>
    );
}
