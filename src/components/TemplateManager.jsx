import React, { useRef, useState } from 'react'
import { useTemplates } from '../hooks/useTemplates'
import { pdfPageToDataURL, readFileAsArrayBuffer, readFileAsDataURL } from '../utils/pdfToImage'

/**
 * TemplateManager – displayed in Settings page under its own tab.
 * Allows upload (PDF or PNG/JPG), naming, default selection, and deletion.
 */
export default function TemplateManager({ onSelectForEdit }) {
    const {
        templates,
        defaultTemplate,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        setDefault,
    } = useTemplates()

    const fileRef = useRef()
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState(null)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [previewId, setPreviewId] = useState(null)

    /* ── Upload handler ── */
    const handleFile = async (file) => {
        if (!file) return
        setUploadError(null)
        const isPDF = file.type === 'application/pdf'
        const isImage = file.type.startsWith('image/')
        if (!isPDF && !isImage) {
            setUploadError('يرجى رفع ملف PDF أو صورة PNG/JPG')
            return
        }

        setUploading(true)
        try {
            let dataURL
            if (isPDF) {
                const buf = await readFileAsArrayBuffer(file)
                dataURL = await pdfPageToDataURL(buf, 2.5)
            } else {
                dataURL = await readFileAsDataURL(file)
            }

            const name = newName.trim() || file.name.replace(/\.[^.]+$/, '')
            addTemplate(name, dataURL, isPDF ? 'pdf' : 'image')
            setNewName('')
            if (fileRef.current) fileRef.current.value = ''
        } catch (err) {
            setUploadError('خطأ في معالجة الملف: ' + err.message)
        }
        setUploading(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        handleFile(e.dataTransfer.files[0])
    }

    /* ── Rename ── */
    const startEdit = (tpl) => {
        setEditingId(tpl.id)
        setEditName(tpl.name)
    }
    const saveEdit = (id) => {
        if (editName.trim()) updateTemplate(id, { name: editName.trim() })
        setEditingId(null)
    }

    const previewedTpl = previewId ? templates.find(t => t.id === previewId) : null

    return (
        <div>
            {/* ── Upload section ── */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-title">➕ إضافة نموذج جديد</div>

                <div className="form-group">
                    <label className="form-label">اسم النموذج</label>
                    <input
                        className="form-control"
                        placeholder="مثال: النموذج الرسمي 2025"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                </div>

                <div
                    className="upload-zone"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    {uploading ? (
                        <>
                            <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
                            <p>جاري تحويل الملف إلى صورة...</p>
                        </>
                    ) : (
                        <>
                            <span className="upload-icon">📄</span>
                            <p style={{ fontWeight: 600 }}>ارفع قالب PDF أو صورة PNG/JPG</p>
                            <p style={{ fontSize: '0.82rem', color: '#aaa', marginTop: '6px' }}>
                                A4 أفقي — سيتم تحويل الصفحة الأولى من PDF إلى صورة تلقائياً
                            </p>
                        </>
                    )}
                </div>

                <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={e => handleFile(e.target.files[0])}
                    style={{ display: 'none' }}
                />

                {uploadError && (
                    <div className="alert alert-warning" style={{ marginTop: '10px' }}>⚠️ {uploadError}</div>
                )}
            </div>

            {/* ── Templates list ── */}
            {templates.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📂</div>
                    <h3>لا توجد نماذج بعد</h3>
                    <p style={{ marginTop: '6px', fontSize: '0.88rem' }}>
                        ارفع ملف PDF أو صورة لإنشاء أول نموذج
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                    {templates.map(tpl => (
                        <div key={tpl.id} style={{
                            border: `2px solid ${tpl.isDefault ? 'var(--gold)' : 'var(--border)'}`,
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: 'white',
                            boxShadow: tpl.isDefault ? '0 4px 20px rgba(201,162,39,0.2)' : '0 2px 8px rgba(0,0,0,0.06)',
                            position: 'relative',
                            transition: 'all 0.2s'
                        }}>
                            {/* Default badge */}
                            {tpl.isDefault && (
                                <div style={{
                                    position: 'absolute', top: '10px', right: '10px',
                                    background: 'var(--gold)', color: 'white',
                                    fontSize: '0.72rem', fontWeight: 700,
                                    padding: '3px 10px', borderRadius: '20px',
                                    zIndex: 2
                                }}>
                                    ✓ الافتراضي
                                </div>
                            )}

                            {/* Thumbnail */}
                            <div
                                style={{
                                    aspectRatio: '297/210',
                                    overflow: 'hidden',
                                    background: '#eee',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                                onClick={() => setPreviewId(tpl.id)}
                            >
                                <img
                                    src={tpl.image}
                                    alt={tpl.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                />
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0, transition: 'all 0.2s',
                                    backdropFilter: 'blur(2px)',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; e.currentTarget.style.opacity = '1' }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0' }}
                                >
                                    <span style={{ color: 'white', fontSize: '1.5rem' }}>🔍 معاينة</span>
                                </div>
                            </div>

                            {/* Info + actions */}
                            <div style={{ padding: '12px' }}>
                                {/* Name */}
                                {editingId === tpl.id ? (
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                        <input
                                            className="form-control"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && saveEdit(tpl.id)}
                                            autoFocus
                                            style={{ flex: 1, fontSize: '0.85rem', padding: '6px 10px' }}
                                        />
                                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(tpl.id)}>✓</button>
                                        <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>✕</button>
                                    </div>
                                ) : (
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px', color: 'var(--primary)' }}>
                                        {tpl.name}
                                    </div>
                                )}

                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                    {tpl.type === 'pdf' ? '📄 PDF' : '🖼️ صورة'} ·{' '}
                                    {new Date(tpl.createdAt).toLocaleDateString('ar-SA')}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {!tpl.isDefault && (
                                        <button className="btn btn-gold btn-sm" onClick={() => setDefault(tpl.id)}
                                            style={{ flex: 1 }}>
                                            ⭐ افتراضي
                                        </button>
                                    )}
                                    {onSelectForEdit && (
                                        <button className="btn btn-primary btn-sm" onClick={() => onSelectForEdit(tpl)}
                                            style={{ flex: 1 }}>
                                            📍 ضبط المواضع
                                        </button>
                                    )}
                                    <button className="btn btn-outline btn-sm" onClick={() => startEdit(tpl)}>
                                        ✏️
                                    </button>
                                    {deleteConfirm === tpl.id ? (
                                        <>
                                            <button className="btn btn-danger btn-sm" onClick={() => { deleteTemplate(tpl.id); setDeleteConfirm(null) }}>تأكيد</button>
                                            <button className="btn btn-outline btn-sm" onClick={() => setDeleteConfirm(null)}>إلغاء</button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => setDeleteConfirm(tpl.id)}
                                            disabled={tpl.isDefault && templates.length === 1}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Fullscreen Preview Modal ── */}
            {previewedTpl && (
                <div className="modal-overlay" onClick={() => setPreviewId(null)}>
                    <div
                        style={{
                            maxWidth: '90vw', maxHeight: '90vh',
                            borderRadius: '12px', overflow: 'hidden',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            position: 'relative'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="modal-close"
                            onClick={() => setPreviewId(null)}
                            style={{ zIndex: 10 }}
                        >✕</button>
                        <div style={{ background: '#333', padding: '8px', textAlign: 'center', color: 'white', fontSize: '0.85rem' }}>
                            {previewedTpl.name}
                        </div>
                        <img
                            src={previewedTpl.image}
                            alt={previewedTpl.name}
                            style={{ maxWidth: '85vw', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
