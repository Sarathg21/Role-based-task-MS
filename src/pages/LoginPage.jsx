import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Shield, Eye, EyeOff, TrendingUp, Zap } from 'lucide-react';

const LoginPage = () => {
    // view: 'login' | 'forgot' | 'reset'
    const [view, setView] = useState('login');
    const [formData, setFormData] = useState({ id: '', password: '' });
    const [resetData, setResetData] = useState({ email: '', newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleResetChange = (e) => {
        setResetData({ ...resetData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        const result = await login(formData.id, formData.password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    const handleForgotSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        setTimeout(() => {
            setIsLoading(false);
            setSuccessMsg(`Password reset link sent to ${resetData.email}`);
            setTimeout(() => {
                setSuccessMsg('');
                setView('reset');
            }, 2000);
        }, 1500);
    };

    const handleResetSubmit = (e) => {
        e.preventDefault();
        if (resetData.newPassword !== resetData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        setError('');

        setTimeout(() => {
            setIsLoading(false);
            setSuccessMsg("Password successfully reset! Redirecting to login...");
            setTimeout(() => {
                setSuccessMsg('');
                setView('login');
                setResetData({ email: '', newPassword: '', confirmPassword: '' });
            }, 2000);
        }, 1500);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Left Side - Hero — Premium Upgrade */}
                <div className="login-hero relative overflow-hidden mesh-gradient">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent z-0 animate-pulse"></div>
                    {/* Floating Premium Blobs */}
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl animate-blob"></div>
                    <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-blob [animation-delay:2s]"></div>

                    <div className="relative z-10 px-12 py-16 flex flex-col items-center">
                        {/* Hero Image/Logo Area */}
                        <div className="flex justify-center mb-12">
                            <div className="w-40 h-40 bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl flex items-center justify-center border border-white/20 animate-float card-gloss">
                                <img src="/fj-group-logo.png" alt="Logo" className="w-28 drop-shadow-2xl" />
                            </div>
                        </div>

                        <div className="text-center mb-10">
                            <h2 className="text-4xl font-black mb-2 tracking-tighter text-white drop-shadow-xl uppercase">Performance</h2>
                            <h2 className="text-4xl font-black mb-4 tracking-tighter text-white drop-shadow-xl uppercase">Management System</h2>
                            <div className="h-1.5 w-24 bg-gradient-to-r from-violet-400 to-emerald-400 mx-auto rounded-full mb-6 shadow-glow"></div>
                            <p className="text-slate-300 font-bold uppercase tracking-[0.4em] text-[10px] leading-relaxed">
                                FJ GROUP <span className="mx-2 text-white/20">|</span> EXECUTIVE GOVERNANCE
                            </p>
                        </div>
                        <p className="text-violet-100/80 text-sm max-w-sm mx-auto leading-relaxed text-center">
                            Role-based task management and performance tracking built for the FJ Group enterprise.
                        </p>
                    </div>

                    {/* Features List */}
                    <div className="relative z-10 space-y-4 max-w-sm mx-auto px-12">
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                                <Shield size={18} className="text-white" />
                            </div>
                            <span className="text-sm font-medium text-violet-50">RBAC — Admin, CFO, Manager, Employee</span>
                        </div>
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                                <TrendingUp size={18} className="text-white" />
                            </div>
                            <span className="text-sm font-medium text-violet-50">Real-time dashboards & performance insights</span>
                        </div>
                        <div className="flex items-center gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
                                <Zap size={18} className="text-white" />
                            </div>
                            <span className="text-sm font-medium text-violet-50">Task workflows with full audit history</span>
                        </div>
                    </div>
                </div>

                {/* Right Side - Forms */}
                <div className="login-form-section">
                    {/* Header Logo — Extra Visibility */}
                    <div className="flex justify-center mb-12">
                        <img
                            src="/fj-group-logo.png"
                            alt="FJ Group Logo"
                            style={{ maxWidth: '180px', width: '100%' }}
                        />
                    </div>

                    <div className="mb-8">
                        {view === 'login' && (
                            <>
                                <h1 className="text-3xl font-black text-slate-800 mb-1 text-center">Welcome back</h1>
                                <p className="text-slate-500 text-sm text-center">Sign in to access your workspace</p>
                            </>
                        )}
                        {view === 'forgot' && (
                            <>
                                <h1 className="text-3xl font-black text-slate-800 mb-1 text-center">Forgot Password</h1>
                                <p className="text-slate-500 text-sm text-center">Receive a secure reset link</p>
                            </>
                        )}
                        {view === 'reset' && (
                            <>
                                <h1 className="text-3xl font-black text-slate-800 mb-1 text-center">Reset Password</h1>
                                <p className="text-slate-500 text-sm text-center">Update your account credentials</p>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-center gap-2 animate-shake">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-6 p-3 bg-green-50 text-green-600 text-xs rounded-xl border border-green-100 flex items-center gap-2 animate-fade-in">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            {successMsg}
                        </div>
                    )}

                    {/* LOGIN FORM */}
                    {view === 'login' && (
                        <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div className="form-group mb-0">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Employee ID</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        name="id"
                                        placeholder="ADMIN001"
                                        className="w-full pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                                        style={{ paddingLeft: '3.25rem' }}
                                        value={formData.id}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group mb-0">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Password</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        placeholder="••••••••••••"
                                        className="w-full pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                                        style={{ paddingLeft: '3.25rem' }}
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 transition-colors z-20"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button type="button" onClick={() => setView('forgot')} className="text-violet-600 hover:text-violet-700 font-bold text-xs">
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-violet-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-violet-200 hover:bg-violet-700 hover:-translate-y-0.5 active:scale-95 transition-all"
                            >
                                Sign In
                            </button>
                        </form>
                    )}

                    {/* FORGOT PASSWORD FORM */}
                    {view === 'forgot' && (
                        <form onSubmit={handleForgotSubmit} className="space-y-5 animate-fade-in">
                            <div className="form-group mb-0">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Email Address</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="john@example.com"
                                        className="w-full pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 transition-all outline-none"
                                        style={{ paddingLeft: '3.25rem' }}
                                        value={resetData.email}
                                        onChange={handleResetChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-violet-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="w-full text-center text-slate-400 hover:text-slate-600 text-xs font-bold transition-all"
                            >
                                Back to Login
                            </button>
                        </form>
                    )}

                    {/* RESET PASSWORD FORM */}
                    {view === 'reset' && (
                        <form onSubmit={handleResetSubmit} className="space-y-5 animate-fade-in">
                            <div className="form-group mb-0">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">New Password</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        className="w-full pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 transition-all outline-none"
                                        style={{ paddingLeft: '3.25rem' }}
                                        value={resetData.newPassword}
                                        onChange={handleResetChange}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="form-group mb-0">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Confirm Password</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
                                        <Shield size={18} />
                                    </div>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        className="w-full pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-violet-500 transition-all outline-none"
                                        style={{ paddingLeft: '3.25rem' }}
                                        value={resetData.confirmPassword}
                                        onChange={handleResetChange}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-violet-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Resetting...' : 'Set New Password'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="w-full text-center text-slate-400 hover:text-slate-600 text-xs font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </form>
                    )}

                    {/* Demo Credentials Box */}
                    {view === 'login' && (
                        <div className="mt-10 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                                Demo Credentials <span className="font-normal text-[9px] lowercase opacity-60">(password: Perfmetric@123)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-2.5 bg-white rounded-xl border border-slate-100 hover:border-violet-100 transition-all cursor-pointer group" onClick={() => setFormData({ ...formData, id: 'ADMIN001' })}>
                                    <div className="text-[10px] font-bold text-rose-500 mb-1 group-hover:scale-105 transition-transform origin-left">Admin</div>
                                    <div className="text-[11px] font-bold text-slate-700 tracking-tight">ADMIN001</div>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-slate-100 hover:border-violet-100 transition-all cursor-pointer group" onClick={() => setFormData({ ...formData, id: 'MGR001' })}>
                                    <div className="text-[10px] font-bold text-violet-500 mb-1 group-hover:scale-105 transition-transform origin-left">Manager</div>
                                    <div className="text-[11px] font-bold text-slate-700 tracking-tight">MGR001</div>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-slate-100 hover:border-violet-100 transition-all cursor-pointer group" onClick={() => setFormData({ ...formData, id: 'EMP001' })}>
                                    <div className="text-[10px] font-bold text-emerald-500 mb-1 group-hover:scale-105 transition-transform origin-left">Employee</div>
                                    <div className="text-[11px] font-bold text-slate-700 tracking-tight">EMP001</div>
                                </div>
                                <div className="p-2.5 bg-white rounded-xl border border-slate-100 hover:border-violet-100 transition-all cursor-pointer group" onClick={() => setFormData({ ...formData, id: 'CFO001' })}>
                                    <div className="text-[10px] font-bold text-blue-500 mb-1 group-hover:scale-105 transition-transform origin-left">CFO</div>
                                    <div className="text-[11px] font-bold text-slate-700 tracking-tight">CFO001</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
