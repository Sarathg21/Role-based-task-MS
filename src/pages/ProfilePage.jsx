import { useState } from 'react';
import { User, Briefcase, Shield, ChevronDown, ChevronRight, ChevronLeft, Network, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USERS } from '../data/mockData';

// Build a nested tree structure from a flat USERS array
function buildTree(users) {
    const byId = {};
    users.forEach(u => { byId[u.id] = { ...u, children: [] }; });
    const roots = [];
    users.forEach(u => {
        if (u.managerId && byId[u.managerId]) {
            byId[u.managerId].children.push(byId[u.id]);
        } else {
            roots.push(byId[u.id]);
        }
    });
    return roots;
}

// Role config
const roleMeta = {
    CFO: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', dot: '#7c3aed' },
    Admin: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', dot: '#7c3aed' },
    Manager: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', dot: '#2563eb' },
    Employee: { bg: '#d1fae5', border: '#10b981', text: '#065f46', dot: '#059669' },
};

function getRoleMeta(role) {
    return roleMeta[role] || roleMeta.Employee;
}

// Recursive tree node — indented list style
function TreeNode({ node, depth = 0, highlightId }) {
    const [open, setOpen] = useState(depth < 2); // auto-expand first 2 levels
    const hasChildren = node.children && node.children.length > 0;
    const isMe = node.id === highlightId;
    const meta = getRoleMeta(node.role);

    return (
        <div style={{ marginLeft: depth === 0 ? 0 : 24 }}>
            {/* Node row */}
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
                {/* Expand/collapse toggle */}
                <div style={{ width: 16, flexShrink: 0, color: '#94a3b8' }}>
                    {hasChildren
                        ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                        : <span style={{ display: 'inline-block', width: 14 }} />
                    }
                </div>

                {/* Role dot */}
                <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: meta.dot, flexShrink: 0
                }} />

                {/* Avatar initial */}
                <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    backgroundColor: meta.bg,
                    color: meta.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 12, flexShrink: 0
                }}>
                    {node.name?.charAt(0) || '?'}
                </div>

                {/* Name & details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{node.name}</span>
                        <span style={{
                            fontSize: 10, fontWeight: 600,
                            backgroundColor: meta.bg, color: meta.text,
                            padding: '1px 7px', borderRadius: 999
                        }}>{node.role}</span>
                        {isMe && (
                            <span style={{
                                fontSize: 10, fontWeight: 700,
                                backgroundColor: '#ffedd5', color: '#ea580c',
                                padding: '1px 7px', borderRadius: 999
                            }}>You</span>
                        )}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                        {node.id} &nbsp;·&nbsp; {node.department}
                    </div>
                </div>

                {/* Children count badge */}
                {hasChildren && (
                    <span style={{
                        fontSize: 10, fontWeight: 600, color: '#64748b',
                        backgroundColor: '#f1f5f9', padding: '2px 7px', borderRadius: 999,
                        flexShrink: 0
                    }}>
                        {node.children.length} reports
                    </span>
                )}
            </div>

            {/* Children */}
            {hasChildren && open && (
                <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 20, paddingLeft: 4, marginBottom: 4 }}>
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} depth={depth + 1} highlightId={highlightId} />
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

    if (!user) return null;

    const empId = user.id;
    const manager = user.managerId ? USERS.find(u => u.id === user.managerId) : null;
    const treeRoots = buildTree(USERS);
    const totalStaff = USERS.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-medium text-slate-800">My Profile</h1>
                    <p className="text-sm text-slate-500">View your account details and organisation chart</p>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-2xl font-bold">
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

                <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                            <p className="text-sm font-semibold text-slate-800">{user.department}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="p-2 bg-emerald-100 rounded-lg"><Shield size={16} className="text-emerald-600" /></div>
                        <div>
                            <p className="text-xs text-slate-500">Reporting Manager</p>
                            {manager
                                ? <><p className="text-sm font-semibold text-slate-800">{manager.name}</p><p className="text-xs text-slate-400">{manager.id}</p></>
                                : <p className="text-sm font-semibold text-slate-800">Top-level Management</p>
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Org Hierarchy Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Toggle header */}
                <button
                    onClick={() => setShowOrg(o => !o)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-100 rounded-lg">
                            <Network size={18} className="text-violet-600" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-slate-800">Organisation Hierarchy</p>
                            <p className="text-xs text-slate-500">{totalStaff} staff · Click to {showOrg ? 'hide' : 'view'}</p>
                        </div>
                    </div>
                    <div className="text-slate-400">
                        {showOrg ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                </button>

                {/* Tree panel */}
                {showOrg && (
                    <div className="border-t border-slate-200">
                        {/* Legend */}
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-5 text-xs text-slate-600 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#7c3aed' }} />
                                CFO / Admin
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#2563eb' }} />
                                Manager
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#059669' }} />
                                Employee
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: '#f97316' }} />
                                You
                            </div>
                            <span className="ml-auto text-slate-400">Click any row to expand/collapse</span>
                        </div>

                        {/* Tree */}
                        <div className="p-5 overflow-y-auto max-h-[70vh]">
                            {treeRoots.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-8">No organisation data available.</p>
                            ) : (
                                treeRoots.map(root => (
                                    <TreeNode key={root.id} node={root} depth={0} highlightId={empId} />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
