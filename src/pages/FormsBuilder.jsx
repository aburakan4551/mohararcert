/**
 * 📋 FormsBuilder.jsx
 * Admin dashboard to manage dynamic Forms, versioning, status changes, and templates.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sliders, Image as ImageIcon, Trash2, ShieldCheck, Check, X, Search, FileText, Calendar, Layers, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formService, templateService } from '../services/db';
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import PageHeader from '../ui/layouts/PageHeader';
import { logger } from '../utils/debug';

const STATUS_MAP = {
    DRAFT:     { label: 'مسودة', variant: 'neutral' },
    PUBLISHED: { label: 'منشور', variant: 'success' },
    ARCHIVED:  { label: 'مؤرشف', variant: 'warning' },
    DELETED:   { label: 'محذوف', variant: 'danger' }
};

export default function FormsBuilder() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [forms, setForms] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Search and Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Create Modal state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formName, setFormName] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    useEffect(() => {
        // Enforce role checks at UI level
        const isAdmin = user?.role === 'SUPER_ADMIN' || 
                        user?.role === 'System Administrator' || 
                        user?.role === 'SYSTEM_ADMINISTRATOR' ||
                        user?.role === 'Super Admin';
        if (!isAdmin) {
            navigate('/dashboard');
            return;
        }
        loadData();
    }, [user, navigate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const formsData = await formService.getAll();
            const templatesData = await templateService.getAll();
            
            setForms(formsData || []);
            // Only allow linking forms to OFFICIAL/approved templates
            setTemplates(templatesData.filter(t => String(t.status || '').toUpperCase() === 'OFFICIAL') || []);
            
            if (templatesData.length > 0) {
                setSelectedTemplateId(templatesData[0].id);
            }
        } catch (e) {
            console.error("Failed to load forms data:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateForm = async () => {
        if (!formName.trim()) return alert('الرجاء إدخال اسم النموذج.');
        if (!selectedTemplateId) return alert('الرجاء تحديد قالب مرتبط.');

        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
        
        try {
            const newForm = await formService.create({
                name: formName,
                templateId: selectedTemplateId,
                templateName: selectedTemplate?.name || 'قالب غير معروف',
                orientation: selectedTemplate?.orientation || 'landscape',
                version: 1,
                fields: []
            });
            setShowCreateModal(false);
            setFormName('');
            navigate(`/forms-builder/designer/${newForm.id}`);
        } catch (e) {
            alert('فشل إنشاء النموذج: ' + e.message);
        }
    };

    const handleDelete = async (id, name, usage) => {
        if (usage > 0) {
            return alert('لا يمكن حذف نموذج يحتوي على شهادات مصدرة بالفعل. يرجى أرشفة النموذج بدلاً من ذلك.');
        }
        if (!window.confirm(`هل أنت متأكد من حذف النموذج: "${name}"؟`)) return;

        try {
            await formService.delete(id);
            await loadData();
        } catch (e) {
            alert('خطأ أثناء الحذف: ' + e.message);
        }
    };

    const handleRecover = async (id) => {
        try {
            await formService.recover(id);
            await loadData();
            alert('تم استعادة النموذج بنجاح وإعادته لحالة مسودة.');
        } catch (e) {
            alert('فشل استعادة النموذج: ' + e.message);
        }
    };

    const handleToggleEnabled = async (id, currentEnabled) => {
        try {
            await formService.update(id, { enabled: !currentEnabled });
            await loadData();
        } catch (e) {
            alert('فشل تحديث الإتاحة: ' + e.message);
        }
    };

    // Filtered Forms
    const filteredForms = useMemo(() => {
        return forms.filter(f => {
            const matchesSearch = (f.name || '').toLowerCase().includes(search.toLowerCase()) || 
                                 (f.templateName || '').toLowerCase().includes(search.toLowerCase());
            
            // Exclude DELETED forms from ALL list. Only show DELETED when explicitly selected.
            const matchesStatus = statusFilter === 'ALL' 
                ? f.status !== 'DELETED' 
                : f.status === statusFilter;
                
            return matchesSearch && matchesStatus;
        });
    }, [forms, search, statusFilter]);

    // Statistics (Excluding DELETED forms)
    const stats = useMemo(() => {
        const activeForms = forms.filter(f => f.status !== 'DELETED');
        return {
            total: activeForms.length,
            published: activeForms.filter(f => f.status === 'PUBLISHED').length,
            active: activeForms.filter(f => f.status === 'PUBLISHED' && f.enabled).length,
            drafts: activeForms.filter(f => f.status === 'DRAFT').length,
            totalUsage: activeForms.reduce((sum, f) => sum + (f.usageCount || 0), 0)
        };
    }, [forms]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Cairo, sans-serif' }}>
            
            <PageHeader
                title="إدارة ونماذج الإدخال (Forms Builder)"
                subtitle="إنشاء وتصميم نماذج إدخال مخصصة للمستفيدين، تحديد حقول البيانات، وربطها بالقوالب الرسمية."
                actions={
                    <Button variant="primary" onClick={() => setShowCreateModal(true)} leftIcon={Plus}>
                        إعداد نموذج جديد
                    </Button>
                }
            />

            {/* Stats Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                    { label: 'إجمالي النماذج المصممة', value: stats.total, color: 'var(--color-primary-500)' },
                    { label: 'النماذج المنشورة والمفعلة', value: stats.active, color: 'var(--color-success)' },
                    { label: 'نماذج مسودة (قيد التطوير)', value: stats.drafts, color: 'var(--color-warning)' },
                    { label: 'إجمالي الشهادات المصدرة بها', value: stats.totalUsage, color: 'var(--color-info)' }
                ].map(c => (
                    <div key={c.label} style={{
                        padding: '16px 20px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '16px',
                        boxShadow: 'var(--shadow-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{c.label}</span>
                        <span style={{ fontSize: '24px', fontWeight: 900, color: c.color }}>{c.value}</span>
                    </div>
                ))}
            </div>

            {/* List and Table Grid */}
            <Card>
                <CardHeader>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sliders size={16} style={{ color: 'var(--color-primary-600)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>نماذج الإدخال النشطة</h3>
                            <span style={{ fontSize: '11px', background: 'var(--bg-muted)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                                {filteredForms.length} نموذج
                            </span>
                        </div>
                        
                        {/* Search & Filter Controls */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {/* Search */}
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="بحث باسم النموذج أو القالب..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    style={{
                                        padding: '8px 36px 8px 12px',
                                        border: '1.5px solid var(--border-strong)',
                                        borderRadius: '10px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        width: '240px'
                                    }}
                                />
                            </div>

                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1.5px solid var(--border-strong)',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="ALL">جميع الحالات النشطة</option>
                                <option value="DRAFT">مسودة</option>
                                <option value="PUBLISHED">منشور</option>
                                <option value="ARCHIVED">مؤرشف</option>
                                <option value="DELETED">المحذوفة (سلة المهملات)</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton" style={{ height: '60px', borderRadius: '12px' }} />
                            ))}
                        </div>
                    ) : filteredForms.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600 }}>
                            لا توجد نماذج مطابقة لشروط البحث.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                        {['اسم النموذج', 'القالب المرتبط', 'المنشئ', 'تاريخ الإنشاء', 'آخر تعديل', 'الحالة', 'الإتاحة', 'الاستخدام', 'الإجراءات'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredForms.map((form) => {
                                        const status = STATUS_MAP[form.status] || { label: form.status, variant: 'neutral' };
                                        return (
                                            <tr key={form.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                                                
                                                {/* Form Name & Version */}
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>{form.name}</span>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>إصدار: v{form.version}</span>
                                                    </div>
                                                </td>

                                                {/* Linked Template */}
                                                <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        <ImageIcon size={14} style={{ color: 'var(--text-muted)' }} />
                                                        {form.templateName}
                                                    </span>
                                                </td>

                                                {/* Creator */}
                                                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>
                                                    {form.createdByName || 'المشرف'}
                                                </td>

                                                {/* Created At */}
                                                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                                                    {new Date(form.createdAt).toLocaleDateString('ar-SA')}
                                                </td>

                                                {/* Updated At */}
                                                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600 }}>
                                                    {new Date(form.updatedAt).toLocaleDateString('ar-SA')}
                                                </td>

                                                {/* Status */}
                                                <td style={{ padding: '16px' }}>
                                                    <Badge variant={status.variant} dot>{status.label}</Badge>
                                                </td>

                                                {/* Enabled Toggle */}
                                                <td style={{ padding: '16px' }}>
                                                    <button
                                                        onClick={() => handleToggleEnabled(form.id, form.enabled)}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            fontSize: '11px',
                                                            fontWeight: 800,
                                                            background: form.enabled ? 'var(--color-success-bg)' : 'var(--bg-muted)',
                                                            color: form.enabled ? 'var(--color-success)' : 'var(--text-muted)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.15s'
                                                        }}
                                                    >
                                                        {form.enabled ? <Check size={12} /> : <X size={12} />}
                                                        {form.enabled ? 'مفعّل' : 'معطل'}
                                                    </button>
                                                </td>

                                                {/* Usage Count */}
                                                <td style={{ padding: '16px', fontWeight: 800, color: 'var(--color-primary-600)', fontSize: '13px' }}>
                                                    {form.usageCount || 0}
                                                </td>

                                                {/* Actions */}
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        {form.status === 'DELETED' ? (
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                style={{ color: 'var(--color-success)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                                                leftIcon={Check}
                                                                onClick={() => handleRecover(form.id)}
                                                            >
                                                                استعادة
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    leftIcon={Sliders}
                                                                    onClick={() => navigate(`/forms-builder/designer/${form.id}`)}
                                                                >
                                                                    مصمم اللوحة
                                                                </Button>
                                                                <button
                                                                    onClick={() => handleDelete(form.id, form.name, form.usageCount)}
                                                                    disabled={form.usageCount > 0}
                                                                    style={{
                                                                        padding: '6px',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                        background: 'transparent',
                                                                        color: 'var(--color-danger)',
                                                                        cursor: form.usageCount > 0 ? 'not-allowed' : 'pointer',
                                                                        opacity: form.usageCount > 0 ? 0.35 : 1,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                    title={form.usageCount > 0 ? 'لا يمكن الحذف لوجود استخدامات للنموذج' : 'حذف النموذج'}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CREATE FORM MODAL */}
            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: 'var(--shadow-overlay)' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: 'var(--text-primary)', textAlign: 'right' }}>إعداد نموذج إدخال جديد</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>اسم النموذج:</label>
                            <input
                                type="text"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="مثال: نموذج تكريم متميزي التحول الرقمي"
                                style={{ background: 'var(--bg-page)', border: '1.5px solid var(--border-strong)', borderRadius: '10px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none', direction: 'rtl', fontFamily: 'Cairo' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>القالب المرتبط (قوالب معتمدة فقط):</label>
                            {templates.length === 0 ? (
                                <p style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: 700 }}>لا توجد قوالب رسمية معتمدة بالكامل في النظام حالياً. يرجى اعتماد قالب أولاً من Template Studio.</p>
                            ) : (
                                <select
                                    value={selectedTemplateId}
                                    onChange={e => setSelectedTemplateId(e.target.value)}
                                    style={{ background: 'var(--bg-page)', border: '1.5px solid var(--border-strong)', borderRadius: '10px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer', direction: 'rtl', fontFamily: 'Cairo' }}
                                >
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.orientation === 'landscape' ? 'أفقي' : 'عمودي'})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <Button variant="outline" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>إلغاء</Button>
                            <Button variant="primary" style={{ flex: 1.5 }} onClick={handleCreateForm} disabled={templates.length === 0}>إنشاء والذهاب للمصمم</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
