import React from 'react'
import { Link } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useSerial } from '../hooks/useSerial'

export default function Home() {
    const [registry] = useLocalStorage('certificateRegistry', [])
    const { serialSettings } = useSerial()

    const today = new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' })
    const thisMonth = registry.filter(c => {
        const d = new Date(c.createdAt)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return (
        <div>
            {/* Welcome Banner */}
            <div style={{
                background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, var(--primary-light) 100%)',
                borderRadius: '16px',
                padding: '32px 36px',
                marginBottom: '28px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '6px' }}>{today}</div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
                        🏛️ منصة شهادات الشكر والتقدير
                    </h2>
                    <p style={{ opacity: 0.85, fontSize: '1rem', maxWidth: '500px', lineHeight: 1.6 }}>
                        نظام متكامل لإصدار شهادات احترافية مع التوقيع والختم والرقم التسلسلي والتصدير بجودة عالية
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                        <Link to="/create" className="btn btn-gold">
                            📜 إنشاء شهادة جديدة
                        </Link>
                        <Link to="/batch" className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}>
                            📊 استيراد من Excel
                        </Link>
                    </div>
                </div>
                {/* Decorative background */}
                <div style={{
                    position: 'absolute', top: '-20px', left: '-20px',
                    width: '200px', height: '200px',
                    borderRadius: '50%',
                    border: '40px solid rgba(255,255,255,0.04)'
                }} />
                <div style={{
                    position: 'absolute', bottom: '-40px', left: '100px',
                    width: '160px', height: '160px',
                    borderRadius: '50%',
                    border: '30px solid rgba(255,255,255,0.03)'
                }} />
            </div>

            {/* Stats */}
            <div className="grid-3" style={{ marginBottom: '28px' }}>
                <div className="stat-card">
                    <div className="stat-icon">📜</div>
                    <div className="stat-info">
                        <h3>{registry.length}</h3>
                        <p>إجمالي الشهادات الصادرة</p>
                    </div>
                </div>
                <div className="stat-card gold">
                    <div className="stat-icon" style={{ background: 'rgba(201,162,39,0.1)' }}>📅</div>
                    <div className="stat-info">
                        <h3>{thisMonth}</h3>
                        <p>شهادات هذا الشهر</p>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon" style={{ background: 'rgba(45,125,70,0.1)' }}>🔢</div>
                    <div className="stat-info">
                        <h3 style={{ fontSize: '1.1rem' }}>{serialSettings.currentNumber}</h3>
                        <p>الرقم التسلسلي التالي</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid-2" style={{ marginBottom: '28px' }}>
                <div className="card">
                    <div className="card-title">⚡ البدء السريع</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Link to="/create" className="btn btn-primary btn-block">
                            📜 إنشاء شهادة واحدة
                        </Link>
                        <Link to="/batch" className="btn btn-gold btn-block">
                            📊 إنشاء دفعة من Excel
                        </Link>
                        <Link to="/settings" className="btn btn-outline btn-block">
                            ⚙️ إعداد البيانات والتوقيعات
                        </Link>
                        <Link to="/registry" className="btn btn-outline btn-block">
                            📋 عرض سجل الشهادات
                        </Link>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">📋 آخر الشهادات الصادرة</div>
                    {registry.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📭</div>
                            <p>لا توجد شهادات صادرة بعد</p>
                            <Link to="/create" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>
                                إنشاء أول شهادة
                            </Link>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>الرقم</th>
                                        <th>الاسم</th>
                                        <th>المناسبة</th>
                                        <th>التاريخ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registry.slice(-6).reverse().map((cert, i) => (
                                        <tr key={i}>
                                            <td><span className="badge badge-primary">{cert.serial}</span></td>
                                            <td>{cert.name}</td>
                                            <td>{cert.event}</td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                {new Date(cert.createdAt).toLocaleDateString('ar-SA')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Info section */}
            <div className="alert alert-info">
                💡 <strong>تلميح:</strong> قم أولاً بإعداد بيانات جهتك وتوقيعاتها من صفحة <Link to="/settings" style={{ color: 'var(--primary)', fontWeight: 700 }}>الإعدادات</Link> قبل إنشاء أي شهادة.
            </div>
        </div>
    )
}
