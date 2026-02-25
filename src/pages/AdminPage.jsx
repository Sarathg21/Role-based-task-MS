import { useState } from "react";
import { USERS, DEPARTMENTS } from "../data/mockData";
import Badge from "../components/UI/Badge";
import {
  Plus,
  Search,
  Trash2,
  CheckSquare,
  Network,
  KeyRound,
} from "lucide-react";

import OrgTreeModal from "../components/Modals/OrgTreeModal";
import AddEmployeeModal from "../components/Modals/AddEmployeeModal";

const AdminPage = () => {
  const [employees, setEmployees] = useState(USERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showOrgTreeModal, setShowOrgTreeModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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

  const handleToggleStatus = (id) => {
    const emp = employees.find((e) => e.id === id);
    const action = emp.active ? "deactivate" : "activate";
    if (window.confirm(`Are you sure you want to ${action} ${emp.name}?`)) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === id ? { ...e, active: !e.active } : e))
      );
    }
  };

  const handleResetPassword = (id) => {
    if (window.confirm(`Reset password for user ${id}?`)) {
      alert(`Password reset for ${id} to 'password123'`);
    }
  };

  const handleAddEmployee = (newUser) => {
    setEmployees((prev) => [...prev, newUser]);
    alert(`Employee ${newUser.name} added successfully!`);
  };

  const managers = employees.filter(
    (u) => u.role === "Manager" || u.role === "Admin"
  );

  return (
    <div className="space-y-4">
      <OrgTreeModal
        isOpen={showOrgTreeModal}
        onClose={() => setShowOrgTreeModal(false)}
        users={employees}
        departments={DEPARTMENTS}
        onAddNode={(parentId, newUser) => {
          const parent = employees.find(u => u.id === parentId);
          const isParentAdmin = parent?.role === 'Admin';
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

      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEmployee}
        managers={managers}
        departments={DEPARTMENTS}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl text-slate-800">
            Employee Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage system users and access
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowOrgTreeModal(true)}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2"
          >
            <Network size={16} />
            Org Tree
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2 transition"
          >
            <Plus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Table Container */}
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
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>

              <select
                className="px-2 py-1.5 rounded-md border border-slate-200 text-xs bg-white"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="All">All Departments</option>
                {DEPARTMENTS.map((d) => (
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
                    {emp.managerId || "-"}
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
    </div>
  );
};

export default AdminPage;
