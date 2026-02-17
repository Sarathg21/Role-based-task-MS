import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart3, User, Lock, Shield } from 'lucide-react';
import Button from '../components/UI/Button';

const LoginPage = () => {
    const [formData, setFormData] = useState({ id: '', password: '' });
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const result = login(formData.id, formData.password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Left Side - Hero */}
                <div className="login-hero">
                    <div>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <BarChart3 size={32} />
                            </div>
                            <h1 className="text-2xl font-bold">PerfMetric</h1>
                        </div>
                        <h2 className="text-4xl font-bold mb-6">Elevate Team Performance</h2>
                        <p className="text-blue-100 text-lg leading-relaxed">
                            Enterprise-grade performance management and task tracking system for modern organizations.
                        </p>
                    </div>
                    <div className="flex gap-4 text-sm text-blue-200">
                        <span>© 2024 PerfMetric Inc.</span>
                        <span>Privacy Policy</span>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="login-form-section">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                        <p className="text-slate-500">Please sign in to access your dashboard.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
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

                        {/* Role selection removed - automatic detection */}

                        <div className="flex justify-between items-center mb-6 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-slate-600">Remember me</span>
                            </label>
                            <a href="#" className="text-blue-600 hover:underline font-medium">Forgot password?</a>
                        </div>

                        <Button type="submit" className="w-full py-3 text-base shadow-lg shadow-orange-500/20">
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm text-slate-500">
                        Need help? <a href="#" className="text-blue-600 hover:underline">Contact System Admin</a>
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 rounded-lg text-xs text-slate-500">
                        <p className="font-semibold mb-1">Demo Credentials:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <span>Admin: ADMIN001 / password123</span>
                            <span>Manager: MGR001 / password123</span>
                            <span>Employee: EMP001 / password123</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
