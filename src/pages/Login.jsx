import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Award, ShieldAlert, Key, User, Eye, EyeOff,
    FileCheck, Users, ShieldCheck, TrendingUp, CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/debug';

export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [shake, setShake] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        if (user) {
            logger.nav('جلسة نشطة — توجيه إلى لوحة التحكم');
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
        if (!email) { triggerError('يرجى إدخال البريد الإلكتروني'); return; }
        if (!password) { triggerError('يرجى إدخال كلمة المرور'); return; }

        setSubmitting(true);
        logger.auth(`محاولة دخول: ${email}`);
        try {
            await login(email, password);
            logger.auth('مصادقة ناجحة');
            navigate('/dashboard');
        } catch (err) {
            logger.error('فشل الدخول', err);
            triggerError(err.message || 'بيانات الدخول غير صحيحة');
        } finally {
            setSubmitting(false);
        }
    };

    const demoAccounts = [
        { role: 'منشئ المعاملات', email: 'creator@moh.gov.sa', icon: '✍️', color: 'var(--color-primary-600)' },
        { role: 'مساعد المدير', email: 'assistant@moh.gov.sa', icon: '🔏', color: 'var(--color-accent-500)' },
        { role: 'المدير العام', email: 'manager@moh.gov.sa', icon: '👑', color: '#F59E0B' },
        { role: 'المشرف العام', email: 'admin@moh.gov.sa', icon: '🛡️', color: '#8B5CF6' },
    ];

    const kpis = [
        { label: 'إجمالي المعاملات', value: '0', icon: FileCheck, color: 'var(--color-primary-600)', bg: 'rgba(15,169,88,0.10)' },
        { label: 'مستخدم نشط', value: '0', icon: Users, color: 'var(--color-accent-500)', bg: 'rgba(30,136,229,0.10)' },
        { label: 'معدل الاعتماد', value: '0%', icon: TrendingUp, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
        { label: 'شهادة معتمدة', value: '0', icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
    ];

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                direction: 'rtl',
                background: '#F5F7FA',
                fontFamily: 'var(--font-sans)',
            }}
        >
            {/* ══════════ LEFT PANEL — Branding & KPIs ══════════ */}
            <div
                style={{
                    flex: '0 0 45%',
                    background: 'linear-gradient(145deg, #0d7a3e 0%, #0FA958 40%, #1E88E5 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '48px 52px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
                className="hidden lg:flex"
            >
                {/* Background decorative blobs */}
                <div style={{
                    position: 'absolute', top: '-15%', right: '-15%',
                    width: '55%', height: '55%',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-20%', left: '-10%',
                    width: '60%', height: '60%',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '50%',
                    filter: 'blur(80px)',
                    pointerEvents: 'none',
                }} />
                {/* Grid overlay */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                    pointerEvents: 'none',
                }} />

                {/* ── Logo & Title ── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ position: 'relative', zIndex: 2 }}
                >
                    {/* Icon */}
                    <div style={{
                        width: 72, height: 72,
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(8px)',
                        border: '1.5px solid rgba(255,255,255,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '24px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    }}>
                        <Award size={38} color="white" strokeWidth={1.5} />
                    </div>

                    {/* Badge */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '5px 14px',
                        borderRadius: '999px',
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.30)',
                        marginBottom: '16px',
                    }}>
                        <ShieldCheck size={13} color="rgba(255,255,255,0.9)" />
                        <span style={{
                            fontSize: '11px', fontWeight: 700,
                            color: 'rgba(255,255,255,0.95)',
                            letterSpacing: '0.04em',
                        }}>
                            بوابة المعاملات الرقمية الرسمية
                        </span>
                    </div>

                    <h1 style={{
                        fontSize: '2rem', fontWeight: 900, color: 'white',
                        lineHeight: 1.25, marginBottom: '8px',
                        textShadow: '0 2px 12px rgba(0,0,0,0.15)',
                    }}>
                        إدارة التميز المؤسسي
                    </h1>
                    <p style={{
                        fontSize: '14px', fontWeight: 600,
                        color: 'rgba(255,255,255,0.80)',
                        marginBottom: '8px',
                    }}>
                        فرع وزارة الصحة — منطقة الحدود الشمالية
                    </p>
                    <p style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1.7,
                        maxWidth: '420px',
                        fontWeight: 400,
                        marginBottom: '40px',
                    }}>
                        منصة إلكترونية حكومية متكاملة لإصدار وتدقيق واعتماد الشهادات والمعاملات الإدارية الرسمية.
                    </p>

                    {/* ── KPI Mini Cards ── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                    }}>
                        {kpis.map((kpi, i) => {
                            const Icon = kpi.icon;
                            return (
                                <motion.div
                                    key={kpi.label}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 + i * 0.08 }}
                                    style={{
                                        background: 'rgba(255,255,255,0.14)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}
                                >
                                    <div style={{
                                        width: 38, height: 38,
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.20)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <Icon size={18} color="white" strokeWidth={1.75} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '17px', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                                            {kpi.value}
                                        </p>
                                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.72)', fontWeight: 600, marginTop: '3px' }}>
                                            {kpi.label}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* ══════════ RIGHT PANEL — Login Form ══════════ */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
                background: '#F5F7FA',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ width: '100%', maxWidth: '440px' }}
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden" style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{
                            width: 56, height: 56,
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #0FA958, #1E88E5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px',
                            boxShadow: '0 8px 24px rgba(15,169,88,0.30)',
                        }}>
                            <Award size={28} color="white" strokeWidth={1.5} />
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                            إدارة التميز المؤسسي
                        </p>
                    </div>

                    {/* Card */}
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        border: '1px solid var(--border-default)',
                        boxShadow: '0 10px 35px rgba(0,0,0,0.08)',
                        padding: '36px 36px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Top accent line */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                            background: 'linear-gradient(90deg, #0FA958, #1E88E5)',
                        }} />

                        <div style={{ marginBottom: '28px' }}>
                            <h2 style={{
                                fontSize: '20px', fontWeight: 900,
                                color: 'var(--text-primary)',
                                marginBottom: '6px',
                            }}>
                                تسجيل الدخول
                            </h2>
                            <p style={{
                                fontSize: '13px', color: 'var(--text-muted)',
                                fontWeight: 500,
                            }}>
                                أدخل بيانات حسابك للوصول إلى المنصة
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                                {/* Email */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{
                                        fontSize: '13px', fontWeight: 700,
                                        color: 'var(--text-secondary)',
                                    }}>
                                        البريد الإلكتروني
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <User
                                            size={16}
                                            style={{
                                                position: 'absolute', right: '14px', top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'var(--text-muted)', pointerEvents: 'none',
                                            }}
                                        />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => { setEmail(e.target.value); setError(''); }}
                                            disabled={submitting}
                                            placeholder="username@moh.gov.sa"
                                            autoComplete="email"
                                            style={{
                                                width: '100%',
                                                padding: '11px 44px 11px 14px',
                                                background: '#F9FAFB',
                                                border: `1.5px solid ${error && !password ? '#EF4444' : 'rgba(0,0,0,0.10)'}`,
                                                borderRadius: '12px',
                                                fontFamily: 'var(--font-sans)',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                color: 'var(--text-primary)',
                                                direction: 'ltr',
                                                outline: 'none',
                                                transition: 'all 0.15s',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = '#0FA958'; e.target.style.boxShadow = '0 0 0 3px rgba(15,169,88,0.12)'; e.target.style.background = 'white'; }}
                                            onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.10)'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F9FAFB'; }}
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{
                                            fontSize: '13px', fontWeight: 700,
                                            color: 'var(--text-secondary)',
                                        }}>
                                            كلمة المرور
                                        </label>
                                        <button
                                            type="button"
                                            style={{
                                                fontSize: '12px', fontWeight: 700,
                                                color: 'var(--color-primary-600)',
                                                background: 'none', border: 'none',
                                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                            }}
                                        >
                                            نسيت كلمة المرور؟
                                        </button>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <Key
                                            size={16}
                                            style={{
                                                position: 'absolute', right: '14px', top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'var(--text-muted)', pointerEvents: 'none',
                                            }}
                                        />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => { setPassword(e.target.value); setError(''); }}
                                            disabled={submitting}
                                            placeholder="••••••••••••"
                                            autoComplete="current-password"
                                            style={{
                                                width: '100%',
                                                padding: '11px 44px',
                                                background: '#F9FAFB',
                                                border: `1.5px solid ${error ? '#EF4444' : 'rgba(0,0,0,0.10)'}`,
                                                borderRadius: '12px',
                                                fontFamily: 'var(--font-sans)',
                                                fontSize: '14px',
                                                fontWeight: 500,
                                                color: 'var(--text-primary)',
                                                direction: 'ltr',
                                                outline: 'none',
                                                transition: 'all 0.15s',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = '#0FA958'; e.target.style.boxShadow = '0 0 0 3px rgba(15,169,88,0.12)'; e.target.style.background = 'white'; }}
                                            onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.10)'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F9FAFB'; }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            style={{
                                                position: 'absolute', left: '14px', top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none', border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                                display: 'flex', alignItems: 'center',
                                            }}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Remember Me */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="rememberMe"
                                        checked={rememberMe}
                                        onChange={e => setRememberMe(e.target.checked)}
                                        style={{
                                            width: 16, height: 16,
                                            accentColor: '#0FA958',
                                            cursor: 'pointer',
                                        }}
                                    />
                                    <label
                                        htmlFor="rememberMe"
                                        style={{
                                            fontSize: '13px', fontWeight: 600,
                                            color: 'var(--text-tertiary)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        تذكرني لمدة 30 يوم
                                    </label>
                                </div>

                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0, x: shake ? [0, -8, 8, -8, 8, 0] : 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: shake ? 0.4 : 0.2 }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '12px 14px',
                                                background: 'rgba(239,68,68,0.06)',
                                                border: '1px solid rgba(239,68,68,0.18)',
                                                borderRadius: '12px',
                                                color: '#DC2626',
                                                fontSize: '13px', fontWeight: 600,
                                            }}
                                        >
                                            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                                            <span>{error}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        width: '100%',
                                        padding: '13px',
                                        background: submitting
                                            ? 'rgba(15,169,88,0.6)'
                                            : 'linear-gradient(135deg, #0d7a3e, #0FA958)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '14px',
                                        fontSize: '15px', fontWeight: 800,
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                        boxShadow: submitting ? 'none' : '0 8px 24px rgba(15,169,88,0.30)',
                                        fontFamily: 'var(--font-sans)',
                                    }}
                                    onMouseEnter={e => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,169,88,0.40)'; } }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = submitting ? 'none' : '0 8px 24px rgba(15,169,88,0.30)'; }}
                                >
                                    {submitting ? (
                                        <>
                                            <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                                            جارٍ التحقق...
                                        </>
                                    ) : (
                                        'دخول المنصة'
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Demo Accounts */}
                        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-default)' }}>
                            <p style={{
                                fontSize: '11px', fontWeight: 700,
                                color: 'var(--text-muted)',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                marginBottom: '12px',
                            }}>
                                حسابات تجريبية للاختبار
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {demoAccounts.map(acc => (
                                    <button
                                        key={acc.email}
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => {
                                            setEmail(acc.email);
                                            setPassword('Aa@0555386421');
                                            setError('');
                                            logger.auth(`حساب تجريبي: ${acc.email}`);
                                        }}
                                        style={{
                                            padding: '9px 10px',
                                            borderRadius: '10px',
                                            background: '#F9FAFB',
                                            border: '1.5px solid rgba(0,0,0,0.07)',
                                            fontSize: '11px', fontWeight: 700,
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            textAlign: 'center',
                                            fontFamily: 'var(--font-sans)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(15,169,88,0.06)';
                                            e.currentTarget.style.borderColor = 'rgba(15,169,88,0.20)';
                                            e.currentTarget.style.color = 'var(--color-primary-700)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = '#F9FAFB';
                                            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)';
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                        }}
                                    >
                                        <span>{acc.icon}</span>
                                        <span>{acc.role}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p style={{
                        textAlign: 'center',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                        marginTop: '20px',
                    }}>
                        منصة إدارة التميز المؤسسي · فرع وزارة الصحة بمنطقة الحدود الشمالية © {new Date().getFullYear()}
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
