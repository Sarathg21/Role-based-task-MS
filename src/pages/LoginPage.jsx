import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
    const [formData, setFormData] = useState({ id: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        console.log(`[Login] Attempting login for ID: ${formData.id}`);
        
        try {
            const result = await login(formData.id, formData.password);
            setIsLoading(false);
            
            if (result.success) {
                console.log(`[Login] Success! Role: ${result.role}`);
                if (result.role === 'Admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } else {
                console.error(`[Login] Failed: ${result.message}`);
                setError(result.message);
            }
        } catch (err) {
            setIsLoading(false);
            console.error(`[Login] Critical Error:`, err);
            setError('An unexpected error occurred during login. Please check your connection or try again later.');
        }
    };

    const demoRoles = [
        { role: 'Admin', id: 'ADMIN001', color: 'text-rose-600' },
        { role: 'Manager', id: 'MGR001', color: 'text-violet-600' },
        { role: 'Employee', id: 'EMP001', color: 'text-emerald-600' },
        { role: 'CFO', id: 'CFO001', color: 'text-blue-600' },
    ];

    return (
        <div className="min-h-screen flex relative overflow-auto bg-gradient-to-br from-[#4c00d4] via-[#6d28d9] to-[#a855f7] select-none">
            {/* Background Effects */}
            <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[repeating-linear-gradient(135deg,transparent,transparent_100px,#ffffff_100px,#ffffff_102px)]" />

            {/* ─── LEFT SIDE (hidden on mobile) ─── */}
            <div className="flex-[0_0_50%] w-1/2 flex-col justify-between p-14 relative overflow-hidden z-[2] hidden lg:flex">
                <div className="relative z-[1] flex-1 flex flex-col justify-center items-center text-center">
                    <div className="w-[120px] h-[120px] rounded-[28px] backdrop-blur-2xl flex items-center justify-center mb-8 self-center bg-white/5">
                        <img
                            src="/images/logo.png"
                            alt="Tascade Logo"
                            className="w-[110%] h-[110%] object-contain block"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                    <h1 className="text-[3.5rem] font-semibold text-white tracking-[-0.02em] mb-1">Tascade®</h1>
                    <h2 className="text-[1.75rem] font-semibold text-white mb-3 tracking-[-0.01em]">Track. Measure. Succeed.</h2>
                    <p className="text-base text-white/85 leading-[1.8] max-w-[500px] mx-auto font-normal">
                        Elevate productivity by tracking and measuring task performance.
                        Turn goals into achievements with Tascade®.
                    </p>
                </div>
                <p className="text-[0.85rem] text-white/70 m-0 text-left">
                    © 2026 Zenith Data Intelligence, LLC. All rights reserved.
                </p>
            </div>

            {/* ─── RIGHT SIDE (full width on mobile) ─── */}
            <div className="flex-1 flex items-center justify-center z-[2] px-4 py-8 sm:py-12 min-h-screen">
                <div className="w-full max-w-[480px] bg-white rounded-[20px] sm:rounded-[24px] p-6 sm:p-10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex flex-col">
                    {/* Card Header Logo */}
                    <div className="flex items-center gap-4 mb-6 sm:mb-8 self-center">
                        <div className="h-[90px] w-[90px] sm:h-[120px] sm:w-[120px] rounded-[26px] bg-white/80 border border-slate-100 flex items-center justify-center shadow-[0_18px_35px_rgba(79,70,229,0.25)]">
                            <img
                                src="/images/fj.png.png"
                                alt="FJ Group logo"
                                className="h-[80%] w-[80%] object-contain block"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                        </div>
                        <div className="leading-tight">
                            <p className="text-[22px] sm:text-[28px] font-[800] text-[#1e1b4b] tracking-tight">FJ Group</p>
                            <p className="text-[10px] sm:text-[11px] font-[700] tracking-[0.18em] text-slate-400 uppercase">Corporate Suite</p>
                        </div>
                    </div>

                    {/* Mobile brand tagline */}
                    <div className="flex flex-col items-center mb-3 lg:hidden">
                        <p className="text-[11px] font-semibold text-slate-400 tracking-widest capitalize">Tascade® — Track. Measure. Succeed.</p>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1e1b4b] mb-6 text-center capitalize tracking-tight">Welcome</h1>

                    {error && (
                        <p className="text-[#ef4444] text-[0.85rem] text-center mb-4 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">
                            {error}
                        </p>
                    )}

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="block text-[10px] font-black text-slate-500 capitalize tracking-widest pl-1">Employee ID</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={18} /></div>
                                <input
                                    type="text"
                                    name="id"
                                    placeholder="CFO001"
                                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[0.9rem] sm:text-[0.95rem] text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                                    value={formData.id}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="block text-[10px] font-black text-slate-500 capitalize tracking-widest pl-1">Password</label>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={18} /></div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="••••••••••••"
                                    className="w-full pl-11 pr-12 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[0.9rem] sm:text-[0.95rem] text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="text-right">
                            <button
                                type="button"
                                className="text-indigo-600 text-xs font-semibold capitalize tracking-wider hover:text-indigo-800"
                                onClick={() => {
                                    alert(`If you forgot your password, please contact the Admin.\nYour password can be reset by Admin, and you will be asked to change it after login.\nContact: admin@company.com`);
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_auto] hover:bg-right text-white rounded-xl text-[0.85rem] sm:text-[0.9rem] font-semibold capitalize tracking-widest cursor-pointer shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo Credentials Box */}
                    <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 mt-5 sm:mt-8">
                        <div className="text-[10px] font-semibold text-slate-400 capitalize tracking-widest mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                            Demo IDs (Pass: Perfmetric@123)
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {demoRoles.map(role => (
                                <div
                                    key={role.id}
                                    onClick={() => setFormData({ ...formData, id: role.id })}
                                    className="cursor-pointer p-2 bg-white border border-slate-100 rounded-xl hover:border-indigo-500 hover:shadow-sm transition-all text-center group"
                                >
                                    <div className={`text-[10px] font-black capitalize tracking-tighter ${role.color}`}>{role.role}</div>
                                    <div className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">{role.id}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 text-center text-[11px] font-bold text-slate-400">
                        Helpline; support@fjgroup.com | <button className="text-indigo-500 hover:underline">Contact</button>
                    </div>

                    <p className="mt-3 text-center text-[10px] text-white/50 lg:hidden">
                        © 2026 Zenith Data Intelligence, LLC.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
