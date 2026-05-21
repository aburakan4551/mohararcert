import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import Sidebar from './Sidebar'

export default function DashboardLayout({ children, currentUser, onLogout, navItems = [], notifications = [], onClearNotifications }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isNotifOpen, setIsNotifOpen] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || 
               (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    })

    const location = useLocation()
    const isEditor = location.pathname === '/create' || location.pathname === '/settings'

    // Apply dark class to html tag for Tailwind Dark Mode
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [isDarkMode])

    const getPageTitle = () => {
        const path = location.pathname
        const match = navItems.find(item => item.to === path)
        if (match) return match.label
        if (path === '/create') return 'إنشاء شهادة جديدة'
        if (path === '/settings') return 'الإعدادات العامة'
        return 'منصة الشهادات'
    }

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex transition-colors duration-300 font-sans`} style={{ direction: 'rtl' }}>
            {/* Sidebar component */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                navItems={navItems}
                currentUser={currentUser}
                onLogout={onLogout}
            />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isEditor ? '' : 'md:mr-72'}`}>
                
                {/* Header / Top Bar */}
                {!isEditor && (
                    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                        {/* Right: Hamburger + Breadcrumb */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 md:hidden cursor-pointer"
                            >
                                <Icons.Menu className="w-5 h-5" />
                            </button>
                            
                            <div className="flex flex-col">
                                <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
                                    {getPageTitle()}
                                </h1>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                                    {new Date().toLocaleDateString('ar-SA', { dateStyle: 'full' })}
                                </span>
                            </div>
                        </div>

                        {/* Left: Theme toggle, Notifications, Profile */}
                        <div className="flex items-center gap-3">
                            
                            {/* Dark Mode Toggle */}
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-amber-400 cursor-pointer transition-all duration-300 shadow-sm hover:scale-105"
                                title={isDarkMode ? 'الوضع المضيء' : 'الوضع المظلم'}
                            >
                                {isDarkMode ? <Icons.Sun className="w-5 h-5" /> : <Icons.Moon className="w-5 h-5" />}
                            </button>

                            {/* Notifications Center */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                                    className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-all duration-300 shadow-sm hover:scale-105"
                                >
                                    <Icons.Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950 animate-bounce">
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
                                                className="absolute left-0 mt-3 w-80 z-50 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                                            >
                                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-50">التنبيهات</span>
                                                    {unreadCount > 0 && (
                                                        <button 
                                                            onClick={() => { onClearNotifications?.(); setIsNotifOpen(false) }}
                                                            className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                                                        >
                                                            مسح الكل
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
                                                    {notifications.length === 0 ? (
                                                        <div className="p-6 text-center text-slate-400 dark:text-slate-500">
                                                            <Icons.BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                            <p className="text-xs">لا توجد تنبيهات جديدة</p>
                                                        </div>
                                                    ) : (
                                                        notifications.map((notif) => (
                                                            <div key={notif.id} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-900/35 transition-colors cursor-pointer ${notif.read ? 'opacity-60' : 'bg-amber-50/25 dark:bg-amber-500/5'}`}>
                                                                <div className="flex gap-3">
                                                                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.type === 'approve' ? 'bg-emerald-500' : notif.type === 'reject' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                                                    <div className="flex-1">
                                                                        <p className="text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-200">{notif.message}</p>
                                                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium block mt-1">{notif.time}</span>
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

                {/* Main Content Area */}
                <main className={`flex-1 ${isEditor ? '' : 'p-6 md:p-8'}`}>
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
    )
}
