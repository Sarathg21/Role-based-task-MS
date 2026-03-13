import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

/* ─── Inline styles ─── */
const S = {
    /* ── PAGE WRAPPER ── */
    page: {
        minHeight: '100vh',
        height: '100vh',
        display: 'flex',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: 'linear-gradient(135deg, #4c00d4 0%, #6d28d9 45%, #7e22ce 75%, #a855f7 100%)',
        overflow: 'hidden',
        position: 'relative',
    },

    /* ── LEFT PANEL — 50% ── */
    left: {
        flex: '0 0 50%',
        width: '50%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3.5rem 4rem 3rem 4rem',
        position: 'relative',
        overflow: 'hidden',
        zIndex: 2,
    },
    leftRays: {
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at top right, rgba(255,255,255,0.15) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 1,
    },
    diagonalTexture: {
        position: 'absolute',
        inset: 0,
        opacity: 0.1,
        backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 100px, #ffffff 100px, #ffffff 102px)',
        pointerEvents: 'none',
        zIndex: 0,
    },

    /* Taskcade Icon Box */
    iconBox: {
        width: '120px',
        height: '120px',
        borderRadius: '28px',
        // background: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        // border: '1px solid rgba(255, 255, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        // boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.1)',
        alignSelf: 'center',
    },
    tascadeLogo: {
        width: '110%',
        height: '110%',
        objectFit: 'contain',
        display: 'block',
    },

    /* Left Text Content */
    leftContent: {
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },
    appName: {
        fontSize: '3.5rem',
        fontWeight: 600,
        color: '#ffffff',
        letterSpacing: '-0.02em',
        margin: '0 0 0.5rem 0',
    },
    tagline: {
        fontSize: '1.75rem',
        fontWeight: 600,
        color: '#ffffff',
        margin: '0 0 2.5rem 0',
        letterSpacing: '-0.01em',
    },
    desc: {
        fontSize: '1rem',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.8,
        maxWidth: '400px',
        margin: '0 auto',
        fontWeight: 400,
    },

    copyright: {
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.7)',
        margin: 0,
        textAlign: 'left',
    },

    /* ── RIGHT PANEL — 50% ── */
    right: {
        flex: '0 0 50%',
        width: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    card: {
        width: '100%',
        maxWidth: '540px',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '3rem 2.75rem 2.5rem 2.75rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
    },

    /* Card Header Logo */
    cardBrand: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '2.5rem',
        alignSelf: 'center',
    },
    cardLogoImg: {
        height: '120px',
        width: 'auto',
        display: 'block',
    },

    welcome: {
        fontSize: '2rem',
        fontWeight: 600,
        color: '#1e1b4b',
        marginBottom: '2rem',
        textAlign: 'center',
        margin: '0 0 2rem 0',
    },

    /* Form Fields */
    fieldWrap: { marginBottom: '1.25rem' },
    label: {
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: '0.5rem',
        letterSpacing: '0.05em',
    },
    inputRow: { position: 'relative' },
    inputIcon: {
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: '#94a3b8',
        display: 'flex',
    },
    input: {
        width: '100%',
        padding: '0.875rem 1rem 0.875rem 3rem',
        background: '#eef2f6',
        border: 'none',
        borderRadius: '12px',
        fontSize: '0.95rem',
        color: '#1e293b',
        outline: 'none',
        boxSizing: 'border-box',
    },
    eyeBtn: {
        position: 'absolute',
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#94a3b8',
        display: 'flex',
    },

    forgotRow: { textAlign: 'right', marginBottom: '0.75rem' },
    forgotBtn: {
        background: 'none',
        border: 'none',
        color: '#8b5cf6',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        padding: 0,
    },
    forgotNote: {
        fontSize: '0.75rem',
        color: '#6b7280',
        lineHeight: 1.5,
        textAlign: 'left',
        marginBottom: '1.5rem',
    },

    signInBtn: {
        width: '100%',
        padding: '1rem',
        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '0.9rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        cursor: 'pointer',
        boxShadow: '0 10px 20px rgba(139, 92, 246, 0.3)',
        marginBottom: '3rem',
    },

    /* Card Footer */
    cardFooter: {
        marginTop: 'auto',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#94a3b8',
    },
    footerLink: {
        color: '#6366f1',
        fontWeight: 600,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        marginLeft: '4px',
    },
};

const TascadeIcon = () => (
    <svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0.6" />
            </linearGradient>
        </defs>
        {/* Bars */}
        <rect x="10" y="42" width="10" height="12" rx="2" fill="url(#barGrad)" fillOpacity="0.7" />
        <rect x="24" y="32" width="10" height="22" rx="2" fill="url(#barGrad)" fillOpacity="0.8" />
        <rect x="38" y="22" width="10" height="32" rx="2" fill="url(#barGrad)" fillOpacity="0.9" />
        <rect x="52" y="14" width="10" height="40" rx="2" fill="url(#barGrad)" />

        {/* Upward Line with Dots */}
        <g filter="url(#glow)">
            <path d="M15 40L29 30L43 20L57 10" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="15" cy="40" r="3.5" fill="white" />
            <circle cx="29" cy="30" r="3.5" fill="white" />
            <circle cx="43" cy="20" r="3.5" fill="white" />
            {/* Arrow Head */}
            <path d="M52 10H57V15" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    </svg>
);


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
        const result = await login(formData.id, formData.password);
        setIsLoading(false);
        if (result.success) {
            if (result.role === 'Admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } else {
            setError(result.message);
        }
    };

    const demoRoles = [
        { role: 'Admin', id: 'ADMIN001', color: '#e11d48' },
        { role: 'Manager', id: 'MGR001', color: '#7c3aed' },
        { role: 'Employee', id: 'EMP001', color: '#10b981' },
        { role: 'CFO', id: 'CFO001', color: '#2563eb' },
    ];

    return (
        <div style={S.page}>
            <div style={S.leftRays} />
            <div style={S.diagonalTexture} />

            {/* ─── LEFT SIDE ─── */}
            <div style={S.left}>
                <div style={S.leftContent}>
                    <div style={S.iconBox}>
                        <img
                            src="/images/logo.png"
                            alt="Tascade Logo"
                            style={S.tascadeLogo}
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                    <h1 style={S.appName}>Tascade®</h1>
                    <h2 style={S.tagline}>Track. Measure. Succeed.</h2>
                    <p style={S.desc}>
                        Elevate productivity by tracking and measuring task performance.<br />
                        Turn goals into achievements with Tascade®.
                    </p>
                </div>
                <p style={S.copyright}>
                    © 2026 Zenith Data Intelligence, LLC. All rights reserved.
                </p>
            </div>

            {/* ─── RIGHT SIDE ─── */}
            <div style={S.right}>
                <div style={S.card}>
                    <div style={S.cardBrand}>
                        <img
                            src="/images/fj.png.png"
                            alt="FJ Group"
                            style={S.cardLogoImg}
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>

                    <h1 style={S.welcome}>Welcome</h1>

                    {error && (
                        <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
                            {error}
                        </p>
                    )}

                    <form onSubmit={handleLoginSubmit}>
                        <div style={S.fieldWrap}>
                            <label style={S.label}>Employee ID</label>
                            <div style={S.inputRow}>
                                <div style={S.inputIcon}><User size={18} /></div>
                                <input
                                    type="text"
                                    name="id"
                                    placeholder="CFO001"
                                    style={S.input}
                                    value={formData.id}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div style={S.fieldWrap}>
                            <label style={S.label}>Password</label>
                            <div style={S.inputRow}>
                                <div style={S.inputIcon}><Lock size={18} /></div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="••••••••••••"
                                    style={S.input}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    style={S.eyeBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                                <div style={S.forgotRow}>
                                    <button
                                        type="button"
                                        style={S.forgotBtn}
                                        onClick={() => {
                                            alert(
`If you forgot your password, please contact the Admin.
Your password can be reset by Admin, and you will be asked to change it after login.
Contact: admin@company.com`
                                            );
                                        }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <p style={S.forgotNote}>
                                    If you forgot your password, please contact the Admin. Your password can be reset by Admin,
                                    and you will be asked to change it after login. Contact: <strong>admin@company.com</strong>
                                </p>
                        <button
                            type="submit"
                            style={S.signInBtn}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo Credentials Box - Simplified */}
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: 4, height: 4, background: '#8b5cf6', borderRadius: '50%' }}></div> Demo IDs (Pass: Perfmetric@123)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {demoRoles.map(role => (
                                <div
                                    key={role.id}
                                    onClick={() => setFormData({ ...formData, id: role.id })}
                                    style={{ cursor: 'pointer', padding: '6px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.75rem' }}
                                >
                                    <div style={{ fontWeight: 700, color: role.color, fontSize: '0.65rem' }}>{role.role}</div>
                                    <div style={{ fontWeight: 600 }}>{role.id}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={S.cardFooter}>
                        Helpline; support@fjgroup.com | <span style={S.footerLink}>Contact</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;