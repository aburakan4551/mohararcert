import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Award, ShieldAlert, Key, User, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

// Presentation imports
import { Card, CardContent } from '../ui/cards/Card';
import { Input, Label } from '../ui/forms/Input';
import { Button } from '../ui/components/Button';

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [shake, setShake] = useState(false);

    // Redirect logged-in users
    useEffect(() => {
        if (user) {
            logger.nav('تم الكشف عن جلسة مستخدم نشطة ومصادقة، جاري التوجيه التلقائي إلى لوحة التحكم...');
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    const triggerError = (msg) => {
        setError(msg);
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        
        if (!email) {
            triggerError('يرجى إدخال البريد الإلكتروني للعمل');
            return;
        }

        if (!password) {
            triggerError('يرجى إدخال كلمة المرور الأمنية');
            return;
        }

        setSubmitting(true);
        logger.auth(`بدء إرسال بيانات المصادقة للبريد: ${email}`);

        try {
            await login(email, password);
            logger.auth('تمت المصادقة بنجاح. جاري تشغيل الموجه والتحويل إلى الصفحة الرئيسية /dashboard...');
            navigate('/dashboard');
        } catch (err) {
            logger.error(`فشلت محاولة المصادقة بسبب خطأ: ${err.message}`, err);
            triggerError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050a14] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none" style={{ direction: 'rtl' }}>
            {/* Dynamic Background Animated Ambient Blobs */}
            <div className="absolute top-[-30%] right-[-20%] w-[80%] h-[80%] bg-gradient-to-br from-[#0c2f1f]/20 via-[#0d2a4a]/20 to-transparent rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-30%] left-[-20%] w-[80%] h-[80%] bg-gradient-to-tr from-[#9b7b1a]/5 via-[#0c251d]/15 to-transparent rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }} />
            
            {/* Mesh Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                
                {/* Right Column: High-End Government Identity */}
                <div className="lg:col-span-6 flex flex-col justify-center gap-8 text-right p-2 md:p-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#9b7b1a]/15 border border-[#9b7b1a]/30 text-amber-300 text-xs font-black w-fit">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>بوابة المعاملات الرقمية الرسمية والاعتمادات</span>
                        </div>
                        
                        <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-[0_0_40px_rgba(201,162,39,0.35)] flex-shrink-0">
                                <Award className="w-10 h-10 text-slate-950 stroke-[1.8]" />
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-black tracking-tight leading-snug bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                                    إدارة التميز المؤسسي
                                </h1>
                                <p className="text-sm font-bold text-amber-500/90 tracking-wide uppercase">
                                    فرع وزارة الصحة بمنطقة الحدود الشمالية
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-slate-400 leading-relaxed max-w-lg font-medium">
                        بوابة التوثيق الفنية المعتمدة لإصدار وتدقيق وتأشير المعاملات والشهادات الإدارية تحت إشراف الجودة والحوكمة المؤسسية المعتمدة لفرع الوزارة بالمنطقة.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 hover:border-slate-800/80 transition-all duration-300">
                            <h4 className="text-amber-500 font-black text-xs mb-1">المصداقية الرقمية</h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed">شهادات مشفرة بالكامل تحتوي على معرفات أمنية فريدة غير قابلة للتلاعب.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-800/40 hover:border-slate-800/80 transition-all duration-300">
                            <h4 className="text-teal-400 font-black text-xs mb-1">حوكمة متكاملة</h4>
                            <p className="text-[11px] text-slate-500 leading-relaxed">تكامل المسار الإداري من المنشئ إلى مراجع الاعتماد والمدير العام بالتوقيع الحيوي.</p>
                        </div>
                    </div>
                </div>

                {/* Left Column: Glassmorphism Card */}
                <div className="lg:col-span-6 flex justify-center">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="w-full max-w-md"
                    >
                        <Card className="border border-slate-800/60 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                            
                            <CardContent className="p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-black tracking-tight text-white">بوابة التحقق الآمن</h2>
                                    <p className="text-xs text-slate-400 mt-1.5 font-medium">سجل الدخول باستخدام بريدك الإلكتروني والرمز السري</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Email */}
                                    <div className="space-y-2">
                                        <Label>البريد الإلكتروني المهني</Label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setError('');
                                            }}
                                            disabled={submitting}
                                            placeholder="username@moh.gov.sa"
                                            style={{ direction: 'ltr' }}
                                            required
                                            leftIcon={User}
                                        />
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>كلمة المرور الأمنية</Label>
                                            <span className="text-[10px] text-amber-500/60 font-bold hover:text-amber-400 cursor-pointer transition-colors">نسيت كلمة المرور؟</span>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    setError('');
                                                }}
                                                disabled={submitting}
                                                placeholder="••••••••••••"
                                                style={{ direction: 'ltr' }}
                                                required
                                                leftIcon={Key}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-350 transition-colors cursor-pointer"
                                                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Errors */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0, x: shake ? [0, -10, 10, -10, 10, 0] : 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: shake ? 0.4 : 0.2 }}
                                                className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold"
                                            >
                                                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <span>{error}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Action Button */}
                                    <Button
                                        type="submit"
                                        isLoading={submitting}
                                        variant="accent"
                                        className="w-full py-3.5 font-bold"
                                    >
                                        دخول للمنصة
                                    </Button>

                                    {/* Simulate Account Grid */}
                                    <div className="pt-5 border-t border-slate-800/40 mt-6">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center">
                                            بوابة محاكاة الحسابات الرسمية للاختبار
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { role: 'منشئ المعاملات', email: 'creator@moh.gov.sa', emoji: '✍️' },
                                                { role: 'المساعد للتخطيط', email: 'assistant@moh.gov.sa', emoji: '🔏' },
                                                { role: 'المدير العام', email: 'manager@moh.gov.sa', emoji: '👑' },
                                                { role: 'المشرف العام', email: 'admin@moh.gov.sa', emoji: '🛡️' }
                                            ].map((acc) => (
                                                <button
                                                    key={acc.email}
                                                    type="button"
                                                    onClick={() => {
                                                        setEmail(acc.email);
                                                        setPassword('Aa@0555386421');
                                                        setError('');
                                                        logger.auth(`Pre-seeded account credentials selected: ${acc.email}`);
                                                    }}
                                                    disabled={submitting}
                                                    className="py-2 px-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-amber-500 hover:text-amber-400 transition-all text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {acc.emoji} {acc.role}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

            </div>
        </div>
    );
}
