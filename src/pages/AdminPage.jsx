import { useState, useEffect } from "react";
import api from "../services/api";
import Badge from "../components/UI/Badge";
import {
  Plus,
  Search,
  Trash2,
  CheckSquare,
  Network,
  KeyRound,
  Loader2,
} from "lucide-react";

import OrgTreeModal from "../components/Modals/OrgTreeModal";
import AddEmployeeForm from "../components/Modals/AddEmployeeModal";

const AdminPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showOrgTreeModal, setShowOrgTreeModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const empRes = await api.get('/users');
      setEmployees(empRes.data);
      // Hardcoded departments since backend lacks an endpoint
      setDepartments([
        "Administration", "Finance", "Engineering", "Sales",
        "Accounts Receivables", "Accounts Payables", "Fixed Assets",
        "Treasury and Trade Finance", "MIS Report and Internal Audit",
        "Cash Management Team"
      ]);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "All" || emp.role === roleFilter;
    const matchesDept =
      deptFilter === "All" || emp.department === deptFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" ? emp.active : !emp.active);

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const handleToggleStatus = async (id) => {
    const emp = employees.find((e) => e.id === id);
    if (window.confirm(`Are you sure you want to ${emp.active ? 'deactivate' : 'activate'} ${emp.name}?`)) {
      try {
        await api.patch(`/users/${id}/status`, { active: !emp.active });
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
      } catch (err) {
        console.error("Failed to toggle status", err);
        alert("Failed to update status");
      }
    }
  };

  const handleResetPassword = async (id) => {
    const newPassword = window.prompt(`Enter new password for ${id}:`, "password123");
    if (newPassword) {
      try {
        await api.patch(`/users/${id}/password`, { password: newPassword });
        alert(`Password for ${id} has been reset.`);
      } catch (err) {
        console.error("Failed to reset password", err);
        alert("Failed to reset password");
      }
    }
  };

  const handleAddEmployee = async (newEmpData) => {
    try {
      await api.post('/users', newEmpData);
      alert(`Employee ${newEmpData.name} added successfully!`);
      fetchInitialData();
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add employee", err);
      alert("Failed to add employee: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  const managers = employees.filter(
    (u) => u.role === "Manager" || u.role === "Admin" || u.role === "CFO"
  );

  return (
    <div className="space-y-4">
      <OrgTreeModal
        isOpen={showOrgTreeModal}
        onClose={() => setShowOrgTreeModal(false)}
        users={employees}
        onAddNode={(parentId, newUser) => {
          const parent = employees.find(u => u.id === parentId);
          const isParentAdmin = parent?.role === 'ADMIN';
          setEmployees(prev => [
            ...prev,
            {
              ...newUser,
              managerId: isParentAdmin ? parentId : parentId,
              active: true,
            }
          ]);
        }}
      />

      {/* ── Inline Add Employee Form (replaces table) ── */}
      {showAddModal && (
        <AddEmployeeForm
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEmployee}
          managers={managers}
          departments={departments}
        />
      )}

      {!showAddModal && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl text-slate-800">Employee Management</h1>
            <p className="text-sm text-slate-500">Manage system users and access</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOrgTreeModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-full border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2 transition shadow-sm whitespace-nowrap"
            >
              <Network size={16} />
              Org Tree
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-full bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2 transition shadow-sm whitespace-nowrap"
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
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <select
                  className="px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="CFO">CFO</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>

                <select
                  className="px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <select
                  className="px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
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
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 truncate">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs truncate">
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {emp.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-2 truncate">{emp.role}</td>
                    <td className="px-4 py-2 truncate">{emp.department}</td>
                    <td className="px-4 py-2 truncate">
                      {emp.manager_id || "-"}
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
                          onClick={() => handleResetPassword(emp.id)}
                          className="p-1.5 rounded bg-amber-500 text-white hover:bg-amber-600"
                        >
                          <KeyRound size={16} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(emp.id)}
                          className={`p-1.5 rounded text-white ${emp.active
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-green-600 hover:bg-green-700"
                            }`}
                        >
                          {emp.active ? (
                            <Trash2 size={16} />
                          ) : (
                            <CheckSquare size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {filteredEmployees.length} entries</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
