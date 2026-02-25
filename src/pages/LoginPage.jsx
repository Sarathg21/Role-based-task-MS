import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Shield } from 'lucide-react';

const LoginPage = () => {
    // view: 'login' | 'forgot' | 'reset'
    const [view, setView] = useState('login');
    const [formData, setFormData] = useState({ id: '', password: '' });
    const [resetData, setResetData] = useState({ email: '', newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        const result = login(formData.id, formData.password);
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

        // Simulate API call to send reset link
        setTimeout(() => {
            setIsLoading(false);
            setSuccessMsg(`Password reset link sent to ${resetData.email}`);

            // Auto transition to reset view for demo purposes after 2 seconds
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

        // Simulate API call to reset password
        setTimeout(() => {
            setIsLoading(false);
            setSuccessMsg("Password successfully reset! Redirecting to login...");

            // Auto transition back to login
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
                {/* Left Side - Hero */}
                <div className="login-hero">
                    <div>
                        <div className="flex items-center justify-center mb-8">
                            <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '16px 28px', display: 'inline-flex' }}>
                                <img
                                    src="/fj-group-logo.png"
                                    alt="FJ Group Logo"
                                    style={{ maxWidth: '280px', width: '100%' }}
                                />
                            </div>
                        </div>
                        <h2 className="text-4xl font-bold mb-6">Elevate Team Performance</h2>
                        <p className="text-violet-100 text-lg leading-relaxed">
                            Enterprise-grade performance management and task tracking system for modern organizations.
                        </p>
                    </div>
                    <div className="flex gap-4 text-sm text-violet-200">
                        <span>© 2026 ZENITH DATA INTELLIGENCE LLC</span>
                    </div>
                </div>

                {/* Right Side - Forms */}
                <div className="login-form-section">

                    {/* FJ Group Logo */}
                    <div className="flex justify-center mb-6">
                        <img
                            src="/fj-group-logo.png"
                            alt="FJ Group Logo"
                            style={{ maxWidth: '240px', width: '100%' }}
                        />
                    </div>

                    {/* Header updates based on view */}
                    <div className="mb-8">
                        {view === 'login' && (
                            <>
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                                <p className="text-slate-500">Please sign in to access your dashboard.</p>
                            </>
                        )}
                        {view === 'forgot' && (
                            <>
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">Forgot Password</h2>
                                <p className="text-slate-500">Enter your email to receive a reset link.</p>
                            </>
                        )}
                        {view === 'reset' && (
                            <>
                                <h2 className="text-3xl font-bold text-slate-800 mb-2">Reset Password</h2>
                                <p className="text-slate-500">Create a new password for your account.</p>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="mb-6 p-4 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            {successMsg}
                        </div>
                    )}

                    {/* LOGIN FORM */}
                    {view === 'login' && (
                        <form onSubmit={handleLoginSubmit}>
                            <div className="form-group">
                                <label className="form-label">User ID</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input
                                        type="text"
                                        name="id"
                                        placeholder="e.g. EMP001"
                                        className="form-input"
                                        value={formData.id}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="••••••••"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-6 text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                                    <span className="text-slate-600">Remember me</span>
                                </label>
                                <button type="button" onClick={() => setView('forgot')} className="text-violet-600 hover:underline font-medium">
                                    Forgot password?
                                </button>
                            </div>

                            <button
                                type="submit"
                                className="w-full inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-base bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500 shadow-lg shadow-orange-500/20"
                            >
                                Sign In
                            </button>
                        </form>
                    )}

                    {/* FORGOT PASSWORD FORM */}
                    {view === 'forgot' && (
                        <form onSubmit={handleForgotSubmit}>
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={18} />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="john@example.com"
                                        className="form-input"
                                        value={resetData.email}
                                        onChange={handleResetChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mb-4 inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-base bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 shadow-lg shadow-violet-500/20"
                            >
                                {isLoading ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="w-full text-center text-slate-500 hover:text-slate-700 text-sm font-medium"
                            >
                                Back to Login
                            </button>
                        </form>
                    )}

                    {/* RESET PASSWORD FORM */}
                    {view === 'reset' && (
                        <form onSubmit={handleResetSubmit}>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <div className="input-wrapper">
                                    <Lock className="input-icon" size={18} />
                                    <input
                                        type="password"
                                        name="newPassword"
                                        placeholder="New password"
                                        className="form-input"
                                        value={resetData.newPassword}
                                        onChange={handleResetChange}
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <div className="input-wrapper">
                                    <Shield className="input-icon" size={18} />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        placeholder="Confirm password"
                                        className="form-input"
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
                                className="w-full mb-4 inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-base bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 shadow-lg shadow-violet-500/20"
                            >
                                {isLoading ? 'Resetting...' : 'Set New Password'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setView('login')}
                                className="w-full text-center text-slate-500 hover:text-slate-700 text-sm font-medium"
                            >
                                Cancel
                            </button>
                        </form>
                    )}

                    {view === 'login' && (
                        <div className="mt-8 text-center text-sm text-slate-500">
                            Need help? <a href="#" className="text-violet-600 hover:underline">Contact System Admin</a>
                        </div>
                    )}

                    {view === 'login' && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs text-slate-500">
                            <p className="font-semibold mb-1">Demo Credentials:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <span>Admin: ADMIN001 / password123</span>
                                <span>Manager: MGR001 / password123</span>
                                <span>Employee: EMP001 / password123</span>
                                <span>  CFO: CFO001    / password123</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
