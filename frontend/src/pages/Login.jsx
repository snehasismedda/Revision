import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react';

import toast from 'react-hot-toast';

const Login = () => {
    const { login, forgotPassword } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const loadingToast = toast.loading('Authenticating...');
        try {
            await login(form);
            toast.success('Welcome back!', { id: loadingToast });
            navigate('/');
        } catch (err) {
            const msg = err.message || 'Failed to login';
            setError(msg);
            toast.error(msg, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!form.email) {
            toast.error('Please enter your email address to reset your password');
            return;
        }
        setResetLoading(true);
        const loadingToast = toast.loading('Sending reset email...');
        try {
            const data = await forgotPassword({ email: form.email });
            toast.success('Password reset email sent!', { id: loadingToast });

            // If smart developer mode (Ethereal Preview URL exists), open it automatically
            if (data?.previewUrl) {
                setTimeout(() => {
                    window.open(data.previewUrl, '_blank');
                    toast.success('Opened preview in new tab!', { duration: 5000 });
                }, 1000);
            }
        } catch (err) {
            const msg = err.message || 'Failed to send reset email';
            toast.error(msg, { id: loadingToast });
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-surface px-4 relative overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/[0.07] blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/[0.05] blur-[120px] pointer-events-none" />

            <div className="w-full max-w-[440px] fade-in relative z-10">
                {/* Branding */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-dark mb-5 shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-4xl font-heading font-bold gradient-text mb-2 tracking-tight">Revision AI</h1>
                    <p className="text-slate-400 text-sm font-medium">Track performance. Improve intelligently.</p>
                </div>

                {/* Card — increased padding, semi-transparent border */}
                <div
                    className="glass rounded-2xl"
                    style={{
                        padding: 'clamp(2rem, 5vw, 2.75rem)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 8px 40px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.05)',
                    }}
                >
                    <h2 className="text-[22px] font-heading font-semibold text-white mb-8 tracking-tight">
                        Welcome back
                    </h2>

                    {error && (
                        <div className="mb-6 px-4 py-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-7">
                        <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em] mb-3">
                                Email
                            </label>
                            <div className="flex items-center gap-3 bg-surface-2/50 border border-white/[0.08] rounded-xl px-4 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 focus-within:bg-surface-2/70 group/input">
                                <Mail className="w-[18px] h-[18px] text-slate-600 shrink-0 transition-colors group-focus-within/input:text-primary/70" />
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    className="w-full bg-transparent text-slate-100 py-4 text-[14px] focus:outline-none placeholder:text-slate-600/80"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-[0.18em]">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    disabled={resetLoading}
                                    className="text-[12px] font-medium text-primary hover:text-primary-light transition-colors disabled:opacity-50"
                                >
                                    {resetLoading ? 'Sending...' : 'Forgot password?'}
                                </button>
                            </div>
                            <div className="flex items-center gap-3 bg-surface-2/50 border border-white/[0.08] rounded-xl px-4 transition-all focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 focus-within:bg-surface-2/70 group/input">
                                <Lock className="w-[18px] h-[18px] text-slate-600 shrink-0 transition-colors group-focus-within/input:text-primary/70" />
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    className="w-full bg-transparent text-slate-100 py-4 text-[14px] focus:outline-none placeholder:text-slate-600/80"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2.5 font-bold py-4 rounded-xl text-[14px] mt-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all hover:shadow-[0_6px_24px_rgba(139,92,246,0.45)] hover:brightness-110 active:scale-[0.98] focus:ring-2 focus:ring-primary/30 focus:outline-none"
                        >
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
                            ) : (
                                <>Sign in <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
                        <p className="text-[13px] text-slate-400">
                            Don&apos;t have an account?{' '}
                            <Link to="/register" className="text-primary font-semibold hover:text-primary-light transition-colors">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
