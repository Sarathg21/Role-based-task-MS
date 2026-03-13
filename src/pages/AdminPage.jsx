import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Badge from "../components/UI/Badge";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  CheckSquare,
  Network,
  Loader2,
  XCircle,
  RefreshCw,
  KeyRound,
} from "lucide-react";

import AddEmployeeForm from "../components/Modals/AddEmployeeModal";
import CustomSelect from "../components/UI/CustomSelect";

const AdminPage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  // Use a fetch function that explicitly accepts current values (avoids stale closure)
  const fetchInitialData = async (overrides = {}) => {
    setLoading(true);
    const currentStatus = overrides.statusFilter ?? statusFilter;
    const currentRole = overrides.roleFilter ?? roleFilter;
    const currentDept = overrides.deptFilter ?? deptFilter;
    const currentSearch = overrides.searchTerm ?? searchTerm;
    try {
      const params = {};
      if (currentStatus !== "All") params.active = currentStatus === "active";
      if (currentRole !== "All") params.role = currentRole;
      if (currentDept !== "All") params.department_id = currentDept;
      if (currentSearch) params.search = currentSearch;

      const [empRes, deptRes] = await Promise.all([
        api.get('/employees', { params }),
        api.get('/departments'),
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
      toast.error("Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Client-side additional filtering for instant search feedback
  const safeEmployees = Array.isArray(employees) ? employees : [];
  const filteredEmployees = safeEmployees.filter((emp) => {
    if (!emp) return false;

    // Search Filter
    const query = (searchTerm || '').toLowerCase();
    const name = (emp.name || '').toLowerCase();
    const empId = (emp.emp_id || emp.id || '').toLowerCase();
    const matchesSearch = !query || name.includes(query) || empId.includes(query);

    // Role Filter
    const matchesRole = roleFilter === "All" || emp.role === roleFilter;

    // Dept Filter - robust comparison
    const empDept = String(emp.department_id || emp.department || '');
    const filterDept = String(deptFilter);
    const matchesDept = deptFilter === "All" || empDept === filterDept;

    // Status Filter
    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "active" ? !!emp.active : !emp.active);

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const handleToggleStatus = async (emp) => {
    const action = emp.active ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${emp.name}?`)) return;

    setTogglingId(emp.emp_id);
    try {
      await api.post(`/employees/${emp.emp_id}/${action}`);
      setEmployees(prev =>
        prev.map(e => e.emp_id === emp.emp_id ? { ...e, active: !e.active } : e)
      );
      toast.success(`${emp.name} ${action}d successfully`);
    } catch (err) {
      console.error(`Failed to ${action}`, err);
      toast.error(`Failed to ${action} ${emp.name}`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleResetPassword = async (emp) => {
    if (!window.confirm(`Reset password for ${emp.name} (${emp.emp_id})?`)) return;

    setResettingId(emp.emp_id);
    try {
      await api.post(`/employees/${emp.emp_id}/reset-password`);
      toast.success(`Password reset for ${emp.name}. They will be asked to change it after login.`);
    } catch (err) {
      console.error("Failed to reset password", err);
      toast.error(`Failed to reset password for ${emp.name}`);
    } finally {
      setResettingId(null);
    }
  };

  const handleAddEmployee = async (newEmpData) => {
    try {
      await api.post('/employees', newEmpData);
      toast.success(`Employee ${newEmpData.name} added successfully!`);
      fetchInitialData();
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add employee", err);
      // Global interceptor shows 422 errors; show generic for others
      if (!err.response || err.response.status !== 422) {
        toast.error("Failed to add employee: " + (err.response?.data?.detail || "Unknown error"));
      }
    }
  };

  const managers = safeEmployees.filter(
    (u) => u && (u.role === "MANAGER" || u.role === "ADMIN" || u.role === "CFO")
  );

  const deptOptions = Array.isArray(departments) && departments.length > 0
    ? departments
    : [...new Set(safeEmployees.map(e => e.department_id || e.department).filter(Boolean))];

  return (
    <div className="space-y-4">

      {/* ── Inline Add Employee Form ── */}
      {showAddModal && (
        <AddEmployeeForm
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEmployee}
          managers={managers}
          departments={deptOptions}
        />
      )}

      {/* ══ ADMIN PREMIUM HERO ══ */}
      {!showAddModal && (
        <div
          className="rounded-[2.5rem] overflow-hidden shadow-2xl relative mb-10 mesh-gradient-premium border border-white/5"
        >
          {/* Decorative Premium Blobs */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-blob opacity-50" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-48 bg-violet-500/10 rounded-full blur-[100px] animate-pulse" />

          <div className="relative z-10 px-12 pt-10 pb-6 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex flex-col items-center md:items-start gap-4 max-w-2xl text-center md:text-left">
              <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-[1.75rem] shadow-2xl border border-white/20 animate-float flex items-center justify-center w-14 h-14">
                <Network size={28} className="text-white drop-shadow-glow" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-2xl leading-tight">
                  Personnel <span className="text-violet-200">Archive</span> & <br className="hidden md:block" /> Governance
                </h2>
                <p className="text-white font-bold uppercase tracking-[0.4em] text-[10px] mt-3 opacity-90">
                  Secure Enterprise Resource Management
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full md:w-auto">
              {/* Primary Action - Add Employee */}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-white text-slate-900 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] shadow-xl flex items-center justify-center gap-3 group whitespace-nowrap"
              >
                <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" /> Add New Employee
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/org-tree')}
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white text-[11px] font-black uppercase tracking-[0.2em] px-10 py-5 rounded-2xl border border-white/40 backdrop-blur-xl transition-all flex items-center justify-center gap-3 group shadow-xl"
                >
                  <Network size={22} className="group-hover:rotate-12 transition-transform text-violet-200" />
                  <span>Org Tree</span>
                </button>

                <button
                  onClick={() => fetchInitialData()}
                  className="bg-white/5 hover:bg-white/10 text-white px-5 py-3.5 rounded-xl border border-white/5 backdrop-blur-md transition-all flex items-center justify-center group"
                >
                  <RefreshCw size={14} className="group-hover:rotate-180 transition-all duration-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Governance Command Island — Optimized Fit */}
          <div className="relative z-10 mx-6 mb-8 px-12 py-8 flex flex-wrap items-center justify-around gap-6 bg-white/[0.08] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-1.5 items-center md:items-start">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Personnel Registry</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white tabular-nums leading-none leading-[0.8]">{employees.length}</span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Units</span>
              </div>
            </div>
            <div className="hidden lg:block w-px h-12 bg-white/20 self-center" />
            <div className="flex flex-col gap-1.5 items-center md:items-start">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Strategic Assets</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-emerald-300 tabular-nums leading-none leading-[0.8]">{employees.filter(e => e.active).length}</span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Active</span>
              </div>
            </div>
            <div className="hidden lg:block w-px h-12 bg-white/20 self-center" />
            <div className="flex flex-col gap-1.5 items-center md:items-start">
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Core Stability</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-violet-200 tabular-nums leading-none leading-[0.8]">99.8%</span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Index</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Directory Table */}
      {!showAddModal && (
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">

          {/* ══ EXECUTIVE FILTER SUITE ══ */}
          <div className="px-10 py-8 bg-slate-50/30 border-b border-slate-100 space-y-6">
            <div className="flex flex-col gap-6">
              {/* Primary Search Bar */}
              <div className="relative group">
                <Search
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-violet-500 transition-colors pointer-events-none"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full pl-14 pr-6 py-4 rounded-2xl border border-slate-200 bg-white hover:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 text-sm font-bold transition-all placeholder:text-slate-300 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchInitialData({ searchTerm: e.target.value })}
                />
              </div>

              {/* Advanced Filter Row */}
              <div className="flex flex-wrap items-end gap-5">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Access Role</p>
                  <CustomSelect
                    options={[
                      { value: 'All', label: 'All Roles' },
                      { value: 'CFO', label: 'CFO' },
                      { value: 'ADMIN', label: 'Admin' },
                      { value: 'MANAGER', label: 'Manager' },
                      { value: 'EMPLOYEE', label: 'Employee' },
                    ]}
                    value={roleFilter}
                    onChange={(val) => { setRoleFilter(val); fetchInitialData({ roleFilter: val }); }}
                    className="w-full"
                  />
                </div>

                <div className="flex-[1.5] min-w-[200px]">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Department</p>
                  <CustomSelect
                    options={[
                      { value: 'All', label: 'All Departments' },
                      ...deptOptions.map((d, idx) => {
                        const val = typeof d === 'string' ? d : (d.department_id || d.id || d.name || `dept-${idx}`);
                        const label = typeof d === 'string' ? d : (d.name || d.department_id || d.id || 'Unknown');
                        return { value: String(val), label: String(label) };
                      })
                    ]}
                    value={deptFilter}
                    onChange={(val) => { setDeptFilter(val); }}
                    className="w-full"
                  />
                </div>

                <div className="flex-1 min-w-[130px]">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Status</p>
                  <CustomSelect
                    options={[
                      { value: 'All', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    value={statusFilter}
                    onChange={(val) => { setStatusFilter(val); }}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={() => fetchInitialData({
                    searchTerm,
                    roleFilter,
                    deptFilter,
                    statusFilter
                  })}
                  className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-violet-200/50 flex items-center justify-center gap-2 min-w-[140px]"
                >
                  <RefreshCw size={14} /> Apply Filters
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-violet-500" size={32} />
                <span className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Synchronizing Records</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700 table-fixed">
                <thead className="bg-[#f1f5f9] uppercase text-[10px] font-black tracking-widest text-[#475569] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-5">Employee Identity</th>
                    <th className="px-6 py-5 w-32 text-center">Security Role</th>
                    <th className="px-6 py-5 text-center">Department</th>
                    <th className="px-6 py-5 text-center">Reporting To</th>
                    <th className="px-6 py-5 w-28 text-center">Status</th>
                    <th className="px-6 py-5 text-right">Operations</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                            <Search size={32} />
                          </div>
                          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No personnel records found</p>
                          <p className="text-slate-300 text-[10px] max-w-[200px] mx-auto">Try adjusting your executive filters to see more results.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.emp_id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-3 truncate">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600 flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                              {(emp.name || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs truncate font-black text-slate-800">{emp.name}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{emp.emp_id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-1.5 truncate">
                          <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${emp.role === 'CFO' || emp.role === 'ADMIN' ? 'bg-violet-100 text-violet-700 shadow-sm border border-violet-200' :
                            emp.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200' :
                              'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-3 truncate text-slate-600 font-bold text-[10px] uppercase text-center">{emp.department_id || emp.department || '—'}</td>
                        <td className="px-6 py-3 truncate text-slate-600 text-[10px] font-bold tabular-nums text-center">
                          {emp.manager_emp_id || 'Global Parent'}
                        </td>

                        <td className="px-6 py-1.5">
                          <div className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest ${emp.active ? 'text-emerald-600' : 'text-slate-500'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${emp.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-400'}`} />
                            {emp.active ? "Active" : "Inactive"}
                          </div>
                        </td>

                        <td className="px-6 py-1.5 text-right">
                          <div className="flex justify-end gap-2 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                            <button
                              onClick={() => handleResetPassword(emp)}
                              disabled={!!resettingId || togglingId === emp.emp_id}
                              className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-1 bg-slate-900 text-white hover:bg-slate-800"
                            >
                              {resettingId === emp.emp_id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <>
                                  <KeyRound size={12} />
                                  Reset
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              disabled={togglingId === emp.emp_id || !!resettingId}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 ${emp.active
                                ? "bg-white text-rose-500 hover:bg-rose-50 border border-rose-100"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100"
                                }`}
                            >
                              {togglingId === emp.emp_id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : emp.active ? (
                                <><XCircle size={12} /> Disable</>
                              ) : (
                                <><CheckSquare size={12} /> Enable</>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-5 bg-slate-50/50 border-t border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-widest flex justify-between items-center">
            <span>Verified Registry: {filteredEmployees.length} Units in View</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
