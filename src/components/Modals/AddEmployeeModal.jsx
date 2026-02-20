import { useState } from "react";
import { X } from "lucide-react";

const AddEmployeeModal = ({ isOpen, onClose, onAdd, managers, departments }) => {
  const [formData, setFormData] = useState({
    name: "",
    role: "Employee",
    department: departments[0] || "Engineering",
    managerId: "",
    email: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      alert("Name and Email/ID are required");
      return;
    }

    const newId = formData.email.includes("EMP")
      ? formData.email
      : `EMP-${Math.floor(Math.random() * 1000)}`;

    const newUser = {
      id: newId,
      name: formData.name,
      role: formData.role,
      department: formData.department,
      managerId: formData.managerId || null,
      active: true,
      password: "password123",
    };

    onAdd(newUser);
    onClose();

    setFormData({
      name: "",
      role: "Employee",
      department: departments[0] || "Engineering",
      managerId: "",
      email: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl min-h-[600px] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center px-12 py-8 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
          <div>
            <h3 className="text-3xl font-bold text-slate-800">Add Employee</h3>
            <p className="text-base text-slate-500 mt-1">Fill in the details to register a new team member</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2.5 rounded-xl transition"
          >
            <X size={28} />
          </button>
        </div>

        {/* Form — 2-column grid layout */}
        <form onSubmit={handleSubmit} className="px-12 py-10 flex-1">
          <div className="grid grid-cols-2 gap-8">

            {/* Full Name */}
            <div>
              <label className="block text-base font-semibold text-slate-600 mb-2.5">Full Name</label>
              <input
                type="text"
                className="w-full px-5 py-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-base font-semibold text-slate-600 mb-2.5">Employee ID / Email</label>
              <input
                type="text"
                className="w-full px-5 py-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition"
                placeholder="e.g. EMP001"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-base font-semibold text-slate-600 mb-2.5">Role</label>
              <select
                className="w-full px-5 py-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-base font-semibold text-slate-600 mb-2.5">Department</label>
              <select
                className="w-full px-5 py-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Reporting Manager — full width */}
            <div className="col-span-2">
              <label className="block text-base font-semibold text-slate-600 mb-2.5">Reporting Manager</label>
              <select
                className="w-full px-5 py-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition"
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              >
                <option value="">Select Manager...</option>
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.name} — {mgr.department}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex gap-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-10 py-4 text-base font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-12 py-4 text-base font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition shadow-sm"
            >
              Add Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
