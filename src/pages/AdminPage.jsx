import { useState, useEffect } from "react";
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
} from "lucide-react";

import OrgTreeModal from "../components/Modals/OrgTreeModal";
import AddEmployeeForm from "../components/Modals/AddEmployeeModal";
import CustomSelect from "../components/UI/CustomSelect";

const AdminPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showOrgTreeModal, setShowOrgTreeModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "All") params.active = statusFilter === "active";
      if (roleFilter !== "All") params.role = roleFilter;
      if (searchTerm) params.search = searchTerm;

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
    const name = emp.name || '';
    const empId = emp.emp_id || '';
    const query = searchTerm ? searchTerm.toLowerCase() : '';
    const matchesSearch =
      name.toLowerCase().includes(query) ||
      empId.toLowerCase().includes(query);

    const matchesRole = roleFilter === "All" || emp.role === roleFilter;
    const deptId = emp.department_id || emp.department || '';
    const matchesDept = deptFilter === "All" || deptId === deptFilter;

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
      <OrgTreeModal
        isOpen={showOrgTreeModal}
        onClose={() => setShowOrgTreeModal(false)}
        users={employees.map(e => ({ ...e, id: e.emp_id, managerId: e.manager_emp_id }))}
      />

      {/* ── Inline Add Employee Form ── */}
      {showAddModal && (
        <AddEmployeeForm
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEmployee}
          managers={managers}
          departments={deptOptions}
        />
      )}

      {!showAddModal && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Employee Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage system users and access</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => fetchInitialData()}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2 transition shadow-sm whitespace-nowrap"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => setShowOrgTreeModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2 transition shadow-sm whitespace-nowrap"
            >
              <Network size={16} />
              Org Tree
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2 transition shadow-sm whitespace-nowrap"
            >
              <Plus size={16} />
              Add Employee
            </button>
          </div>
        </div>
      )}

      {/* Employee Directory Table */}
      {!showAddModal && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">

          {/* Filters */}
          <div className="px-4 py-3 border-b border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
              </div>

              <div className="flex gap-3 flex-wrap flex-1 sm:flex-none">
                <CustomSelect
                  options={[
                    { value: 'All', label: 'All Roles' },
                    { value: 'CFO', label: 'CFO' },
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'MANAGER', label: 'Manager' },
                    { value: 'EMPLOYEE', label: 'Employee' },
                  ]}
                  value={roleFilter}
                  onChange={(val) => setRoleFilter(val)}
                  style={{ minWidth: '140px' }}
                />

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
                  onChange={(val) => setDeptFilter(val)}
                  style={{ minWidth: '180px' }}
                />

                <CustomSelect
                  options={[
                    { value: 'All', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ minWidth: '130px' }}
                />

                <button
                  onClick={fetchInitialData}
                  className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition shadow-sm hover:shadow active:transform active:scale-95 whitespace-nowrap"
                  style={{ minWidth: '110px' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-violet-500 mr-2" size={20} />
                <span className="text-slate-500 text-sm">Loading employees...</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-700 table-fixed">
                <thead className="bg-slate-50 uppercase text-[11px] text-slate-500">
                  <tr>
                    <th className="px-4 py-2">User</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Department</th>
                    <th className="px-4 py-2">Manager</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                        No employees found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.emp_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 truncate">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                              {(emp.name || '?').charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs truncate font-medium">{emp.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{emp.emp_id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-2 truncate">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${emp.role === 'CFO' || emp.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' :
                            emp.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 truncate text-slate-500">{emp.department_id || emp.department || '—'}</td>
                        <td className="px-4 py-2 truncate text-slate-500">
                          {emp.manager_emp_id || '—'}
                        </td>

                        <td className="px-4 py-2">
                          <Badge
                            variant={emp.active ? "success" : "danger"}
                            className="text-[10px] px-2 py-0.5 whitespace-nowrap"
                          >
                            {emp.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              disabled={togglingId === emp.emp_id}
                              className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 text-xs font-bold transition shadow-sm active:scale-95 ${emp.active
                                ? "bg-red-500 hover:bg-red-600 ring-red-100"
                                : "bg-green-600 hover:bg-green-700 ring-green-100"
                                } disabled:opacity-50 hover:shadow-md`}
                            >
                              {togglingId === emp.emp_id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : emp.active ? (
                                <><XCircle size={16} /> Deactivate</>
                              ) : (
                                <><CheckSquare size={16} /> Activate</>
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
          <div className="px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
