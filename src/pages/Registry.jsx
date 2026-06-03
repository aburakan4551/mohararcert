/**
 * 🗃️ Registry.jsx — Enterprise MoH Healthcare Dashboard
 * Unified Central Registry for all certificates
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Search, Download, Calendar, ShieldCheck,
    Eye, Filter, Archive
} from 'lucide-react';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Badge } from '../ui/feedback/Badge';
import { DataTable } from '../ui/tables/DataTable';
import PageHeader from '../ui/layouts/PageHeader';
import { Button } from '../ui/components/Button';

export default function Registry() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [certs, setCerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            navigate('/dashboard');
            return;
        }
        loadRegistry();
    }, [user, navigate]);

    const loadRegistry = async () => {
        setLoading(true);
        try {
            const all = await dbService.getAll();
            setCerts(all);
            logger.api(`تحميل السجل العام: ${all.length}`);
        } catch (e) {
            logger.error('فشل تحميل السجل العام', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredCerts = useMemo(() => {
        return certs.filter(c => {
            const matchSearch = !search ||
                c.serial?.includes(search) ||
                c.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
                c.event?.toLowerCase().includes(search.toLowerCase());
            
            const matchDate = !dateFilter || 
                (c.createdAt && new Date(c.createdAt).toLocaleDateString('ar-SA').includes(dateFilter)) ||
                c.date?.includes(dateFilter);
                
            return matchSearch && matchDate;
        });
    }, [certs, search, dateFilter]);

    const handleExportCSV = () => {
        const headers = ['الرقم التسلسلي', 'اسم المستفيد', 'المناسبة', 'التاريخ المكتوب', 'تاريخ الإنشاء', 'الحالة', 'المنشئ'];
        const rows = filteredCerts.map(c => [
            c.serial,
            c.recipientName,
            c.event,
            c.date,
            c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : '',
            c.status,
            c.creatorName || ''
        ]);
        const csvContent = [headers, ...rows]
            .map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','))
            .join('\n');
            
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `سجل_الشهادات_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const columns = [
        {
            key: 'serial',
            label: 'الرقم',
            render: v => (
                <code style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-muted)', padding: '2px 7px', borderRadius: '5px' }}>
                    {v}
                </code>
            ),
        },
        {
            key: 'recipientName',
            label: 'المستفيد',
            render: (v, row) => <strong style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-primary)' }}>{row.prefix ? `${row.prefix} ${v}` : v}</strong>,
        },
        {
            key: 'event',
            label: 'المناسبة',
            render: v => <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>{v}</span>,
        },
        {
            key: 'createdAt',
            label: 'تاريخ الإنشاء',
            render: v => (
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={11} />
                    {v ? new Date(v).toLocaleDateString('ar-SA') : '—'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'الحالة',
            sortable: false,
            render: v => {
                const variants = {
                    'DRAFT': { v: 'neutral', l: 'مسودة' },
                    'PENDING_APPROVAL': { v: 'info', l: 'مراجعة المساعد' },
                    'APPROVED_BY_ASSISTANT': { v: 'warning', l: 'اعتماد المدير' },
                    'FINAL_APPROVED': { v: 'success', l: 'معتمد' },
                    'ARCHIVED': { v: 'success', l: 'مؤرشف' },
                    'RETURNED_FOR_EDIT': { v: 'danger', l: 'مُعاد' },
                    'REJECTED': { v: 'danger', l: 'مرفوض' },
                };
                const meta = variants[v] || { v: 'neutral', l: v };
                return <Badge variant={meta.v} dot>{meta.l}</Badge>;
            },
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            render: (_, row) => (
                <Button size="xs" variant="outline" onClick={() => navigate(`/approvals/${row.id}`)} leftIcon={Eye}>
                    تفاصيل
                </Button>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <PageHeader
                title="السجل المركزي الموحد"
                subtitle="قاعدة البيانات الشاملة لجميع المعاملات المنشأة والمحفوظة في النظام"
                actions={
                    <Button variant="primary" size="sm" onClick={handleExportCSV} leftIcon={Download} disabled={filteredCerts.length === 0}>
                        تصدير السجل (CSV)
                    </Button>
                }
            />

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)' }}>إجمالي السجلات</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{certs.length}</span>
                </div>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)' }}>نتائج البحث الحالية</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary-600)' }}>{filteredCerts.length}</span>
                </div>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)' }}>المعاملات المعتمدة</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-success)' }}>{certs.filter(c => c.status === 'FINAL_APPROVED' || c.status === 'ARCHIVED').length}</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOpen size={15} style={{ color: 'var(--color-primary-600)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                قاعدة البيانات الشاملة
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
                                        fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--text-primary)', outline: 'none'
                                    }}
                                />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Filter size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="تصفية بالتاريخ (مثال: 2026)..."
                                    value={dateFilter}
                                    onChange={e => setDateFilter(e.target.value)}
                                    style={{
                                        padding: '8px 10px 8px 30px', border: '1.5px solid var(--border-strong)', borderRadius: '8px',
                                        fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--text-primary)', outline: 'none'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                
                <DataTable
                    columns={columns}
                    data={filteredCerts}
                    isLoading={loading}
                    emptyStateMessage="لا توجد سجلات مطابقة"
                    emptyStateIcon={Archive}
                    rowKey="id"
                />
            </Card>

        </div>
    );
}
