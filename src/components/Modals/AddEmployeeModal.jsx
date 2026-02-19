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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-8 py-4 border-b border-slate-100">
          <h3 className="text-base text-slate-800">
            Add Employee
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">

          {/* Name */}
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Employee ID / Email
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="EMP001"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          {/* Role + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Role
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Department
              </label>
              <select
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Manager */}
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              Reporting Manager
            </label>
            <select
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={formData.managerId}
              onChange={(e) =>
                setFormData({ ...formData, managerId: e.target.value })
              }
            >
              <option value="">Select Manager...</option>
              {managers.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  {mgr.name} ({mgr.department})
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="pt-3 flex gap-3">

            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>

            {/* Bigger Add Button */}
            <button
              type="submit"
              className="flex-1 py-3 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition shadow-sm"
            >
              Add
            </button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeeModal;
