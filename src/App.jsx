import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { TemplateProvider } from './context/TemplateContext'

const Home = lazy(() => import('./pages/Home'))
const CreateCertificate = lazy(() => import('./pages/CreateCertificate'))
const BatchCreate = lazy(() => import('./pages/BatchCreate'))
const Settings = lazy(() => import('./pages/Settings'))
const Registry = lazy(() => import('./pages/Registry'))

const APP_PASSWORD = 'Aa@0555386421'
const AUTH_STORAGE_KEY = 'certificates-platform-authenticated'

const navItems = [
    { to: '/', icon: '🏠', label: 'الرئيسية', end: true },
    { to: '/create', icon: '📝', label: 'إنشاء شهادة' },
    { to: '/batch', icon: '📦', label: 'استيراد Excel' },
    { to: '/registry', icon: '📋', label: 'سجل الشهادات' },
    { to: '/settings', icon: '⚙️', label: 'الإعدادات' },
]

function PageTitle() {
    const location = useLocation()
    const titles = {
        '/': 'الرئيسية',
        '/create': 'إنشاء شهادة جديدة',
        '/batch': 'استيراد وإنشاء دفعة',
        '/registry': 'سجل الشهادات',
        '/settings': 'الإعدادات',
    }

    return <h1>{titles[location.pathname] || 'منصة الشهادات'}</h1>
}

function Layout({ onLogout }) {
    const location = useLocation()
    const isEditor = location.pathname === '/create' || location.pathname === '/settings'

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span className="logo-icon">🏅</span>
                    <h2>منصة شهادات<br />الشكر والتقدير</h2>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        >
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button type="button" className="sidebar-logout-btn" onClick={onLogout}>
                        تسجيل الخروج
                    </button>
                    <div className="sidebar-footer-note">v1.0 | منصة الشهادات الرسمية</div>
                </div>
            </aside>

            <div className="main-content" style={isEditor ? { overflow: 'hidden', height: '100vh' } : {}}>
                {!isEditor && (
                    <div className="top-bar no-print">
                        <PageTitle />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' })}
                        </span>
                    </div>
                )}

                <main
                    className="page-content"
                    style={isEditor ? { padding: 0, height: '100vh', overflow: 'hidden' } : {}}
                >
                    <Suspense
                        fallback={
                            <div className="flex-center" style={{ padding: '60px' }}>
                                <div className="loading-spinner" />
                            </div>
                        }
                    >
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/create" element={<CreateCertificate />} />
                            <Route path="/batch" element={<BatchCreate />} />
                            <Route path="/registry" element={<Registry />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>
                    </Suspense>
                </main>
            </div>
        </div>
    )
}

function LoginGate({ children }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        const savedAuth = window.sessionStorage.getItem(AUTH_STORAGE_KEY)
        if (savedAuth === 'true') {
            setIsAuthenticated(true)
        }
    }, [])

    const handleSubmit = (event) => {
        event.preventDefault()

        if (password === APP_PASSWORD) {
            window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
            setIsAuthenticated(true)
            setError('')
            setPassword('')
            return
        }

        setError('كلمة المرور غير صحيحة')
    }

    const handleLogout = () => {
        window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
        setIsAuthenticated(false)
        setPassword('')
        setError('')
    }

    if (isAuthenticated) {
        return children({ onLogout: handleLogout })
    }

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-badge">منصة الشهادات</div>
                <h1 className="login-title">تسجيل الدخول</h1>
                <p className="login-subtitle">
                    أدخل كلمة المرور للوصول إلى منصة شهادات الشكر والتقدير
                </p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="app-password" className="form-label">كلمة المرور</label>
                        <input
                            id="app-password"
                            type="password"
                            className="form-control login-input"
                            value={password}
                            onChange={(event) => {
                                setPassword(event.target.value)
                                if (error) {
                                    setError('')
                                }
                            }}
                            placeholder="أدخل كلمة المرور"
                            autoComplete="current-password"
                            autoFocus
                        />
                    </div>

                    {error ? <div className="alert alert-warning">{error}</div> : null}

                    <button type="submit" className="btn btn-gold btn-lg btn-block">
                        دخول
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <TemplateProvider>
                <LoginGate>
                    {({ onLogout }) => <Layout onLogout={onLogout} />}
                </LoginGate>
            </TemplateProvider>
        </BrowserRouter>
    )
}
