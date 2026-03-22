import { useState, useEffect } from "react";
import {
    X, User, Shield, Briefcase, Network,
    ChevronDown, ChevronRight, PlusCircle, Check, XCircle, Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// ─── Inline Add-Node Form ────────────────────────────────────────────────────
const AddNodeForm = ({ parentRole, departments, onAdd, onCancel }) => {
    const childRole = (parentRole === "Admin" || parentRole === "CFO" || parentRole === "ADMIN") ? "Manager" : "Employee";

    // Normalise departments: API may return objects {dept_id, name, active} or plain strings
    const deptStrings = departments.map(d =>
        typeof d === 'string' ? d : (d.name || d.dept_id || d.department_id || String(d))
    );

    const [form, setForm] = useState({
        name: "",
        id: "",
        department: deptStrings[0] || "",
        password: "password123",
    });
    const [error, setError] = useState("");

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = () => {
        if (!form.name.trim() || !form.id.trim()) {
            setError("Name and ID are required.");
            return;
        }
        onAdd({ ...form, role: childRole, active: true });
    };

    return (
        <div className="mt-3 bg-white border-2 border-violet-300 rounded-xl p-3 shadow-xl w-52 z-30 relative">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-2">
                + Add {childRole}
            </p>
            {error && <p className="text-red-500 text-[10px] mb-1">{error}</p>}
            <div className="space-y-1.5">
                <input
                    autoFocus
                    placeholder="Full Name"
                    value={form.name}
                    onChange={e => set("name", e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <input
                    placeholder={`ID (e.g. ${childRole === "Manager" ? "MGR003" : "EMP009"})`}
                    value={form.id}
                    onChange={e => set("id", e.target.value.toUpperCase())}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
                <select
                    value={form.department}
                    onChange={e => set("department", e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                    {deptStrings.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input
                    placeholder="Password"
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
            </div>
            <div className="flex gap-2 mt-2">
                <button
                    onClick={handleSubmit}
                    className="flex-1 flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                >
                    <Check size={12} /> Add
                </button>
                <button
                    onClick={onCancel}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                >
                    <XCircle size={12} /> Cancel
                </button>
            </div>
        </div>
    );
};

// ─── Role Styles ─────────────────────────────────────────────────────────────
const ROLE_CARD = {
    CFO: "bg-violet-50  border-violet-300  shadow-violet-100",
    ADMIN: "bg-violet-50  border-violet-300  shadow-violet-100",
    MANAGER: "bg-blue-50    border-blue-300    shadow-blue-100",
    EMPLOYEE: "bg-emerald-50 border-emerald-300 shadow-emerald-100",
};
const ROLE_ICON_BG = {
    CFO: "bg-violet-100  text-violet-600",
    ADMIN: "bg-violet-100  text-violet-600",
    MANAGER: "bg-blue-100    text-blue-600",
    EMPLOYEE: "bg-emerald-100 text-emerald-600",
};
const ROLE_BADGE = {
    CFO: "text-violet-700  bg-violet-100  border-violet-200",
    ADMIN: "text-violet-700  bg-violet-100  border-violet-200",
    MANAGER: "text-blue-700    bg-blue-100    border-blue-200",
    EMPLOYEE: "text-emerald-700 bg-emerald-100 border-emerald-200",
};
const ROLE_ADD_BTN = {
    CFO: "border-violet-300  text-violet-600  hover:bg-violet-100",
    ADMIN: "border-violet-300  text-violet-600  hover:bg-violet-100",
    MANAGER: "border-blue-300    text-blue-600    hover:bg-blue-100",
    EMPLOYEE: null,
};

// ─── Single Org Node ─────────────────────────────────────────────────────────
const OrgNode = ({ node, departments, onAddNode, isRoot = false }) => {
    const { user } = useAuth();
    const children = node?.children || [];
    // Handle both { user: {...}, children: [] } and { emp_id, name, role, children: [] } structures
    const u = node?.user || node || {};
    const [collapsed, setCollapsed] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const emp_id = u.id || u.emp_id || 'Unknown';
    const role = (u.role || 'EMPLOYEE').toUpperCase();
    const name = u.name || 'Unknown User';
    const dept = u.department || u.department_id || (isRoot ? "Management" : "");

    const canAddChild = role !== "EMPLOYEE";
    const hasChildren = children.length > 0;

    const handleAdd = (newUser) => {
        onAddNode(emp_id, newUser);
        setShowAddForm(false);
    };

    const cardStyle = ROLE_CARD[role] || ROLE_CARD.EMPLOYEE;
    const iconCls = ROLE_ICON_BG[role] || ROLE_ICON_BG.EMPLOYEE;
    const badgeCls = ROLE_BADGE[role] || ROLE_BADGE.EMPLOYEE;
    const addBtnCls = ROLE_ADD_BTN[role] || ROLE_ADD_BTN.EMPLOYEE || 'border-slate-300 text-slate-600 hover:bg-slate-100';

    return (
        <div className="flex flex-col items-center">
            {/* ── Node Card ── */}
            <div className={`relative flex flex-col items-center p-3 rounded-lg border-2 shadow-sm hover:shadow-lg transition-all w-40 z-10 ${cardStyle}`}>
                {/* Collapse/Expand toggle */}
                {hasChildren && (
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? "Expand" : "Collapse"}
                        className="absolute top-2 right-2 p-0.5 rounded-full bg-white/70 hover:bg-white text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
                    >
                        {collapsed
                            ? <ChevronRight size={14} />
                            : <ChevronDown size={14} />
                        }
                    </button>
                )}

                {/* Icon */}
                <div className={`p-2 rounded-full mb-1.5 ${iconCls}`}>
                    {(role === "ADMIN" || role === "CFO") && <Shield size={18} />}
                    {role === "MANAGER" && <Briefcase size={18} />}
                    {role === "EMPLOYEE" && <User size={18} />}
                </div>

                {/* Name */}
                <h3 className="font-bold text-slate-800 text-sm text-center leading-tight mb-1 truncate w-full px-2" title={name}>{name}</h3>
                <span className="text-[10px] text-slate-400 font-mono mb-1">{emp_id}</span>

                {/* Role badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${badgeCls}`}>
                    {role}
                </span>
                {dept && (
                    <span className="text-[10px] text-slate-500 mt-1 bg-white/70 px-2 py-0.5 rounded-md truncate max-w-full">
                        {dept}
                    </span>
                )}

                {/* Add child button */}
                {canAddChild && (
                    <button
                        onClick={() => setShowAddForm(v => !v)}
                        className={`mt-3 w-full flex items-center justify-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${addBtnCls}`}
                    >
                        <PlusCircle size={12} />
                        Add {role === "ADMIN" || role === "CFO" ? "Manager" : "Employee"}
                    </button>
                )}
            </div>

            {/* Inline add form — positioned below card */}
            {showAddForm && (
                <AddNodeForm
                    parentRole={user.role}
                    departments={departments}
                    onAdd={handleAdd}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* ── Children ── */}
            {hasChildren && !collapsed && (
                <div className="flex flex-col items-center w-full">
                    {/* Primary vertical connector from parent down to the branch line */}
                    <div className="w-0.5 h-10 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]" />

                    <div className="flex justify-center flex-nowrap pt-0 gap-0">
                        {children.map((child, idx) => (
                            <div key={child.emp_id || Math.random()} className="flex flex-col items-center relative">
                                
                                {/* Horizontal connectors forming the 'spine' - robust single-element approach */}
                                <div 
                                    className="absolute top-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                                    style={{ 
                                        left: idx === 0 ? '50%' : '0', 
                                        right: idx === children.length - 1 ? '50%' : '0' 
                                    }}
                                />

                                {/* Stub vertical line connecting the spine down to the child card */}
                                <div className="w-0.5 h-10 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.2)]" />
                                
                                <div className="px-6">
                                    <OrgNode
                                        node={child}
                                        departments={departments}
                                        onAddNode={onAddNode}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Modal Shell ─────────────────────────────────────────────────────────────
const OrgTreeModal = ({ isOpen, onClose, onAddNode, users = [] }) => {
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);

    const fetchTree = async () => {
        setLoading(true);
        try {
            const res = await api.get('/org/tree');
            // Backend returns { root: { ... }, total_employees: X, ... } or { cfo: { ... } }
            // Let's be compatible with both
            setTreeData(res.data);

            // Still need to fetch departments for the add form
            const deptRes = await api.get('/departments');
            setDepartments(deptRes.data);
        } catch (err) {
            console.error("Failed to build org tree", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchTree();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const depts = departments?.length ? departments : ["Engineering", "Sales", "HR", "Administration"];

    // Dynamically calculate counts if backend doesn't provide them accurately
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

    let calculatedManagers = treeData?.total_managers || 0;
    let calculatedEmployees = treeData?.total_employees || 0;

    if (treeData && (treeData.root || treeData.cfo) && (!treeData.total_managers && !treeData.total_employees)) {
        const stats = getOrgStats(treeData.root || treeData.cfo);

        // Add orphans to stats
        if (treeData.orphan_managers) stats.managers += treeData.orphan_managers.length;
        if (treeData.orphan_employees) stats.employees += treeData.orphan_employees.length;

        calculatedManagers = stats.managers;
        calculatedEmployees = stats.employees;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-6xl" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-20">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Network size={22} className="text-violet-600" />
                            Organization Hierarchy
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Click <strong>▶ / ▼</strong> to collapse/expand · Click <strong>+ Add</strong> on a node to add a branch
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-red-500"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tree Canvas */}
                <div className="flex-1 overflow-auto p-8 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] bg-slate-50 flex justify-center">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 size={32} className="text-violet-600 animate-spin mb-2" />
                            <p className="text-sm text-slate-500 font-medium">Loading organization structure...</p>
                        </div>
                    ) : (
                        <div className="min-w-max pb-12 pt-4">
                            {/* ── CFO Node (Root) ── */}
                            <div className="flex gap-16 justify-center">
                                {(treeData?.root || treeData?.cfo) && (
                                    <OrgNode
                                        key={(treeData.root || treeData.cfo).emp_id || (treeData.root || treeData.cfo).user?.id || 'root'}
                                        node={treeData.root || treeData.cfo}
                                        departments={depts}
                                        onAddNode={onAddNode}
                                        isRoot
                                    />
                                )}
                            </div>

                            {/* ── Orphan managers (not linked to any root) ── */}
                            {treeData?.orphan_managers?.length > 0 && (
                                <div className="mt-12">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-4">Unlinked Managers</p>
                                    <div className="flex gap-8 justify-center flex-wrap">
                                        {treeData.orphan_managers.map(node => (
                                            <OrgNode
                                                key={node.emp_id || node.user?.id || node.id || Math.random()}
                                                node={node}
                                                departments={depts}
                                                onAddNode={onAddNode}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Orphan employees (no manager assigned) ── */}
                            {treeData?.orphan_employees?.length > 0 && (
                                <div className="mt-12">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-4">Unassigned Employees</p>
                                    <div className="flex gap-4 justify-center flex-wrap">
                                        {treeData.orphan_employees.map(node => (
                                            <OrgNode
                                                key={node.emp_id || node.user?.id || node.id || Math.random()}
                                                node={node}
                                                departments={depts}
                                                onAddNode={onAddNode}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Legend */}
                <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-600 shadow-[0_-2px_6px_rgba(0,0,0,0.06)]">
                    <div className="flex gap-5 font-medium flex-wrap">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-violet-500 ring-2 ring-violet-200 inline-block" /> CFO / Admin</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200 inline-block" /> Manager</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 inline-block" /> Employee</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <span className="text-slate-500">Managers: <strong className="text-slate-800">{calculatedManagers}</strong></span>
                        <span className="text-slate-500">Employees: <strong className="text-slate-800">{calculatedEmployees}</strong></span>
                        <div className="w-px h-4 bg-slate-200" />
                        <span className="text-slate-400 font-semibold uppercase tracking-tighter">Total Staff: {users.length}</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OrgTreeModal;
