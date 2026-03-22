import { useState, useEffect, useMemo } from "react";
import api from "../services/api";
import { Building2, Plus, Edit3, MoreHorizontal, User, Users, RefreshCw, Loader2, Search, ArrowLeft, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import DepartmentFormModal from "../components/Modals/DepartmentFormModal";
import ConfirmationModal from "../components/UI/ConfirmationModal";

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, empRes] = await Promise.all([
                api.get('/admin/departments'),
                api.get('/employees')
            ]);
            setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
            setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        } catch (err) {
            console.error("Failed to fetch department data", err);
            toast.error("Failed to load departments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveDepartment = async (deptData) => {
        try {
            if (editingDept) {
                // Prioritize the internal database ID if available for the URL
                const targetId = editingDept.id || editingDept.department_id || editingDept.dept_id;
                await api.patch(`/admin/departments/${targetId}`, deptData);
                toast.success("Department reconfigured successfully!");
            } else {
                await api.post('/admin/departments', deptData);
                toast.success("Department created successfully!");
            }
            fetchData();
            setShowFormModal(false);
            setEditingDept(null);
        } catch (err) {
            console.error("Failed to save department", err);
            toast.error("Failed to save department: " + (err.response?.data?.detail || "Unknown error"));
        }
    };

    const filteredDepts = departments.filter(d => 
        (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (d.department_id || d.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employees.find(e => e.emp_id === d.manager_emp_id)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const deptStats = useMemo(() => {
        const total = departments.length;
        const totalStaff = employees.length;
        const withManagers = departments.filter(d => d.manager_emp_id).length;
        const emptyDepts = departments.filter(d => {
            const count = d.employee_count ?? employees.filter(e => (e.department_id || e.department) === (d.dept_id || d.department_id || d.id)).length;
            return count === 0;
        }).length;
        return { total, totalStaff, withManagers, emptyDepts };
    }, [departments, employees]);

    const getDeptColor = (index) => {
        const colors = [
            { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50 text-blue-600', glow: 'shadow-blue-200/50' },
            { bg: 'from-purple-500 to-violet-600', light: 'bg-purple-50 text-purple-600', glow: 'shadow-purple-200/50' },
            { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50 text-rose-600', glow: 'shadow-rose-200/50' },
            { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50 text-emerald-600', glow: 'shadow-emerald-200/50' },
            { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-50 text-amber-600', glow: 'shadow-amber-200/50' },
            { bg: 'from-indigo-500 to-cyan-600', light: 'bg-indigo-50 text-indigo-600', glow: 'shadow-indigo-200/50' },
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="min-h-[calc(100vh-60px)] bg-[#F8FAFC] p-6 lg:p-10 animate-in fade-in duration-1000 selection:bg-indigo-100 selection:text-indigo-900 rounded-[2.5rem] mx-2 my-2 shadow-[inset_0_0_80px_rgba(79,70,229,0.03)] border border-white/40">
            
            {(showFormModal || editingDept) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-full max-w-lg transform hover:scale-[1.01] transition-transform duration-500">
                        <DepartmentFormModal
                            onClose={() => {
                                setShowFormModal(false);
                                setEditingDept(null);
                            }}
                            onSave={handleSaveDepartment}
                            employees={employees}
                            initialData={editingDept}
                        />
                    </div>
                </div>
            )}

            {/* ── HEADER & SEARCH ── */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 capitalize">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-100 shadow-sm text-indigo-600 font-black text-[10px]  capitalize tracking-widest animate-in slide-in-from-left-4 duration-500">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Infrastructure Matrix
                    </div>
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight flex items-center gap-4 capitalize">
                            Global Departments
                            <div className="hidden sm:flex items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100">
                                <Building2 size={28} />
                            </div>
                        </h1>
                        <p className="text-slate-400 mt-2 font-bold text-sm lg:text-base max-w-lg  capitalize">
                            Manage and orchestrate organizational units, define leadership hierarchies, and track team expansion.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group flex-1 min-w-[280px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 group-focus-within:scale-110 transition-all duration-300" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by name, ID or manager..." 
                            className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-8 focus:ring-indigo-500/5 transition-all font-bold text-slate-700 placeholder:text-slate-400 shadow-sm text-[15px]  capitalize"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => setShowFormModal(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-100 transition-all active:scale-95 text-sm  capitalize tracking-wider group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                        Initialize Dept
                    </button>
                    <button 
                        onClick={fetchData}
                        className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-90"
                        title="Refresh Data"
                    >
                        <RefreshCw size={22} className={loading ? "animate-spin" : "hover:rotate-180 transition-transform duration-500"} />
                    </button>
                </div>
            </div>

            {/* ── QUICK STATS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-12 capitalize">
                {[
                    { label: 'Total Depts', value: deptStats.total, icon: Building2, color: 'indigo' },
                    { label: 'Total Personnel', value: deptStats.totalStaff, icon: Users, color: 'blue' },
                    { label: 'Managers', value: deptStats.withManagers, icon: User, color: 'emerald' },
                    { label: 'Memberless Units', value: deptStats.emptyDepts, icon: AlertCircle, color: 'rose' }
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-5 lg:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="relative z-10 flex flex-col gap-1">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                            <span className="text-2xl lg:text-3xl font-black text-slate-800 uppercase">{stat.value}</span>
                        </div>
                        <div className={`absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity duration-300 transform group-hover:scale-110`}>
                            <stat.icon size={80} className={`text-${stat.color}-600`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── DEPARTMENTS GRID ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white/50 rounded-[4rem] border border-slate-200/50 backdrop-blur-xl">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                        <Building2 size={24} className="absolute inset-0 m-auto text-indigo-600 animate-pulse" />
                    </div>
                    <p className="mt-6 text-slate-400 font-black  capitalize tracking-[0.2em] text-xs">Accessing Departmental Records...</p>
                </div>
            ) : filteredDepts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-slate-200 animate-in zoom-in-95 duration-500 capitalize">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8">
                        <Search size={48} />
                    </div>
                    <h3 className="text-xl font-black text-slate-400">Zero matches found</h3>
                    <p className="text-slate-300 font-bold text-sm mt-1  capitalize tracking-widest">Adjust filters or initialize a new unit</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredDepts.map((dept, index) => {
                        const manager = employees.find(e => e.emp_id === dept.manager_emp_id);
                        const staffCount = dept.employee_count ?? employees.filter(e => (e.department_id || e.department) === (dept.dept_id || dept.department_id || dept.id)).length;
                        const cardTheme = getDeptColor(index);
                        const uniqueKey = dept.dept_id || dept.department_id || dept.id || `dept-${index}`;

                        return (
                            <div key={uniqueKey} className="group flex flex-col bg-white rounded-[3rem] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-indigo-200/20 transition-all duration-700 hover:translate-y-[-8px] overflow-hidden capitalize">
                                {/* Header with Gradient */}
                                <div className={`h-32 bg-gradient-to-br ${cardTheme.bg} p-8 flex justify-between items-start relative overflow-hidden`}>
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-all duration-500">
                                        <Building2 size={28} />
                                    </div>
                                    <button 
                                        onClick={() => setEditingDept(dept)}
                                        className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                </div>

                                <div className="p-8 pb-10 flex-1 flex flex-col">
                                    <div className="mb-8 overflow-visible">
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 font-mono">{dept.department_id || dept.id || 'FJ-UNIT'}</p>
                                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-7 break-words whitespace-normal">{dept.name}</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-indigo-50 transition-all">
                                            <p className="text-[9px] font-black text-slate-400  capitalize tracking-widest mb-1.5">Personnel</p>
                                            <div className="flex items-center gap-2  capitalize">
                                                <Users size={16} className="text-indigo-600" />
                                                <span className="text-lg font-black text-slate-800">{staffCount}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-indigo-50 transition-all">
                                            <p className="text-[9px] font-black text-slate-400  capitalize tracking-widest mb-1.5">Ops Status</p>
                                            <div className="flex items-center gap-2  capitalize">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[13px] font-black text-slate-800">Operational</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-3">
                                        <span className="text-[10px] font-black text-slate-400  capitalize tracking-widest flex items-center gap-2">
                                            Reporting Authority
                                        </span>
                                        {manager ? (
                                            <div className={`flex items-center gap-4 p-4 rounded-[2rem] transition-all bg-slate-50 border border-slate-100 group-hover:bg-indigo-50/50 group-hover:border-indigo-100 capitalize`}>
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100 transition-all duration-500 group-hover:rotate-6">
                                                    {(manager.name || '?').charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[15px] font-black text-slate-800 tracking-tight break-words whitespace-normal uppercase">{manager.name}</p>
                                                    <p className="text-[11px] font-bold text-slate-400 font-mono tracking-tighter break-words whitespace-normal opacity-70 italic uppercase">{manager.emp_id}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 p-4 rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/30  capitalize">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 font-black text-lg">
                                                    ?
                                                </div>
                                                <p className="text-[11px] font-black text-slate-400 italic  capitalize tracking-widest">Leadership Pending</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DepartmentsPage;
