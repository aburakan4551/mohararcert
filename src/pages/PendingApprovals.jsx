/**
 * 📥 PendingApprovals.jsx — Enterprise MoH Healthcare Dashboard
 * Balanced Enterprise UI: Information-dense, professional, clean.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService, auditService, notificationService } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { getRecipientDisplayName } from '../engine/FieldEngine/FieldEngine';
import {
    Hourglass, Eye, CheckSquare, Square, CheckCircle,
    MessageSquare, ThumbsUp, AlertCircle, Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import { DataTable } from '../ui/tables/DataTable';
import PageHeader from '../ui/layouts/PageHeader';

const QUEUE_STATUS = {
    ASSISTANT_MANAGER: ['PENDING_APPROVAL'],
    GENERAL_MANAGER:   ['APPROVED_BY_ASSISTANT'],
    SUPER_ADMIN:       ['PENDING_APPROVAL', 'APPROVED_BY_ASSISTANT'],
};

const STAGE_BADGE = {
    PENDING_APPROVAL:     <Badge variant="warning" dot>بانتظار تأشير المساعد</Badge>,
    APPROVED_BY_ASSISTANT:<Badge variant="info"    dot>بانتظار اعتماد المدير</Badge>,
};

export default function PendingApprovals() {
    const { user } = useAuth();
    const navigate  = useNavigate();

    const [certs,         setCerts]         = useState([]);
    const [selectedIds,   setSelectedIds]   = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [decisionNotes, setDecisionNotes] = useState('');
    const [processing,    setProcessing]    = useState(false);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const all = await dbService.getAll();
            const processed = (all || []).map(c => ({
                ...c,
                fullDisplayName: getRecipientDisplayName(c)
            }));
            setCerts(processed);
            logger.api(`تحميل طابور المعلقة: ${all.length} معاملة`);
        } catch (e) {
            logger.error('فشل تحميل الطابور', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadQueue(); }, []);

    const pendingCerts = useMemo(() => {
        const allowed = QUEUE_STATUS[user.role] || [];
        return certs.filter(c => allowed.includes(c.status));
    }, [certs, user]);

    const handleSelectToggle = (id) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleSelectAll = () =>
        setSelectedIds(selectedIds.length === pendingCerts.length ? [] : pendingCerts.map(c => c.id));

    const handleBulkApprove = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`هل تؤكد اعتماد (${selectedIds.length}) معاملة دفعة واحدة؟`)) return;
        setProcessing(true);
        try {
            for (const id of selectedIds) {
                const cert = certs.find(x => x.id === id);
                const dispName = getRecipientDisplayName(cert);
                if (user.role === 'ASSISTANT_MANAGER' || (user.role === 'SUPER_ADMIN' && cert.status === 'PENDING_APPROVAL')) {
                    await dbService.approveByAssistant(id, user, decisionNotes || 'اعتماد جماعي — تأشيرة المساعد');
                    await auditService.log('APPROVE_CERTIFICATE', user, `تأشيرة جماعية: ${cert.serial}`, id);
                    await notificationService.create({ userId: 'usr-3', message: `تأشيرة جديدة بانتظار اعتمادك: ${dispName}`, type: 'approve' });
                } else {
                    await dbService.approveFinal(id, user, decisionNotes || 'اعتماد نهائي جماعي — المدير العام');
                    await auditService.log('APPROVE_CERTIFICATE', user, `اعتماد نهائي جماعي: ${cert.serial}`, id);
                    await notificationService.create({ userId: cert.createdBy, message: `تمت المصادقة النهائية لشهادة: ${dispName}`, type: 'approve' });
                }
            }
            setSelectedIds([]);
            setDecisionNotes('');
            await loadQueue();
        } catch (e) {
            alert('فشل الاعتماد الجماعي: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    /* ── Table Columns ── */
    const allSelected   = selectedIds.length === pendingCerts.length && pendingCerts.length > 0;
    const someSelected  = selectedIds.length > 0;

    const columns = [
        {
            key: '_select',
            label: (
                <button
                    onClick={handleSelectAll}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }}
                >
                    {allSelected
                        ? <CheckSquare size={16} style={{ color: 'var(--color-primary-600)' }} />
                        : <Square size={16} />
                    }
                </button>
            ),
            sortable: false,
            render: (_, row) => (
                <button
                    onClick={e => { e.stopPropagation(); handleSelectToggle(row.id); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)' }}
                >
                    {selectedIds.includes(row.id)
                        ? <CheckSquare size={16} style={{ color: 'var(--color-primary-600)' }} />
                        : <Square size={16} />
                    }
                </button>
            ),
        },
        {
            key: 'serial',
            label: 'التسلسل',
            render: v => (
                <code style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 7px', borderRadius: '5px' }}>
                    {v}
                </code>
            ),
        },
        {
            key: 'recipientName',
            label: 'صاحب المعاملة',
            render: (v, row) => <strong style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>{row.fullDisplayName}</strong>,
        },
        {
            key: 'event',
            label: 'المناسبة',
            render: v => <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{v}</span>,
        },
        {
            key: 'creatorName',
            label: 'المنشئ',
            render: v => <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>{v || 'النظام'}</span>,
        },
        {
            key: 'status',
            label: 'المرحلة',
            sortable: false,
            render: v => STAGE_BADGE[v] || <Badge variant="neutral">{v}</Badge>,
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            render: (_, row) => (
                <Button size="xs" variant="outline" onClick={() => navigate(`/approvals/${row.id}`)} leftIcon={Eye}>
                    مراجعة
                </Button>
            ),
        },
    ];

    /* ── Empty Queue ── */
    const EmptyQueue = () => (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
                width: 56, height: 56,
                borderRadius: 'var(--radius-xl)',
                background: 'rgba(15,169,88,0.08)',
                border: '1.5px solid rgba(15,169,88,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
            }}>
                <ThumbsUp size={24} style={{ color: 'var(--color-primary-600)' }} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                الطابور خالٍ تماماً
            </h3>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 500, maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
                تم إنهاء جميع المعاملات المرفوعة إليك. لا توجد طلبات بانتظار قرارك الإداري حالياً.
            </p>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Page Header ── */}
            <PageHeader
                title="المعاملات المعلقة"
                subtitle={
                    user.role === 'ASSISTANT_MANAGER' ? 'مراجعة المعاملات المرفوعة وتأشيرها للمدير العام' :
                    user.role === 'GENERAL_MANAGER'   ? 'المصادقة النهائية والاعتماد الرقمي للشهادات' :
                    'إدارة جميع المعاملات المعلقة في النظام'
                }
            />

            {/* ── Stats Bar ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
            }}>
                {[
                    {
                        label: 'إجمالي المعلقة',
                        value: pendingCerts.length,
                        color: 'var(--color-warning)',
                        bg: 'rgba(245,158,11,0.08)',
                        border: 'rgba(245,158,11,0.15)',
                    },
                    {
                        label: 'المحددة للاعتماد',
                        value: selectedIds.length,
                        color: 'var(--color-primary-600)',
                        bg: 'rgba(15,169,88,0.08)',
                        border: 'rgba(15,169,88,0.15)',
                    },
                    {
                        label: 'مستوى الأولوية',
                        value: pendingCerts.length > 5 ? 'عالية' : pendingCerts.length > 0 ? 'متوسطة' : 'لا يوجد',
                        color: pendingCerts.length > 5 ? 'var(--color-danger)' : pendingCerts.length > 0 ? 'var(--color-warning)' : 'var(--color-success)',
                        bg: 'var(--bg-subtle)',
                        border: 'var(--border-default)',
                        isText: true,
                    },
                ].map(stat => (
                    <div key={stat.label} style={{
                        padding: '14px 16px',
                        background: stat.bg,
                        border: `1px solid ${stat.border}`,
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {stat.label}
                        </span>
                        <span style={{ fontSize: stat.isText ? 'var(--text-label)' : '1.35rem', fontWeight: 900, color: stat.color }}>
                            {stat.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* ── Bulk Action Toolbar ── */}
            <AnimatePresence>
                {someSelected && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            background: 'rgba(15,169,88,0.06)',
                            border: '1.5px solid rgba(15,169,88,0.18)',
                            borderRadius: 'var(--radius-lg)',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <CheckCircle size={15} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} />
                            <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--color-primary-700)' }}>
                                تم تحديد {selectedIds.length} معاملة
                            </span>
                        </div>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <MessageSquare size={14} style={{
                                position: 'absolute', right: '10px', top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)', pointerEvents: 'none',
                            }} />
                            <input
                                type="text"
                                placeholder="ملاحظة موحدة (اختياري)..."
                                value={decisionNotes}
                                onChange={e => setDecisionNotes(e.target.value)}
                                style={{
                                    padding: '8px 32px 8px 12px',
                                    border: '1.5px solid var(--border-strong)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--text-label)',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    background: 'var(--bg-surface)',
                                    outline: 'none',
                                    width: '240px',
                                    fontFamily: 'var(--font-sans)',
                                }}
                                onFocus={e => { e.target.style.borderColor = '#0FA958'; e.target.style.boxShadow = '0 0 0 3px rgba(15,169,88,0.10)'; }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleBulkApprove}
                            isLoading={processing}
                            leftIcon={CheckCircle}
                        >
                            اعتماد جماعي ({selectedIds.length})
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds([])}
                        >
                            إلغاء التحديد
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── DataTable ── */}
            <Card>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: pendingCerts.length > 0 ? 'var(--color-warning)' : 'var(--color-success)',
                            boxShadow: pendingCerts.length > 0 ? '0 0 0 3px rgba(245,158,11,0.2)' : 'none',
                        }} />
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            طابور الاعتماد
                        </h3>
                        <span style={{
                            fontSize: 'var(--text-micro)', fontWeight: 700,
                            background: pendingCerts.length > 0 ? 'rgba(245,158,11,0.10)' : 'var(--bg-muted)',
                            color: pendingCerts.length > 0 ? 'var(--color-warning)' : 'var(--text-muted)',
                            border: `1px solid ${pendingCerts.length > 0 ? 'rgba(245,158,11,0.20)' : 'var(--border-default)'}`,
                            padding: '2px 8px', borderRadius: '999px',
                        }}>
                            {pendingCerts.length} معاملة
                        </span>
                    </div>
                </CardHeader>

                {loading ? (
                    <div style={{ padding: '32px' }}>
                        {[1,2,3,4].map(i => (
                            <div key={i} className="skeleton" style={{ height: '44px', borderRadius: '8px', marginBottom: '8px' }} />
                        ))}
                    </div>
                ) : pendingCerts.length === 0 ? (
                    <EmptyQueue />
                ) : (
                    <DataTable
                        columns={columns}
                        data={pendingCerts}
                        rowKey="id"
                        onRowClick={row => navigate(`/approvals/${row.id}`)}
                    />
                )}
            </Card>
        </div>
    );
}
