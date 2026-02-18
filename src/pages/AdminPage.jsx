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

  /* ============================= */
  /* Filtering */
  /* ============================= */
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

  /* ============================= */
  /* Handlers */
  /* ============================= */
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
    setEmployees(prev => [...prev, newUser]);
    alert(`Employee ${newUser.name} added successfully!`);
  };

  // Get managers for the dropdown
  const managers = employees.filter(u => u.role === 'Manager' || u.role === 'Admin');

  return (
    <div className="space-y-6">
      <OrgTreeModal
        isOpen={showOrgTreeModal}
        onClose={() => setShowOrgTreeModal(false)}
        users={USERS}
      />

      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddEmployee}
        managers={managers}
        departments={DEPARTMENTS}
      />

      {/* ================= Header ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Employee Management
          </h1>
          <p className="text-slate-500">
            Manage system users and access
          </p>
        </div>

        <div className="flex gap-2">
          {/* Org Tree Button */}
          <button
            onClick={() => setShowOrgTreeModal(true)}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center gap-2"
          >
            <Network size={18} />
            View Org Tree
          </button>

          {/* Add Employee */}
          {/* Add Employee */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2 transition"
          >
            <Plus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {/* ================= Table Container ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search employees..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <select
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>

              <select
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
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
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
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

        {/* ================= Table ================= */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Reporting Manager</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-slate-500">
                          {emp.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">{emp.role}</td>
                  <td className="p-4">{emp.department}</td>
                  <td className="p-4">{emp.managerId || "-"}</td>

                  <td className="p-4">
                    <Badge variant={emp.active ? "success" : "danger"}>
                      {emp.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>

                  {/* ================= Actions ================= */}
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {/* Reset Password - ORANGE */}
                      <button
                        onClick={() => handleResetPassword(emp.id)}
                        className="p-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition"
                        title="Reset Password"
                      >
                        <KeyRound size={16} />
                      </button>

                      {/* Activate / Deactivate */}
                      <button
                        onClick={() => handleToggleStatus(emp.id)}
                        className={`p-2 rounded-md text-white transition ${emp.active
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-green-600 hover:bg-green-700"
                          }`}
                        title={emp.active ? "Deactivate" : "Activate"}
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

        {/* ================= Footer ================= */}
        <div className="p-4 border-t border-slate-200 text-sm text-slate-500 flex justify-between items-center">
          <span>Showing {filteredEmployees.length} entries</span>

          <div className="flex gap-2">
            <button
              disabled
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white disabled:opacity-50"
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
