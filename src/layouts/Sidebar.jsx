/**
 * 🗂️ Sidebar.jsx
 * Collapsible SaaS Navigation & Access Control Sidebar.
 * Desktop: Collapses between 280px (w-72) and 80px (w-20) with live tooltip popouts.
 * Mobile: Backdrop-blur swipable drawer.
 */

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { logger } from '../utils/debug';

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse, navItems = [], currentUser = null, onLogout }) {
    const [isMobile, setIsMobile] = useState(false);

    // Track screen resizing dynamically to adapt collapsible drawers
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Dynamic icon fetch helper
    const getIcon = (iconName) => {
        const IconComponent = Icons[iconName] || Icons.HelpCircle;
        return <IconComponent className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />;
    };

    return (
        <>
            {/* Mobile Touch Overlay */}
            {isOpen && isMobile && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
                />
            )}

            {/* Sidebar Navigation Panel */}
            <motion.aside
                initial={isMobile ? { x: '100%' } : { x: 0 }}
                animate={{ x: isMobile ? (isOpen ? 0 : '100%') : 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className={`fixed top-0 right-0 z-50 flex flex-col ${isCollapsed && !isMobile ? 'md:w-20' : 'md:w-72'} w-72 h-screen text-white bg-radial from-[#0f213b] to-[#071020] border-l border-white/5 shadow-2xl transition-all duration-300 md:translate-x-0 md:flex`}
                style={{ direction: 'rtl' }}
            >
                {/* Logo and Institution Title Section */}
                <div className="flex flex-col items-center justify-center py-8 border-b border-white/5 relative overflow-hidden group">
                    {/* Floating collapse chevron button on desktop */}
                    {!isMobile && (
                        <button
                            onClick={onToggleCollapse}
                            className="absolute bottom-4 left-4 w-7 h-7 rounded-lg bg-slate-900/90 border border-white/10 text-amber-500 flex items-center justify-center cursor-pointer shadow-md hover:text-amber-400 active:scale-95 transition-all z-50 hover:bg-slate-950"
                            title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
                        >
                            {isCollapsed ? <Icons.ChevronLeft className="w-4 h-4" /> : <Icons.ChevronRight className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Glowing gold ambient background blob */}
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-700 pointer-events-none" />
                    
                    <motion.div 
                        whileHover={{ rotate: 10, scale: 1.05 }}
                        className="flex items-center justify-center w-14 h-14 mb-3 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[0_0_20px_rgba(201,162,39,0.25)] flex-shrink-0"
                    >
                        <Icons.Award className="w-8 h-8 text-slate-950 stroke-[1.8]" />
                    </motion.div>
                    
                    {/* Hide descriptions when collapsed on desktop */}
                    {(!isCollapsed || isMobile) ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center"
                        >
                            <h2 className="text-sm font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100">
                                إدارة التميز المؤسسي
                            </h2>
                            <span className="text-[9px] text-amber-550/80 font-black uppercase tracking-wider block mt-0.5">
                                صحة الحدود الشمالية
                            </span>
                        </motion.div>
                    ) : (
                        <span className="text-[9px] text-amber-500 font-bold">MOH</span>
                    )}
                </div>

                {/* Navigation Items Menu */}
                <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-1.5 custom-scrollbar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => {
                                logger.nav(`الموجّه: جاري الانتقال إلى ${item.label} (${item.to})`);
                                onClose();
                            }}
                            className={({ isActive }) => `
                                group flex items-center ${isCollapsed && !isMobile ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3.5 rounded-xl transition-all duration-300 font-bold text-xs relative
                                ${isActive 
                                    ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-300 border-r-4 border-amber-500' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-r-4 border-transparent'
                                }
                            `}
                        >
                            <span className="text-current flex-shrink-0">{getIcon(item.icon)}</span>
                            
                            {/* Render label or tooltips depending on collapsed state */}
                            {(!isCollapsed || isMobile) ? (
                                <span className="tracking-wide truncate">{item.label}</span>
                            ) : (
                                <div className="absolute right-auto left-20 scale-0 group-hover:scale-100 transition-all duration-200 z-50 bg-[#070e1b] border border-white/5 text-slate-200 text-[10px] font-black py-2 px-3.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap">
                                    {item.label}
                                </div>
                            )}
                            
                            {/* Hover Micro-light beam animation */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </NavLink>
                    ))}
                </nav>

                {/* User Section / Footer Profile */}
                <div className="p-3 border-t border-white/5 bg-black/20">
                    {currentUser && (
                        <div className={`flex items-center ${isCollapsed && !isMobile ? 'justify-center p-1' : 'gap-3 p-3'} mb-3 rounded-2xl bg-white/5 border border-white/5`}>
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/20 text-amber-400 font-black text-xs border border-amber-500/10 flex-shrink-0">
                                {currentUser.name ? currentUser.name.charAt(0) : 'م'}
                            </div>
                            
                            {(!isCollapsed || isMobile) && (
                                <div className="flex-1 min-w-0 text-right">
                                    <h4 className="text-xs font-black truncate text-slate-100 leading-normal">{currentUser.name || 'مستخدم النظام'}</h4>
                                    <span className="text-[8px] text-amber-400/90 font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 inline-block mt-1 truncate">
                                        {currentUser.role === 'SUPER_ADMIN' ? 'المشرف العام' : 
                                         currentUser.role === 'CREATOR' ? 'منشئ المعاملات' : 'مساعد المدير'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Logout Button */}
                    <button
                        onClick={() => {
                            logger.auth('تم تسجيل الخروج، جاري توجيه جلسة الاتصال...');
                            onLogout();
                        }}
                        className={`flex items-center justify-center ${isCollapsed && !isMobile ? 'p-3' : 'gap-2 py-3 px-4'} w-full rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 font-black text-xs transition-all duration-350 cursor-pointer shadow-md`}
                        title="تسجيل الخروج"
                    >
                        <Icons.LogOut className="w-4 h-4 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </motion.aside>
        </>
    );
}
