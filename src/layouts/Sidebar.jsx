import React from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'

export default function Sidebar({ isOpen, onClose, navItems = [], currentUser = null, onLogout }) {
    // Helper to dynamically get Lucide icons
    const getIcon = (iconName) => {
        const IconComponent = Icons[iconName] || Icons.HelpCircle
        return <IconComponent className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
                />
            )}

            {/* Sidebar Container */}
            <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: isOpen ? 0 : '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`fixed top-0 right-0 z-50 flex flex-col w-72 h-screen text-white bg-radial from-[#0f1f38] to-[#071123] border-l border-white/10 shadow-2xl transition-all duration-300 md:translate-x-0 md:flex`}
                style={{ direction: 'rtl' }}
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center justify-center py-8 border-b border-white/5 relative overflow-hidden group">
                    {/* Decorative gold gradient blob */}
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-700" />
                    
                    <motion.div 
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        className="flex items-center justify-center w-16 h-16 mb-3 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                    >
                        <Icons.Award className="w-9 h-9 text-slate-950" />
                    </motion.div>
                    <h2 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
                        إدارة التميز المؤسسي
                    </h2>
                    <span className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest mt-1">
                        صحة الحدود الشمالية
                    </span>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5 custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={onClose}
                            className={({ isActive }) => `
                                group flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm relative overflow-hidden
                                ${isActive 
                                    ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-300 border-r-4 border-amber-500 shadow-[inset_1px_0_0_rgba(255,255,255,0.05)]' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-r-4 border-transparent'
                                }
                            `}
                        >
                            <span className="text-current">{getIcon(item.icon)}</span>
                            <span>{item.label}</span>
                            
                            {/* Hover effect micro-light */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </NavLink>
                    ))}
                </nav>

                {/* User Section / Footer */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    {currentUser && (
                        <div className="flex items-center gap-3 p-3 mb-3 rounded-xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-400 font-bold">
                                {currentUser.name ? currentUser.name.charAt(0) : 'م'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold truncate text-slate-200">{currentUser.name || 'مستخدم النظام'}</h4>
                                <span className="text-[10px] text-amber-500/80 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 inline-block mt-0.5">
                                    {currentUser.roleLabel || 'صلاحية عامة'}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 font-bold text-sm transition-all duration-300 cursor-pointer shadow-lg hover:shadow-rose-950/20"
                    >
                        <Icons.LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                    </button>
                    
                    <div className="text-center text-[10px] text-slate-500 mt-3 font-semibold">
                        إدارة التميز المؤسسي | صحة الحدود الشمالية
                    </div>
                </div>
            </motion.aside>
        </>
    )
}
