/**
 * 📋 FillForms.jsx
 * Grid display of available published/enabled forms for creators, with inline FormRenderer.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';
import { formService } from '../services/db';
import FormRenderer from '../components/FormRenderer';
import { ClipboardSignature, FileText, CheckCircle, Search, Eye } from 'lucide-react';

export default function FillForms() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFormId, setSelectedFormId] = useState(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadPublishedForms();
    }, []);

    const loadPublishedForms = async () => {
        setLoading(true);
        try {
            const list = await formService.getAll();
            // Normal creators only see forms that are PUBLISHED and Enabled (enabled = true)
            // DELETED, DRAFT, and ARCHIVED status are excluded.
            const published = (list || []).filter(f => f.status === 'PUBLISHED' && f.enabled);
            setForms(published);
        } catch (e) {
            console.error("Failed to load forms catalog", e);
        } finally {
            setLoading(false);
        }
    };

    const filtered = forms.filter(f => 
        (f.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.templateName || '').toLowerCase().includes(search.toLowerCase())
    );

    if (selectedFormId) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Cairo, sans-serif' }}>
                <PageHeader
                    title="تعبئة نموذج المعاملة"
                    subtitle="الرجاء ملء الحقول المطلوبة واضغط إرسال لتوليد الشهادة الرسمية للتحقق والمراجعة."
                />
                <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
                    <FormRenderer
                        formId={selectedFormId}
                        onBack={() => {
                            setSelectedFormId(null);
                            loadPublishedForms(); // reload to get usage updates if any
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Cairo, sans-serif' }}>
            
            <PageHeader
                title="نماذج المعاملات المتاحة"
                subtitle="حدد النموذج المعتمد لإصدار شهادة المستفيد مباشرة وإرسالها لمسار الاعتماد الإداري."
            />

            {/* Search toolbar */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', background: 'var(--bg-surface)', padding: '14px 20px', borderRadius: '16px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="البحث باسم النموذج..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 36px 8px 12px',
                            border: '1.5px solid var(--border-strong)',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            background: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontFamily: 'Cairo'
                        }}
                    />
                </div>
            </div>

            {/* Forms Catalog Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '16px' }} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: 'var(--bg-surface)',
                    border: '1.5px dashed var(--border-strong)',
                    borderRadius: '20px',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    fontWeight: 600
                }}>
                    <ClipboardSignature size={48} style={{ color: 'var(--text-disabled)', margin: '0 auto 16px', opacity: 0.5 }} />
                    لا توجد نماذج معاملات منشورة ومتاحة للتعبئة حالياً.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filtered.map(form => (
                        <Card 
                            key={form.id} 
                            hover 
                            style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                height: '100%', 
                                border: '1px solid var(--border-default)',
                                borderRadius: '16px',
                                overflow: 'hidden'
                            }}
                        >
                            <CardHeader style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContext: 'center', flexShrink: 0, padding: '8px' }}>
                                        <ClipboardSignature size={20} style={{ color: 'var(--color-success)' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                                            {form.name}
                                        </h4>
                                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                                            إصدار: v{form.version}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>القالب المعتمد:</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{form.templateName}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>عدد حقول الإدخال:</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{(form.fields || []).length} حقول</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>مرات الاستخدام الإجمالي:</span>
                                        <span style={{ color: 'var(--color-primary-600)', fontWeight: 800 }}>{form.usageCount || 0} شهادات</span>
                                    </div>
                                </div>

                                <Button 
                                    variant="primary" 
                                    style={{ width: '100%' }} 
                                    leftIcon={FileText}
                                    onClick={() => setSelectedFormId(form.id)}
                                >
                                    البدء بتعبئة النموذج
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

        </div>
    );
}
