import React, { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

export default function Registry() {
    const [registry, setRegistry] = useLocalStorage('certificateRegistry', [])
    const [search, setSearch] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

    const filtered = registry.filter(cert => {
        const q = search.toLowerCase()
        const matchSearch = !q || cert.serial?.toLowerCase().includes(q) ||
            cert.name?.includes(q) || cert.event?.includes(q)
        const matchDate = !filterDate || cert.date?.includes(filterDate) ||
            new Date(cert.createdAt).toLocaleDateString('ar-SA').includes(filterDate)
        return matchSearch && matchDate
    }).reverse()

    const handleDelete = (serial) => {
        setRegistry(prev => prev.filter(c => c.serial !== serial))
        setShowDeleteConfirm(null)
    }

    const handleClearAll = () => {
        if (window.confirm('هل أنت متأكد من حذف جميع الشهادات من السجل؟')) {
            setRegistry([])
        }
    }

    const handleExportCSV = () => {
        const headers = ['الرقم التسلسلي', 'اسم المستفيد', 'المناسبة', 'التاريخ', 'تاريخ الإصدار']
        const rows = registry.map(c => [
            c.serial, c.name, c.event, c.date,
            new Date(c.createdAt).toLocaleDateString('ar-SA')
        ])
        const csvContent = [headers, ...rows]
            .map(r => r.map(v => `"${v || ''}"`).join(','))
            .join('\n')
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'سجل-الشهادات.csv'
        a.click()
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                        📋 سجل الشهادات الصادرة
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        إجمالي: {registry.length} شهادة مسجلة
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-success btn-sm" onClick={handleExportCSV} disabled={registry.length === 0}>
                        📥 تصدير CSV
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={handleClearAll} disabled={registry.length === 0}>
                        🗑️ مسح الكل
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">🔍 البحث (بالرقم أو الاسم أو المناسبة)</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="ابحث هنا..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">📅 تصفية بالتاريخ</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="مثال: 2025"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid-3" style={{ marginBottom: '20px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📜</div>
                    <div className="stat-info">
                        <h3>{registry.length}</h3>
                        <p>إجمالي الشهادات</p>
                    </div>
                </div>
                <div className="stat-card gold">
                    <div className="stat-icon" style={{ background: 'rgba(201,162,39,0.1)' }}>🔍</div>
                    <div className="stat-info">
                        <h3>{filtered.length}</h3>
                        <p>نتائج البحث</p>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon" style={{ background: 'rgba(45,125,70,0.1)' }}>📅</div>
                    <div className="stat-info">
                        <h3>{registry.filter(c => {
                            const d = new Date(c.createdAt)
                            const now = new Date()
                            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                        }).length}</h3>
                        <p>هذا الشهر</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card">
                {registry.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                        <h3 style={{ marginBottom: '8px' }}>السجل فارغ</h3>
                        <p>لم يتم إصدار أي شهادات بعد. ابدأ بإنشاء شهادة من صفحة "إنشاء شهادة".</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                        <p>لا توجد نتائج مطابقة للبحث</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>الرقم التسلسلي</th>
                                    <th>اسم المستفيد</th>
                                    <th>المناسبة</th>
                                    <th>التاريخ</th>
                                    <th>تاريخ الإصدار</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((cert, i) => (
                                    <tr key={cert.serial + i}>
                                        <td style={{ color: 'var(--text-muted)' }}>{filtered.length - i}</td>
                                        <td>
                                            <span className="badge badge-primary" style={{ fontFamily: 'monospace' }}>
                                                {cert.serial}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{cert.name}</td>
                                        <td>{cert.event}</td>
                                        <td>{cert.date}</td>
                                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                            {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('ar-SA') : '-'}
                                        </td>
                                        <td>
                                            {showDeleteConfirm === cert.serial ? (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn btn-danger btn-sm"
                                                        onClick={() => handleDelete(cert.serial)}>تأكيد</button>
                                                    <button className="btn btn-outline btn-sm"
                                                        onClick={() => setShowDeleteConfirm(null)}>إلغاء</button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-danger btn-sm"
                                                    onClick={() => setShowDeleteConfirm(cert.serial)}>
                                                    🗑️
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
