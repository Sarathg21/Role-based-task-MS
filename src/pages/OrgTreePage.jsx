import { useState, useEffect } from "react";
import {
    X, User, Shield, Briefcase, Network,
    ChevronDown, ChevronRight, PlusCircle, Check, XCircle, Loader2, ArrowLeft
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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
            <div className={`relative flex flex-col items-center p-2 rounded-lg border-2 shadow-sm hover:shadow-lg transition-all w-32 z-10 ${cardStyle}`}>
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
                <div className={`p-1.5 rounded-full mb-1 ${iconCls}`}>
                    {(role === "ADMIN" || role === "CFO") && <Shield size={14} />}
                    {role === "MANAGER" && <Briefcase size={14} />}
                    {role === "EMPLOYEE" && <User size={14} />}
                </div>

                {/* Name */}
                <h3 className="font-bold text-slate-800 text-[11px] text-center leading-tight mb-1 truncate w-full px-1" title={name}>{name}</h3>
                <span className="text-[9px] text-slate-400 font-mono mb-1">{emp_id}</span>

                {/* Role badge */}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${badgeCls}`}>
                    {role}
                </span>
                {dept && (
                    <span className="text-[8px] text-slate-500 mt-1 bg-white/70 px-1.5 py-0.5 rounded-md truncate max-w-full">
                        {dept}
                    </span>
                )}

                {/* Add child button */}
                {canAddChild && (
                    <button
                        onClick={() => setShowAddForm(v => !v)}
                        className={`mt-2 w-full flex items-center justify-center gap-1 text-[9px] font-semibold px-1 py-1 rounded-lg border transition-colors ${addBtnCls}`}
                    >
                        <PlusCircle size={10} />
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
                <div className="flex flex-col items-center">
                    {/* Connector line down */}
                    <div className="w-px h-6 bg-slate-300" />

                    <div className="relative flex justify-center">
                        {/* Horizontal bar across children */}
                        {children.length > 1 && (
                            <div className="absolute top-0 h-px bg-slate-300"
                                style={{
                                    left: '4rem',
                                    right: '4rem',
                                    width: 'auto'
                                }}
                            />
                        )}
                        <div className="flex gap-4 pt-0">
                            {children.map(child => (
                                <div key={child.emp_id || child.user?.id || child.id || Math.random()} className="flex flex-col items-center relative">
                                    {/* Stub line up to horizontal bar */}
                                    <div className="w-px h-6 bg-slate-300 absolute -top-6" />
                                    <OrgNode
                                        node={child}
                                        departments={departments}
                                        onAddNode={onAddNode}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Page Component ─────────────────────────────────────────────────────
const OrgTreePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [treeData, setTreeData] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [zoom, setZoom] = useState(0.85);

    const fetchTree = async () => {
        setLoading(true);
        try {
            const res = await api.get('/org/tree');
            setTreeData(res.data);

            // Still need to fetch departments for the add form
            const deptRes = await api.get('/departments');
            setDepartments(deptRes.data);

            // Fetch total count for footer
            const empRes = await api.get('/employees');
            setTotalEmployees(Array.isArray(empRes.data) ? empRes.data.length : 0);
        } catch (err) {
            console.error("Failed to build org tree", err);
            toast.error("Failed to load organization hierarchy");
        } finally {
            setLoading(false);
        }
    };

    const handleAddNode = async (managerId, newEmpData) => {
        try {
            const payload = {
                ...newEmpData,
                manager_emp_id: managerId,
                active: true
            };
            await api.post('/employees', payload);
            toast.success(`${newEmpData.name} added successfully!`);
            fetchTree(); // Refresh the tree
        } catch (err) {
            console.error("Failed to add employee via tree", err);
            toast.error("Failed to add employee");
        }
    };

    useEffect(() => {
        fetchTree();
    }, []);

    const depts = departments?.length ? departments : ["Engineering", "Sales", "HR", "Administration"];

    // Dynamically calculate counts
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
        if (treeData.orphan_managers) stats.managers += treeData.orphan_managers.length;
        if (treeData.orphan_employees) stats.employees += treeData.orphan_employees.length;
        calculatedManagers = stats.managers;
        calculatedEmployees = stats.employees;
    }

    return (
        <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col animate-fade-in mt-4">
            {/* Header */}
            <div className="flex justify-between items-start flex-wrap gap-3">
                <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-white/40 shadow-sm w-fit">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shrink-0 transition shadow-sm hover:shadow-md active:scale-95"
                        title="Back to Directory"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="pr-4">
                        <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Network size={22} className="text-violet-600" />
                            Organization Hierarchy
                        </h1>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-widest uppercase">
                            Manage your team structure and branch relationships
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 items-center bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Managers</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">{calculatedManagers}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Employees</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">{calculatedEmployees}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100" />
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Total Staff</p>
                        <p className="text-sm font-black text-violet-600 tabular-nums">{totalEmployees}</p>
                    </div>
                </div>
            </div>

            {/* Tree Canvas */}
            <div className="flex-1 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-auto p-4 bg-[radial-gradient(#cbd5e1_0.5px,transparent_0.5px)] [background-size:20px_20px] relative flex justify-center min-h-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 size={32} className="text-violet-600 animate-spin mb-2" />
                        <p className="text-sm text-slate-500 font-medium">Building tree structure...</p>
                    </div>
                ) : (
                    <div className="pb-12 pt-4 transition-transform duration-300 origin-top" style={{ transform: `scale(${zoom})` }}>
                        {/* Root Node */}
                        <div className="flex gap-16 justify-center">
                            {(treeData?.root || treeData?.cfo) && (
                                <OrgNode
                                    key={(treeData.root || treeData.cfo).emp_id || (treeData.root || treeData.cfo).user?.id || 'root'}
                                    node={treeData.root || treeData.cfo}
                                    departments={depts}
                                    onAddNode={handleAddNode}
                                    isRoot
                                />
                            )}
                        </div>

                        {/* Orphans */}
                        {treeData?.orphan_managers?.length > 0 && (
                            <div className="mt-16">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-6">Unlinked Departments</p>
                                <div className="flex gap-12 justify-center flex-wrap">
                                    {treeData.orphan_managers.map(node => (
                                        <OrgNode
                                            key={node.emp_id || node.user?.id || node.id || Math.random()}
                                            node={node}
                                            departments={depts}
                                            onAddNode={handleAddNode}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {treeData?.orphan_employees?.length > 0 && (
                            <div className="mt-16">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-6">Unassigned Staff</p>
                                <div className="flex gap-8 justify-center flex-wrap">
                                    {treeData.orphan_employees.map(node => (
                                        <OrgNode
                                            key={node.emp_id || node.user?.id || node.id || Math.random()}
                                            node={node}
                                            departments={depts}
                                            onAddNode={handleAddNode}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Legend Footer */}
            <div className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex justify-between items-center shadow-sm">
                <div className="flex gap-6 items-center">
                    <div className="flex items-center gap-4 border-r border-slate-100 pr-6 mr-2">
                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Zoom</span>
                        <input
                            type="range"
                            min="0.3"
                            max="1.5"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-32 accent-violet-600 cursor-pointer h-1.5 bg-slate-100 rounded-full"
                        />
                        <span className="text-[10px] font-black text-slate-600 w-8 tabular-nums">{Math.round(zoom * 100)}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#9B51E0] shadow-sm" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">CFO / Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#4285F4] shadow-sm" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Manager</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10B981] shadow-sm" />
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Employee</span>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                    Use slider to zoom · Drag canvas to navigate · Click nodes to expand branches
                </div>
            </div>
        </div>
    );
};

export default OrgTreePage;
