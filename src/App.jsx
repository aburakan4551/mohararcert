import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TemplateProvider } from './context/TemplateContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import DashboardLayout from './layouts/DashboardLayout'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateCertificate = lazy(() => import('./pages/CreateCertificate'))
const MyCertificates = lazy(() => import('./pages/MyCertificates'))
const PendingApprovals = lazy(() => import('./pages/PendingApprovals'))
const ApprovalDetails = lazy(() => import('./pages/ApprovalDetails'))
const Archive = lazy(() => import('./pages/Archive'))
const Registry = lazy(() => import('./pages/Registry'))
const SystemSettings = lazy(() => import('./pages/SystemSettings'))
const UsersManagement = lazy(() => import('./pages/UsersManagement'))
const RolePermissions = lazy(() => import('./pages/RolePermissions'))
const AuditLogs = lazy(() => import('./pages/AuditLogs'))

// New Studio Pages
const TemplateStudio = lazy(() => import('./ui/studio/TemplateStudio/TemplateStudio'))
const TemplateMapper = lazy(() => import('./ui/studio/TemplateMapper/TemplateMapper'))

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
                { to: '/system-settings', icon: 'Settings', label: 'إعدادات الهوية' },
                { to: '/users', icon: 'Users', label: 'إدارة الحسابات' },
                { to: '/permissions', icon: 'ShieldAlert', label: 'صلاحيات الأدوار' },
                { to: '/audit', icon: 'FileText', label: 'سجل التدقيق الأمني' },
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
    return (
        <BrowserRouter>
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
        </BrowserRouter>
    )
}

