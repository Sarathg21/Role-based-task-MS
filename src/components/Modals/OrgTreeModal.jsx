import { useState } from "react";
import {
    X, User, Shield, Briefcase, Network,
    ChevronDown, ChevronRight, PlusCircle, Check, XCircle
} from "lucide-react";

// ─── Inline Add-Node Form ────────────────────────────────────────────────────
const AddNodeForm = ({ parentRole, departments, onAdd, onCancel }) => {
    const childRole = parentRole === "Admin" ? "Manager" : "Employee";

    const [form, setForm] = useState({
        name: "",
        id: "",
        department: departments[0] || "",
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
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
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
    Admin: "bg-violet-50  border-violet-300  shadow-violet-100",
    Manager: "bg-blue-50    border-blue-300    shadow-blue-100",
    Employee: "bg-emerald-50 border-emerald-300 shadow-emerald-100",
};
const ROLE_ICON_BG = {
    CFO: "bg-violet-100  text-violet-600",
    Admin: "bg-violet-100  text-violet-600",
    Manager: "bg-blue-100    text-blue-600",
    Employee: "bg-emerald-100 text-emerald-600",
};
const ROLE_BADGE = {
    CFO: "text-violet-700  bg-violet-100  border-violet-200",
    Admin: "text-violet-700  bg-violet-100  border-violet-200",
    Manager: "text-blue-700    bg-blue-100    border-blue-200",
    Employee: "text-emerald-700 bg-emerald-100 border-emerald-200",
};
const ROLE_ADD_BTN = {
    CFO: "border-violet-300  text-violet-600  hover:bg-violet-100",
    Admin: "border-violet-300  text-violet-600  hover:bg-violet-100",
    Manager: "border-blue-300    text-blue-600    hover:bg-blue-100",
    Employee: null,
};

// ─── Single Org Node ─────────────────────────────────────────────────────────
const OrgNode = ({ node, departments, onAddNode, isRoot = false }) => {
    const { user, children } = node;
    const [collapsed, setCollapsed] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const canAddChild = user.role !== "Employee";
    const hasChildren = children && children.length > 0;

    const handleAdd = (newUser) => {
        onAddNode(user.id, newUser);
        setShowAddForm(false);
    };

    return (
        <div className="flex flex-col items-center">
            {/* ── Node Card ── */}
            <div className={`relative flex flex-col items-center p-4 rounded-xl border-2 shadow-sm hover:shadow-lg transition-all w-48 z-10 ${ROLE_CARD[user.role] || ROLE_CARD.Employee}`}>
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
                <div className={`p-3 rounded-full mb-2 ${ROLE_ICON_BG[user.role] || ROLE_ICON_BG.Employee}`}>
                    {(user.role === "Admin" || user.role === "CFO") && <Shield size={22} />}
                    {user.role === "Manager" && <Briefcase size={22} />}
                    {user.role === "Employee" && <User size={22} />}
                </div>

                {/* Name */}
                <h3 className="font-bold text-slate-800 text-sm text-center leading-tight mb-1">{user.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono mb-1">{user.id}</span>

                {/* Role badge */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${ROLE_BADGE[user.role]}`}>
                    {user.role}
                </span>
                <span className="text-[10px] text-slate-500 mt-1 bg-white/70 px-2 py-0.5 rounded-md">
                    {user.department || "Management"}
                </span>

                {/* Add child button */}
                {canAddChild && (
                    <button
                        onClick={() => setShowAddForm(v => !v)}
                        className={`mt-3 w-full flex items-center justify-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${ROLE_ADD_BTN[user.role]}`}
                    >
                        <PlusCircle size={12} />
                        Add {user.role === "Admin" ? "Manager" : "Employee"}
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
                    <div className="w-px h-8 bg-slate-300" />

                    <div className="relative flex justify-center">
                        {/* Horizontal bar across children */}
                        {children.length > 1 && (
                            <div className="absolute top-0 left-[calc(50%-var(--half,0px))] w-[calc(100%-12rem)] h-px bg-slate-300"
                                style={{ left: '6rem', width: `calc(100% - 12rem)` }}
                            />
                        )}
                        <div className="flex gap-8 pt-0">
                            {children.map(child => (
                                <div key={child.id} className="flex flex-col items-center relative">
                                    {/* Stub line up to horizontal bar */}
                                    <div className="w-px h-8 bg-slate-300 absolute -top-8" />
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

// ─── Modal Shell ─────────────────────────────────────────────────────────────
const OrgTreeModal = ({ isOpen, onClose, users, departments, onAddNode }) => {
    if (!isOpen) return null;

    // Build the tree from flat users list
    const buildTree = () => {
        // Root = CFO or Admin
        const roots = users.filter(u => u.role === "CFO" || u.role === "Admin");
        const managers = users.filter(u => u.role === "Manager");
        const employees = users.filter(u => u.role === "Employee");

        // Track which employee IDs have been placed in the tree
        const placedEmpIds = new Set();

        const rootNodes = roots.map(root => ({
            user: root,
            id: root.id,
            children: managers
                // managers either explicitly report to this root or have no managerId (auto-assign to first root)
                .filter(m => m.managerId === root.id || !m.managerId)
                .map(mgr => {
                    const mgrEmployees = employees.filter(e => e.managerId === mgr.id);
                    mgrEmployees.forEach(e => placedEmpIds.add(e.id));
                    return {
                        user: mgr,
                        id: mgr.id,
                        children: mgrEmployees.map(emp => ({ user: emp, id: emp.id, children: [] })),
                    };
                }),
        }));

        // Any managers not linked to a root
        const orphanManagers = managers.filter(m =>
            !roots.some(r => m.managerId === r.id || !m.managerId)
        ).map(mgr => {
            const mgrEmployees = employees.filter(e => e.managerId === mgr.id);
            mgrEmployees.forEach(e => placedEmpIds.add(e.id));
            return { user: mgr, id: mgr.id, children: mgrEmployees.map(emp => ({ user: emp, id: emp.id, children: [] })) };
        });

        // Any employees not yet placed (no matching manager)
        const orphanEmps = employees
            .filter(e => !placedEmpIds.has(e.id))
            .map(e => ({ user: e, id: e.id, children: [] }));

        return { rootNodes, orphanManagers, orphanEmps };
    };

    const { rootNodes, orphanManagers, orphanEmps } = buildTree();
    const depts = departments && departments.length ? departments : ["Engineering", "Sales", "HR", "Administration"];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden">

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
                    <div className="min-w-max pb-12 pt-4">
                        {/* ── Root nodes (CFO / Admin) ── */}
                        <div className="flex gap-16 justify-center">
                            {rootNodes.map(node => (
                                <OrgNode
                                    key={node.id}
                                    node={node}
                                    departments={depts}
                                    onAddNode={onAddNode}
                                    isRoot
                                />
                            ))}
                        </div>

                        {/* ── Orphan managers (not linked to any root) ── */}
                        {orphanManagers.length > 0 && (
                            <div className="mt-12">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-4">Unlinked Managers</p>
                                <div className="flex gap-8 justify-center flex-wrap">
                                    {orphanManagers.map(node => (
                                        <OrgNode key={node.id} node={node} departments={depts} onAddNode={onAddNode} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Orphan employees (no manager assigned) ── */}
                        {orphanEmps.length > 0 && (
                            <div className="mt-12">
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center mb-4">Unassigned Employees</p>
                                <div className="flex gap-4 justify-center flex-wrap">
                                    {orphanEmps.map(node => (
                                        <OrgNode key={node.id} node={node} departments={depts} onAddNode={onAddNode} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Legend */}
                <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-600 shadow-[0_-2px_6px_rgba(0,0,0,0.06)]">
                    <div className="flex gap-5 font-medium">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-violet-500 ring-2 ring-violet-200 inline-block" /> CFO / Admin</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-200 inline-block" /> Manager</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200 inline-block" /> Employee</span>
                    </div>
                    <span className="text-slate-400 font-semibold">Total Staff: {users.length}</span>
                </div>

            </div>
        </div>
    );
};

export default OrgTreeModal;
