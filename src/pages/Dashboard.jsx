import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { Link, useNavigate } from 'react-router-dom';
import { Award, FileText, Hourglass, CheckCircle2, AlertTriangle, Search, Eye, Filter, Sparkles, Inbox, Archive } from 'lucide-react';
import { motion } from 'framer-motion';
import { logger } from '../utils/debug';

// Presentation imports
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import { DataTable } from '../ui/tables/DataTable';

// Import Recharts components
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
    const { user, canPerform } = useAuth();
    const navigate = useNavigate();
    const [certs, setCerts] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        logger.api('بدء استدعاء البيانات من المستودع لتغذية مؤشرات الأداء...');
        try {
            const list = await dbService.getAll();
            setCerts(list);
            logger.api(`تم استرجاع سجلات المعاملات بنجاح. إجمالي السجلات: ${list.length}`);
        } catch (e) {
            logger.error('فشل استرداد بيانات لوحة التحكم من مستودع البيانات المحلي', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter transactions
    const filteredCerts = useMemo(() => {
        return certs.filter(c => {
            const matchesSearch = 
                (c.recipientName || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.event || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.serial || '').includes(search);
            
            const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

            const isCreatorOnly = user.role === 'CREATOR';
            const matchesUser = !isCreatorOnly || c.createdBy === user.id;

            return matchesSearch && matchesStatus && matchesUser;
        });
    }, [certs, search, statusFilter, user]);

    // Computed Stats
    const stats = useMemo(() => {
        const userCerts = user.role === 'CREATOR' ? certs.filter(c => c.createdBy === user.id) : certs;
        
        return {
            total: userCerts.length,
            pending: userCerts.filter(c => c.status === 'PENDING_APPROVAL' || c.status === 'APPROVED_BY_ASSISTANT').length,
            approved: userCerts.filter(c => c.status === 'FINAL_APPROVED' || c.status === 'ARCHIVED').length,
            returned: userCerts.filter(c => c.status === 'RETURNED_FOR_EDIT' || c.status === 'REJECTED').length,
            drafts: userCerts.filter(c => c.status === 'DRAFT').length
        };
    }, [certs, user]);

    // Chart Dataset
    const chartData = useMemo(() => {
        return [
            { name: 'الأحد', 'الطلبات الصادرة': 4, 'الاعتمادات النهائية': 2 },
            { name: 'الإثنين', 'الطلبات الصادرة': 7, 'الاعتمادات النهائية': 5 },
            { name: 'الثلاثاء', 'الطلبات الصادرة': 5, 'الاعتمادات النهائية': 3 },
            { name: 'الأربعاء', 'الطلبات الصادرة': 9, 'الاعتمادات النهائية': 8 },
            { name: 'الخميس', 'الطلبات الصادرة': 6, 'الاعتمادات النهائية': 4 },
            { name: 'الجمعة', 'الطلبات الصادرة': 1, 'الاعتمادات النهائية': 1 },
            { name: 'السبت', 'الطلبات الصادرة': 2, 'الاعتمادات النهائية': 2 }
        ];
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'DRAFT':
                return <Badge variant="warning">مسودة</Badge>;
            case 'PENDING_APPROVAL':
                return <Badge variant="warning">بانتظار تأشير المساعد</Badge>;
            case 'APPROVED_BY_ASSISTANT':
                return <Badge variant="success">معتمد من المساعد</Badge>;
            case 'FINAL_APPROVED':
                return <Badge variant="success">معتمد نهائياً</Badge>;
            case 'RETURNED_FOR_EDIT':
                return <Badge variant="danger">مُعاد للتعديل</Badge>;
            case 'REJECTED':
                return <Badge variant="danger">مرفوض</Badge>;
            case 'ARCHIVED':
                return <Badge variant="primary">مؤرشف</Badge>;
            default:
                return <Badge variant="secondary">—</Badge>;
        }
    };

    // Columns config for premium DataTable component
    const columns = [
        {
            key: 'serial',
            label: 'الرقم التسلسلي',
            render: (val) => <span className="font-mono font-bold text-slate-500 dark:text-slate-400">{val}</span>,
        },
        {
            key: 'recipientName',
            label: 'اسم صاحب المعاملة',
            render: (val) => <span className="font-bold text-slate-900 dark:text-slate-100">{val}</span>,
        },
        {
            key: 'event',
            label: 'العنوان والمناسبة',
            render: (val) => <span className="text-slate-500 dark:text-slate-400">{val}</span>,
        },
        {
            key: 'createdAt',
            label: 'تاريخ التقديم',
            render: (val) => <span>{val ? new Date(val).toLocaleDateString('ar-SA') : '—'}</span>,
        },
        {
            key: 'status',
            label: 'حالة التوقيع',
            render: (val) => getStatusBadge(val),
        },
        {
            key: 'actions',
            label: 'العمليات',
            render: (_, row) => (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        logger.nav(`توجيه المعاينة للمعاملة ذات الرقم: ${row.serial}`);
                        navigate(`/approvals/${row.id}`);
                    }}
                    leftIcon={Eye}
                >
                    معاينة
                </Button>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="space-y-8 py-2">
                <div className="h-44 rounded-3xl animate-pulse bg-slate-200 dark:bg-slate-900/60" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="h-28 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-900/60" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 h-72 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-900/60" />
                    <div className="lg:col-span-4 h-72 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-900/60" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 py-2 text-right">
            {/* Elegant MoH Header Card Banner */}
            <Card className="bg-gradient-to-l from-[#0f213b] via-[#132a4a] to-[#071020] text-white border border-white/5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between p-8 gap-6">
                <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none animate-pulse" />
                <div className="absolute bottom-[-30%] left-[-10%] w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none animate-pulse" />
                
                <div className="space-y-3 z-10">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs tracking-wider uppercase">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse animate-duration-1000" />
                        <span>منصة الاعتمادات والتميز المؤسسي الرسمية</span>
                    </div>
                    <h2 className="text-2xl font-black bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                        أهلاً بك، {user.name} 👋
                    </h2>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed font-semibold">
                        {user.role === 'CREATOR' 
                            ? 'يمكنك البدء بإنشاء شهادات ومعاملات رقمية جديدة، وتتبع مسار مراجعتها واعتمادها الإداري خطوة بخطوة.'
                            : 'لديك معاملات جديدة معلقة بانتظار استعراض وتوقيع تأشيرات المراجعة أو الاعتماد النهائي العام.'
                        }
                    </p>
                </div>

                {canPerform('CREATE_CERTIFICATE') && (
                    <Button 
                        variant="accent"
                        onClick={() => {
                            logger.nav('الانتقال الموجه إلى شاشة تحرير شهادة جديدة.');
                            navigate('/create');
                        }}
                        className="flex-shrink-0 z-10 font-bold"
                    >
                        📝 إنشاء شهادة جديدة
                    </Button>
                )}
            </Card>

            {/* Performance Statistics Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'إجمالي المعاملات', val: stats.total, icon: FileText, style: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20' },
                    { label: 'بانتظار الاعتماد', val: stats.pending, icon: Hourglass, style: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' },
                    { label: 'معتمد نهائياً', val: stats.approved, icon: CheckCircle2, style: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'مُرجَع / مرفوض', val: stats.returned, icon: AlertTriangle, style: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20' }
                ].map((item, index) => {
                    const IconComp = item.icon;
                    return (
                        <motion.div key={item.label} whileHover={{ y: -4 }}>
                            <Card className="p-6 flex items-center justify-between relative group cursor-pointer border border-slate-200/60 dark:border-slate-800/40">
                                <div className="flex flex-col gap-1.5 text-right">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</span>
                                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{item.val}</span>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.style}`}>
                                    <IconComp className="w-5.5 h-5.5" />
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Analytical Panels: Recharts Line Chart & Shortcuts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recharts Analytics Activity Chart */}
                <Card className="lg:col-span-8 p-6 flex flex-col gap-5 border border-slate-200/60 dark:border-slate-800/40">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                            مؤشر نشاط إصدار الشهادات الأسبوعي المباشر
                        </h3>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">تفاعلي بالكامل</span>
                    </div>
                    
                    <div className="w-full h-52 rounded-2xl relative overflow-hidden flex items-center justify-center p-2 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorCerts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ca9f22" stopOpacity={0.18}/>
                                        <stop offset="95%" stopColor="#ca9f22" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorApprovals" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.18}/>
                                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Cairo', fontWeight: 'bold' }} 
                                    axisLine={false}
                                    tickLine={false}
                                    reversed={true}
                                />
                                <YAxis 
                                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Cairo', fontWeight: 'bold' }} 
                                    axisLine={false}
                                    tickLine={false}
                                    orientation="right"
                                />
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.06)" />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#0a1122', 
                                        borderColor: 'rgba(255,255,255,0.05)', 
                                        borderRadius: '16px',
                                        color: '#f8fafc',
                                        fontSize: '11px',
                                        fontFamily: 'Cairo',
                                        direction: 'rtl',
                                        textAlign: 'right',
                                        boxShadow: 'var(--shadow-premium)'
                                    }} 
                                />
                                <Area type="monotone" dataKey="الطلبات الصادرة" stroke="#ca9f22" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCerts)" />
                                <Area type="monotone" dataKey="الاعتمادات النهائية" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorApprovals)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Quick Shortcuts Panel */}
                <Card className="lg:col-span-4 p-6 flex flex-col gap-6 justify-between border border-slate-200/60 dark:border-slate-800/40">
                    <div className="space-y-2">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">الوصول الإجرائي السريع</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">تابع سجل التوثيق الإداري المباشر، تحقق من طلبات الاعتماد القائمة، أو انتقل للأرشيف المصادق والمحمي.</p>
                    </div>

                    <div className="space-y-2">
                        {user.role !== 'CREATOR' && (
                            <Link 
                                to="/pending" 
                                onClick={() => logger.nav('الانتقال الموجه إلى المعاملات المعلقة بانتظار الاعتماد.')}
                                className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-950/60 dark:hover:bg-slate-950 rounded-xl transition-all border border-slate-200/80 dark:border-slate-850"
                            >
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2">
                                    <Inbox className="w-4 h-4 text-amber-500" />
                                    المعاملات المعلقة الموكلة لي
                                </span>
                                <span className="px-2.5 py-0.5 text-[9px] font-black bg-amber-500 text-slate-950 rounded-full shadow-sm">{stats.pending}</span>
                            </Link>
                        )}
                        <Link 
                            to="/archive" 
                            onClick={() => logger.nav('الانتقال الموجه إلى شاشة الأرشيف العام.')}
                            className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-950/60 dark:hover:bg-slate-950 rounded-xl transition-all border border-slate-200/80 dark:border-slate-850"
                        >
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-350 flex items-center gap-2">
                                <Archive className="w-4 h-4 text-teal-500" />
                                استعراض السجل المعتمد
                            </span>
                            <span className="text-[10px] font-black text-slate-450 dark:text-slate-550">📂 {stats.approved}</span>
                        </Link>
                    </div>
                </Card>
            </div>

            {/* Core Workflow Transactions Data Table */}
            <Card className="p-6 space-y-6 border border-slate-200/60 dark:border-slate-800/40">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">سجل المعاملات والاعتمادات القائمة</h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">جدول تفاعلي متطور لمراقبة حالات تدقيق وتوقيع المعاملات.</p>
                    </div>

                    {/* Filter and Search Bar Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="ابحث باسم المستفيد، السيريال..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-4 pr-10 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 rounded-xl w-64 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            />
                        </div>

                        <div className="relative flex items-center">
                            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 pointer-events-none" />
                            <select
                                value={statusFilter}
                                onChange={e => {
                                    setStatusFilter(e.target.value);
                                    logger.api(`تصفية المعاملات بحسب الحالة: ${e.target.value}`);
                                }}
                                className="pl-8 pr-10 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border border-slate-250 dark:border-slate-800 rounded-xl w-64 cursor-pointer appearance-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            >
                                <option value="ALL">جميع الحالات الإجرائية</option>
                                <option value="DRAFT">مسودة تحرير</option>
                                <option value="PENDING_APPROVAL">بانتظار تأشير المساعد</option>
                                <option value="APPROVED_BY_ASSISTANT">معتمد من المساعد</option>
                                <option value="FINAL_APPROVED">معتمد نهائياً</option>
                                <option value="RETURNED_FOR_EDIT">مُعاد للتعديل مع التنبيهات</option>
                                <option value="REJECTED">مرفوض</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Unified presentation DataTable */}
                <DataTable
                    columns={columns}
                    data={filteredCerts}
                    isLoading={false}
                    emptyStateMessage="لا توجد معاملات متوافقة حالياً مع الفلاتر المحددة."
                />
            </Card>
        </div>
    );
}
