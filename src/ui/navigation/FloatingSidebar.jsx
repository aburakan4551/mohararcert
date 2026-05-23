import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

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
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getIcon = (iconName) => {
        const IconComponent = Icons[iconName] || Icons.HelpCircle;
        return <IconComponent className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />;
    };

    const activeItemBg = 'bg-gradient-to-l from-teal-500/10 to-teal-500/0 text-teal-600 dark:text-teal-400 border-r-4 border-teal-600 dark:border-teal-400';
    const inactiveItemBg = 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-900/40 border-r-4 border-transparent';

    return (
        <>
            {/* Mobile Overlay Backdrop */}
            {isOpen && isMobile && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-slate-950/45 dark:bg-slate-950/65 backdrop-blur-sm md:hidden"
                />
            )}

            {/* Sidebar Floating Body */}
            <motion.aside
                initial={isMobile ? { x: '110%' } : { x: 0 }}
                animate={{ x: isMobile ? (isOpen ? 0 : '110%') : 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className={`fixed top-4 right-4 bottom-4 z-40 flex flex-col ${
                    isCollapsed && !isMobile ? 'w-20' : 'w-64 sm:w-72'
                } bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/40 rounded-3xl shadow-lg transition-all duration-300 ${className}`}
                style={{ direction: 'rtl' }}
            >
                {/* Collapse Trigger (Desktop Only) */}
                {!isMobile && (
                    <button
                        onClick={onToggleCollapse}
                        className="absolute top-1/2 -left-3.5 transform -translate-y-1/2 w-7.5 h-7.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center cursor-pointer shadow-md hover:text-teal-600 dark:hover:text-teal-400 hover:scale-105 active:scale-95 transition-all z-50"
                        title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
                    >
                        {isCollapsed ? <Icons.ChevronLeft className="w-4 h-4" /> : <Icons.ChevronRight className="w-4 h-4" />}
                    </button>
                )}

                {/* Header Profile Info / Branding Logo */}
                <div className="flex flex-col items-center justify-center py-6 px-4 border-b border-slate-100 dark:border-slate-800/20 relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition-all duration-550 pointer-events-none" />

                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="flex items-center justify-center w-11 h-11 mb-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 shadow-sm shrink-0"
                    >
                        <Icons.Award className="w-6 h-6 stroke-[1.8]" />
                    </motion.div>

                    {(!isCollapsed || isMobile) ? (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center"
                        >
                            <h2 className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100 font-sans leading-normal">
                                إدارة التميز المؤسسي
                            </h2>
                            <span className="text-[9px] text-teal-600 dark:text-teal-400 font-black uppercase tracking-wider block mt-0.5">
                                صحة الحدود الشمالية
                            </span>
                        </motion.div>
                    ) : (
                        <span className="text-[9px] text-teal-600 dark:text-teal-450 font-bold">MOH</span>
                    )}
                </div>

                {/* Nav Links List */}
                <nav className="flex-1 px-3.5 py-4 overflow-y-auto space-y-1 custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) => `
                                group flex items-center ${isCollapsed && !isMobile ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 font-bold text-xs relative
                                ${isActive ? activeItemBg : inactiveItemBg}
                            `}
                        >
                            <span className="shrink-0">{getIcon(item.icon)}</span>

                            {(!isCollapsed || isMobile) ? (
                                <span className="truncate tracking-wide">{item.label}</span>
                            ) : (
                                // Compact Hover Tooltip
                                <div className="absolute right-20 scale-0 group-hover:scale-100 transition-all duration-150 z-50 bg-slate-950/95 dark:bg-slate-900 border border-slate-800 text-slate-200 text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-xl pointer-events-none whitespace-nowrap">
                                    {item.label}
                                </div>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Section Footer */}
                <div className="p-3 border-t border-slate-150/40 dark:border-slate-800/20 bg-slate-50/40 dark:bg-slate-950/20 rounded-b-3xl">
                    {currentUser && (
                        <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center p-1' : 'gap-3 p-2.5'} mb-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30`}>
                            <div className="flex items-center justify-center w-8.5 h-8.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 font-black text-xs shrink-0">
                                {currentUser.name ? currentUser.name.charAt(0) : 'م'}
                            </div>

                            {(!isCollapsed || isMobile) && (
                                <div className="flex-1 min-w-0 text-right">
                                    <h4 className="text-[11px] font-black truncate text-slate-800 dark:text-slate-200 leading-none">
                                        {currentUser.name || 'مستخدم النظام'}
                                    </h4>
                                    <span className="text-[8px] text-teal-650 dark:text-teal-400 font-black px-1.5 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 inline-block mt-1">
                                        {currentUser.role === 'SUPER_ADMIN' ? 'المشرف العام' : 
                                         currentUser.role === 'CREATOR' ? 'منشئ المعاملات' : 'مساعد المدير'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Exit Logout */}
                    <button
                        onClick={onLogout}
                        className={`flex items-center justify-center ${isCollapsed && !isMobile ? 'p-2.5' : 'gap-2 py-2.5 px-4'} w-full rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/10 hover:border-red-500/25 text-red-600 dark:text-red-400 font-black text-[11px] transition-all duration-200 cursor-pointer shadow-sm`}
                        title="تسجيل الخروج"
                    >
                        <Icons.LogOut className="w-4 h-4 shrink-0" />
                        {(!isCollapsed || isMobile) && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </motion.aside>
        </>
    );
};

export default FloatingSidebar;
