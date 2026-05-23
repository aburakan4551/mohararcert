import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Avatar } from '../components/Avatar';

/**
 * Enterprise Floating Sidebar
 * - Minimal, compact, professional
 * - RTL-native (right side)
 * - Smart collapse support
 * - Smooth spring animations
 * - MoH Saudi Arabia identity
 */
export const FloatingSidebar = ({
    isOpen,
    onClose,
    isCollapsed,
    onToggleCollapse,
    navItems = [],
    currentUser = null,
    onLogout,
    className = '',
}) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const getIcon = (iconName) => {
        const Ic = Icons[iconName] || Icons.Circle;
        return <Ic size={18} strokeWidth={1.75} />;
    };

    const roleLabel = {
        SUPER_ADMIN:       'المشرف العام',
        CREATOR:           'منشئ المعاملات',
        ASSISTANT_MANAGER: 'مساعد المدير',
        GENERAL_MANAGER:   'المدير العام',
    }[currentUser?.role] || 'مستخدم النظام';

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && isMobile && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 49,
                            background: 'rgba(0,0,0,0.35)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Body */}
            <motion.aside
                initial={false}
                animate={{
                    x: isMobile ? (isOpen ? 0 : '110%') : 0,
                    width: !isMobile ? (isCollapsed ? 72 : 268) : 268,
                }}
                transition={{ type: 'spring', damping: 30, stiffness: 260 }}
                className={`sidebar-rail ${!isMobile && isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile-sidebar' : ''} ${className}`}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 50,
                    background: 'var(--bg-surface)',
                    borderLeft: '1px solid var(--border-default)',
                    boxShadow: 'var(--shadow-floating)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    direction: 'rtl',
                }}
            >
                {/* ── Brand / Logo ── */}
                <div className="sidebar-brand" style={{ position: 'relative', overflow: 'hidden' }}>
                    {/* Subtle gradient accent */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(135deg, rgba(15,169,88,0.04), transparent)',
                        pointerEvents: 'none',
                    }} />

                    <div className="sidebar-brand-icon" style={{ flexShrink: 0 }}>
                        <Icons.Award size={20} strokeWidth={1.75} />
                    </div>

                    <AnimatePresence mode="wait">
                        {(!isCollapsed || isMobile) && (
                            <motion.div
                                key="brand-text"
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 8 }}
                                transition={{ duration: 0.18 }}
                                className="sidebar-brand-text"
                            >
                                <p className="sidebar-brand-title">إدارة التميز المؤسسي</p>
                                <p className="sidebar-brand-sub">وزارة الصحة · الحدود الشمالية</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Collapse toggle — desktop only */}
                    {!isMobile && (
                        <button
                            onClick={onToggleCollapse}
                            title={isCollapsed ? 'توسيع' : 'طي'}
                            style={{
                                position: 'absolute',
                                left: -14,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--bg-surface)',
                                border: '1.5px solid var(--border-strong)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                                zIndex: 60,
                                boxShadow: 'var(--shadow-card)',
                                transition: 'all var(--transition-fast)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = 'var(--color-primary-600)';
                                e.currentTarget.style.borderColor = 'var(--color-primary-400)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = 'var(--text-muted)';
                                e.currentTarget.style.borderColor = 'var(--border-strong)';
                            }}
                        >
                            {isCollapsed
                                ? <Icons.ChevronLeft size={13} strokeWidth={2.5} />
                                : <Icons.ChevronRight size={13} strokeWidth={2.5} />
                            }
                        </button>
                    )}
                </div>

                {/* ── Navigation ── */}
                <nav className="sidebar-nav custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={isMobile ? onClose : undefined}
                            title={isCollapsed && !isMobile ? item.label : undefined}
                        >
                            {({ isActive }) => (
                                <div
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    style={{
                                        justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
                                        paddingRight: isCollapsed && !isMobile ? 0 : undefined,
                                    }}
                                >
                                    <span className="nav-item-icon" style={{ flexShrink: 0 }}>
                                        {getIcon(item.icon)}
                                    </span>
                                    <AnimatePresence mode="wait">
                                        {(!isCollapsed || isMobile) && (
                                            <motion.span
                                                key="label"
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: 'auto' }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.18 }}
                                                style={{
                                                    overflow: 'hidden',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: 'var(--text-label)',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* ── Footer / User ── */}
                <div className="sidebar-footer">
                    {currentUser && (!isCollapsed || isMobile) && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-default)',
                                marginBottom: '8px',
                            }}
                        >
                            <Avatar name={currentUser.name} size="sm" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    fontSize: 'var(--text-label)',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {currentUser.name || 'مستخدم النظام'}
                                </p>
                                <p style={{
                                    fontSize: 'var(--text-micro)',
                                    color: 'var(--color-primary-600)',
                                    fontWeight: 700,
                                }}>
                                    {roleLabel}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Logout Button */}
                    <button
                        onClick={onLogout}
                        title="تسجيل الخروج"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isCollapsed && !isMobile ? 'center' : 'flex-start',
                            gap: '8px',
                            padding: isCollapsed && !isMobile ? '10px 0' : '10px 12px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1.5px solid rgba(239,68,68,0.15)',
                            background: 'rgba(239,68,68,0.05)',
                            color: 'var(--color-danger)',
                            fontSize: 'var(--text-label)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.10)';
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)';
                        }}
                    >
                        <Icons.LogOut size={16} strokeWidth={2} />
                        {(!isCollapsed || isMobile) && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </motion.aside>
        </>
    );
};

export default FloatingSidebar;
