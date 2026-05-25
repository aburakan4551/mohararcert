import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Link, useNavigate } from 'react-router-dom';
import {
    Award, FileText, Hourglass, CheckCircle2, AlertTriangle,
    Search, Eye, Filter, FilePlus, Inbox, Archive,
    TrendingUp, ArrowUpRight, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { logger } from '../utils/debug';

// Presentation imports
import { Card, CardHeader, CardContent, KpiCard } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import { DataTable } from '../ui/tables/DataTable';
import PageHeader from '../ui/layouts/PageHeader';

// Charts
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_MAP = {
    DRAFT:               { label: 'مسودة',                 variant: 'neutral'  },
    PENDING_APPROVAL:    { label: 'انتظار تأشير المساعد',  variant: 'warning'  },
    APPROVED_BY_ASSISTANT:{ label: 'معتمد من المساعد',     variant: 'info'     },
    FINAL_APPROVED:      { label: 'معتمد نهائياً',          variant: 'success'  },
    RETURNED_FOR_EDIT:   { label: 'مُعاد للتعديل',          variant: 'danger'   },
    REJECTED:            { label: 'مرفوض',                  variant: 'danger'   },
    ARCHIVED:            { label: 'مؤرشف',                  variant: 'neutral'  },
};

const getStatusBadge = (status) => {
    const s = STATUS_MAP[status] || { label: '—', variant: 'neutral' };
    return <Badge variant={s.variant} dot>{s.label}</Badge>;
};

// 📏 Custom ResizeObserver Telemetry hook with deferred render & cleanup to prevent loops
function useChartDimensions() {
    const ref = React.useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const animationFrameId = React.useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const entry = entries[0];
            const { width, height } = entry.contentRect;
            
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }

            animationFrameId.current = requestAnimationFrame(() => {
                if (width > 0 && height > 0) {
                    setDimensions({ width: Math.floor(width), height: Math.floor(height) });
                } else {
                    setDimensions({ width: 0, height: 0 });
                }
            });
        });

        resizeObserver.observe(element);
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            resizeObserver.disconnect();
        };
    }, []);

    return [ref, dimensions.width, dimensions.height];
}

export default function Dashboard() {
    const { user, canPerform } = useAuth();
    const navigate = useNavigate();
    const [chartRef, chartWidth, chartHeight] = useChartDimensions();
    const [certs,        setCerts]        = useState([]);
    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading,      setLoading]      = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const list = await dbService.getAll();
            setCerts(list);
            logger.api(`تحميل ${list.length} معاملة`);
        } catch (e) {
            logger.error('فشل تحميل البيانات', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    /* ── Computed ── */
    const filteredCerts = useMemo(() => certs.filter(c => {
        const matchSearch = (c.recipientName || '').toLowerCase().includes(search.toLowerCase()) ||
                            (c.event || '').toLowerCase().includes(search.toLowerCase()) ||
                            (c.serial || '').includes(search);
        const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
        const matchUser   = user.role !== 'CREATOR' || c.createdBy === user.id;
        return matchSearch && matchStatus && matchUser;
    }), [certs, search, statusFilter, user]);

    const stats = useMemo(() => {
        const base = user.role === 'CREATOR' ? certs.filter(c => c.createdBy === user.id) : certs;
        return {
            total:    base.length,
            pending:  base.filter(c => ['PENDING_APPROVAL','APPROVED_BY_ASSISTANT'].includes(c.status)).length,
            approved: base.filter(c => ['FINAL_APPROVED','ARCHIVED'].includes(c.status)).length,
            returned: base.filter(c => ['RETURNED_FOR_EDIT','REJECTED'].includes(c.status)).length,
        };
    }, [certs, user]);

    const chartData = useMemo(() => [
        { name: 'الأحد',     issued: 4,  approved: 2  },
        { name: 'الإثنين',   issued: 7,  approved: 5  },
        { name: 'الثلاثاء',  issued: 5,  approved: 3  },
        { name: 'الأربعاء',  issued: 9,  approved: 8  },
        { name: 'الخميس',    issued: 6,  approved: 4  },
        { name: 'الجمعة',    issued: 1,  approved: 1  },
        { name: 'السبت',     issued: 2,  approved: 2  },
    ], []);

    /* ── Table Columns ── */
    const columns = [
        {
            key: 'serial',
            label: 'الرقم التسلسلي',
            render: v => (
                <span style={{
                    fontFamily: 'monospace',
                    fontSize: 'var(--text-label)',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-muted)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                }}>
                    {v}
                </span>
            ),
        },
        {
            key: 'recipientName',
            label: 'اسم صاحب المعاملة',
            render: v => (
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-body-sm)' }}>
                    {v}
                </span>
            ),
        },
        {
            key: 'event',
            label: 'المناسبة',
            render: v => (
                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-caption)' }}>
                    {v}
                </span>
            ),
        },
        {
            key: 'createdAt',
            label: 'تاريخ التقديم',
            render: v => (
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {v ? new Date(v).toLocaleDateString('ar-SA') : '—'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'الحالة',
            render: v => getStatusBadge(v),
            sortable: false,
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            render: (_, row) => (
                <Button
                    size="xs"
                    variant="outline"
                    onClick={() => navigate(`/approvals/${row.id}`)}
                    leftIcon={Eye}
                >
                    معاينة
                </Button>
            ),
        },
    ];

    /* ── Loading Skeleton ── */
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="skeleton" style={{ height: '120px', borderRadius: '20px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {[1,2,3,4].map(i => (
                        <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '20px' }} />
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                    <div className="skeleton" style={{ height: '240px', borderRadius: '20px' }} />
                    <div className="skeleton" style={{ height: '240px', borderRadius: '20px' }} />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── Hero Welcome Banner ── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(135deg, #0d7a3e 0%, #0FA958 50%, #1E88E5 100%)',
                    borderRadius: '20px',
                    padding: '28px 32px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                }}
            >
                {/* Decoration blobs */}
                <div style={{
                    position: 'absolute', top: '-30%', right: '-5%',
                    width: '40%', height: '150%',
                    background: 'rgba(255,255,255,0.05)', borderRadius: '50%',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-40%', left: '20%',
                    width: '30%', height: '130%',
                    background: 'rgba(255,255,255,0.04)', borderRadius: '50%',
                    pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 12px',
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        borderRadius: '999px',
                        marginBottom: '10px',
                    }}>
                        <Award size={12} color="rgba(255,255,255,0.9)" />
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}>
                            منصة الاعتمادات الرسمية
                        </span>
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', marginBottom: '6px' }}>
                        مرحباً، {user.name} 👋
                    </h2>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', fontWeight: 500, maxWidth: '500px' }}>
                        {user.role === 'CREATOR'
                            ? 'يمكنك البدء بإنشاء شهادات جديدة وتتبع مسار مراجعتها خطوة بخطوة.'
                            : 'لديك معاملات جديدة بانتظار مراجعتك واعتمادك الإداري.'
                        }
                    </p>
                </div>

                {canPerform('CREATE_CERTIFICATE') && (
                    <button
                        onClick={() => { logger.nav('إنشاء شهادة'); navigate('/create'); }}
                        style={{
                            position: 'relative', zIndex: 2,
                            padding: '11px 22px',
                            background: 'white',
                            color: '#0FA958',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '14px', fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            flexShrink: 0,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                            transition: 'all 0.2s',
                            fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.20)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)'; }}
                    >
                        <FilePlus size={16} />
                        إنشاء شهادة جديدة
                    </button>
                )}
            </motion.div>

            {/* ── KPI Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="kpi-grid">
                {[
                    {
                        label: 'إجمالي المعاملات',
                        value: stats.total,
                        icon: FileText,
                        iconBg: 'rgba(15,169,88,0.10)',
                        iconColor: '#0FA958',
                        change: 'منذ البداية',
                        changeType: 'up',
                    },
                    {
                        label: 'بانتظار الاعتماد',
                        value: stats.pending,
                        icon: Hourglass,
                        iconBg: 'rgba(245,158,11,0.10)',
                        iconColor: '#F59E0B',
                        change: stats.pending > 0 ? 'تحتاج مراجعة' : 'لا يوجد',
                        changeType: stats.pending > 0 ? 'up' : 'up',
                    },
                    {
                        label: 'معتمد نهائياً',
                        value: stats.approved,
                        icon: CheckCircle2,
                        iconBg: 'rgba(16,185,129,0.10)',
                        iconColor: '#10B981',
                        change: stats.total > 0 ? `${Math.round(stats.approved / stats.total * 100)}%` : '0%',
                        changeType: 'up',
                    },
                    {
                        label: 'مُرجَع / مرفوض',
                        value: stats.returned,
                        icon: AlertTriangle,
                        iconBg: 'rgba(239,68,68,0.10)',
                        iconColor: '#EF4444',
                        change: 'يحتاج مراجعة',
                        changeType: 'down',
                    },
                ].map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                    >
                        <KpiCard {...card} />
                    </motion.div>
                ))}
            </div>

            {/* ── Analytics + Quick Access ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', minWidth: 0, minHeight: 0 }}>

                {/* Chart */}
                <Card style={{ minWidth: 0, minHeight: '300px', contain: 'layout style paint' }}>
                    <CardHeader>
                        <div>
                            <h3 style={{
                                fontSize: 'var(--text-body-sm)', fontWeight: 800,
                                color: 'var(--text-primary)',
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                                <span style={{
                                    width: 3, height: 16,
                                    background: '#0FA958',
                                    borderRadius: '99px',
                                    display: 'inline-block',
                                }} />
                                نشاط إصدار الشهادات الأسبوعي
                            </h3>
                            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 500 }}>
                                آخر 7 أيام عمل
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '3px', background: '#0FA958', display: 'inline-block' }} />
                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 600 }}>صادرة</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '3px', background: '#1E88E5', display: 'inline-block' }} />
                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 600 }}>معتمدة</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div ref={chartRef} style={{ width: '100%', height: '220px', minWidth: 0, minHeight: 0, position: 'relative', contain: 'layout paint' }}>
                            {chartWidth > 0 && chartHeight > 0 ? (
                                <AreaChart width={chartWidth} height={chartHeight} data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="issued" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#0FA958" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#0FA958" stopOpacity={0}    />
                                        </linearGradient>
                                        <linearGradient id="approved" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#1E88E5" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#1E88E5" stopOpacity={0}    />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Cairo', fontWeight: 600 }}
                                        axisLine={false} tickLine={false} reversed
                                    />
                                    <YAxis
                                        tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Cairo' }}
                                        axisLine={false} tickLine={false} orientation="right"
                                    />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--bg-surface)',
                                            border: '1px solid var(--border-default)',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontFamily: 'Cairo',
                                            boxShadow: 'var(--shadow-overlay)',
                                            direction: 'rtl',
                                        }}
                                        labelStyle={{ fontWeight: 700, color: 'var(--text-primary)' }}
                                    />
                                    <Area type="monotone" dataKey="issued"   name="صادرة"  stroke="#0FA958" strokeWidth={2} fillOpacity={1} fill="url(#issued)"   dot={false} />
                                    <Area type="monotone" dataKey="approved" name="معتمدة" stroke="#1E88E5" strokeWidth={2} fillOpacity={1} fill="url(#approved)" dot={false} />
                                </AreaChart>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                                    جاري تهيئة مساحة الرسم...
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Access */}
                <Card>
                    <CardHeader>
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            الوصول السريع
                        </h3>
                    </CardHeader>
                    <CardContent>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {user.role !== 'CREATOR' && (
                                <QuickLink
                                    to="/pending"
                                    icon={Inbox}
                                    label="المعاملات المعلقة"
                                    badge={stats.pending}
                                    badgeVariant="warning"
                                />
                            )}
                            <QuickLink
                                to="/archive"
                                icon={Archive}
                                label="الأرشيف المعتمد"
                                badge={stats.approved}
                            />
                            {canPerform('CREATE_CERTIFICATE') && (
                                <QuickLink
                                    to="/create"
                                    icon={FilePlus}
                                    label="إنشاء شهادة جديدة"
                                />
                            )}
                        </div>

                        {/* Summary Stats */}
                        <div style={{
                            marginTop: '16px',
                            padding: '14px',
                            background: 'var(--bg-subtle)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-default)',
                        }}>
                            <p style={{ fontSize: 'var(--text-micro)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                نسبة الاعتماد
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    flex: 1, height: 6,
                                    background: 'var(--bg-muted)',
                                    borderRadius: '99px',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: stats.total > 0 ? `${Math.round(stats.approved / stats.total * 100)}%` : '0%',
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #0FA958, #10B981)',
                                        borderRadius: '99px',
                                        transition: 'width 1s ease',
                                    }} />
                                </div>
                                <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--color-primary-600)', minWidth: '36px' }}>
                                    {stats.total > 0 ? `${Math.round(stats.approved / stats.total * 100)}%` : '0%'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Transactions DataTable ── */}
            <Card>
                <CardHeader>
                    <div>
                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                            سجل المعاملات
                        </h3>
                        <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', marginTop: '3px', fontWeight: 500 }}>
                            {filteredCerts.length} معاملة
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={15} style={{
                                position: 'absolute', right: '12px', top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)', pointerEvents: 'none',
                            }} />
                            <input
                                type="text"
                                placeholder="بحث..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    padding: '8px 36px 8px 12px',
                                    border: '1.5px solid var(--border-strong)',
                                    borderRadius: '10px',
                                    fontSize: 'var(--text-label)',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    background: 'var(--bg-surface)',
                                    outline: 'none',
                                    width: '200px',
                                    fontFamily: 'var(--font-sans)',
                                    transition: 'all 0.15s',
                                }}
                                onFocus={e => { e.target.style.borderColor = '#0FA958'; e.target.style.boxShadow = '0 0 0 3px rgba(15,169,88,0.10)'; }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>

                        {/* Status Filter */}
                        <div style={{ position: 'relative' }}>
                            <Filter size={13} style={{
                                position: 'absolute', right: '12px', top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)', pointerEvents: 'none',
                            }} />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={{
                                    padding: '8px 36px 8px 12px',
                                    border: '1.5px solid var(--border-strong)',
                                    borderRadius: '10px',
                                    fontSize: 'var(--text-label)',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    background: 'var(--bg-surface)',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    appearance: 'none',
                                    fontFamily: 'var(--font-sans)',
                                }}
                            >
                                <option value="ALL">جميع الحالات</option>
                                <option value="DRAFT">مسودة</option>
                                <option value="PENDING_APPROVAL">انتظار المساعد</option>
                                <option value="APPROVED_BY_ASSISTANT">معتمد من المساعد</option>
                                <option value="FINAL_APPROVED">معتمد نهائياً</option>
                                <option value="RETURNED_FOR_EDIT">مُعاد للتعديل</option>
                                <option value="REJECTED">مرفوض</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <DataTable
                    columns={columns}
                    data={filteredCerts}
                    isLoading={false}
                    emptyStateMessage="لا توجد معاملات مطابقة للفلاتر المحددة"
                    onRowClick={row => navigate(`/approvals/${row.id}`)}
                />
            </Card>

            {/* Responsive grid fix */}
            <style>{`
                @media (max-width: 1100px) {
                    .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
                }
                @media (max-width: 640px) {
                    .kpi-grid { grid-template-columns: 1fr 1fr !important; }
                }
            `}</style>
        </div>
    );
}

/* ── Internal: Quick Access Link ── */
const QuickLink = ({ to, icon: Icon, label, badge, badgeVariant = 'neutral' }) => (
    <Link
        to={to}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            textDecoration: 'none',
            transition: 'all 0.15s',
            cursor: 'pointer',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(15,169,88,0.05)';
            e.currentTarget.style.borderColor = 'rgba(15,169,88,0.18)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-subtle)';
            e.currentTarget.style.borderColor = 'var(--border-default)';
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon size={15} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                {label}
            </span>
        </div>
        {badge !== undefined && badge !== null && (
            <span style={{
                fontSize: '11px', fontWeight: 800,
                background: badgeVariant === 'warning' ? '#F59E0B' : 'var(--bg-muted)',
                color: badgeVariant === 'warning' ? 'white' : 'var(--text-muted)',
                borderRadius: '999px',
                padding: '1px 8px',
                minWidth: '24px',
                textAlign: 'center',
            }}>
                {badge}
            </span>
        )}
        {badge === undefined && (
            <ArrowUpRight size={14} style={{ color: 'var(--text-muted)' }} />
        )}
    </Link>
);
