/**
 * ⚙️ SystemSettings.jsx — Enterprise Identity & Platform Settings
 * Tabbed layout: Identity | Signatories | Stamp | Colors
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingService, auditService } from '../services/db';
import SignatureUploader from '../components/SignatureUploader';
import StampManager from '../components/StampManager';
import {
    Save, Building, User, Palette, Stamp,
    CheckCircle, RefreshCw, Type, Plus, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

import { Card, CardHeader, CardContent, CardFooter } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import PageHeader from '../ui/layouts/PageHeader';

const TABS = [
    { id: 'identity',    label: 'هوية الجهة',          icon: Building },
    { id: 'signatories', label: 'المعتمدون والتواقيع', icon: User     },
    { id: 'stamp',       label: 'الختم الرسمي',        icon: Stamp    },
    { id: 'prefixes',    label: 'الألقاب الرسمية',       icon: Type     },
    { id: 'colors',      label: 'الألوان',               icon: Palette  },
];

export default function SystemSettings() {
    const { settings, refreshSettings, user } = useAuth();

    const [activeTab, setActiveTab] = useState('identity');
    const [saving,    setSaving]    = useState(false);
    const [saved,     setSaved]     = useState(false);

    const [formData, setFormData] = useState({
        orgName:          settings?.orgName          || '',
        orgSubName:       settings?.orgSubName       || '',
        orgLogo:          settings?.orgLogo          || '',
        primaryColor:     settings?.primaryColor     || '#0FA958',
        goldColor:        settings?.goldColor        || '#D4A017',
        directorName:     settings?.directorName     || '',
        directorTitle:    settings?.directorTitle    || '',
        directorSignature:settings?.directorSignature|| '',
        visaLabel:        settings?.visaLabel        || '',
        visaName:         settings?.visaName         || '',
        visaSignature:    settings?.visaSignature    || '',
        stamp:            settings?.stamp            || '',
        stampSize:        settings?.stampSize        || 120,
        stampOpacity:     settings?.stampOpacity     || 0.85,
        stampRotation:    settings?.stampRotation    || -8,
        prefixes:         settings?.prefixes         || ['الأستاذ', 'الأستاذة', 'الدكتور', 'الدكتورة', 'المهندس', 'الزميل'],
    });

    const set = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

    const handlePrefixAdd = () => setFormData(p => ({ ...p, prefixes: [...p.prefixes, ''] }));
    const handlePrefixChange = (idx, val) => {
        const newPrefixes = [...formData.prefixes];
        newPrefixes[idx] = val;
        setFormData(p => ({ ...p, prefixes: newPrefixes }));
    };
    const handlePrefixRemove = (idx) => {
        const newPrefixes = formData.prefixes.filter((_, i) => i !== idx);
        setFormData(p => ({ ...p, prefixes: newPrefixes }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await settingService.update(formData);
            await auditService.log('UPDATE_TEMPLATE', user, 'تحديث إعدادات الهوية المؤسسية');
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
                subtitle="تخصيص الهوية البصرية وبيانات المعتمدين والأختام الرسمية"
                actions={
                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        isLoading={saving}
                        leftIcon={saved ? CheckCircle : Save}
                    >
                        {saved ? 'تم الحفظ' : 'حفظ التغييرات'}
                    </Button>
                }
            />

            {/* ── Tabs ── */}
            <div style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '4px',
                gap: '2px',
                boxShadow: 'var(--shadow-surface)',
            }}>
                {TABS.map(tab => {
                    const Icon    = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                padding: '9px 12px',
                                borderRadius: '10px',
                                border: 'none',
                                background: isActive ? 'var(--color-primary-600)' : 'transparent',
                                color: isActive ? 'white' : 'var(--text-tertiary)',
                                fontSize: 'var(--text-label)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                transition: 'all 0.15s',
                                fontFamily: 'var(--font-sans)',
                                boxShadow: isActive ? 'var(--shadow-card)' : 'none',
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}}
                        >
                            <Icon size={14} />
                            <span className="hidden sm:inline">{tab.label}</span>
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

                    {/* ─── Identity Tab ─── */}
                    {activeTab === 'identity' && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Building size={15} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        بيانات الجهة الرسمية
                                    </h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>
                                    <FormField label="اسم الوزارة / المنظمة" required>
                                        <input
                                            type="text"
                                            value={formData.orgName}
                                            onChange={e => set('orgName', e.target.value)}
                                            placeholder="وزارة الصحة"
                                            className="form-input"
                                        />
                                    </FormField>

                                    <FormField label="الإدارة أو الفرع الفرعي">
                                        <input
                                            type="text"
                                            value={formData.orgSubName}
                                            onChange={e => set('orgSubName', e.target.value)}
                                            placeholder="فرع منطقة الحدود الشمالية"
                                            className="form-input"
                                        />
                                    </FormField>

                                    <FormField label="شعار الجهة الرسمي" hint="PNG أو SVG بخلفية شفافة">
                                        <SignatureUploader
                                            value={formData.orgLogo}
                                            onChange={v => set('orgLogo', v)}
                                            hint="يُستخدم في رأس الشهادات الرسمية"
                                        />
                                    </FormField>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ─── Signatories Tab ─── */}
                    {activeTab === 'signatories' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                            {/* General Manager */}
                            <Card>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-600)' }} />
                                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            المدير العام — المصادق النهائي
                                        </h3>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <FormField label="الاسم الكامل" required>
                                            <input
                                                type="text"
                                                value={formData.directorName}
                                                onChange={e => set('directorName', e.target.value)}
                                                placeholder="سعادة مدير فرع الوزارة"
                                                className="form-input"
                                            />
                                        </FormField>
                                        <FormField label="المسمى الوظيفي" required>
                                            <input
                                                type="text"
                                                value={formData.directorTitle}
                                                onChange={e => set('directorTitle', e.target.value)}
                                                placeholder="المدير العام للفرع"
                                                className="form-input"
                                            />
                                        </FormField>
                                        <FormField label="التوقيع الرسمي" hint="يُحقن عند الاعتماد النهائي">
                                            <SignatureUploader
                                                value={formData.directorSignature}
                                                onChange={v => set('directorSignature', v)}
                                            />
                                        </FormField>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Assistant Manager */}
                            <Card>
                                <CardHeader>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-500)' }} />
                                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            مساعد المدير — المراجع الإداري
                                        </h3>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <FormField label="مسمى التأشيرة" required>
                                            <input
                                                type="text"
                                                value={formData.visaLabel}
                                                onChange={e => set('visaLabel', e.target.value)}
                                                placeholder="مساعد المدير للتخطيط والجودة"
                                                className="form-input"
                                            />
                                        </FormField>
                                        <FormField label="الاسم الكامل" required>
                                            <input
                                                type="text"
                                                value={formData.visaName}
                                                onChange={e => set('visaName', e.target.value)}
                                                placeholder="اسم مساعد المدير"
                                                className="form-input"
                                            />
                                        </FormField>
                                        <FormField label="توقيع التأشيرة" hint="يُحقن عند المراجعة والتأشير">
                                            <SignatureUploader
                                                value={formData.visaSignature}
                                                onChange={v => set('visaSignature', v)}
                                            />
                                        </FormField>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ─── Stamp Tab ─── */}
                    {activeTab === 'stamp' && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Stamp size={15} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        إعدادات الختم الرسمي
                                    </h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <StampManager settings={formData} onSettingsChange={setFormData} />
                            </CardContent>
                        </Card>
                    )}

                    {/* ─── Prefixes Tab ─── */}
                    {activeTab === 'prefixes' && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Type size={15} style={{ color: 'var(--color-primary-600)' }} />
                                        <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            إدارة الألقاب الرسمية (Prefixes)
                                        </h3>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={handlePrefixAdd} leftIcon={Plus}>
                                        إضافة لقب جديد
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
                                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginBottom: '8px' }}>هذه الألقاب ستظهر في قائمة الاختيار عند إنشاء الشهادات، وتضاف قبل اسم المستفيد آلياً.</p>
                                    {formData.prefixes.map((pref, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                type="text" 
                                                value={pref} 
                                                onChange={e => handlePrefixChange(idx, e.target.value)} 
                                                placeholder="أدخل اللقب..." 
                                                className="form-input" 
                                                style={{ flex: 1 }} 
                                            />
                                            <Button type="button" variant="outline" onClick={() => handlePrefixRemove(idx)} style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)', padding: '0 12px' }}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                    {formData.prefixes.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>لا يوجد ألقاب مضافة.</p>}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ─── Colors Tab ─── */}
                    {activeTab === 'colors' && (
                        <Card>
                            <CardHeader>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Palette size={15} style={{ color: 'var(--color-primary-600)' }} />
                                    <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        الهوية اللونية للشهادات
                                    </h3>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '480px' }}>
                                    {[
                                        { key: 'primaryColor', label: 'اللون الأساسي', hint: 'يُستخدم في إطارات الشهادة وألوانها الرئيسية' },
                                        { key: 'goldColor',    label: 'اللون الذهبي',  hint: 'يُستخدم في الزخارف والفواصل الرسمية'         },
                                    ].map(({ key, label, hint }) => (
                                        <FormField key={key} label={label} hint={hint}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                                <div style={{
                                                    position: 'relative',
                                                    width: 44, height: 44,
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '2px solid var(--border-strong)',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    background: formData[key],
                                                    boxShadow: 'var(--shadow-card)',
                                                }}>
                                                    <input
                                                        type="color"
                                                        value={formData[key]}
                                                        onChange={e => set(key, e.target.value)}
                                                        style={{
                                                            position: 'absolute', inset: '-4px',
                                                            width: 'calc(100% + 8px)',
                                                            height: 'calc(100% + 8px)',
                                                            opacity: 0, cursor: 'pointer',
                                                        }}
                                                    />
                                                </div>
                                                <code style={{
                                                    fontSize: 'var(--text-label)',
                                                    fontWeight: 700,
                                                    color: 'var(--text-secondary)',
                                                    background: 'var(--bg-muted)',
                                                    padding: '4px 8px',
                                                    borderRadius: 'var(--radius-md)',
                                                    letterSpacing: '0.05em',
                                                }}>
                                                    {formData[key].toUpperCase()}
                                                </code>
                                            </div>
                                        </FormField>
                                    ))}
                                </div>

                                {/* Color Preview */}
                                <div style={{
                                    marginTop: '24px',
                                    padding: '20px',
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-default)',
                                    borderRadius: 'var(--radius-lg)',
                                }}>
                                    <p style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        معاينة اللوحة اللونية
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{
                                            flex: 1, height: 36,
                                            background: formData.primaryColor,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 'var(--text-micro)', fontWeight: 700, color: 'white',
                                        }}>
                                            اللون الأساسي
                                        </div>
                                        <div style={{
                                            flex: 1, height: 36,
                                            background: formData.goldColor,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 'var(--text-micro)', fontWeight: 700, color: 'white',
                                        }}>
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
            <div style={{
                position: 'sticky',
                bottom: '16px',
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: 'var(--shadow-floating)',
                zIndex: 10,
            }}>
                <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 500 }}>
                    التغييرات تؤثر فوراً على جميع الشهادات الجديدة
                </p>
                <Button type="submit" variant="primary" size="md" isLoading={saving} leftIcon={saved ? CheckCircle : Save}>
                    {saved ? '✓ تم الحفظ بنجاح' : 'حفظ جميع الإعدادات'}
                </Button>
            </div>
        </form>
    );
}

/* ── Internal: FormField ── */
const FormField = ({ label, hint, required, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {label}
            {required && <span style={{ color: 'var(--color-danger)', marginRight: '3px' }}>*</span>}
        </label>
        {children}
        {hint && (
            <p style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', fontWeight: 500 }}>
                {hint}
            </p>
        )}
    </div>
);
