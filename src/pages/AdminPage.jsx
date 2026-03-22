import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Loader2,
  RefreshCw,
  KeyRound,
  User, 
  MoreHorizontal,
  Eye,
  Edit3,
  Power
} from "lucide-react";

import EmployeeFormModal from "../components/Modals/EmployeeFormModal";
import EmployeeDetailModal from "../components/Modals/EmployeeDetailModal";
import CustomSelect from "../components/UI/CustomSelect";
import ConfirmationModal from "../components/UI/ConfirmationModal";

const AdminPage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "danger",
    confirmText: "Confirm"
  });

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        api.get('/employees').catch(e => { console.error("Employees fetch failed", e); throw e; }),
        api.get('/admin/departments').catch(e => { console.error("Departments fetch failed", e); throw e; })
      ]);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
    } catch (err) {
      console.error("Critical: Admin data fetch failed. Check backend/ngrok status.", err);
      const isTimeout = err.code === 'ECONNABORTED' || String(err).includes('timeout');
      toast.error(isTimeout ? "Connection Timeout: Your backend (ngrok) might be offline." : "Fetch Error: Could not connect to administration services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredEmployees = (Array.isArray(employees) ? employees : []).filter((emp) => {
    if (!emp) return false;
    const query = (searchTerm || '').toLowerCase();
    
    // Name or ID match
    const nameMatches = (emp.name || '').toLowerCase().includes(query) || 
                        (emp.emp_id || '').toLowerCase().includes(query) ||
                        (emp.id || '').toString().includes(query);
    
    // Role match
    const filterRole = String(roleFilter || 'All').toUpperCase();
    const roleMatches = filterRole === "ALL" || String(emp.role || '').toUpperCase() === filterRole;
    
    // Department match
    const filterDept = String(deptFilter || 'All');
    const isAllDept = filterDept.toUpperCase() === 'ALL';
    
    // Cross-reference filter value (ID/Slug) with department name from the master list
    const selectedDeptObj = departments.find(d => 
        String(d.department_id || d.id || d.dept_id) === filterDept ||
        (typeof d === 'string' && d === filterDept) ||
        (d.name && d.name === filterDept)
    );
    const selectedDeptId = (selectedDeptObj?.department_id || selectedDeptObj?.id || selectedDeptObj?.dept_id || '').toString().toLowerCase();
    const selectedDeptName = (selectedDeptObj?.name || selectedDeptObj?.dept_name || (typeof selectedDeptObj === 'string' ? selectedDeptObj : '')).toLowerCase();

    const empDeptId = String(emp.department_id || emp.dept_id || '').toLowerCase();
    const empDeptName = (emp.department_name || emp.department || '').toString().toLowerCase();
    
    const deptMatches = isAllDept || 
                        empDeptId === filterDept.toLowerCase() || 
                        empDeptName === filterDept.toLowerCase() ||
                        (selectedDeptName && empDeptName.includes(selectedDeptName)) ||
                        (selectedDeptId && empDeptId === selectedDeptId);
                        
    return nameMatches && roleMatches && deptMatches;
  });

  const handleToggleStatus = async (emp) => {
    const action = emp.active ? 'deactivate' : 'activate';
    setConfirmConfig({
        isOpen: true,
        title: `${emp.active ? 'Deactivate' : 'Activate'}?`,
        message: `Confirm ${action} for ${emp.name}.`,
        type: emp.active ? "danger" : "success",
        confirmText: action.toUpperCase(),
        onConfirm: async () => {
            try {
              await api.post(`/employees/${emp.emp_id}/${action}`);
              fetchInitialData();
              toast.success(`${emp.name} updated.`);
              setConfirmConfig(p => ({ ...p, isOpen: false }));
            } catch (err) {
              toast.error("Status update failed.");
            }
        }
    });
  };

  const handleResetPassword = async (emp, manual) => {
    const pwd = manual || "Perfmetric@123";
    try {
      await api.post(`/employees/${emp.emp_id}/reset-password`, { new_password: pwd });
      toast.success(`Password reset to: ${pwd} for ${emp.name}`, { duration: 6000 });
    } catch (err) {
      toast.error("Failed to reset password.");
    }
  };

  const handleUpdateEmployee = async (data, originalId) => {
    try {
      const targetId = originalId || data.emp_id;
      await api.put(`/employees/${targetId}`, data);
      toast.success("Profile updated.");
      fetchInitialData();
      setEditingEmployee(null);
    } catch (err) {
      console.error("Update failed", err);
      toast.error(err.response?.data?.message || err.response?.data?.detail || "Update failed.");
    }
  };

  const handleAddEmployee = async (data) => {
    try {
      await api.post('/employees', data);
      toast.success("Member added.");
      fetchInitialData();
      setShowAddModal(false);
    } catch (err) {
      console.error("Creation failed", err);
      toast.error(err.response?.data?.message || err.response?.data?.detail || "Creation failed.");
    }
  };

  const itemsPerPage = 7;
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginated = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const roleOptions = ["All", "ADMIN", "CFO", "MANAGER", "EMPLOYEE"];

  return (
    <div className="min-h-screen bg-[#f3edfd] p-8 md:p-12 animate-in fade-in duration-1000 selection:bg-indigo-100 selection:text-indigo-900 rounded-[3rem] mx-2 my-2 shadow-[inset_0_0_80px_rgba(139,92,246,0.05)]">
      
      {/* Modals */}
      {(showAddModal || editingEmployee) && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto pt-20 pb-24">
            <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl relative mb-12">
              <div className="p-0 overflow-visible">
                <EmployeeFormModal
                  onClose={() => { setShowAddModal(false); setEditingEmployee(null); }}
                  onAdd={handleAddEmployee}
                  onEdit={(data) => handleUpdateEmployee(data, editingEmployee?.emp_id || editingEmployee?.id)}
                  initialData={editingEmployee}
                  managers={employees.filter(e => ['ADMIN', 'CFO', 'MANAGER'].includes(String(e.role || '').toUpperCase()))}
                  departments={departments}
                />
              </div>
            </div>
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          departments={departments}
          allEmployees={employees}
          onClose={() => setSelectedEmployee(null)}
          onResetPassword={handleResetPassword}
          onToggleStatus={(emp) => { handleToggleStatus(emp); setSelectedEmployee(null); }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(p => ({ ...p, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmText={confirmConfig.confirmText}
      />

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs tracking-widest uppercase opacity-70">
              <User size={14} /> Global Administration / Member Directory
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-500 transition-all pointer-events-none" size={18} />
                  <input 
                      type="text" 
                      placeholder="Search employee or ID..."
                      className="pl-11 pr-6 py-3.5 bg-white rounded-2xl border border-slate-50 shadow-sm focus:ring-8 focus:ring-violet-500/5 focus:outline-none transition-all w-64 text-[13px] font-semibold placeholder:text-slate-300"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-3 px-8 py-3.5 bg-violet-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-violet-200 hover:bg-violet-700 hover:scale-[1.02] active:scale-95 transition-all"
              >
                  <Plus size={18} strokeWidth={3} /> Add Employee
              </button>
          </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[42px] font-[900] text-[#1E1B4B] tracking-tight leading-none mb-2">Employees</h1>
            <p className="text-slate-400 text-sm font-medium">Manage corporate access and organizational alignment.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 min-w-[240px]">
                <CustomSelect
                    options={[
                        { value: 'All', label: 'All Departments' }, 
                        ...departments.map(d => ({ 
                            value: d.department_id || d.id || d.dept_id || (typeof d === 'string' ? d : d.name), 
                            label: d.name || d.dept_name || d.department || (typeof d === 'string' ? d : 'Unknown')
                        }))
                    ]}
                    value={deptFilter}
                    onChange={setDeptFilter}
                    className="w-full bg-white border-none shadow-sm h-11 rounded-xl text-[14px] font-medium"
                />
              </div>
              <div className="w-[180px]">
                <CustomSelect
                    options={roleOptions.map(r => ({ value: r, label: r === 'All' ? 'All Roles' : r }))}
                    value={roleFilter}
                    onChange={setRoleFilter}
                    className="w-full bg-white border-none shadow-sm h-11 rounded-xl text-[12px] font-black uppercase tracking-widest"
                />
              </div>
          </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] shadow-2xl shadow-indigo-200/20 border border-white overflow-hidden overflow-x-auto min-h-[600px] flex flex-col">
        <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-indigo-50/20 text-[10px] font-black text-indigo-300 uppercase tracking-[0.25em] border-b border-indigo-50/50">
                <tr>
                    <th className="px-10 py-7">Emp ID</th>
                    <th className="px-6 py-7">Name</th>
                    <th className="px-6 py-7">Role</th>
                    <th className="px-6 py-7">Department</th>
                    <th className="px-6 py-7">Manager</th>
                    <th className="px-6 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Member Status</th>
                    <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300 text-right sticky right-0 bg-slate-50/80 backdrop-blur-md z-20 shadow-[-10px_0_10px_-10px_rgba(0,0,0,0.1)]">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/40">
                {loading ? (
                    <tr><td colSpan={7} className="py-40 text-center"><Loader2 className="animate-spin text-violet-600 mx-auto" size={42} /></td></tr>
                ) : paginated.length === 0 ? (
                    <tr><td colSpan={7} className="py-40 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">No matching records found.</td></tr>
                ) : paginated.map(emp => {
                    const manager = employees.find(e => e.emp_id === emp.manager_emp_id);
                    return (
                        <tr 
                            key={emp.emp_id} 
                            className="group hover:bg-white transition-all duration-300 cursor-pointer"
                            onClick={() => setSelectedEmployee(emp)}
                        >
                            <td className="px-10 py-5 font-mono text-[11px] font-bold text-slate-300 group-hover:text-indigo-400 transition-colors">{emp.emp_id}</td>
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-full border-[3px] border-white shadow-lg shadow-indigo-100/50 overflow-hidden bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-500 font-[900] text-base group-hover:scale-110 transition-transform duration-500">
                                        <span>{emp.name?.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <span className="text-[14px] font-black text-slate-700 group-hover:text-indigo-600 transition-colors capitalize tracking-tight">{emp.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-5">
                                <span className="text-[12px] font-bold text-slate-500 capitalize tracking-tighter opacity-80">{emp.role?.toLowerCase()}</span>
                            </td>
                            <td className="px-6 py-5">
                                <span className="text-[12px] font-black text-indigo-600/60 capitalize tracking-tighter group-hover:text-indigo-600 transition-colors">{(emp.department_name || emp.department_id || 'N/A').toLowerCase()}</span>
                            </td>
                            <td className="px-6 py-5">
                                <span className="text-[12px] font-bold text-slate-500 group-hover:text-slate-800 transition-colors capitalize tracking-tight">{manager?.name || '—'}</span>
                            </td>
                            <td className="px-6 py-5">
                                <div className="flex justify-center">
                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${emp.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${emp.active ? 'bg-emerald-500' : 'bg-rose-500'} ${emp.active ? 'animate-pulse' : ''}`} />
                                        {emp.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </td>
                            <td className={`px-10 py-5 text-right relative sticky right-0 transition-colors duration-300 shadow-[-12px_0_12px_-12px_rgba(0,0,0,0.1)] ${openActionMenuId === emp.emp_id ? 'z-[100] bg-white' : 'bg-white/90 backdrop-blur-sm z-10'}`}>
                                <div className="flex items-center justify-end">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(openActionMenuId === emp.emp_id ? null : emp.emp_id); }}
                                        className={`p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 group/act ${openActionMenuId === emp.emp_id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600'}`}
                                        title="Management Actions"
                                    >
                                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] overflow-hidden transition-all duration-500 ${openActionMenuId === emp.emp_id ? 'w-auto' : 'w-0 opacity-0'}`}>OPTIONS</span>
                                        <MoreHorizontal size={20} className={openActionMenuId === emp.emp_id ? 'rotate-90' : ''} />
                                    </button>
                                    
                                    {openActionMenuId === emp.emp_id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setOpenActionMenuId(null)} />
                                            <div className="absolute right-10 top-12 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); setOpenActionMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest"><Eye size={16} /> VIEW PROFILE</button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingEmployee(emp); setOpenActionMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest"><Edit3 size={16} /> EDIT PROFILE</button>
                                                <div className="h-px bg-slate-50 my-1 mx-3" />
                                                <button onClick={(e) => { e.stopPropagation(); handleResetPassword(emp); setOpenActionMenuId(null); }} className="w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black text-amber-600 hover:bg-amber-50 transition-colors uppercase tracking-widest"><KeyRound size={16} /> RESET PASSWORD</button>
                                                <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(emp); setOpenActionMenuId(null); }} className={`w-full flex items-center gap-3 px-5 py-3 text-[11px] font-black transition-colors uppercase tracking-widest ${emp.active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}><Power size={16} /> {emp.active ? 'DEACTIVATE' : 'ACTIVATE'}</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>

        {/* ── PAGINATION ── */}
        <div className="mt-auto border-t border-indigo-50/50 bg-indigo-50/10 px-10 py-7 flex items-center justify-between">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] leading-none">
                Volume: {filteredEmployees.length} Members Matrixed
            </p>
            <div className="flex items-center gap-3 leading-none">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 bg-white border border-indigo-100 rounded-xl text-indigo-400 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                >
                    Prev
                </button>
                <div className="flex items-center gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-10 h-10 rounded-xl font-black text-[10px] transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-110' : 'bg-white border border-indigo-100 text-indigo-400 hover:border-indigo-300'}`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 bg-white border border-indigo-100 rounded-xl text-indigo-400 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
                >
                    Next
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
