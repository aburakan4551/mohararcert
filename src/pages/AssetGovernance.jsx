/**
 * 🏛️ AssetGovernance.jsx — Official Saudi Government Asset Governance & Isolation Registry
 * Centrally manages signatures, stamps, logos, and fonts with role-based access, image cropping, and version increments.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { assetService, auditService } from '../services/db';
import { ImageProcessor } from '../engine/StudioEngine/ImageProcessor';
import {
    Shield, Upload, FileImage, UserCheck, Stamp, Type, Eye,
    Trash2, RefreshCw, Key, ShieldCheck, Layers, Building2,
    Calendar, CheckCircle2, AlertTriangle, Filter, Search, Download
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../ui/cards/Card';
import { Button } from '../ui/components/Button';
import { Badge } from '../ui/feedback/Badge';
import PageHeader from '../ui/layouts/PageHeader';
import { logger } from '../utils/debug';

const DEPARTMENTS = [
    'الإدارة العامة للتحول الرقمي',
    'التخطيط والتميز المؤسسي',
    'الموارد البشرية والتدريب',
    'الشؤون المالية والإدارية',
    'مكتب معالي مدير الفرع'
];

const FONTS_SEED = [
    { id: 'font-1', name: 'الخط الديواني الرسمي', category: 'FONTS', url: 'Diwan', department: 'مكتب معالي مدير الفرع', version: 1, uploadedBy: 'يوسف العنزي', createdAt: new Date().toISOString() },
    { id: 'font-2', name: 'خط الرقعة المعياري', category: 'FONTS', url: 'Ruqah', department: 'التخطيط والتميز المؤسسي', version: 1, uploadedBy: 'يوسف العنزي', createdAt: new Date().toISOString() },
    { id: 'font-3', name: 'خط المهند الأساسي', category: 'FONTS', url: 'Al-Mohanad', department: 'الإدارة العامة للتحول الرقمي', version: 2, uploadedBy: 'يوسف العنزي', createdAt: new Date().toISOString() }
];

export default function AssetGovernance() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('LOGOS'); // LOGOS, SIGNATURES, STAMPS, FONTS, AUDIT
    const [assets, setAssets] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search and filters
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [visibilityFilter, setVisibilityFilter] = useState('');

    // Modal state for Upload / Replace
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [replacingAsset, setReplacingAsset] = useState(null); // Asset object if replacing

    // Form inputs
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetCategory, setNewAssetCategory] = useState('LOGOS');
    const [newAssetDept, setNewAssetDept] = useState(DEPARTMENTS[0]);
    const [newAssetVisibility, setNewAssetVisibility] = useState('ALL'); // ALL, CREATOR_UP, ADMIN_ONLY
    const [newAssetCrop, setNewAssetCrop] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [processingFile, setProcessingFile] = useState(false);
    const [processedResult, setProcessedResult] = useState(null);

    // Preview modal
    const [previewAsset, setPreviewAsset] = useState(null);

    // Permissions modal
    const [editingPermissionsAsset, setEditingPermissionsAsset] = useState(null);

    const fileInputRef = useRef();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            let list = await assetService.getAll();
            // Seed fonts if they do not exist
            if (!list.some(a => a.category === 'FONTS')) {
                for (const font of FONTS_SEED) {
                    await assetService.create(font);
                }
                list = await assetService.getAll();
            }
            setAssets(list);

            const allLogs = await auditService.getAll();
            const assetLogs = allLogs.filter(l => 
                l.action.includes('ASSET_') || 
                l.action.includes('SNAPSHOT_') || 
                l.action.includes('VERSION_')
            );
            setAuditLogs(assetLogs);
        } catch (e) {
            logger.error('Failed to load assets data', e);
        } finally {
            setLoading(false);
        }
    };

    // Handle drag and drop or file select
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setSelectedFile(file);
        setProcessingFile(true);
        try {
            // Apply ImageProcessor canvas pipeline (compression, resizing, circular cropping)
            const isStamp = newAssetCategory === 'STAMPS' || (replacingAsset && replacingAsset.category === 'STAMPS');
            const result = await ImageProcessor.processImage(file, {
                cropCircle: newAssetCrop || isStamp,
                maxWidth: isStamp ? 300 : 600,
                maxHeight: isStamp ? 300 : 600,
                quality: 0.82
            });
            setProcessedResult(result);
            logger.system(`Processed image: compressed from ${Math.round(result.originalSizeBytes/1024)}KB to ${Math.round(result.sizeBytes/1024)}KB`);
        } catch (err) {
            alert('فشل معالجة وضغط الصورة: ' + err.message);
            setSelectedFile(null);
        } finally {
            setProcessingFile(false);
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!processedResult && newAssetCategory !== 'FONTS') {
            alert('الرجاء اختيار ملف الصورة أولاً');
            return;
        }

        setLoading(true);
        try {
            if (replacingAsset) {
                // Replacing / Versioning Workflow
                const changes = {
                    url: processedResult.optimizedBase64,
                    sizeBytes: processedResult.sizeBytes,
                    uploadedBy: user.name,
                    createdAt: new Date().toISOString()
                };
                await assetService.update(replacingAsset.id, changes);
                await auditService.log('ASSET_REPLACE', user, `استبدال وترقية نسخة الأصل الحكومي: ${replacingAsset.name} للإصدار الجديد`, replacingAsset.id);
                alert('تم استبدال وترقية نسخة الأصل بنجاح!');
            } else {
                // Creation Workflow
                const payload = {
                    name: newAssetName || selectedFile?.name?.split('.')[0] || 'أصل حكومي غير معنون',
                    category: newAssetCategory,
                    url: newAssetCategory === 'FONTS' ? 'CustomFont' : processedResult.optimizedBase64,
                    department: newAssetDept,
                    visibility: newAssetVisibility,
                    uploadedBy: user.name,
                    sizeBytes: processedResult ? processedResult.sizeBytes : 0,
                    version: 1,
                    approved: true
                };
                const newAsset = await assetService.create(payload);
                await auditService.log('ASSET_UPLOAD', user, `رفع أصل حكومي جديد باسم: ${payload.name} ضمن فئة: ${payload.category}`, newAsset.id);
                alert('تم رفع وحفظ الأصل الفني في المستودع الحكومي بنجاح!');
            }
            
            // Clean states
            resetUploadForm();
            loadData();
        } catch (err) {
            alert('خطأ أثناء رفع وتثبيت الأصل: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetUploadForm = () => {
        setNewAssetName('');
        setSelectedFile(null);
        setProcessedResult(null);
        setReplacingAsset(null);
        setNewAssetCrop(false);
        setIsUploadModalOpen(false);
    };

    const handleDeleteAsset = async (id, name) => {
        if (!window.confirm(`هل أنت متأكد تماماً من حذف الأصل الحكومي المعتمد "${name}"؟ قد يؤثر ذلك على تصميم القوالب المرتبطة به.`)) return;
        setLoading(true);
        try {
            await assetService.delete(id);
            await auditService.log('ASSET_DELETE', user, `حذف أصل حكومي نهائياً من المستودع: ${name}`, id);
            alert('تم الحذف بنجاح');
            loadData();
        } catch (e) {
            alert('فشل الحذف: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePermissions = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const changes = {
                department: editingPermissionsAsset.department,
                visibility: editingPermissionsAsset.visibility,
                approved: editingPermissionsAsset.approved
            };
            await assetService.update(editingPermissionsAsset.id, changes);
            await auditService.log('ASSET_PERMISSIONS_UPDATE', user, `تعديل صلاحيات الوصول وعزل القسم للأصل: ${editingPermissionsAsset.name}`, editingPermissionsAsset.id);
            alert('تم تحديث الصلاحيات وعزل الأصل بنجاح!');
            setEditingPermissionsAsset(null);
            loadData();
        } catch (e) {
            alert('خطأ: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter logic
    const filteredAssets = assets.filter(a => {
        if (a.category !== activeTab && activeTab !== 'AUDIT') return false;
        
        const matchesSearch = !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = !deptFilter || a.department === deptFilter;
        const matchesVisibility = !visibilityFilter || a.visibility === visibilityFilter;

        return matchesSearch && matchesDept && matchesVisibility;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', direction: 'rtl', paddingBottom: '40px' }}>
            <PageHeader
                title="حوكمة الأصول الرسمية والمستندات"
                subtitle="المستودع الحكومي الموحد لإدارة وتأمين الأختام الرسمية والتواقيع والشعارات المعزولة بهوية بصرية فائقة الدقة"
                actions={
                    <Button 
                        variant="primary" 
                        size="md" 
                        leftIcon={Upload} 
                        onClick={() => {
                            setReplacingAsset(null);
                            setIsUploadModalOpen(true);
                        }}
                    >
                        تسجيل أصل رسمي جديد
                    </Button>
                }
            />

            {/* ── Tabs bar ── */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-default)',
                gap: '4px',
                paddingBottom: '2px',
                flexWrap: 'wrap'
            }}>
                {[
                    { id: 'LOGOS', label: 'الشعارات الرسمية', icon: FileImage },
                    { id: 'SIGNATURES', label: 'التواقيع المعتمدة', icon: UserCheck },
                    { id: 'STAMPS', label: 'الأختام الرسمية', icon: Stamp },
                    { id: 'FONTS', label: 'الخطوط الحكومية', icon: Type },
                    { id: 'AUDIT', label: 'سجل حوكمة الأصول', icon: Shield }
                ].map(tab => {
                    const TabIcon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSearchQuery('');
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 18px',
                                border: 'none',
                                background: isActive ? 'var(--color-success-bg)' : 'transparent',
                                color: isActive ? 'var(--color-primary-600)' : 'var(--text-tertiary)',
                                fontWeight: isActive ? 800 : 600,
                                fontSize: 'var(--text-body-sm)',
                                cursor: 'pointer',
                                borderBottom: isActive ? '3px solid var(--color-primary-600)' : '3px solid transparent',
                                transition: 'all var(--transition-fast)'
                            }}
                        >
                            <TabIcon size={16} />
                            {tab.label}
                            {tab.id !== 'AUDIT' && (
                                <span style={{
                                    fontSize: '10px',
                                    background: isActive ? 'var(--color-primary-600)' : 'var(--bg-muted)',
                                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    marginRight: '6px'
                                }}>
                                    {assets.filter(a => a.category === tab.id).length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Filtration Bar ── */}
            {activeTab !== 'AUDIT' && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    padding: '14px',
                    borderRadius: 'var(--radius-lg)'
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="البحث بالاسم أو المنشئ..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 10px 8px 30px',
                                border: '1.5px solid var(--border-strong)',
                                borderRadius: '8px',
                                fontSize: 'var(--text-label)',
                                fontWeight: 600,
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                        <select
                            value={deptFilter}
                            onChange={e => setDeptFilter(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '8px 10px',
                                border: '1.5px solid var(--border-strong)',
                                borderRadius: '8px',
                                fontSize: 'var(--text-label)',
                                fontWeight: 600
                            }}
                        >
                            <option value="">عزل القسم: جميع الأقسام</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Key size={14} style={{ color: 'var(--text-muted)' }} />
                        <select
                            value={visibilityFilter}
                            onChange={e => setVisibilityFilter(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '8px 10px',
                                border: '1.5px solid var(--border-strong)',
                                borderRadius: '8px',
                                fontSize: 'var(--text-label)',
                                fontWeight: 600
                            }}
                        >
                            <option value="">الصلاحية: جميع المستويات</option>
                            <option value="ALL">متاح لجميع الموظفين</option>
                            <option value="CREATOR_UP">المنشئون والإدارة العليا</option>
                            <option value="ADMIN_ONLY">المدير العام والمدققون</option>
                        </select>
                    </div>
                </div>
            )}

            {/* ── Main Tab Content ── */}
            {activeTab === 'AUDIT' ? (
                /* ── AUDIT LOGS DISPLAY ── */
                <Card>
                    <CardHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shield size={16} style={{ color: 'var(--color-primary-600)' }} />
                            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800 }}>
                                سجل التدقيق والمراقبة للأصول الرسمية
                            </h3>
                        </div>
                    </CardHeader>
                    <CardContent style={{ padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                                        <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>التاريخ والوقت</th>
                                        <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>الإجراء الأمني</th>
                                        <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>الموظف المسؤول</th>
                                        <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>تفاصيل التدقيق الأمني</th>
                                        <th style={{ padding: '12px 16px', fontSize: 'var(--text-micro)', fontWeight: 800, color: 'var(--text-muted)' }}>معرف الأصل</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
                                                لا توجد عمليات مسجلة في الأصول حتى الآن
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map(log => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                <td style={{ padding: '12px 16px', fontSize: 'var(--text-caption)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                    {new Date(log.timestamp).toLocaleString('ar-SA')}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <Badge variant={log.action === 'ASSET_UPLOAD' ? 'success' : log.action === 'ASSET_REPLACE' ? 'warning' : 'info'}>
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                    {log.userName} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({log.userEmail})</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 'var(--text-caption)', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                    {log.details}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: 'var(--text-micro)' }}>
                                                    <code style={{ background: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px' }}>{log.targetId || '—'}</code>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* ── CARDS FOR LOGOS, SIGNATURES, STAMPS ── */
                <div>
                    {filteredAssets.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            background: 'var(--bg-surface)',
                            border: '1px dashed var(--border-strong)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <AlertTriangle size={36} style={{ color: 'var(--text-muted)' }} />
                            <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 800 }}>لا توجد أصول رسمية مسجلة</h3>
                            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', maxWidth: '400px' }}>
                                قم بتسجيل الأصول والموافقة عليها وتعيين عزل الأقسام لتتمكن من استخدامها في النماذج وقوالب التوليد.
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '16px'
                        }}>
                            {filteredAssets.map(asset => (
                                <Card key={asset.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    {/* Asset header preview */}
                                    <div style={{
                                        height: '140px',
                                        background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderBottom: '1px solid var(--border-default)',
                                        padding: '16px',
                                        position: 'relative'
                                    }}>
                                        {asset.category === 'FONTS' ? (
                                            <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'sans-serif', color: 'var(--text-primary)' }}>
                                                Aa الخط المعياري
                                            </span>
                                        ) : (
                                            <img
                                                src={asset.url}
                                                alt={asset.name}
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                            />
                                        )}

                                        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                                            <Badge variant={asset.approved ? 'success' : 'danger'}>
                                                {asset.approved ? 'معتمد للاستخدام' : 'معلق الموافقة'}
                                            </Badge>
                                        </div>

                                        <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                                            <Badge variant="warning">
                                                إصدار v{asset.version}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Asset Information */}
                                    <CardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                                        <h4 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                            {asset.name}
                                        </h4>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--text-caption)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                                <span>القسم المعزول:</span>
                                                <strong style={{ color: 'var(--color-primary-600)' }}>{asset.department}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                                <span>الصلاحية الأمنية:</span>
                                                <strong style={{ color: 'var(--text-primary)' }}>
                                                    {asset.visibility === 'ALL' ? 'متاح للجميع' : asset.visibility === 'CREATOR_UP' ? 'منشئ فما فوق' : 'المسؤولين فقط'}
                                                </strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                                <span>بواسطة الموظف:</span>
                                                <span>{asset.uploadedBy}</span>
                                            </div>
                                            {asset.sizeBytes > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                                    <span>الحجم بعد الضغط:</span>
                                                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{Math.round(asset.sizeBytes / 1024)} KB</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>

                                    {/* Actions */}
                                    <CardFooter style={{ padding: '12px 16px', background: 'var(--bg-subtle)', display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-default)' }}>
                                        <Button 
                                            size="xs" 
                                            variant="outline" 
                                            leftIcon={Eye}
                                            onClick={() => setPreviewAsset(asset)}
                                        >
                                            عرض
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            leftIcon={RefreshCw}
                                            onClick={() => {
                                                setReplacingAsset(asset);
                                                setIsUploadModalOpen(true);
                                            }}
                                        >
                                            ترقية/استبدال
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            leftIcon={Key}
                                            onClick={() => setEditingPermissionsAsset(asset)}
                                        >
                                            صلاحيات
                                        </Button>
                                        <Button
                                            size="xs"
                                            variant="outline"
                                            style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                                            leftIcon={Trash2}
                                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                                        >
                                            حذف
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── MODAL: UPLOAD / REPLACE OFFICIAL ASSET ── */}
            {isUploadModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <Card style={{ width: '100%', maxWidth: '520px', margin: '16px' }}>
                        <CardHeader>
                            <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 900 }}>
                                {replacingAsset ? `ترقية وترسيم نسخة جديدة: ${replacingAsset.name}` : 'تسجيل أصل أمني رسمي جديد'}
                            </h3>
                        </CardHeader>
                        <form onSubmit={handleUploadSubmit}>
                            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {!replacingAsset && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>اسم الأصل الفني</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="مثال: ختم فرع وزارة الصحة بالحدود الشمالية"
                                                value={newAssetName}
                                                onChange={e => setNewAssetName(e.target.value)}
                                                style={{ padding: '10px', border: '1.5px solid var(--border-default)', borderRadius: '8px', outline: 'none' }}
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>التصنيف المعياري</label>
                                                <select
                                                    value={newAssetCategory}
                                                    onChange={e => setNewAssetCategory(e.target.value)}
                                                    style={{ padding: '10px', border: '1.5px solid var(--border-default)', borderRadius: '8px' }}
                                                >
                                                    <option value="LOGOS">شعارات رسمية (LOGOS)</option>
                                                    <option value="SIGNATURES">تواقيع معتمدة (SIGNATURES)</option>
                                                    <option value="STAMPS">أختام رسمية (STAMPS)</option>
                                                    <option value="FONTS">خطوط حكومية (FONTS)</option>
                                                </select>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>القسم المالك (عزل المعاملات)</label>
                                                <select
                                                    value={newAssetDept}
                                                    onChange={e => setNewAssetDept(e.target.value)}
                                                    style={{ padding: '10px', border: '1.5px solid var(--border-default)', borderRadius: '8px' }}
                                                >
                                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>صلاحية الوصول الأمني</label>
                                            <select
                                                value={newAssetVisibility}
                                                onChange={e => setNewAssetVisibility(e.target.value)}
                                                style={{ padding: '10px', border: '1.5px solid var(--border-default)', borderRadius: '8px' }}
                                            >
                                                <option value="ALL">متاح للاستخدام لجميع الموظفين الموثقين</option>
                                                <option value="CREATOR_UP">منشئ التراخيص والمحاضر فما فوق</option>
                                                <option value="ADMIN_ONLY">المدير العام والمدققون فقط</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* Image Cropping & Compression zone */}
                                {newAssetCategory !== 'FONTS' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>تحميل الملف الفني ومعالجته</label>
                                        
                                        {!selectedFile ? (
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{
                                                    border: '2px dashed var(--border-strong)', borderRadius: '12px',
                                                    padding: '30px', textAlign: 'center', cursor: 'pointer',
                                                    background: 'var(--bg-subtle)', display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', gap: '10px'
                                                }}
                                            >
                                                <Upload size={32} style={{ color: 'var(--text-muted)' }} />
                                                <p style={{ fontSize: 'var(--text-caption)', fontWeight: 600 }}>اسحب الملف هنا أو اضغط للاختيار</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG شفافة للأختام والتواقيع، JPG أو PNG للشعارات</p>
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: '12px', border: '1px solid var(--border-default)',
                                                borderRadius: '10px', background: 'var(--bg-surface)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '70px', height: '70px',
                                                        background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px',
                                                        borderRadius: '6px', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border-default)'
                                                    }}>
                                                        {processedResult ? (
                                                            <img src={processedResult.optimizedBase64} alt="Optimized" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '10px' }}>جاري التحليل...</span>
                                                        )}
                                                    </div>

                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: 'var(--text-label)', fontWeight: 800 }}>{selectedFile.name}</span>
                                                        {processedResult && (
                                                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                                                                <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>السابق: {Math.round(processedResult.originalSizeBytes/1024)}KB</span>
                                                                <span style={{ color: 'var(--color-success)', fontWeight: 800 }}>المضغوط: {Math.round(processedResult.sizeBytes/1024)}KB</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <Button size="xs" variant="outline" onClick={() => setSelectedFile(null)}>حذف</Button>
                                                </div>

                                                {!replacingAsset && (
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: 'var(--text-caption)', fontWeight: 600, cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={newAssetCrop}
                                                            onChange={e => {
                                                                setNewAssetCrop(e.target.checked);
                                                                // Re-process image with cropping
                                                                handleFileSelect({ target: { files: [selectedFile] } });
                                                            }}
                                                        />
                                                        قص وتأطير أوتوماتيكي دائري (موصى به للأختام والتواقيع)
                                                    </label>
                                                )}
                                            </div>
                                        )}

                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/png,image/jpeg,image/jpg"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px' }}>
                                <Button type="button" variant="outline" onClick={resetUploadForm}>إلغاء</Button>
                                <Button type="submit" variant="primary" isLoading={processingFile} disabled={!processedResult && newAssetCategory !== 'FONTS'}>
                                    {replacingAsset ? 'ترقية وحفظ النسخة' : 'تسجيل الأصول والموافقة'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {/* ── DIALOG: EDIT PERMISSIONS ── */}
            {editingPermissionsAsset && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <Card style={{ width: '100%', maxWidth: '440px', margin: '16px' }}>
                        <CardHeader>
                            <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 900 }}>الصلاحيات وعزل المستندات</h3>
                        </CardHeader>
                        <form onSubmit={handleUpdatePermissions}>
                            <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>عزل القسم المالك</label>
                                    <select
                                        value={editingPermissionsAsset.department}
                                        onChange={e => setEditingPermissionsAsset({ ...editingPermissionsAsset, department: e.target.value })}
                                        style={{ padding: '10px', border: '1.5px solid var(--border-default)', borderRadius: '8px' }}
                                    >
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>صلاحية الاستخدام</label>
                                    <select
                                        value={editingPermissionsAsset.visibility}
                                        onChange={e => setEditingPermissionsAsset({ ...editingPermissionsAsset, visibility: e.target.value })}
                                        style={{ padding: '10px', border: '1.5px solid var(--border-default)', borderRadius: '8px' }}
                                    >
                                        <option value="ALL">متاح للجميع</option>
                                        <option value="CREATOR_UP">المنشئون فما فوق</option>
                                        <option value="ADMIN_ONLY">المدير العام والمدققون فقط</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ fontSize: 'var(--text-label)', fontWeight: 700 }}>حالة الاعتماد القانوني</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={editingPermissionsAsset.approved !== false}
                                            onChange={e => setEditingPermissionsAsset({ ...editingPermissionsAsset, approved: e.target.checked })}
                                        />
                                        <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700 }}>
                                            الترسيم والاعتماد للاستخدام الفوري بالقوالب
                                        </span>
                                    </label>
                                </div>
                            </CardContent>
                            <CardFooter style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px' }}>
                                <Button type="button" variant="outline" onClick={() => setEditingPermissionsAsset(null)}>إلغاء</Button>
                                <Button type="submit" variant="primary">تطبيق وتحديث القواعد</Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            )}

            {/* ── DIALOG: FULL PREVIEW ── */}
            {previewAsset && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => setPreviewAsset(null)}>
                    <Card style={{ width: '100%', maxWidth: '600px', margin: '16px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <CardHeader>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 900 }}>{previewAsset.name}</h3>
                                <Badge variant="warning">نسخة v{previewAsset.version}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
                            minHeight: '260px', padding: '30px'
                        }}>
                            {previewAsset.category === 'FONTS' ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>
                                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800 }}>حروف الأبجدية المعيارية</h2>
                                    <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                        أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن هـ و ي
                                    </p>
                                </div>
                            ) : (
                                <img src={previewAsset.url} alt={previewAsset.name} style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                            )}
                        </CardContent>
                        <CardFooter style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-subtle)' }}>
                            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                                تم الرفع بواسطة: {previewAsset.uploadedBy} · {new Date(previewAsset.createdAt).toLocaleDateString('ar-SA')}
                            </div>
                            <Button variant="outline" onClick={() => setPreviewAsset(null)}>إغلاق النافذة</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
