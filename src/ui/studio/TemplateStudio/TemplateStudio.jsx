/**
 * 🎨 TemplateStudio.jsx
 * SUPER_ADMIN interface to manage Official Templates.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Settings2, Trash2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { dbService, templateService } from '../../../services/db';
import { Card, CardHeader, CardContent } from '../../cards/Card';
import { Button } from '../../components/Button';
import PageHeader from '../../layouts/PageHeader';

export default function TemplateStudio() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateOrientation, setNewTemplateOrientation] = useState('landscape');

    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            navigate('/dashboard');
            return;
        }
        loadTemplates();
    }, [user, navigate]);

    const sortOfficialDefaultFirst = (items) => {
        return [...items].sort((a, b) => {
            if (a.isOfficial && !b.isOfficial) return -1;
            if (!a.isOfficial && b.isOfficial) return 1;
            return 0;
        });
    };

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await templateService.getAll();
            setTemplates(sortOfficialDefaultFirst(data || []));
        } catch (e) {
            console.error("Failed to load templates from dbService:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSetOfficial = async (id, tpl) => {
        if (tpl.status !== 'OFFICIAL') {
            return alert('يمكن فقط تعيين قالب معتمد رسمي كقالب افتراضي. الرجاء اعتماد القالب أولاً.');
        }

        try {
            await templateService.update(id, { isOfficial: true });
            await loadTemplates();
        } catch (e) {
            alert('فشل تعيين القالب الرسمي: ' + e.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا القالب؟ سيؤثر على استخراج الشهادات القادمة.')) return;
        try {
            await templateService.delete(id);
            await loadTemplates();
        } catch (e) {
            alert("فشل حذف القالب: " + e.message);
        }
    };

    const handleCreateNew = () => {
        setNewTemplateName('');
        setNewTemplateOrientation('landscape');
        setShowCreateModal(true);
    };

    const handleConfirmCreate = async () => {
        if (!newTemplateName.trim()) return alert('الرجاء إدخال اسم القالب');
        
        try {
            const newTpl = {
                name: newTemplateName,
                backgroundUrl: '',
                background: '',
                orientation: newTemplateOrientation,
                status: 'DRAFT',
                fields: []
            };
            const created = await templateService.create(newTpl);
            if (created) {
                setShowCreateModal(false);
                navigate(`/studio/mapper/${created.id}`);
            }
        } catch (e) {
            alert("فشل إنشاء القالب: " + e.message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <PageHeader
                title="إدارة القوالب المؤسسية (Template Studio)"
                subtitle="إدارة وتحديث التصاميم الثابتة المعتمدة للشهادات. هذه القوالب سيستخدمها المُنشئون لاحقاً."
                actions={
                    <Button variant="primary" onClick={handleCreateNew} leftIcon={Plus}>
                        رفع وإعداد قالب جديد
                    </Button>
                }
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {templates.map(tpl => (
                    <Card key={tpl.id}>
                        <div style={{
                            width: '100%',
                            aspectRatio: '1.414 / 1', // A4 aspect ratio (Landscape)
                            background: 'var(--bg-muted)',
                            position: 'relative',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderBottom: '1px solid var(--border-default)',
                            overflow: 'hidden'
                        }}>
                            {tpl.backgroundUrl ? (
                                <img src={tpl.backgroundUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'fill' }} />
                            ) : (
                                <ImageIcon size={48} style={{ color: 'var(--text-disabled)' }} />
                            )}
                            
                            {tpl.status === 'OFFICIAL' && (
                                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(15,169,88,0.9)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <ShieldCheck size={12} /> قالب معتمد رسمي
                                </div>
                            )}
                            {tpl.isOfficial && (
                                <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(37, 99, 235, 0.95)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <ShieldCheck size={12} /> القالب الرسمي
                                </div>
                            )}
                        </div>
                        <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <h4 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>{tpl.name}</h4>
                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>{(tpl.fields || []).length} حقول معرفة (Mapped Fields)</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        size="sm"
                                        variant={tpl.isOfficial ? 'secondary' : 'outline'}
                                        style={{ flex: 1, color: tpl.isOfficial ? 'var(--color-success)' : undefined }}
                                        leftIcon={ShieldCheck}
                                        onClick={() => handleSetOfficial(tpl.id, tpl)}
                                        disabled={tpl.isOfficial}
                                    >
                                        {tpl.isOfficial ? 'القالب الرسمي' : 'تعيين كقالب رسمي'}
                                    </Button>
                                    <Button size="sm" variant="outline" style={{ flex: 1 }} leftIcon={Settings2} onClick={() => navigate(`/studio/mapper/${tpl.id}`)}>
                                        تعديل خصائص القالب
                                    </Button>
                                </div>
                                <Button size="sm" variant="outline" style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(tpl.id)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── CREATE NEW TEMPLATE MODAL ─── */}
            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Cairo' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: 'var(--shadow-overlay)' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: 'var(--text-primary)', textAlign: 'right' }}>إنشاء قالب جديد</h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>اسم القالب:</label>
                            <input 
                                type="text"
                                value={newTemplateName} 
                                onChange={e => setNewTemplateName(e.target.value)} 
                                placeholder="مثال: شهادة شكر وتقدير الموظفين"
                                style={{ background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '8px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', direction: 'rtl' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
                            <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)' }}>اتجاه الصفحة (A4 Dimensions):</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div 
                                    onClick={() => setNewTemplateOrientation('landscape')}
                                    style={{
                                        border: newTemplateOrientation === 'landscape' ? '2px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                                        background: newTemplateOrientation === 'landscape' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-subtle)',
                                        borderRadius: '10px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '40px', height: '28px', border: '2px solid var(--text-tertiary)', borderRadius: '4px', background: 'rgba(0,0,0,0.02)' }} />
                                    <span style={{ fontSize: '11px', fontWeight: 900, color: newTemplateOrientation === 'landscape' ? 'var(--color-primary-500)' : 'var(--text-primary)' }}>أفقي (Landscape)</span>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>297mm x 210mm</span>
                                </div>

                                <div 
                                    onClick={() => setNewTemplateOrientation('portrait')}
                                    style={{
                                        border: newTemplateOrientation === 'portrait' ? '2px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                                        background: newTemplateOrientation === 'portrait' ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-subtle)',
                                        borderRadius: '10px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '28px', height: '40px', border: '2px solid var(--text-tertiary)', borderRadius: '4px', background: 'rgba(0,0,0,0.02)' }} />
                                    <span style={{ fontSize: '11px', fontWeight: 900, color: newTemplateOrientation === 'portrait' ? 'var(--color-primary-500)' : 'var(--text-primary)' }}>عمودي (Portrait)</span>
                                    <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>210mm x 297mm</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button 
                                onClick={handleConfirmCreate} 
                                style={{ flex: 1, padding: '10px', background: 'var(--color-primary-500)', color: 'white', fontSize: '12px', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                إنشاء وتصميم
                            </button>
                            <button 
                                onClick={() => setShowCreateModal(false)} 
                                style={{ flex: 1, padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, borderRadius: '8px', cursor: 'pointer' }}
                            >
                                إلغاء الأمر
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
