import React, { Suspense, lazy, Component, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TemplateProvider } from './context/TemplateContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import DashboardLayout from './layouts/DashboardLayout'
import Login from './pages/Login'
import { diagnosticsStore } from './utils/diagnosticsStore'

// 🛡️ Global Error Boundary to catch render failures and provide premium Arabic recovery console
class GlobalErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("[CRITICAL 🚨] GlobalErrorBoundary caught a rendering crash:", error, errorInfo);
        try {
            diagnosticsStore.logInitializationError("SYSTEM_CRASH", error, errorInfo?.componentStack?.slice(0, 150));
        } catch (e) {}
    }

    handleReset = () => {
        try {
            sessionStorage.clear();
            localStorage.clear();
        } catch (e) {}
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    background: 'var(--bg-page)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Cairo, sans-serif',
                    padding: '24px',
                    direction: 'rtl'
                }}>
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '480px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        boxShadow: 'var(--shadow-overlay)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }}>
                            <span style={{ fontSize: '28px' }}>🚨</span>
                            <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>عطل تشغيلي في منصة الاعتمادات</h2>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                            نعتذر، واجهت المنصة عطلاً تشغيلياً مفاجئاً أثناء رندرة مكونات الصفحة. تم عزل وتطويق الفشل بنجاح لحماية سلامة البيانات.
                        </p>

                        <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 800, display: 'block', marginBottom: '4px', color: '#ef4444' }}>معلومات الخطأ (Observability Log):</span>
                            <code style={{ wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
                                {this.state.error?.message || String(this.state.error)}
                            </code>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button 
                                style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                onClick={() => window.location.reload()}
                            >
                                تحديث الصفحة
                            </button>
                            <button 
                                style={{ flex: 1, padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, borderRadius: '8px', cursor: 'pointer' }}
                                onClick={this.handleReset}
                            >
                                تصفير الجلسة والعودة
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// 🔄 Resilient dynamic importer wrapper to handle Vercel SPA chunk fetch/hash caching mismatches
function safeLazy(importFn) {
    return lazy(async () => {
        try {
            return await importFn();
        } catch (error) {
            console.error("[LAZY 🚨] failed to load dynamically imported module chunk:", error);
            
            const isChunkError = 
                error.name === "TypeError" ||
                /failed/i.test(error.message) ||
                /import/i.test(error.message) ||
                error.message?.includes("Failed to fetch dynamically imported module") ||
                error.message?.includes("MIME type");
                
            if (isChunkError && typeof window !== 'undefined') {
                const hasReloaded = sessionStorage.getItem('chunk_reload_retry');
                if (!hasReloaded) {
                    sessionStorage.setItem('chunk_reload_retry', 'true');
                    console.log("[LAZY 🔄] Chunk loading failed. Performing hard reload to fetch fresh assets...");
                    window.location.reload();
                    return new Promise(() => {}); // Return unresolved promise to halt render while reloading
                }
            }
            throw error;
        }
    });
}

const Dashboard = safeLazy(() => import('./pages/Dashboard'))
const CreateCertificate = safeLazy(() => import('./pages/CreateCertificate'))
const MyCertificates = safeLazy(() => import('./pages/MyCertificates'))
const PendingApprovals = safeLazy(() => import('./pages/PendingApprovals'))
const ApprovalDetails = safeLazy(() => import('./pages/ApprovalDetails'))
const Archive = safeLazy(() => import('./pages/Archive'))
const Registry = safeLazy(() => import('./pages/Registry'))
const SystemSettings = safeLazy(() => import('./pages/SystemSettings'))
const UsersManagement = safeLazy(() => import('./pages/UsersManagement'))
const RolePermissions = safeLazy(() => import('./pages/RolePermissions'))
const AuditLogs = safeLazy(() => import('./pages/AuditLogs'))
const AssetGovernance = safeLazy(() => import('./pages/AssetGovernance'))
const Diagnostics = safeLazy(() => import('./pages/Diagnostics'))


// New Studio Pages
const TemplateStudio = safeLazy(() => import('./ui/studio/TemplateStudio/TemplateStudio'))
const TemplateMapper = safeLazy(() => import('./ui/studio/TemplateMapper/TemplateMapper'))

const getNavItems = (role) => {
    switch (role) {
        case 'CREATOR':
            return [
                { to: '/dashboard', icon: 'LayoutDashboard', label: 'لوحة التحكم' },
                { to: '/create', icon: 'FilePlus', label: 'مساحة العمل والتوليد' },
                { to: '/my-certificates', icon: 'FolderHeart', label: 'شهاداتي الخاصة' }
            ];
        case 'ASSISTANT_MANAGER':
        case 'GENERAL_MANAGER':
            return [
                { to: '/dashboard', icon: 'LayoutDashboard', label: 'لوحة التحكم' },
                { to: '/pending', icon: 'Hourglass', label: 'الطلبات المعلقة' },
                { to: '/archive', icon: 'Archive', label: 'الأرشيف العام' },
                { to: '/system-settings', icon: 'Settings', label: 'إعدادات الهوية' }
            ];
        case 'SUPER_ADMIN':
            return [
                { to: '/dashboard', icon: 'LayoutDashboard', label: 'لوحة التحكم' },
                { to: '/create', icon: 'FilePlus', label: 'مساحة العمل والتوليد' },
                { to: '/my-certificates', icon: 'FolderHeart', label: 'شهاداتي الخاصة' },
                { to: '/pending', icon: 'Hourglass', label: 'الطلبات المعلقة' },
                { to: '/archive', icon: 'Archive', label: 'الأرشيف العام' },
                { to: '/registry', icon: 'BookOpen', label: 'سجل النظام الموحد' },
                { to: '/assets', icon: 'ShieldCheck', label: 'حوكمة الأصول الرسمية' },
                { to: '/system-settings', icon: 'Settings', label: 'إعدادات الهوية' },
                { to: '/users', icon: 'Users', label: 'إدارة الحسابات' },
                { to: '/permissions', icon: 'ShieldAlert', label: 'صلاحيات الأدوار' },
                { to: '/audit', icon: 'FileText', label: 'سجل التدقيق الأمني' },
                { to: '/diagnostics', icon: 'Activity', label: 'التشخيص ومراقبة الأداء' },
                { to: '/studio', icon: 'Settings2', label: 'مصمم القوالب' }
            ];
        default:
            return [];
    }
}

function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-page)' }}>
                <span className="spinner spinner-lg" />
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}

function LayoutWrapper() {
    const { user, logout, notifications, clearAllNotifications } = useAuth()
    const navItems = getNavItems(user?.role || '')

    return (
        <DashboardLayout
            currentUser={user}
            onLogout={logout}
            navItems={navItems}
            notifications={notifications}
            onClearNotifications={clearAllNotifications}
        >
            <Suspense
                fallback={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '12px' }}>
                        <span className="spinner spinner-md" />
                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>جارٍ التحميل...</p>
                    </div>
                }
            >
                <Routes>
                    {/* Core Common Pages */}
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* Creator Work Pages */}
                    <Route 
                        path="/create" 
                        element={
                            <ProtectedRoute allowedRoles={['CREATOR', 'SUPER_ADMIN']}>
                                <CreateCertificate />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/my-certificates" 
                        element={
                            <ProtectedRoute allowedRoles={['CREATOR', 'SUPER_ADMIN']}>
                                <MyCertificates />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Approver Work Pages */}
                    <Route 
                        path="/pending" 
                        element={
                            <ProtectedRoute allowedRoles={['ASSISTANT_MANAGER', 'GENERAL_MANAGER', 'SUPER_ADMIN']}>
                                <PendingApprovals />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/approvals/:id" 
                        element={
                            <ProtectedRoute>
                                <ApprovalDetails />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/archive" 
                        element={
                            <ProtectedRoute>
                                <Archive />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Admin Configuration Pages */}
                    <Route 
                        path="/system-settings" 
                        element={
                            <ProtectedRoute allowedRoles={['ASSISTANT_MANAGER', 'GENERAL_MANAGER', 'SUPER_ADMIN']}>
                                <SystemSettings />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/users" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <UsersManagement />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/permissions" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <RolePermissions />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/audit" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <AuditLogs />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/registry" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <Registry />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/assets" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <AssetGovernance />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/diagnostics" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <Diagnostics />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Template Studio */}
                    <Route 
                        path="/studio" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <TemplateStudio />
                            </ProtectedRoute>
                        } 
                    />
                    <Route 
                        path="/studio/mapper/:id" 
                        element={
                            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                                <TemplateMapper />
                            </ProtectedRoute>
                        } 
                    />

                    {/* Catch-all fallback redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </Suspense>
        </DashboardLayout>
    )
}

export default function App() {
    useEffect(() => {
        try {
            sessionStorage.removeItem('chunk_reload_retry');
        } catch (e) {}
    }, []);

    return (
        <GlobalErrorBoundary>
            <BrowserRouter>
                <ThemeProvider>
                    <AuthProvider>
                        <TemplateProvider>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route 
                                    path="/*" 
                                    element={
                                        <ProtectedRoute>
                                            <LayoutWrapper />
                                        </ProtectedRoute>
                                    } 
                                />
                            </Routes>
                        </TemplateProvider>
                    </AuthProvider>
                </ThemeProvider>
            </BrowserRouter>
        </GlobalErrorBoundary>
    )
}

