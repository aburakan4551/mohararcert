/**
 * 🔐 Login.jsx
 * Enterprise luxury login interface for mohararcert.
 * Features dark-mode aesthetics, custom micro-animations, and one-click demo profiles.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, ShieldAlert, Key, User, ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_PROFILES = [
    {
        email: 'creator@platform.gov.sa',
        role: 'CREATOR',
        name: 'سليمان الحربي',
        title: 'منشئ المعاملات والشهادات',
        avatar: '✍️',
        bg: 'from-blue-500/10 to-indigo-500/5 border-blue-500/25 text-blue-400'
    },
    {
        email: 'assistant@platform.gov.sa',
        role: 'ASSISTANT_MANAGER',
        name: 'مساعد المدير العام للتخطيط',
        title: 'مراجعة وتأشير المعاملات',
        avatar: '🔏',
        bg: 'from-purple-500/10 to-pink-500/5 border-purple-500/25 text-purple-400'
    },
    {
        email: 'manager@platform.gov.sa',
        role: 'GENERAL_MANAGER',
        name: 'د. خالد السديري',
        title: 'الاعتماد والمصادقة النهائية',
        avatar: '👑',
        bg: 'from-amber-500/10 to-yellow-500/5 border-amber-500/25 text-amber-400'
    },
    {
        email: 'admin@platform.gov.sa',
        role: 'SUPER_ADMIN',
        name: 'عبد العزيز الرويلي',
        title: 'التحكم الكامل والتدقيق الأمني',
        avatar: '🛡️',
        bg: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/25 text-emerald-400'
    }
];

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('Aa@0555386421');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        
        if (!email) {
            setError('يرجى تحديد حساب أو إدخال البريد الإلكتروني');
            return;
        }

        setSubmitting(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuickSelect = (profile) => {
        setEmail(profile.email);
        setError('');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans" style={{ direction: 'rtl' }}>
            {/* Background design elements */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-amber-600/10 rounded-full blur-[160px] pointer-events-none" />

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                
                {/* Right Column: Title and Quick Select Profiles */}
                <div className="lg:col-span-7 flex flex-col justify-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                            <Award className="w-8 h-8 text-slate-950" />
                        </div>
                        <div>
                            <span className="text-xs font-black tracking-widest text-amber-500 uppercase">المنصة المؤسسية المعتمدة</span>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent mt-0.5">محرّر واعتماد الشهادات الرقمية</h1>
                        </div>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                        نظام متكامل حائز على ثقة الجهات الحكومية والمؤسسات الفيدرالية لإصدار، ومراجعة، واعتماد الشهادات الرسمية عبر دورة معاملات مشددة مع تتبع البصمة الزمنية (Audit Trail) والأختام والتواقيع الرقمية المشفرة.
                    </p>

                    <div>
                        <h3 className="text-xs font-bold text-amber-500/70 tracking-widest uppercase mb-4 flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4" />
                            بوابات الدخول السريع (بيئة التطوير والتقييم)
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {MOCK_PROFILES.map((profile) => (
                                <button
                                    key={profile.email}
                                    onClick={() => handleQuickSelect(profile)}
                                    className={`flex items-start gap-3.5 p-4 rounded-2xl border text-right transition-all duration-300 cursor-pointer bg-gradient-to-b ${profile.bg} ${email === profile.email ? 'ring-2 ring-amber-500 scale-[1.02] border-amber-500/50 shadow-lg shadow-black/20' : 'hover:scale-[1.01] hover:border-slate-800'}`}
                                >
                                    <span className="text-2xl mt-0.5 block">{profile.avatar}</span>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black text-slate-200">{profile.name}</h4>
                                        <p className="text-[11px] text-slate-400 mt-0.5">{profile.title}</p>
                                        <span className="text-[9px] font-mono text-slate-500 block mt-1.5">{profile.email}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Left Column: Form Card */}
                <div className="lg:col-span-5">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/55 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                    >
                        {/* Subtle inner top glow */}
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-slate-100">بوابة المصادقة</h2>
                            <p className="text-xs text-slate-500 mt-1">الرجاء تحديد الحساب وتعبئة المعطيات الأمنية</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Input Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 block">البريد الإلكتروني للعمل</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500">
                                        <User className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-semibold outline-none text-slate-200 transition-all placeholder-slate-600 text-left"
                                        placeholder="user@platform.gov.sa"
                                        style={{ direction: 'ltr' }}
                                    />
                                </div>
                            </div>

                            {/* Input Password */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 block">كلمة المرور الأمنية</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500">
                                        <Key className="w-4 h-4" />
                                    </span>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setError('');
                                        }}
                                        className="w-full pl-4 pr-11 py-3 bg-slate-950/80 border border-slate-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-semibold outline-none text-slate-200 transition-all placeholder-slate-600 text-left"
                                        placeholder="••••••••••••"
                                        style={{ direction: 'ltr' }}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold animate-shake">
                                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3.5 px-4 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all duration-300 cursor-pointer text-center"
                            >
                                {submitting ? '⏳ مصادقة...' : 'دخول للمنصة'}
                            </button>
                        </form>
                    </motion.div>
                </div>

            </div>
        </div>
    );
}
