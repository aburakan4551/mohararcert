/**
 * ⚙️ SystemSettings.jsx
 * Dynamic Platform Setup & Corporate Identity Customizer for mohararcert.
 * Connects directly to the repository settings service to update stamp properties,
 * visual identity, signatures, and titles dynamically.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingService, auditService } from '../services/db';
import SignatureUploader from '../components/SignatureUploader';
import StampManager from '../components/StampManager';
import { Settings, Save, ShieldCheck, Building, User, Sparkles, RefreshCw } from 'lucide-react';

export default function SystemSettings() {
    const { settings, refreshSettings, user } = useAuth();
    
    const [formData, setFormData] = useState({
        orgName: settings?.orgName || '',
        orgSubName: settings?.orgSubName || '',
        orgLogo: settings?.orgLogo || '',
        primaryColor: settings?.primaryColor || '#0d1f3c',
        goldColor: settings?.goldColor || '#c9a227',
        directorName: settings?.directorName || '',
        directorTitle: settings?.directorTitle || '',
        directorSignature: settings?.directorSignature || '',
        visaLabel: settings?.visaLabel || '',
        visaName: settings?.visaName || '',
        visaSignature: settings?.visaSignature || '',
        stamp: settings?.stamp || '',
        stampSize: settings?.stampSize || 120,
        stampOpacity: settings?.stampOpacity || 0.85,
        stampRotation: settings?.stampRotation || -8
    });

    const [saving, setSaving] = useState(false);

    const handleFieldChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await settingService.update(formData);
            await auditService.log(
                'UPDATE_TEMPLATE', // System settings update category
                user,
                'تحديث إعدادات الهوية المؤسسية والأختام والمسؤولين رقمياً'
            );
            await refreshSettings();
            alert('تم حفظ إعدادات النظام وتحديث الهوية المؤسسية بنجاح!');
        } catch (e) {
            alert('خطأ أثناء حفظ التحديثات: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-amber-500" />
                        الهوية المؤسسية وإعدادات النظام الديناميكية
                    </h2>
                    <p className="text-xs text-slate-400">تخصيص الهوية البصرية، أسماء المعتمدين وتواقيعهم الرقمية والأختام الرسمية للجهة.</p>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all duration-300 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>حفظ جميع الإعدادات</span>
                </button>
            </div>

            {/* Layout Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Right Panel: Identity and Visuals */}
                <div className="lg:col-span-6 space-y-6">
                    
                    {/* Visual Identity section */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                            <Building className="w-4 h-4 text-slate-400" />
                            شعار وتسميات الجهة الرسمية
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="form-group">
                                <label className="form-label">اسم المنظمة أو الوزارة *</label>
                                <input
                                    type="text"
                                    value={formData.orgName}
                                    onChange={e => handleFieldChange('orgName', e.target.value)}
                                    className="form-control"
                                    placeholder="وزارة التخطيط والتطوير"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">الإدارة أو المسمى الفرعي</label>
                                <input
                                    type="text"
                                    value={formData.orgSubName}
                                    onChange={e => handleFieldChange('orgSubName', e.target.value)}
                                    className="form-control"
                                    placeholder="الإدارة العامة للتميز المؤسسي"
                                />
                            </div>

                            <SignatureUploader
                                label="شعار الجهة الرقمي"
                                value={formData.orgLogo}
                                onChange={v => handleFieldChange('orgLogo', v)}
                                hint="يفضل استخدام خلفية شفافة PNG أو SVG"
                            />
                        </div>
                    </div>

                    {/* Colors & Visual Tokens */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-slate-400" />
                            لوحة الألوان وهوية المنصة البصرية
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400">اللون الأساسي الفاخر:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formData.primaryColor}
                                        onChange={e => handleFieldChange('primaryColor', e.target.value)}
                                        className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer p-0.5"
                                    />
                                    <span className="font-mono text-xs font-bold">{formData.primaryColor}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-slate-400">اللون الذهبي البرونزي:</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formData.goldColor}
                                        onChange={e => handleFieldChange('goldColor', e.target.value)}
                                        className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer p-0.5"
                                    />
                                    <span className="font-mono text-xs font-bold">{formData.goldColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stamp custom settings */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <StampManager 
                            settings={formData} 
                            onSettingsChange={setFormData} 
                        />
                    </div>
                </div>

                {/* Left Panel: Signing Authority Signatures */}
                <div className="lg:col-span-6 space-y-6">
                    
                    {/* General Manager details */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                            <User className="w-4 h-4 text-amber-500" />
                            أختام واعتماد المدير العام (المصادق النهائي)
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="form-group">
                                <label className="form-label">الاسم الكامل للمدير العام *</label>
                                <input
                                    type="text"
                                    value={formData.directorName}
                                    onChange={e => handleFieldChange('directorName', e.target.value)}
                                    className="form-control"
                                    placeholder="سعادة مدير فرع الوزارة"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">المسمى الوظيفي والصفة الرسمية *</label>
                                <input
                                    type="text"
                                    value={formData.directorTitle}
                                    onChange={e => handleFieldChange('directorTitle', e.target.value)}
                                    className="form-control"
                                    placeholder="المدير العام للمنصة"
                                />
                            </div>

                            <SignatureUploader
                                label="توقيع المدير العام الرسمي المعتمد"
                                value={formData.directorSignature}
                                onChange={v => handleFieldChange('directorSignature', v)}
                                hint="يتم حقنه تلقائياً في الشهادة عند الاعتماد النهائي"
                            />
                        </div>
                    </div>

                    {/* Assistant Manager details */}
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                            <User className="w-4 h-4 text-purple-400" />
                            تأشيرة ومراجعة مساعد المدير العام (المراجع الإداري)
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="form-group">
                                <label className="form-label">تسمية التأشيرة الوظيفية *</label>
                                <input
                                    type="text"
                                    value={formData.visaLabel}
                                    onChange={e => handleFieldChange('visaLabel', e.target.value)}
                                    className="form-control"
                                    placeholder="مساعد المدير العام للتخطيط"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">الاسم الكامل للمساعد *</label>
                                <input
                                    type="text"
                                    value={formData.visaName}
                                    onChange={e => handleFieldChange('visaName', e.target.value)}
                                    className="form-control"
                                    placeholder="اسم مساعد المدير العام"
                                />
                            </div>

                            <SignatureUploader
                                label="توقيع تأشيرة المساعد الرقمي"
                                value={formData.visaSignature}
                                onChange={v => handleFieldChange('visaSignature', v)}
                                hint="يتم حقنه عند مراجعة المعاملة والموافقة عليها"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </form>
    );
}
