/**
 * 🔐 Login.jsx
 * Enterprise luxury login interface for mohararcert.
 * Features dark-mode aesthetics, custom micro-animations.
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, ShieldAlert, Key, User, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        
        if (!email) {
            setError('يرجى إدخال البريد الإلكتروني');
            return;
        }

        if (!password) {
            setError('يرجى إدخال كلمة المرور');
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans" style={{ direction: 'rtl' }}>
            {/* Background design elements */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-amber-600/10 rounded-full blur-[160px] pointer-events-none" />

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
                
                {/* Right Column: Title and Platform Details */}
                <div className="md:col-span-6 flex flex-col justify-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                            <Award className="w-8 h-8 text-slate-950" />
                        </div>
                        <div>
                            <span className="text-xs font-black tracking-widest text-amber-500 uppercase">بوابة المعاملات الرقمية الرسمية</span>
                            <h1 className="text-2xl font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent mt-0.5">إدارة التميز المؤسسي بفرع وزارة الصحة بمنطقة الحدود الشمالية</h1>
                        </div>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                        النظام المعتمد لإصدار ومراجعة واعتماد الشهادات والمعاملات الرسمية تحت إشراف وتدقيق إدارة التميز المؤسسي لضمان أعلى معايير الجودة والحوكمة التنظيمية.
                    </p>

                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-slate-400 text-xs font-semibold">
                        <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <span>يتوافق هذا النظام بالكامل مع معايير الحوكمة والخصوصية لفرع وزارة الصحة بمنطقة الحدود الشمالية.</span>
                    </div>
                </div>

                {/* Left Column: Form Card */}
                <div className="md:col-span-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/55 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                    >
                        {/* Subtle inner top glow */}
                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-slate-100">بوابة المصادقة</h2>
                            <p className="text-xs text-slate-500 mt-1">الرجاء إدخال البريد الإلكتروني للعمل وكلمة المرور الأمنية</p>
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
                                        placeholder="user@moh.gov.sa"
                                        style={{ direction: 'ltr' }}
                                        required
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
                                        required
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
