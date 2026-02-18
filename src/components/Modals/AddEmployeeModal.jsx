
import { useState } from 'react';
import { X } from 'lucide-react';

const AddEmployeeModal = ({ isOpen, onClose, onAdd, managers, departments }) => {
    const [formData, setFormData] = useState({
        name: '',
        role: 'Employee',
        department: departments[0] || 'Engineering',
        managerId: '',
        email: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        // Basic validation
        if (!formData.name || !formData.email) {
            alert("Name and Email/ID are required");
            return;
        }

        // Auto-generate ID if not provided (simplified for demo)
        const newId = formData.email.includes("EMP") ? formData.email : `EMP-${Math.floor(Math.random() * 1000)}`;

        const newUser = {
            id: newId,
            name: formData.name,
            role: formData.role,
            department: formData.department,
            managerId: formData.managerId || null,
            active: true,
            password: 'password123' // Default password
        };

        onAdd(newUser);
        onClose();
        setFormData({
            name: '',
            role: 'Employee',
            department: departments[0] || 'Engineering',
            managerId: '',
            email: ''
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">Add New Employee</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID / Email</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            placeholder="EMP001"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="Employee">Employee</option>
                                <option value="Manager">Manager</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                            <select
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            >
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Manager</label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            value={formData.managerId}
                            onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                        >
                            <option value="">Select Manager...</option>
                            {managers.map(mgr => (
                                <option key={mgr.id} value={mgr.id}>{mgr.name} ({mgr.department})</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-white bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition shadow-sm"
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
