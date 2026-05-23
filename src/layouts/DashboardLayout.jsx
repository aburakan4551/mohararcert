/**
 * 🏛️ DashboardLayout.jsx
 * Enterprise SaaS Responsive Layout Manager.
 * Orchestrates collapsible desktop margins, mobile drawers, breadcrumbs,
 * unified dark mode classes, and isolated Z-index overlay layers.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import Sidebar from './Sidebar';
import { logger } from '../utils/debug';

export default function DashboardLayout({ children, currentUser, onLogout, navItems = [], notifications = [], onClearNotifications }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    // Manage sidebar collapsible state dynamically
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('mohararcert_sidebar_collapsed') === 'true';
    });

    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || 
               (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    const location = useLocation();
    const isEditor = location.pathname === '/create' || location.pathname === '/settings';

    // Apply dark class dynamically to html tag for Tailwind Dark Mode support
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            logger.system('الوضع المظلم نشط حالياً.');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            logger.system('الوضع المضيء نشط حالياً.');
        }
    }, [isDarkMode]);

    const toggleCollapse = () => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        localStorage.setItem('mohararcert_sidebar_collapsed', String(next));
        logger.system(next ? 'طي القائمة الجانبية للمستندات.' : 'توسيع القائمة الجانبية للمستندات.');
    };

    const getPageTitle = () => {
        const path = location.pathname;
        const match = navItems.find(item => item.to === path);
        if (match) return match.label;
        if (path === '/create') return 'إنشاء شهادة جديدة';
        if (path === '/settings') return 'الإعدادات العامة';
        if (path.startsWith('/approvals/')) return 'تفاصيل واعتماد المعاملة';
        return 'إدارة التميز المؤسسي';
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-[#050a14] text-slate-800 dark:text-slate-100 flex transition-colors duration-300 font-sans`} style={{ direction: 'rtl' }}>
            {/* Sidebar Navigation component */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => {
                    logger.nav('تم إغلاق الدرج الجانبي.');
                    setIsSidebarOpen(false);
                }}
                isCollapsed={isCollapsed}
                onToggleCollapse={toggleCollapse}
                navItems={navItems}
                currentUser={currentUser}
                onLogout={onLogout}
            />

            {/* Main Content Area - shifts dynamically depending on isCollapsed */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isEditor ? '' : (isCollapsed ? 'md:mr-20' : 'md:mr-72')}`}>
                
                {/* Header / Top Bar (Glassmorphic) */}
                {!isEditor && (
                    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-[#050a14]/70 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300">
                        {/* Right: Drawer Hamburger + Breadcrumb */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    logger.nav('تم فتح الدرج الجانبي المتجاوب للهاتف.');
                                    setIsSidebarOpen(true);
                                }}
                                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 md:hidden cursor-pointer active:scale-95 transition-all"
                            >
                                <Icons.Menu className="w-5 h-5" />
                            </button>
                            
                            <div className="flex flex-col">
                                <h1 className="text-sm font-black text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
                                    <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block animate-pulse" />
                                    {getPageTitle()}
                                </h1>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">
                                    {new Date().toLocaleDateString('ar-SA', { dateStyle: 'full' })}
                                </span>
                            </div>
                        </div>

                        {/* Left: Theme toggle, Notifications Center */}
                        <div className="flex items-center gap-3">
                            
                            {/* Dark/Light Mode Interactive Toggle */}
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#0f1d35] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-amber-400 cursor-pointer transition-all duration-300 shadow-sm hover:scale-105"
                                title={isDarkMode ? 'الوضع المضيء' : 'الوضع المظلم'}
                            >
                                {isDarkMode ? <Icons.Sun className="w-4 h-4" /> : <Icons.Moon className="w-4 h-4" />}
                            </button>

                            {/* Notifications Center Trigger */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                                    className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-[#0f1d35] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all duration-300 shadow-sm hover:scale-105"
                                >
                                    <Icons.Bell className="w-4 h-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -left-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-950 animate-pulse">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notifications Dropdown */}
                                <AnimatePresence>
                                    {isNotifOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 15 }}
                                                className="absolute left-0 mt-3.5 w-80 z-50 bg-white dark:bg-[#0b1626] border border-slate-200/60 dark:border-slate-850 rounded-2xl shadow-xl overflow-hidden"
                                                style={{ boxShadow: 'var(--shadow-premium)' }}
                                            >
                                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800/80">
                                                    <span className="font-black text-xs text-slate-900 dark:text-slate-100">الإشعارات والتنبيهات</span>
                                                    {unreadCount > 0 && (
                                                        <button 
                                                            onClick={() => { 
                                                                logger.system('تصفية وإخلاء جميع الإشعارات.');
                                                                onClearNotifications?.(); 
                                                                setIsNotifOpen(false); 
                                                            }}
                                                            className="text-[10px] text-amber-600 dark:text-amber-400 font-black hover:underline cursor-pointer"
                                                        >
                                                            مسح الكل
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 custom-scrollbar">
                                                    {notifications.length === 0 ? (
                                                        <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                                                            <Icons.BellOff className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                                                            <p className="text-[10px] font-bold">لا توجد تنبيهات معلقة حالياً</p>
                                                        </div>
                                                    ) : (
                                                        notifications.map((notif) => (
                                                            <div key={notif.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/35 transition-colors cursor-pointer ${notif.read ? 'opacity-60' : 'bg-amber-500/5 dark:bg-amber-500/10'}`}>
                                                                <div className="flex gap-3">
                                                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.type === 'approve' ? 'bg-teal-500 shadow-[0_0_10px_rgba(13,148,136,0.5)]' : notif.type === 'reject' ? 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                                                                    <div className="flex-1">
                                                                        <p className="text-xs font-bold leading-normal text-slate-800 dark:text-slate-200">{notif.message}</p>
                                                                        <span className="text-[9px] text-slate-450 dark:text-slate-550 font-bold block mt-1.5">{notif.time}</span>
                                                                    </div>
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
                        </div>
                    </header>
                )}

                {/* Main Content Area - Enforces Container layouts */}
                <main className={`flex-1 ${isEditor ? '' : 'p-6 md:p-8 w-full container-max'}`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25 }}
                            className="h-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
