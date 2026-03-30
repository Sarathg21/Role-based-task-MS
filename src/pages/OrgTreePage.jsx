import { useState, useEffect, useMemo } from "react";
import {
    X, User, Shield, Briefcase, Network, RefreshCw,
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
            <p className="text-[10px] font-bold capitalize tracking-wider text-violet-600 mb-2">
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
    CFO: "border-indigo-100",
    ADMIN: "border-indigo-100",
    MANAGER: "border-indigo-100",
    EMPLOYEE: "border-indigo-100",
    SYSTEM: "border-violet-200",
    ORGANIZATION: "border-violet-200",
};
const ROLE_BADGE = {
    CFO: "text-indigo-600 bg-indigo-50",
    ADMIN: "text-indigo-600 bg-indigo-50",
    MANAGER: "text-blue-600 bg-blue-50",
    EMPLOYEE: "text-emerald-600 bg-emerald-50",
    SYSTEM: "text-violet-600 bg-violet-50",
    ORGANIZATION: "text-violet-600 bg-violet-50",
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

    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const canAddChild = role !== "EMPLOYEE";
    const hasChildren = children.length > 0;

    const handleAdd = (newUser) => {
        onAddNode(emp_id, newUser);
        setShowAddForm(false);
    };

    const cardStyle = ROLE_CARD[role] || ROLE_CARD.EMPLOYEE;
    const badgeCls = ROLE_BADGE[role] || ROLE_BADGE.EMPLOYEE;

    return (
        <div className="flex flex-col items-center">
            {/* ── Node Card (Horizontal Design) ── */}
            <div className={`group relative flex items-center gap-4 p-4 rounded-3xl border bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 w-[280px] z-10 border-indigo-100/50`}>
                
                {/* Profile Avatar */}
                <div className="relative shrink-0">
                   <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-200 overflow-hidden">
                       {/* Placeholder for real image if available, else initials */}
                       <img 
                          src={`https://i.pravatar.cc/150?u=${emp_id}`} 
                          alt={name} 
                          className="w-full h-full object-cover opacity-90" 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                       />
                       <span className="absolute inset-0 flex items-center justify-center pointer-events-none">{initials}</span>
                   </div>
                   {/* Online status indicator */}
                   <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-bold text-[#1e1b4b] text-[15px] truncate leading-tight mb-0.5 group-hover:text-indigo-700 transition-colors" title={name}>{name}</h3>
                    <p className="text-[12px] text-slate-500 font-medium truncate capitalize opacity-80" title={u.role}>
                        {u.role === 'ADMIN' ? 'Administrator' : u.role === 'CFO' ? 'Chief Financial Officer' : (u.role || 'Member')}
                    </p>
                    {dept && (
                         <div className="flex items-center gap-1.5 mt-2">
                             <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold border-none uppercase tracking-widest ${badgeCls} opacity-90`}>
                                {dept} 
                             </span>
                         </div>
                    )}
                </div>

                {/* Actions Layer */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {hasChildren && (
                        <button
                            onClick={() => setCollapsed(c => !c)}
                            title={collapsed ? "Expand" : "Collapse"}
                            className="p-1.5 rounded-xl bg-slate-50 hover:bg-white text-slate-500 hover:text-indigo-600 transition-all shadow-sm border border-slate-100"
                        >
                            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                    {canAddChild && (
                        <button
                            onClick={() => setShowAddForm(v => !v)}
                            title={`Add ${role === "ADMIN" || role === "CFO" ? "Manager" : "Employee"}`}
                            className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                        >
                            <PlusCircle size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Inline add form */}
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
                            <div key={child.emp_id || child.user?.id || child.id || Math.random()} className="flex flex-col items-center relative gap-0">
                                
                                {/* Horizontal connectors forming the 'spine' - robust approach */}
                                <div 
                                    className="absolute top-0 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.3)] transition-all duration-500"
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

// ─── Main Page Component ─────────────────────────────────────────────────────
const OrgTreePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [deptFilter, setDeptFilter] = useState('ALL');
    const [isDeptOpen, setIsDeptOpen] = useState(false);
    const [treeData, setTreeData] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [zoom, setZoom] = useState(0.85);

    const fetchTree = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                api.get('/org/tree'),
                api.get('/admin/departments'),
                api.get('/employees')
            ]);
            
            // Extract employees first for fallback
            const empRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
            const emps = Array.isArray(empRes.data) ? empRes.data : [];
            setTotalEmployees(emps.length);
            
            // Extract departments with multiple fallbacks
            let deptRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
            let deptData = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.data || []);
            
            if (deptData.length === 0) {
                try {
                    const altRes = await api.get('/departments');
                    deptData = Array.isArray(altRes.data) ? altRes.data : (altRes.data?.data || []);
                } catch (e) { console.warn("Alt dept fetch failed", e); }
            }
            setDepartments(deptData);

            // Handle Tree Data
            if (results[0].status === 'fulfilled' && results[0].value.data) {
                const raw = results[0].value.data;
                if (raw.root || raw.children) {
                    setTreeData(raw);
                } else {
                    setTreeData(buildHierarchy(emps));
                }
            } else {
                // If org/tree failed, build from employees
                setTreeData(buildHierarchy(emps));
            }
        } catch (err) {
            console.error("Failed to build org tree", err);
            toast.error("Error building structure. Trying local build.");
        } finally {
            setLoading(false);
        }
    };

    const buildHierarchy = (emps) => {
        if (!emps || !emps.length) return null;
        
        const idMap = {};
        // First pass: Create nodes
        emps.forEach(emp => {
          if (emp && emp.emp_id) {
            idMap[emp.emp_id] = { ...emp, children: [] };
          }
        });

        const roots = [];
        // Second pass: Assign children
        emps.forEach(emp => {
            if (!emp || !emp.emp_id) return;
            const node = idMap[emp.emp_id];
            const managerId = emp.manager_emp_id;

            if (managerId && idMap[managerId] && managerId !== emp.emp_id) {
                idMap[managerId].children.push(node);
            } else {
                roots.push(node);
            }
        });

        // Use the first root (typically CEO/Admin) or a virtual root if multiple
        if (roots.length > 1) {
            return {
                name: "Organization",
                role: "SYSTEM",
                emp_id: "ORG-ROOT",
                children: roots
            };
        }
        return roots[0];
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

    const depts = useMemo(() => {
        const list = departments?.length ? departments.map(d => ({
            name: d.name || d.dept_name || (typeof d === 'string' ? d : String(d)),
            id: String(d.department_id || d.dept_id || d.id || (d.name || d.dept_name || String(d)))
        })) : [];

        // If still empty, try to extract from treeData
        if (list.length === 0 && treeData) {
            const extracted = new Set();
            const scan = (n) => {
                if (!n) return;
                const d = n.user?.department || n.department || n.department_name;
                if (d && d !== 'Management' && d !== 'System') extracted.add(d);
                (n.children || []).forEach(scan);
            };
            scan(treeData?.root || treeData?.cfo || treeData);
            if (treeData.orphan_managers) treeData.orphan_managers.forEach(scan);
            if (treeData.orphan_employees) treeData.orphan_employees.forEach(scan);
            
            extracted.forEach(name => list.push({ name, id: name }));
        }

        if (list.length === 0) {
            ["Engineering", "Sales", "HR", "Administration"].forEach(name => list.push({ name, id: name }));
        }
        return list;
    }, [departments, treeData]);

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

    // Helper: resolve a dept filter value (ID or name) against the departments list
    const getDeptLabelForFilter = (filterVal) => {
        if (!filterVal || filterVal === 'ALL') return 'All Departments';
        const match = departments.find(d => {
            const dId = String(d.department_id || d.dept_id || d.id || '').toUpperCase();
            const dName = (d.name || d.dept_name || (typeof d === 'string' ? d : '')).toUpperCase();
            return dId === filterVal.toUpperCase() || dName === filterVal.toUpperCase();
        });
        return match ? (match.name || match.dept_name || filterVal) : filterVal;
    };

    // Helper to filter tree nodes by department
    const filterNodeByDept = (node, deptFilter) => {
        if (!node) return null;
        if (deptFilter === 'ALL') return node;
        
        const u = node.user || node;
        // Nodes can store dept as department_id (e.g. "CASH") or department (name string)
        const empDeptId   = String(u.department_id || u.dept_id || '').toUpperCase().trim();
        const empDeptName = String(u.department || u.department_name || '').toUpperCase().trim();
        const filterUp    = deptFilter.toUpperCase().trim();

        // Also resolve the filter value against the departments master list
        const matchingDepts = departments.filter(d => {
            const dId   = String(d.department_id || d.dept_id || d.id || '').toUpperCase();
            const dName = (d.name || d.dept_name || (typeof d === 'string' ? d : '')).toUpperCase();
            return dId === filterUp || dName === filterUp;
        });
        const validIds   = matchingDepts.map(d => String(d.department_id || d.dept_id || d.id || '').toUpperCase());
        const validNames = matchingDepts.map(d => (d.name || d.dept_name || (typeof d === 'string' ? d : '')).toUpperCase());

        const selfMatch =
            (empDeptId   && (empDeptId === filterUp   || validIds.includes(empDeptId)))   ||
            (empDeptName && (empDeptName === filterUp || validNames.includes(empDeptName))) ||
            empDeptId.includes(filterUp) || empDeptName.includes(filterUp);
        
        // Recursively filter children
        const filteredChildren = (node.children || [])
            .map(c => filterNodeByDept(c, deptFilter))
            .filter(Boolean);
        
        // Admin/CFO/ORG-ROOT is always kept as structural head if any child matches
        const isStructuralRoot = ['ADMIN', 'CFO', 'SYSTEM', 'ORGANIZATION'].includes(
            String(u.role || '').toUpperCase()
        ) || u.emp_id === 'ORG-ROOT';

        if (selfMatch || filteredChildren.length > 0 || isStructuralRoot) {
            return { ...node, children: filteredChildren };
        }
        return null;
    };

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
                            Organization Tree
                        </h1>
                    </div>
                </div>

                <div className="flex gap-3 items-center">
                    <div className="flex gap-4 items-center bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] mb-0.5">Managers</p>
                            <p className="text-sm font-black text-slate-800 tabular-nums">{calculatedManagers}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] mb-0.5">Employees</p>
                            <p className="text-sm font-black text-slate-800 tabular-nums">{calculatedEmployees}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] mb-0.5">Total Staff</p>
                            <p className="text-sm font-black text-violet-600 tabular-nums">{totalEmployees}</p>
                        </div>
                    </div>

                    <div className="relative">
                        <button 
                            onClick={() => setIsDeptOpen(v => !v)}
                            className={`flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold shadow-sm hover:shadow-md transition-all ${
                                deptFilter !== 'ALL' ? 'text-violet-600 border-violet-200' : 'text-slate-600'
                            }`}
                        >
                            <Network size={16} className="text-violet-500" />
                            {deptFilter === 'ALL' ? 'Department' : getDeptLabelForFilter(deptFilter)}
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDeptOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDeptOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsDeptOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in zoom-in-95 duration-200 max-h-72 overflow-y-auto">
                                        <button
                                            onClick={() => { setDeptFilter('ALL'); setIsDeptOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest mb-0.5 flex items-center justify-between ${
                                                deptFilter === 'ALL' ? 'bg-violet-50 text-violet-600' : 'text-slate-400 hover:bg-slate-50'
                                            }`}
                                        >
                                            All Departments
                                            {deptFilter === 'ALL' && <Check size={14} />}
                                        </button>
                                        {depts.length === 0 && (
                                            <p className="px-4 py-3 text-[10px] text-slate-400 italic">No departments found</p>
                                        )}
                                        {depts.map((d, di) => {
                                            const isSelected = deptFilter === d.id;
                                            return (
                                                <button
                                                    key={d.id || di}
                                                    onClick={() => { setDeptFilter(d.id); setIsDeptOpen(false); }}
                                                    className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest mb-0.5 flex items-center justify-between ${
                                                        isSelected ? 'bg-violet-50 text-violet-600' : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <span>{d.name}</span>
                                                    {isSelected && <Check size={14} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                            </>
                        )}
                    </div>

                    <button 
                        onClick={fetchTree}
                        disabled={loading}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Tree Canvas */}
            <div className="flex-1 bg-[#F5F3FF] rounded-[2.5rem] shadow-sm border border-indigo-100 overflow-auto p-12 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:32px_32px] relative flex flex-col items-center min-h-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center m-auto">
                        <Loader2 size={32} className="text-violet-600 animate-spin mb-2" />
                        <p className="text-sm text-slate-500 font-medium">Building tree structure...</p>
                    </div>
                ) : (
                    <div className="m-auto min-w-fit flex flex-col items-center pb-24 pt-4 transition-transform duration-300 origin-top" style={{ transform: `scale(${zoom})` }}>
                        {/* Root Node Detection & Rendering */}
                        {(() => {
                            const rawNode = treeData?.root || treeData?.cfo || (treeData?.children ? treeData : null);
                            const mainNode = deptFilter !== 'ALL' ? filterNodeByDept(rawNode, deptFilter) : rawNode;
                            if (!mainNode) return (
                                <div className="m-auto flex flex-col items-center justify-center gap-3 text-slate-400 opacity-60">
                                    <Network size={32} strokeWidth={1} />
                                    <p className="text-sm font-bold">No nodes match the selected department filter.</p>
                                </div>
                            );
                            return (
                                <div className="flex gap-16 justify-center">
                                    <OrgNode
                                        key={mainNode.emp_id || mainNode.user?.id || mainNode.id || 'root'}
                                        node={mainNode}
                                        departments={depts}
                                        onAddNode={handleAddNode}
                                        isRoot
                                    />
                                </div>
                            );
                        })()}

                        {/* Orphan managers — also apply dept filter */}
                        {treeData?.orphan_managers?.length > 0 && (
                            <div className="mt-16">
                                <p className="text-xs text-slate-400 font-semibold capitalize tracking-wider text-center mb-6">Unlinked Departments</p>
                                <div className="flex gap-12 justify-center flex-wrap">
                                    {treeData.orphan_managers
                                        .filter(node => deptFilter === 'ALL' || filterNodeByDept(node, deptFilter) !== null)
                                        .map(node => (
                                        <OrgNode
                                            key={node.emp_id || node.user?.id || node.id || Math.random()}
                                            node={deptFilter !== 'ALL' ? filterNodeByDept(node, deptFilter) : node}
                                            departments={depts}
                                            onAddNode={handleAddNode}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Orphan employees — also apply dept filter */}
                        {treeData?.orphan_employees?.length > 0 && (
                            <div className="mt-16">
                                <p className="text-xs text-slate-400 font-semibold capitalize tracking-wider text-center mb-6">Unassigned Staff</p>
                                <div className="flex gap-8 justify-center flex-wrap">
                                    {treeData.orphan_employees
                                        .filter(node => deptFilter === 'ALL' || filterNodeByDept(node, deptFilter) !== null)
                                        .map(node => (
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
                        <span className="text-[10px] font-black tracking-widest capitalize text-slate-400">Zoom</span>
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
                        <span className="text-[10px] font-black text-slate-600 capitalize tracking-widest">CFO/Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#4285F4] shadow-sm" />
                        <span className="text-[10px] font-black text-slate-600 capitalize tracking-widest">Manager</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10B981] shadow-sm" />
                        <span className="text-[10px] font-black text-slate-600 capitalize tracking-widest">Employee</span>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 tracking-widest capitalize">
                    Use slider to zoom · Drag canvas to navigate · Click nodes to expand branches
                </div>
            </div>
        </div>
    );
};

export default OrgTreePage;
