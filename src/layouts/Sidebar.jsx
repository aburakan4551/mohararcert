/**
 * 🗂️ Sidebar.jsx
 * Responsive Navigation and Role-Based Access Sidebar Component.
 * Resolves the Framer Motion offscreen layout translation bug, integrates detailed diagnostic logging,
 * and displays styled Saudi MoH active states and user profile context.
 */

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { logger } from '../utils/debug';

export default function Sidebar({ isOpen, onClose, navItems = [], currentUser = null, onLogout }) {
    const [isMobile, setIsMobile] = useState(false);

    // Track dynamic screen resizing to toggle responsive drawer behavior safely
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper to dynamically render Lucide icons with smooth active scales
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

            {/* Sidebar Navigation Panel Container */}
            <motion.aside
                initial={isMobile ? { x: '100%' } : { x: 0 }}
                animate={{ x: isMobile ? (isOpen ? 0 : '100%') : 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 210 }}
                className={`fixed top-0 right-0 z-50 flex flex-col w-72 h-screen text-white bg-radial from-[#0f213b] to-[#071020] border-l border-white/5 shadow-2xl transition-all duration-300 md:translate-x-0 md:flex`}
                style={{ direction: 'rtl' }}
            >
                {/* Logo and Institution Title Branding */}
                <div className="flex flex-col items-center justify-center py-8 border-b border-white/5 relative overflow-hidden group">
                    {/* Glowing golden ambient blob */}
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-700 pointer-events-none" />
                    
                    <motion.div 
                        whileHover={{ rotate: 12, scale: 1.08 }}
                        className="flex items-center justify-center w-16 h-16 mb-3.5 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[0_0_25px_rgba(201,162,39,0.3)]"
                    >
                        <Icons.Award className="w-9 h-9 text-slate-950 stroke-[1.8]" />
                    </motion.div>
                    
                    <h2 className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100">
                        إدارة التميز المؤسسي
                    </h2>
                    <span className="text-[10px] text-amber-500/80 font-black uppercase tracking-widest mt-1">
                        صحة الحدود الشمالية
                    </span>
                </div>

                {/* Navigation Menu List */}
                <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5 custom-scrollbar">
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
                                group flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-300 font-bold text-xs relative overflow-hidden
                                ${isActive 
                                    ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-300 border-r-4 border-amber-500 shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-r-4 border-transparent'
                                }
                            `}
                        >
                            <span className="text-current">{getIcon(item.icon)}</span>
                            <span className="tracking-wide">{item.label}</span>
                            
                            {/* Hover Micro-light Beam Slide Animation */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </NavLink>
                    ))}
                </nav>

                {/* User Section Footer Profile */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    {currentUser && (
                        <div className="flex items-center gap-3 p-3.5 mb-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/20 text-amber-400 font-black text-sm border border-amber-500/10">
                                {currentUser.name ? currentUser.name.charAt(0) : 'م'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-black truncate text-slate-100 leading-normal">{currentUser.name || 'مستخدم النظام'}</h4>
                                <span className="text-[9px] text-amber-400/90 font-black px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 inline-block mt-1 uppercase tracking-wide">
                                    {currentUser.role === 'SUPER_ADMIN' ? 'المشرف العام' : 
                                     currentUser.role === 'CREATOR' ? 'منشئ المعاملات' : 
                                     currentUser.role === 'ASSISTANT_MANAGER' ? 'مساعد المدير' : 
                                     currentUser.role === 'GENERAL_MANAGER' ? 'المدير العام' : 'صلاحية المنصة'}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    {/* Logout Trigger Button */}
                    <button
                        onClick={() => {
                            logger.auth('تم الضغط على زر تسجيل الخروج، جاري إنهاء الجلسة...');
                            onLogout();
                        }}
                        className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 font-black text-xs transition-all duration-300 cursor-pointer shadow-md hover:shadow-rose-950/20 active:scale-[0.98]"
                    >
                        <Icons.LogOut className="w-4 h-4" />
                        <span>تسجيل الخروج</span>
                    </button>
                    
                    <div className="text-center text-[9px] text-slate-500 mt-3.5 font-bold tracking-wide">
                        إدارة التميز المؤسسي | صحة الحدود الشمالية
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
