/**
 * 🎨 TemplateStudio.jsx
 * SUPER_ADMIN interface to manage Official Templates.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Image as ImageIcon, Settings2, Trash2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { dbService } from '../../../services/db';
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

    const loadTemplates = () => {
        try {
            // Mock fetching templates from localStorage for the new structure
            const stored = localStorage.getItem('official_templates');
            if (stored) {
                setTemplates(JSON.parse(stored));
            } else {
                // Seed default
                const defaultTpl = [{
                    id: 'tpl_default_1',
                    name: 'قالب شكر وتقدير القياسي',
                    backgroundUrl: '/certificate-bg.png', // Assuming public folder asset
                    status: 'OFFICIAL',
                    fields: [
                        { fieldId: 'recipient_name', x: 50, y: 45, fontSize: 42, color: '#000000', fontFamily: 'Cairo', align: 'center' },
                        { fieldId: 'certificate_title', x: 50, y: 25, fontSize: 34, color: '#0d1f3c', fontFamily: 'Cairo', align: 'center', fontWeight: '900' },
                        { fieldId: 'reason', x: 50, y: 55, fontSize: 24, color: '#333333', fontFamily: 'Amiri', align: 'center' },
                        { fieldId: 'date', x: 25, y: 75, fontSize: 16, color: '#666666', fontFamily: 'Cairo', align: 'center' }
                    ]
                }];
                localStorage.setItem('official_templates', JSON.stringify(defaultTpl));
                setTemplates(defaultTpl);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا القالب؟ سيؤثر على استخراج الشهادات القادمة.')) return;
        const updated = templates.filter(t => t.id !== id);
        localStorage.setItem('official_templates', JSON.stringify(updated));
        setTemplates(updated);
    };

    const handleCreateNew = () => {
        const name = prompt("أدخل اسم القالب الجديد:");
        if (!name) return;
        
        const newTpl = {
            id: `tpl_${Date.now()}`,
            name: name,
            backgroundUrl: '',
            status: 'DRAFT',
            fields: []
        };
        const updated = [...templates, newTpl];
        localStorage.setItem('official_templates', JSON.stringify(updated));
        setTemplates(updated);
        
        // Navigate to mapper
        navigate(`/studio/mapper/${newTpl.id}`);
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
                                <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)' }}>{tpl.fields.length} حقول معرفة (Mapped Fields)</span>
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
