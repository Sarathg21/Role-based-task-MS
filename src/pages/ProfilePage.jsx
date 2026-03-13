import { useState, useEffect } from 'react';
import { User, Briefcase, Shield, ChevronDown, ChevronRight, ChevronLeft, Network, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Role config
const roleMeta = {
    CFO: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', dot: '#7c3aed' },
    ADMIN: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', dot: '#7c3aed' },
    Admin: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', dot: '#7c3aed' },
    MANAGER: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', dot: '#2563eb' },
    Manager: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', dot: '#2563eb' },
    EMPLOYEE: { bg: '#d1fae5', border: '#10b981', text: '#065f46', dot: '#059669' },
    Employee: { bg: '#d1fae5', border: '#10b981', text: '#065f46', dot: '#059669' },
};

function getRoleMeta(role) {
    return roleMeta[role] || roleMeta.EMPLOYEE;
}

// Recursive tree node
function TreeNode({ node, depth = 0, highlightId }) {
    const [open, setOpen] = useState(depth < 2);
    const hasChildren = node.children && node.children.length > 0;
    const isMe = node.emp_id === highlightId;
    const meta = getRoleMeta(node.role);

    return (
        <div style={{ marginLeft: depth === 0 ? 0 : 24 }}>
            <div
                onClick={() => hasChildren && setOpen(o => !o)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 10,
                    marginBottom: 4,
                    cursor: hasChildren ? 'pointer' : 'default',
                    backgroundColor: isMe ? '#fff7ed' : 'white',
                    border: `1.5px solid ${isMe ? '#f97316' : meta.border}`,
                    boxShadow: isMe ? '0 0 0 2px #fed7aa' : '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.15s',
                }}
            >
                <div style={{ width: 16, flexShrink: 0, color: '#94a3b8' }}>
                    {hasChildren
                        ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                        : <span style={{ display: 'inline-block', width: 14 }} />
                    }
                </div>

                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: meta.dot, flexShrink: 0, display: 'inline-block' }} />

                <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: meta.bg, color: meta.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {node.name?.charAt(0) || '?'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{node.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: meta.bg, color: meta.text, padding: '1px 7px', borderRadius: 999 }}>{node.role}</span>
                        {isMe && (
                            <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#ffedd5', color: '#ea580c', padding: '1px 7px', borderRadius: 999 }}>You</span>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        {node.emp_id}&nbsp;·&nbsp;{node.department_id || node.department || ''}
                    </div>
                </div>

                {hasChildren && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                        {node.children_count || node.children.length} reports
                    </span>
                )}
            </div>

            {hasChildren && open && (
                <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 20, paddingLeft: 4, marginBottom: 4 }}>
                    {node.children.map(child => (
                        <TreeNode key={child.emp_id} node={child} depth={depth + 1} highlightId={highlightId} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showOrg, setShowOrg] = useState(false);
    const [orgTree, setOrgTree] = useState(null);
    const [orgLoading, setOrgLoading] = useState(false);
    const [managerInfo, setManagerInfo] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // tabs: overview, organisation, security

    // Change password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPwd, setChangingPwd] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const [pwdSuccess, setPwdSuccess] = useState('');

    if (!user) return null;

    const empId = user.id;

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwdError('');
        setPwdSuccess('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPwdError('All password fields are required.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdError('New password and confirm password do not match.');
            return;
        }

        try {
            setChangingPwd(true);
            await api.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            setPwdSuccess('Password updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            const msg =
                err.response?.data?.detail ||
                err.response?.data?.message ||
                'Failed to change password.';
            setPwdError(msg);
        } finally {
            setChangingPwd(false);
        }
    };

    // Load org tree
    const loadOrgData = async () => {
        if (!orgTree) {
            setOrgLoading(true);
            try {
                const res = await api.get('/org/tree', { params: { depth: 4 } });
                const tree = res.data?.root || res.data?.cfo || res.data?.admin || res.data;
                setOrgTree(tree);
            } catch (err) {
                console.error('Failed to fetch org tree', err);
                setOrgTree(null);
            } finally {
                setOrgLoading(false);
            }
        }
    };

    useEffect(() => {
        if (activeTab === 'organisation') {
            loadOrgData();
        }
    }, [activeTab]);

    // Count total nodes and breakdown by role in tree recursively
    const getOrgStats = (node) => {
        if (!node) return { total: 0, managers: 0, employees: 0 };

        let stats = { total: 1, managers: 0, employees: 0 };
        const role = (node.user?.role || node.role || '').toUpperCase();

        if (role === 'MANAGER') stats.managers += 1;
        if (role === 'EMPLOYEE') stats.employees += 1;

        (node.children || []).forEach(child => {
            const childStats = getOrgStats(child);
            stats.total += childStats.total;
            stats.managers += childStats.managers;
            stats.employees += childStats.employees;
        });

        return stats;
    };

    const orgStats = orgTree ? getOrgStats(orgTree) : null;
    const totalStaff = orgStats ? orgStats.total : '—';

    return (
        <div className="space-y-6 animate-fade-in mt-4 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-white/40 shadow-sm w-fit">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shrink-0 transition shadow-sm hover:shadow-md active:scale-95"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="pr-4">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">My Profile</h1>
                    <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-widest capitalize">View your account details and security settings</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-2xl w-fit border border-slate-200/60 shadow-sm">
                {[
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'organisation', label: 'Organisation', icon: Network },
                    { id: 'security', label: 'Security', icon: Shield },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black capitalize tracking-widest transition-all ${
                            activeTab === tab.id
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                        }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conditional Content */}
            {activeTab === 'overview' && (
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden animate-slide-up">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-[1.25rem] bg-violet-100 flex items-center justify-center text-violet-600 text-2xl font-black shadow-sm">
                                {user.name?.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">{user.name}</h2>
                                <p className="text-sm text-slate-500">{empId}</p>
                                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs bg-violet-100 text-violet-700 font-semibold">
                                    {user.role}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="p-2 bg-violet-100 rounded-lg"><User size={16} className="text-violet-600" /></div>
                            <div>
                                <p className="text-xs text-slate-500">Employee ID</p>
                                <p className="text-sm font-semibold text-slate-800">{empId}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="p-2 bg-blue-100 rounded-lg"><Briefcase size={16} className="text-blue-600" /></div>
                            <div>
                                <p className="text-xs text-slate-500">Department</p>
                                <p className="text-sm font-semibold text-slate-800">{user.department || '—'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="p-2 bg-emerald-100 rounded-lg"><Shield size={16} className="text-emerald-600" /></div>
                            <div>
                                <p className="text-xs text-slate-500">Reporting Manager</p>
                                {user.manager_id
                                    ? <p className="text-sm font-semibold text-slate-800">{user.manager_id}</p>
                                    : <p className="text-sm font-semibold text-slate-800">Top-level Management</p>
                                }
                            </div>
                        </div>

                        {user.email && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="p-2 bg-orange-100 rounded-lg"><Mail size={16} className="text-orange-600" /></div>
                                <div>
                                    <p className="text-xs text-slate-500">Email</p>
                                    <p className="text-sm font-semibold text-slate-800 truncate">{user.email}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden animate-slide-up">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl">
                            <Shield size={18} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-800 tracking-tight">Security Settings</p>
                            <p className="text-[11px] text-slate-500">Update your login password securely.</p>
                        </div>
                    </div>
                    <form className="p-6 grid grid-cols-1 md:grid-cols-1 gap-6 max-w-xl" onSubmit={handleChangePassword}>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 capitalize tracking-widest pl-1">Current Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-slate-50/30"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                autoComplete="current-password"
                                placeholder="Enter current password"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 capitalize tracking-widest pl-1">New Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-slate-50/30"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder="Min. 8 characters"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 capitalize tracking-widest pl-1">Confirm New Password</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all bg-slate-50/30"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                placeholder="Repeat new password"
                            />
                        </div>
                        
                        <div className="flex flex-col gap-3 pt-2">
                            {pwdError && (
                                <p className="text-xs text-rose-600 font-bold bg-rose-50 p-3 rounded-lg border border-rose-100">{pwdError}</p>
                            )}
                            {pwdSuccess && !pwdError && (
                                <p className="text-xs text-emerald-600 font-bold bg-emerald-50 p-3 rounded-lg border border-emerald-100">{pwdSuccess}</p>
                            )}
                            <button
                                type="submit"
                                disabled={changingPwd}
                                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-violet-600 text-white text-xs font-bold capitalize tracking-widest shadow-lg shadow-violet-200 hover:bg-violet-700 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60"
                            >
                                {changingPwd && <Loader2 size={14} className="animate-spin mr-2" />}
                                Save New Password
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'organisation' && (
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden animate-slide-up">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-100 rounded-xl shadow-sm">
                                <Network size={20} className="text-violet-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800 tracking-tight">Organisation Hierarchy</p>
                                <p className="text-[10px] font-bold tracking-widest capitalize text-slate-400 mt-0.5">
                                    {totalStaff === '—' ? 'Syncing...' : `${totalStaff} staff (${orgStats?.managers || 0} Managers, ${orgStats?.employees || 0} Employees)`}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {/* Legend */}
                        <div className="px-6 py-3 bg-slate-50/30 flex items-center gap-5 text-[10px] font-bold text-slate-500 flex-wrap capitalize tracking-wider">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#7c3aed' }} /> CFO / Admin
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2563eb' }} /> Manager
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#059669' }} /> Employee
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f97316' }} /> You
                            </div>
                            <span className="sm:ml-auto text-[9px] text-slate-400">Expand rows to see direct reports</span>
                        </div>

                        {/* Tree */}
                        <div className="p-6 overflow-y-auto" style={{ maxHeight: '65vh' }}>
                            {orgLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse" />
                                        <Loader2 size={24} className="animate-spin text-violet-500 absolute top-1/2 left-1/2 -ml-3 -mt-3" />
                                    </div>
                                    <span className="text-slate-400 text-[10px] font-black capitalize tracking-widest">Compiling Org Map...</span>
                                </div>
                            ) : !orgTree ? (
                                <div className="text-center py-20">
                                    <Network size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 text-xs font-bold">No organisation data available.</p>
                                </div>
                            ) : (
                                <TreeNode node={orgTree} depth={0} highlightId={empId} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;
