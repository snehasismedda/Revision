import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity, User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

import toast from 'react-hot-toast';

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const loadingToast = toast.loading('Creating account...');
        try {
            await register(form);
            toast.success('Account created! Welcome.', { id: loadingToast });
            navigate('/');
        } catch (err) {
            const msg = err.message || 'Failed to register';
            setError(msg);
            toast.error(msg, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { key: 'name', label: 'Full Name', type: 'text', icon: User, placeholder: 'John Doe' },
        { key: 'email', label: 'Email Address', type: 'email', icon: Mail, placeholder: 'name@company.com' },
        { key: 'password', label: 'Password', type: 'password', icon: Lock, placeholder: '••••••••', minLength: 6 },
    ];

    return (
        <div className="min-h-screen flex bg-surface selection:bg-primary/30">
            {/* Left Side: Branding & Visuals (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center p-16 overflow-hidden bg-[#0c0c14]">
                {/* Background Decor */}
                <div className="absolute inset-0 mesh-grid opacity-20" />
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full bg-primary/[0.08] blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/[0.05] blur-[120px]" />

                {/* Decorative Structural Elements */}
                <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/[0.05] to-transparent pointer-events-none" />

                {/* Glowing Nodes Decor */}
                <div className="glow-point top-1/3 left-1/4 opacity-40 animate-pulse" />
                <div className="glow-point bottom-1/4 right-1/4 opacity-30 animate-pulse stagger-1" />
                <div className="glow-point top-1/2 left-1/2 opacity-20 animate-pulse stagger-3" />

                <div className="relative z-10 fade-in text-center">
                    <div className="flex flex-col items-center group">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.3)] mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 border border-white/10">
                            <Activity className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-6xl font-heading font-black tracking-tighter text-white mb-2">
                            Prep<span className="text-primary">Tracker</span>
                        </h1>
                    </div>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative overflow-hidden bg-[#0c0c14]">
                {/* Background Detailing */}
                <div className="absolute inset-0 dot-grid opacity-40" />
                <div className="absolute inset-0 bg-vignette" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/[0.02] blur-[120px] pointer-events-none" />

                {/* Mobile Orbs */}
                <div className="lg:hidden absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/[0.07] blur-[120px] pointer-events-none" />

                <div className="w-full max-w-[420px] fade-in relative z-10">
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-dark mb-4 shadow-xl shadow-primary/20">
                            <Activity className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-heading font-bold text-white mb-1">PrepTracker</h1>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-heading font-bold text-white mb-2">Create account</h2>
                        <p className="text-slate-500 font-medium">Get started with your free account today.</p>
                    </div>

                    {error && (
                        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-shake">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {fields.map(({ key, label, type, icon: Icon, placeholder, minLength }, index) => (
                            <div key={key} className={`stagger-${index + 1} group/field`}>
                                <label className="block text-[11px] font-bold text-slate-500 group-focus-within/field:text-primary transition-colors uppercase tracking-wider mb-2.5 ml-1">
                                    {label}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Icon className="w-[18px] h-[18px] text-slate-600 transition-colors group-focus-within/field:text-primary/70" />
                                    </div>
                                    <input
                                        type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
                                        required
                                        value={form[key]}
                                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                        className="w-full bg-slate-900/40 backdrop-blur-sm border border-white/[0.06] rounded-xl pl-11 pr-12 py-3.5 text-slate-100 text-sm transition-all focus:border-primary/40 focus:bg-slate-900/60 focus:ring-4 focus:ring-primary/10 outline-none placeholder:text-slate-600/60"
                                        placeholder={placeholder}
                                        minLength={minLength}
                                    />
                                    {type === 'password' && (
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-slate-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 group stagger-4 overflow-hidden relative mt-4"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Create Free Account</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/[0.05] text-center stagger-5">
                        <p className="text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary font-bold hover:text-primary-light transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
