/**
 * 🏛️ DashboardLayout.jsx
 * Enterprise MoH Saudi Arabia — Main Layout Manager
 * Handles: Sidebar, Topbar, Notifications, Dark Mode, Responsive
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu, Sun, Moon, Bell, BellOff, Search, X, ChevronLeft,
} from 'lucide-react';
import FloatingSidebar from '../ui/navigation/FloatingSidebar';
import { Avatar } from '../ui/components/Avatar';
import { logger } from '../utils/debug';

const PAGE_TITLES = {
    '/dashboard':       { title: 'لوحة التحكم',            subtitle: 'نظرة عامة على المعاملات والإحصائيات' },
    '/create':          { title: 'إنشاء شهادة جديدة',      subtitle: 'أنشئ وصمم شهادة رسمية جديدة' },
    '/batch':           { title: 'استيراد Excel',           subtitle: 'إنشاء شهادات متعددة من ملف بيانات' },
    '/my-certificates': { title: 'شهاداتي',                 subtitle: 'جميع الشهادات التي أنشأتها' },
    '/pending':         { title: 'الطلبات المعلقة',         subtitle: 'معاملات بانتظار مراجعتك واعتمادك' },
    '/archive':         { title: 'الأرشيف العام',           subtitle: 'السجل الكامل للمعاملات المعتمدة' },
    '/system-settings': { title: 'إعدادات الهوية',          subtitle: 'تخصيص هوية المنظومة الرسمية' },
    '/users':           { title: 'إدارة الحسابات',          subtitle: 'إدارة مستخدمي النظام وصلاحياتهم' },
    '/permissions':     { title: 'صلاحيات الأدوار',         subtitle: 'تحديد صلاحيات كل دور إداري' },
    '/audit':           { title: 'سجل التدقيق',             subtitle: 'تتبع كافة العمليات والإجراءات' },
    '/registry':        { title: 'سجل النظام الموحد',       subtitle: 'السجل الرسمي الشامل للمعاملات' },
    '/assets':          { title: 'حوكمة الأصول الرسمية',    subtitle: 'إدارة وتأمين الأختام والتواقيع والشعارات الرسمية' },
    '/diagnostics':     { title: 'التشخيص ومراقبة الأداء',  subtitle: 'فحص جهد الأنظمة وسعة الذاكرة ومعدل الإطارات' },
};

export default function DashboardLayout({
    children,
    currentUser,
    onLogout,
    navItems = [],
    notifications = [],
    onClearNotifications,
}) {
    const [isSidebarOpen,  setIsSidebarOpen]  = useState(false);
    const [isNotifOpen,    setIsNotifOpen]    = useState(false);
    const [isCollapsed,    setIsCollapsed]    = useState(() =>
        localStorage.getItem('mohararcert_sidebar_collapsed') === 'true'
    );
    const [isDarkMode, setIsDarkMode] = useState(() =>
        localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );

    const location  = useLocation();
    const isEditor  = location.pathname === '/create' || location.pathname === '/settings';
    const pageInfo  = PAGE_TITLES[location.pathname] ||
                      (location.pathname.startsWith('/approvals/')
                          ? { title: 'تفاصيل واعتماد المعاملة', subtitle: 'مراجعة واتخاذ قرار الاعتماد' }
                          : { title: 'إدارة التميز المؤسسي', subtitle: '' });

    /* ── Dark Mode ── */
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleCollapse = () => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        localStorage.setItem('mohararcert_sidebar_collapsed', String(next));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const sidebarWidth = isCollapsed ? 72 : 268;

    /* ── Editor Mode: no chrome ── */
    if (isEditor) {
        return (
            <div style={{ minHeight: '100vh', direction: 'rtl' }}>
                {children}
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--bg-page)',
                direction: 'rtl',
                display: 'flex',
            }}
        >
            {/* ── Sidebar ── */}
            <FloatingSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isCollapsed}
                onToggleCollapse={toggleCollapse}
                navItems={navItems}
                currentUser={currentUser}
                onLogout={() => {
                    logger.nav('تسجيل خروج المستخدم.');
                    onLogout?.();
                }}
            />

            {/* ── Main Content ── */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    marginRight: `${sidebarWidth}px`,
                    transition: 'margin-right 0.25s cubic-bezier(0.4,0,0.2,1)',
                }}
                className="main-area-responsive"
            >
                {/* ── Topbar ── */}
                <header
                    className="topbar"
                    style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 40,
                        height: 'var(--topbar-height)',
                        background: 'rgba(255,255,255,0.92)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        borderBottom: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 20px',
                        gap: '12px',
                    }}
                >
                    {/* Mobile menu trigger */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="lg:hidden"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-lg)',
                            border: '1.5px solid var(--border-strong)',
                            background: 'var(--bg-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)',
                            flexShrink: 0,
                        }}
                    >
                        <Menu size={17} />
                    </button>

                    {/* Page Title & Breadcrumb */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{
                            fontSize: 'var(--text-body)',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {pageInfo.title}
                        </h1>
                        {pageInfo.subtitle && (
                            <p style={{
                                fontSize: 'var(--text-micro)',
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                marginTop: '1px',
                            }}>
                                {pageInfo.subtitle}
                            </p>
                        )}
                    </div>

                    {/* Right Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                        {/* Date */}
                        <span
                            className="hidden md:block"
                            style={{
                                fontSize: 'var(--text-micro)',
                                color: 'var(--text-muted)',
                                fontWeight: 600,
                                padding: '5px 10px',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-default)',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {new Date().toLocaleDateString('ar-SA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>

                        {/* Dark Mode Toggle */}
                        <TopbarIconBtn
                            onClick={() => {
                                setIsDarkMode(d => !d);
                                logger.system('تبديل ثيم الواجهة.');
                            }}
                            title={isDarkMode ? 'الوضع المضيء' : 'الوضع المظلم'}
                        >
                            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                        </TopbarIconBtn>

                        {/* Notifications */}
                        <div style={{ position: 'relative' }}>
                            <TopbarIconBtn
                                onClick={() => setIsNotifOpen(v => !v)}
                                title="الإشعارات"
                                active={isNotifOpen}
                            >
                                <Bell size={16} />
                                {unreadCount > 0 && (
                                    <span className="notif-dot" style={{
                                        position: 'absolute', top: '-4px', left: '-4px',
                                        fontSize: '9px', fontWeight: 900,
                                    }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </TopbarIconBtn>

                            {/* Notifications Dropdown */}
                            <AnimatePresence>
                                {isNotifOpen && (
                                    <>
                                        <div
                                            style={{ position: 'fixed', inset: 0, zIndex: 45 }}
                                            onClick={() => setIsNotifOpen(false)}
                                        />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.97 }}
                                            transition={{ duration: 0.15 }}
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 'calc(100% + 8px)',
                                                width: 320,
                                                zIndex: 50,
                                                background: 'var(--bg-surface)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: 'var(--radius-xl)',
                                                boxShadow: 'var(--shadow-overlay)',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '14px 16px',
                                                borderBottom: '1px solid var(--border-default)',
                                                background: 'var(--bg-subtle)',
                                            }}>
                                                <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    الإشعارات
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    {unreadCount > 0 && (
                                                        <button
                                                            onClick={() => { onClearNotifications?.(); setIsNotifOpen(false); }}
                                                            style={{
                                                                fontSize: 'var(--text-micro)',
                                                                color: 'var(--color-primary-600)',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                background: 'none',
                                                                border: 'none',
                                                                fontFamily: 'var(--font-sans)',
                                                            }}
                                                        >
                                                            مسح الكل
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setIsNotifOpen(false)}
                                                        style={{
                                                            width: 24, height: 24,
                                                            borderRadius: 'var(--radius-md)',
                                                            border: 'none',
                                                            background: 'var(--bg-muted)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            color: 'var(--text-muted)',
                                                        }}
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ maxHeight: 320, overflowY: 'auto' }} className="custom-scrollbar">
                                                {notifications.length === 0 ? (
                                                    <div style={{
                                                        padding: '2.5rem 1rem',
                                                        textAlign: 'center',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                    }}>
                                                        <BellOff size={32} strokeWidth={1.25} style={{ color: 'var(--text-muted)' }} />
                                                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                            لا توجد إشعارات حالياً
                                                        </p>
                                                    </div>
                                                ) : (
                                                    notifications.map(notif => (
                                                        <div
                                                            key={notif.id}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid var(--border-subtle)',
                                                                display: 'flex',
                                                                gap: '10px',
                                                                background: notif.read ? 'transparent' : 'rgba(15,169,88,0.03)',
                                                                cursor: 'pointer',
                                                                transition: 'background var(--transition-fast)',
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(15,169,88,0.03)'}
                                                        >
                                                            <div style={{
                                                                width: 8,
                                                                height: 8,
                                                                borderRadius: '50%',
                                                                background: {
                                                                    approve: 'var(--color-success)',
                                                                    reject: 'var(--color-danger)',
                                                                    pending: 'var(--color-warning)',
                                                                }[notif.type] || 'var(--color-info)',
                                                                flexShrink: 0,
                                                                marginTop: '5px',
                                                            }} />
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p style={{
                                                                    fontSize: 'var(--text-label)',
                                                                    fontWeight: notif.read ? 500 : 700,
                                                                    color: 'var(--text-secondary)',
                                                                    lineHeight: 1.5,
                                                                }}>
                                                                    {notif.message}
                                                                </p>
                                                                <p style={{
                                                                    fontSize: 'var(--text-micro)',
                                                                    color: 'var(--text-muted)',
                                                                    marginTop: '3px',
                                                                    fontWeight: 500,
                                                                }}>
                                                                    {notif.time}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* User Avatar */}
                        {currentUser && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '4px 10px 4px 4px',
                                borderRadius: 'var(--radius-lg)',
                                border: '1.5px solid var(--border-default)',
                                background: 'var(--bg-subtle)',
                            }}>
                                <Avatar name={currentUser.name} size="sm" />
                                <span className="hidden md:block" style={{
                                    fontSize: 'var(--text-micro)',
                                    fontWeight: 700,
                                    color: 'var(--text-secondary)',
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {currentUser.name}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── Page Content ── */}
                <main style={{
                    flex: 1,
                    padding: '24px 24px',
                    maxWidth: 'var(--content-max-width)',
                    width: '100%',
                    margin: '0 auto',
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.2 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            {/* Responsive: hide sidebar margin on mobile */}
            <style>{`
                @media (max-width: 1023px) {
                    .main-area-responsive {
                        margin-right: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}

/* ── Internal: Topbar Icon Button ── */
const TopbarIconBtn = ({ children, onClick, title, active = false }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--border-default)',
            background: active ? 'var(--color-success-bg)' : 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: active ? 'var(--color-primary-600)' : 'var(--text-tertiary)',
            transition: 'all var(--transition-fast)',
            flexShrink: 0,
        }}
        onMouseEnter={e => {
            if (!active) {
                e.currentTarget.style.background = 'var(--bg-muted)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
            }
        }}
        onMouseLeave={e => {
            if (!active) {
                e.currentTarget.style.background = 'var(--bg-surface)';
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
            }
        }}
    >
        {children}
    </button>
);
