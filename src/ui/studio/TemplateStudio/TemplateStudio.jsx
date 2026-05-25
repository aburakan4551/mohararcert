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

    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            navigate('/dashboard');
            return;
        }
        loadTemplates();
    }, [user, navigate]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await templateService.getAll();
            setTemplates(data || []);
        } catch (e) {
            console.error("Failed to load templates from dbService:", e);
        } finally {
            setLoading(false);
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

    const handleCreateNew = async () => {
        const name = prompt("أدخل اسم القالب الجديد:");
        if (!name) return;
        
        try {
            const newTpl = {
                name: name,
                backgroundUrl: '',
                status: 'DRAFT',
                fields: []
            };
            const created = await templateService.create(newTpl);
            if (created) {
                // Navigate directly to the studio mapper
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
                        </div>
                        <CardContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <h4 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 800, color: 'var(--text-primary)' }}>{tpl.name}</h4>
                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>{(tpl.fields || []).length} حقول معرفة (Mapped Fields)</span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Button size="sm" variant="outline" style={{ flex: 1 }} leftIcon={Settings2} onClick={() => navigate(`/studio/mapper/${tpl.id}`)}>
                                    تعديل خصائص القالب
                                </Button>
                                <Button size="sm" variant="outline" style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(tpl.id)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
