/**
 * 🗄️ Archive.jsx — Enterprise Official Certificate Vault
 * Split layout: DataTable left + Preview right
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService, templateService, auditService } from '../services/db';
import { useNavigate } from 'react-router-dom';
import { exportSinglePDF, printElements } from '../utils/pdfExport';
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine';
import { getRecipientDisplayName } from '../engine/FieldEngine/FieldEngine';
import {
    Archive, Search, FileText, Download, Printer,
    ShieldCheck, Eye, Calendar, User2, X,
} from 'lucide-react';
import { useLayers } from '../hooks/useLayers';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Badge } from '../ui/feedback/Badge';
import { DataTable } from '../ui/tables/DataTable';
import PageHeader from '../ui/layouts/PageHeader';
import { Button } from '../ui/components/Button';

export default function ArchivePage() {
    const { user, settings } = useAuth();
    const navigate = useNavigate();

    const [certs,         setCerts]         = useState([]);
    const [templates,     setTemplates]     = useState([]);
    const [search,        setSearch]        = useState('');
    const [loading,       setLoading]       = useState(true);
    const [activeCert,    setActiveCert]    = useState(null);
    const [activeTemplate,setActiveTemplate]= useState(null);
    const [scale,         setScale]         = useState(0.45);
    const [exporting,     setExporting]     = useState(false);

    const certRef             = useRef();
    const previewContainerRef = useRef();

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const all  = await dbService.getAll();
                const tpls = await templateService.getAll();
                const filtered = all.filter(c => c.status === 'FINAL_APPROVED' || c.status === 'ARCHIVED');
                const processed = filtered.map(c => ({
                    ...c,
                    fullDisplayName: getRecipientDisplayName(c)
                }));
                setCerts(processed);
                setTemplates(tpls);
                logger.api(`تحميل الأرشيف: ${all.length} معاملة معتمدة`);
            } catch (e) {
                logger.error('فشل تحميل الأرشيف', e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* Auto Scale for A4 Preview */
    useEffect(() => {
        if (!activeCert) return;
        const measure = () => {
            const el = previewContainerRef.current;
            if (!el) return;
            const A4W = 297 * (96 / 25.4);
            const A4H = 210 * (96 / 25.4);
            setScale(Math.min(el.clientWidth / A4W, el.clientHeight / A4H) * 0.92);
        };
        const ro = new ResizeObserver(measure);
        if (previewContainerRef.current) ro.observe(previewContainerRef.current);
        measure();
        return () => ro.disconnect();
    }, [activeCert]);

    const { layers: editorLayers, canvasWidth } = useLayers(activeCert?.templateId || 'default');

    const filteredCerts = useMemo(() =>
        certs.filter(c =>
            c.fullDisplayName?.toLowerCase().includes(search.toLowerCase()) ||
            c.event?.toLowerCase().includes(search.toLowerCase()) ||
            c.serial?.includes(search)
        ), [certs, search]);

    const handleInspect = (c) => {
        setActiveCert(c);
        setActiveTemplate(templates.find(t => t.id === c.templateId) || null);
        logger.api(`معاينة شهادة: ${c.serial}`);
    };

    const handleExport = async () => {
        if (!activeCert) return;
        setExporting(true);
        try {
            const dispName = getRecipientDisplayName(activeCert);
            await auditService.log('EXPORT_PDF', user, `تصدير أرشيف: ${activeCert.serial}`, activeCert.id);
            await exportSinglePDF(certRef.current, `شهادة_معتمدة_${dispName}.pdf`);
        } catch (e) {
            alert('خطأ أثناء التصدير: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    const handlePrint = () => {
        if (!activeCert) return;
        const dispName = getRecipientDisplayName(activeCert);
        auditService.log('PRINT_CERTIFICATE', user, `طباعة أرشيف: ${activeCert.serial}`, activeCert.id);
        printElements([certRef.current], `شهادة — ${dispName}`);
    };

    const certData = activeCert ? {
        recipientName: getRecipientDisplayName(activeCert),
        event: activeCert.event,
        date: activeCert.date,
        serial: activeCert.serial,
    } : null;

    /* ── Table Columns ── */
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
            label: 'صاحب الشهادة',
            render: (v, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: 28, height: 28,
                        borderRadius: '8px',
                        background: 'var(--color-success-bg)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 900,
                        color: 'var(--color-success)',
                        flexShrink: 0,
                    }}>
                        {v?.charAt(0) || '؟'}
                    </div>
                    <div>
                        <p style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{row.fullDisplayName}</p>
                        <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 500 }}>{row.event}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'updatedAt',
            label: 'تاريخ الاعتماد',
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
            render: () => <Badge variant="success" dot>معتمد نهائياً</Badge>,
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        onClick={e => { e.stopPropagation(); handleInspect(row); }}
                        title="معاينة سريعة"
                        style={{
                            width: 28, height: 28,
                            borderRadius: '8px',
                            border: '1.5px solid var(--border-strong)',
                            background: activeCert?.id === row.id ? 'var(--color-success-bg)' : 'var(--bg-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: activeCert?.id === row.id ? 'var(--color-primary-600)' : 'var(--text-tertiary)',
                            transition: 'all 0.15s',
                        }}
                    >
                        <Eye size={13} />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); navigate(`/approvals/${row.id}`); }}
                        title="التفاصيل الكاملة"
                        style={{
                            width: 28, height: 28,
                            borderRadius: '8px',
                            border: '1.5px solid var(--border-strong)',
                            background: 'var(--bg-subtle)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            transition: 'all 0.15s',
                        }}
                    >
                        <FileText size={13} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Page Header ── */}
            <PageHeader
                title="الأرشيف الرسمي المقفل"
                subtitle={`${filteredCerts.length} مستند معتمد ومؤرشف — غير قابل للتعديل`}
                actions={
                    activeCert && (
                        <>
                            <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={Printer}>
                                طباعة
                            </Button>
                            <Button variant="primary" size="sm" onClick={handleExport} isLoading={exporting} leftIcon={Download}>
                                تصدير PDF
                            </Button>
                        </>
                    )
                }
            />

            {/* ── Split Layout ── */}
            <div style={{ display: 'grid', gridTemplateColumns: activeCert ? '1fr 380px' : '1fr', gap: '16px', alignItems: 'start' }}>

                {/* DataTable Panel */}
                <Card>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Archive size={15} style={{ color: 'var(--color-primary-600)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                المستندات المؤرشفة
                            </h3>
                            <span style={{
                                fontSize: 'var(--text-micro)', fontWeight: 700,
                                background: 'var(--color-success-bg)',
                                color: 'var(--color-success)',
                                border: '1px solid var(--color-success-border)',
                                padding: '1px 8px', borderRadius: '999px',
                            }}>
                                {filteredCerts.length}
                            </span>
                        </div>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{
                                position: 'absolute', right: '10px', top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)', pointerEvents: 'none',
                            }} />
                            <input
                                type="text"
                                placeholder="بحث بالاسم أو الرقم..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    padding: '8px 32px 8px 10px',
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
                                onFocus={e => { e.target.style.borderColor = 'var(--color-primary-500)'; e.target.style.boxShadow = '0 0 0 3px var(--border-focus-ring)'; }}
                                onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </CardHeader>
                    <DataTable
                        columns={columns}
                        data={filteredCerts}
                        isLoading={loading}
                        emptyStateMessage="لا توجد شهادات معتمدة في الأرشيف حالياً"
                        emptyStateIcon={Archive}
                        onRowClick={handleInspect}
                        rowKey="id"
                    />
                </Card>

                {/* Preview Panel */}
                <AnimatePresence>
                    {activeCert && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            style={{ position: 'sticky', top: '80px' }}
                        >
                            <Card>
                                {/* Preview Header */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: 'var(--bg-subtle)',
                                    borderBottom: '1px solid var(--border-default)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ShieldCheck size={14} style={{ color: 'var(--color-success)' }} />
                                        <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            المعاينة الرسمية
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <code style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>
                                            #{activeCert.serial}
                                        </code>
                                        <button
                                            onClick={() => setActiveCert(null)}
                                            style={{
                                                width: 24, height: 24,
                                                borderRadius: '7px',
                                                border: '1.5px solid var(--border-default)',
                                                background: 'var(--bg-surface)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Certificate Preview */}
                                <div
                                    ref={previewContainerRef}
                                    style={{
                                        background: 'var(--bg-page)',
                                        height: '200px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{
                                        transform: `scale(${scale})`,
                                        transformOrigin: 'center center',
                                        width: '297mm', height: '210mm',
                                        flexShrink: 0,
                                    }}>
                                        <UnifiedCertificateEngine
                                            ref={certRef}
                                            mode="preview"
                                            template={activeTemplate}
                                            layers={editorLayers}
                                            canvasWidth={canvasWidth}
                                            data={certData}
                                            settings={activeCert.managerSnapshot || activeCert.assistantSnapshot || settings}
                                            showQR={activeCert.showQR}
                                        />
                                    </div>
                                </div>

                                {/* Meta Info */}
                                <div style={{
                                    padding: '14px 16px',
                                    background: 'var(--bg-subtle)',
                                    borderTop: '1px solid var(--border-default)',
                                    borderBottom: '1px solid var(--border-default)',
                                }}>
                                    {[
                                        { icon: User2,    label: 'الاسم', value: activeCert.recipientName },
                                        { icon: FileText, label: 'المناسبة', value: activeCert.event },
                                        {
                                            icon: Calendar, label: 'تاريخ الاعتماد',
                                            value: activeCert.managerSnapshot
                                                ? new Date(activeCert.managerSnapshot.approvedAt).toLocaleDateString('ar-SA')
                                                : new Date(activeCert.updatedAt).toLocaleDateString('ar-SA'),
                                        },
                                    ].map((row, i, arr) => {
                                        const Icon = row.icon;
                                        return (
                                            <div key={row.label} style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '8px 0',
                                                borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                            }}>
                                                <Icon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 600, minWidth: '70px' }}>
                                                    {row.label}:
                                                </span>
                                                <span style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                                                    {row.value}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Actions */}
                                <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Button variant="secondary" size="sm" onClick={handlePrint} leftIcon={Printer}>
                                        طباعة
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={handleExport} isLoading={exporting} leftIcon={Download}>
                                        PDF
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
