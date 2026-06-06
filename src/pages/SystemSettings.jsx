/**
 * ⚙️ SystemSettings.jsx — Enterprise Identity & Platform Settings
 * Single Source of Truth for all official identity data.
 * Tabs: النصوص الرسمية | المعتمدون والتواقيع | الختم الرسمي | الألقاب الرسمية | الألوان
 */

import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingService, auditService } from '../services/db';
import SignatureUploader from '../components/SignatureUploader';
import StampManager from '../components/StampManager';
import {
    Save, Building, User, Palette, Stamp,
    CheckCircle, Type, Plus, Trash2, ChevronUp, ChevronDown,
    FileText, Shield, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';

const TABS = [
    { id: 'texts', label: 'النصوص الرسمية', icon: FileText },
    { id: 'signatories', label: 'المعتمدون والتواقيع', icon: User },
    { id: 'stamp', label: 'الختم الرسمي', icon: Stamp },
    { id: 'prefixes', label: 'الألقاب الرسمية', icon: Type },
    { id: 'colors', label: 'الألوان', icon: Palette },
];

export default function SystemSettings() {
    const { settings, refreshSettings, user } = useAuth();

    const [activeTab, setActiveTab] = useState('texts');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showSig, setShowSig] = useState({ gm: false, ap: false, os: false });

    const [formData, setFormData] = useState({
        // ── Organization ────────────────────────────────────────────────
        orgName: settings?.orgName || 'وزارة الصحة',
        orgSubName: settings?.orgSubName || 'فرع الوزارة بالحدود الشمالية',
        orgLogo: settings?.orgLogo || '',

        // ── Official Certificate Texts ───────────────────────────────────
        certificate_header_text: settings?.certificate_header_text || 'يتقدم فرع وزارة الصحة بمنطقة الحدود الشمالية بخالص الشكر والتقدير',
        certificate_closing_text: settings?.certificate_closing_text || 'متمنين له/ـها دوام التوفيق والنجاح',

        // ── General Manager ─────────────────────────────────────────────
        general_manager_name: settings?.general_manager_name || settings?.directorName || '',
        general_manager_title: settings?.general_manager_title || settings?.directorTitle || '',
        general_manager_signature: settings?.general_manager_signature || settings?.directorSignature || '',

        // ── Assistant Planning Director ─────────────────────────────────
        assistant_planning_name: settings?.assistant_planning_name || settings?.visaName || '',
        assistant_planning_title: settings?.assistant_planning_title || settings?.visaLabel || '',
        assistant_planning_signature: settings?.assistant_planning_signature || settings?.visaSignature || '',
        assistant_planning_enabled: settings?.assistant_planning_enabled ?? true,

        // ── Official Seal ───────────────────────────────────────────────
        official_seal: settings?.official_seal || settings?.stamp || '',
        stampSize: settings?.stampSize || 120,
        stampOpacity: settings?.stampOpacity || 0.85,
        stampRotation: settings?.stampRotation || -8,

        // ── Official Signature (general purpose) ────────────────────────
        official_signature: settings?.official_signature || '',

        // ── Official Titles ─────────────────────────────────────────────
        official_titles: settings?.official_titles || settings?.prefixes || [
            'الأستاذ', 'الأستاذة', 'الدكتور', 'الدكتورة',
            'المهندس', 'المهندسة', 'الزميل', 'الزميلة'
        ],

        // ── Colors ──────────────────────────────────────────────────────
        primaryColor: settings?.primaryColor || '#0FA958',
        goldColor: settings?.goldColor || '#D4A017',
    });

    const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

    // ── Prefix handlers ──────────────────────────────────────────────────
    const handleTitleAdd = () => set('official_titles', [...formData.official_titles, '']);
    const handleTitleChange = (idx, val) => {
        const arr = [...formData.official_titles];
        arr[idx] = val;
        set('official_titles', arr);
    };
    const handleTitleRemove = (idx) => set('official_titles', formData.official_titles.filter((_, i) => i !== idx));
    const handleTitleMoveUp = (idx) => {
        if (idx === 0) return;
        const arr = [...formData.official_titles];
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        set('official_titles', arr);
    };
    const handleTitleMoveDown = (idx) => {
        if (idx === formData.official_titles.length - 1) return;
        const arr = [...formData.official_titles];
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
        set('official_titles', arr);
    };

    // ── Save ─────────────────────────────────────────────────────────────
    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            // Sync legacy aliases so old code keeps working
            const payload = {
                ...formData,
                // legacy aliases
                directorName: formData.general_manager_name,
                directorTitle: formData.general_manager_title,
                directorSignature: formData.general_manager_signature,
                visaName: formData.assistant_planning_name,
                visaLabel: formData.assistant_planning_title,
                visaSignature: formData.assistant_planning_signature,
                stamp: formData.official_seal,
                prefixes: formData.official_titles,
            };
            await settingService.update(payload);
            await auditService.log('UPDATE_SETTINGS', user, 'تحديث إعدادات الهوية المؤسسية الشاملة');
            await refreshSettings();
            setSaved(true);
            logger.api('تم حفظ الإعدادات بنجاح');
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            logger.error('فشل حفظ الإعدادات', e);
            alert('خطأ أثناء الحفظ: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Header ── */}
            <PageHeader
                title="الهوية المؤسسية وإعدادات النظام"
                subtitle="المصدر الوحيد لجميع بيانات الهوية — تؤثر التغييرات فوراً على كل الشهادات والقوالب"
                actions={
                    <Button type="submit" variant="primary" size="md" isLoading={saving} leftIcon={saved ? CheckCircle : Save}>
                        {saved ? 'تم الحفظ' : 'حفظ التغييرات'}
                    </Button>
                }
            />

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '4px', gap: '2px', boxShadow: 'var(--shadow-surface)' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1, padding: '9px 10px', borderRadius: '10px', border: 'none',
                                background: isActive ? 'var(--color-primary-600)' : 'transparent',
                                color: isActive ? 'white' : 'var(--text-tertiary)',
                                fontSize: 'var(--text-label)', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                transition: 'all 0.15s', fontFamily: 'var(--font-sans)',
                                boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; } }}
                        >
                            <Icon size={14} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ── */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                >
                    {/* ─────────────────────────────────────────────────────── */}
                    {/* TAB: النصوص الرسمية                                   */}
                    {/* ─────────────────────────────────────────────────────── */}
                    {activeTab === 'texts' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Organization Identity */}
                            <Card>
                                <CardHeader>
                                    <SectionTitle icon={Building} title="بيانات الجهة الرسمية" />
                                </CardHeader>
                                <CardContent>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
                                        <FormField label="اسم الوزارة / المنظمة" required>
                                            <input type="text" value={formData.orgName} onChange={e => set('orgName', e.target.value)} placeholder="وزارة الصحة" className="form-input" />
                                        </FormField>
                                        <FormField label="الإدارة أو الفرع">
                                            <input type="text" value={formData.orgSubName} onChange={e => set('orgSubName', e.target.value)} placeholder="فرع وزارة الصحة بمنطقة الحدود الشمالية" className="form-input" />
                                        </FormField>
                                        <FormField label="شعار الجهة الرسمي" hint="PNG أو SVG بخلفية شفافة">
                                            <SignatureUploader value={formData.orgLogo} onChange={v => set('orgLogo', v)} hint="يُستخدم في رأس الشهادات الرسمية" />
                                        </FormField>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Certificate Official Texts */}
                            <Card>
                                <CardHeader>
                                    <SectionTitle icon={FileText} title="النصوص الرسمية للشهادات" color="var(--color-accent-500)" />
                                </CardHeader>
                                <CardContent>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>
                                        <InfoBanner>
                                            هذه النصوص تُستخدم تلقائياً في جميع القوالب عبر الحقول:
                                            <code style={{ margin: '0 4px', background: 'var(--bg-muted)', color: 'var(--text-primary)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{'{{certificate_header_text}}'}</code>
                                            و
                                            <code style={{ margin: '0 4px', background: 'var(--bg-muted)', color: 'var(--text-primary)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>{'{{certificate_closing_text}}'}</code>
                                        </InfoBanner>

                                        <FormField
                                            label="نص رأس الشهادة الرسمي"
                                            hint="يظهر في حقل 'نص رأس الشهادة الرسمي' في القوالب"
                                            required
                                        >
                                            <textarea
                                                value={formData.certificate_header_text}
                                                onChange={e => set('certificate_header_text', e.target.value)}
                                                rows={3}
                                                className="form-input"
                                                style={{ resize: 'vertical', fontFamily: 'Amiri, serif', fontSize: '16px', lineHeight: 1.8 }}
                                                dir="rtl"
                                            />
                                        </FormField>

                                        <FormField
                                            label="النص الختامي الرسمي"
                                            hint="يظهر في حقل 'النص الختامي الرسمي' في القوالب"
                                            required
                                        >
                                            <textarea
                                                value={formData.certificate_closing_text}
                                                onChange={e => set('certificate_closing_text', e.target.value)}
                                                rows={2}
                                                className="form-input"
                                                style={{ resize: 'vertical', fontFamily: 'Amiri, serif', fontSize: '16px', lineHeight: 1.8 }}
                                                dir="rtl"
                                            />
                                        </FormField>

                                        {/* Live Preview */}
                                        <div style={{ padding: '16px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', direction: 'rtl' }}>
                                            <p style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>معاينة النص الرسمي</p>
                                            <p style={{ fontFamily: 'Amiri, serif', fontSize: '18px', color: 'var(--text-primary)', lineHeight: 2, textAlign: 'center', margin: '0 0 8px' }}>{formData.certificate_header_text}</p>
                                            <p style={{ fontFamily: 'Amiri, serif', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 2, textAlign: 'center', margin: 0 }}>{formData.certificate_closing_text}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* TAB: المعتمدون والتواقيع                              */}
                    {/* ─────────────────────────────────────────────────────── */}
                    {activeTab === 'signatories' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* General Manager */}
                            <Card>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <SectionTitle icon={Shield} title="المدير العام — المصادق النهائي" color="var(--color-primary-600)" />
                                        <FieldKey field="general_manager_name / general_manager_title / general_manager_signature" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <FormField label="الاسم الكامل" required>
                                                <input
                                                    type="text"
                                                    value={formData.general_manager_name}
                                                    onChange={e => set('general_manager_name', e.target.value)}
                                                    placeholder="أ. منصور بن سالم الرشيدي"
                                                    className="form-input"
                                                />
                                            </FormField>
                                            <FormField label="المسمى الوظيفي" required>
                                                <input
                                                    type="text"
                                                    value={formData.general_manager_title}
                                                    onChange={e => set('general_manager_title', e.target.value)}
                                                    placeholder="مدير عام فرع وزارة الصحة بمنطقة الحدود الشمالية"
                                                    className="form-input"
                                                />
                                            </FormField>
                                        </div>
                                        <FormField label="التوقيع الرسمي للمدير العام" hint="يُحقن عند الاعتماد النهائي للشهادة">
                                            <SignatureUploader
                                                value={formData.general_manager_signature}
                                                onChange={v => set('general_manager_signature', v)}
                                            />
                                        </FormField>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Assistant Planning Director */}
                            <Card>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <SectionTitle icon={User} title="مساعد المدير العام للتخطيط" color="var(--color-accent-500)" />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FieldKey field="assistant_planning_name / assistant_planning_title / assistant_planning_signature" />
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.assistant_planning_enabled}
                                                    onChange={e => set('assistant_planning_enabled', e.target.checked)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                مفعّل
                                            </label>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <FormField label="الاسم الكامل" required>
                                                <input
                                                    type="text"
                                                    value={formData.assistant_planning_name}
                                                    onChange={e => set('assistant_planning_name', e.target.value)}
                                                    placeholder="د. أحمد بن مريح العنزي"
                                                    className="form-input"
                                                />
                                            </FormField>
                                            <FormField label="المسمى الوظيفي" required>
                                                <input
                                                    type="text"
                                                    value={formData.assistant_planning_title}
                                                    onChange={e => set('assistant_planning_title', e.target.value)}
                                                    placeholder="مساعد المدير العام للتخطيط"
                                                    className="form-input"
                                                />
                                            </FormField>
                                        </div>
                                        <FormField label="توقيع مساعد المدير (التأشيرة)" hint="يُحقن عند التأشير والمراجعة">
                                            <SignatureUploader
                                                value={formData.assistant_planning_signature}
                                                onChange={v => set('assistant_planning_signature', v)}
                                            />
                                        </FormField>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Official Signature (general purpose) */}
                            <Card>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <SectionTitle icon={FileText} title="التوقيع الرسمي العام" color="#7c3aed" />
                                        <FieldKey field="official_signature" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ maxWidth: '400px' }}>
                                        <FormField label="التوقيع الرسمي (للقوالب العامة)" hint="يمكن ربطه بالحقل official_signature في أي قالب">
                                            <SignatureUploader
                                                value={formData.official_signature}
                                                onChange={v => set('official_signature', v)}
                                            />
                                        </FormField>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* TAB: الختم الرسمي                                     */}
                    {/* ─────────────────────────────────────────────────────── */}
                    {activeTab === 'stamp' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Card>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <SectionTitle icon={Stamp} title="الختم الرسمي للفرع" color="var(--color-primary-600)" />
                                        <FieldKey field="official_seal" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                                        <FormField label="صورة الختم الرسمي" hint="PNG بخلفية شفافة — يُستخدم في حقل official_seal في القوالب">
                                            <SignatureUploader
                                                value={formData.official_seal}
                                                onChange={v => set('official_seal', v)}
                                                hint="يُستخدم تلقائياً في بلوك الختم الرسمي للفرع"
                                            />
                                        </FormField>

                                        {/* Preview */}
                                        {formData.official_seal && (
                                            <div style={{ padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <img
                                                    src={formData.official_seal}
                                                    alt="الختم الرسمي"
                                                    style={{
                                                        width: `${formData.stampSize}px`,
                                                        height: `${formData.stampSize}px`,
                                                        objectFit: 'contain',
                                                        transform: `rotate(${formData.stampRotation}deg)`,
                                                        opacity: formData.stampOpacity
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <StampManager settings={formData} onSettingsChange={setFormData} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* TAB: الألقاب الرسمية                                  */}
                    {/* ─────────────────────────────────────────────────────── */}
                    {activeTab === 'prefixes' && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <SectionTitle icon={Type} title="إدارة الألقاب الرسمية" color="var(--color-primary-600)" />
                                        <FieldKey field="official_titles" />
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={handleTitleAdd} leftIcon={Plus}>
                                        إضافة لقب جديد
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ maxWidth: '500px' }}>
                                    <InfoBanner>
                                        هذه الألقاب تظهر في قائمة اختيار اللقب عند إنشاء الشهادات. تُضاف قبل اسم المستفيد آلياً.
                                        مثال: <strong>الدكتور أحمد محمد</strong> — <strong>الأستاذة سارة خالد</strong>
                                    </InfoBanner>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                        {formData.official_titles.map((title, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                {/* Reorder buttons */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTitleMoveUp(idx)}
                                                        disabled={idx === 0}
                                                        style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px', color: idx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: idx === 0 ? 'default' : 'pointer', padding: '2px 4px', opacity: idx === 0 ? 0.3 : 1 }}
                                                    >
                                                        <ChevronUp size={12} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTitleMoveDown(idx)}
                                                        disabled={idx === formData.official_titles.length - 1}
                                                        style={{ background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px', color: idx === formData.official_titles.length - 1 ? 'var(--text-muted)' : 'var(--text-secondary)', cursor: idx === formData.official_titles.length - 1 ? 'default' : 'pointer', padding: '2px 4px', opacity: idx === formData.official_titles.length - 1 ? 0.3 : 1 }}
                                                    >
                                                        <ChevronDown size={12} />
                                                    </button>
                                                </div>

                                                {/* Order badge */}
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', width: '20px', textAlign: 'center' }}>{idx + 1}</span>

                                                {/* Input */}
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={e => handleTitleChange(idx, e.target.value)}
                                                    placeholder="أدخل اللقب..."
                                                    className="form-input"
                                                    style={{ flex: 1 }}
                                                    dir="rtl"
                                                />

                                                {/* Delete */}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => handleTitleRemove(idx)}
                                                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)', padding: '0 10px', flexShrink: 0 }}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        ))}
                                        {formData.official_titles.length === 0 && (
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                                                لا توجد ألقاب مضافة. اضغط "إضافة لقب جديد" للبدء.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* TAB: الألوان                                          */}
                    {/* ─────────────────────────────────────────────────────── */}
                    {activeTab === 'colors' && (
                        <Card>
                            <CardHeader>
                                <SectionTitle icon={Palette} title="الهوية اللونية للشهادات" color="var(--color-primary-600)" />
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '480px' }}>
                                    {[
                                        { key: 'primaryColor', label: 'اللون الأساسي', hint: 'يُستخدم في إطارات الشهادة وألوانها الرئيسية' },
                                        { key: 'goldColor', label: 'اللون الذهبي', hint: 'يُستخدم في الزخارف والفواصل الرسمية' },
                                    ].map(({ key, label, hint }) => (
                                        <FormField key={key} label={label} hint={hint}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                                <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 'var(--radius-md)', border: '2px solid var(--border-strong)', overflow: 'hidden', flexShrink: 0, background: formData[key], boxShadow: 'var(--shadow-card)' }}>
                                                    <input
                                                        type="color"
                                                        value={formData[key]}
                                                        onChange={e => set(key, e.target.value)}
                                                        style={{ position: 'absolute', inset: '-4px', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)', opacity: 0, cursor: 'pointer' }}
                                                    />
                                                </div>
                                                <code style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-muted)', padding: '4px 8px', borderRadius: 'var(--radius-md)', letterSpacing: '0.05em' }}>
                                                    {formData[key].toUpperCase()}
                                                </code>
                                            </div>
                                        </FormField>
                                    ))}
                                </div>

                                <div style={{ marginTop: '24px', padding: '20px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                                    <p style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>معاينة اللوحة اللونية</p>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ flex: 1, height: 36, background: formData.primaryColor, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-micro)', fontWeight: 700, color: 'white' }}>
                                            اللون الأساسي
                                        </div>
                                        <div style={{ flex: 1, height: 36, background: formData.goldColor, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-micro)', fontWeight: 700, color: 'white' }}>
                                            اللون الذهبي
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </motion.div>
            </AnimatePresence>

            {/* ── Sticky Save Footer ── */}
            <div style={{ position: 'sticky', bottom: '16px', background: 'var(--bg-surface)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-floating)', zIndex: 10 }}>
                <p style={{ fontSize: 'var(--text-caption)', color: '#0D7F55', fontWeight: 600 }}>
                    ✓ التغييرات تؤثر فوراً على جميع القوالب والشهادات الجديدة
                </p>
                <Button type="submit" variant="primary" size="md" isLoading={saving} leftIcon={saved ? CheckCircle : Save}>
                    {saved ? '✓ تم الحفظ بنجاح' : 'حفظ جميع الإعدادات'}
                </Button>
            </div>
        </form>
    );
}

/* ── Internal Components ─────────────────────────────────────────────────── */

const FormField = ({ label, hint, required, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {label}
            {required && <span style={{ color: 'var(--color-danger)', marginRight: '3px' }}>*</span>}
        </label>
        {children}
        {hint && <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 500 }}>{hint}</p>}
    </div>
);

const SectionTitle = ({ icon: Icon, title, color = 'var(--color-primary-600)' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={15} style={{ color }} />
        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
    </div>
);

const FieldKey = ({ field }) => (
    <span style={{ fontSize: '10px', fontFamily: 'monospace', background: 'var(--bg-muted)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
        {field}
    </span>
);

const InfoBanner = ({ children }) => (
    <div style={{
        padding: '10px 14px', background: 'var(--color-info-bg)', border: '1px solid var(--color-info-border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#0D7F55', lineHeight: 1.8,
        fontWeight: 600
    }}>
        {children}
    </div>
);
