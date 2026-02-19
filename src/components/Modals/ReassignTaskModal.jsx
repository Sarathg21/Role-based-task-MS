import { X, User, CheckCircle } from "lucide-react";
import { useState } from "react";

const ReassignTaskModal = ({ isOpen, onClose, onReassign, employees, currentTask }) => {
    const [selectedEmployee, setSelectedEmployee] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (window.confirm(`Are you sure you want to reassign this task to the selected employee?`)) {
            onReassign(selectedEmployee);
            setSelectedEmployee(""); // Reset
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-medium text-slate-800 flex items-center gap-2">
                        <User size={20} className="text-violet-600" /> Reassign Task
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4">
                        Current Task: <span className="text-slate-800">"{currentTask?.title}"</span>
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select New Assignee</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 appearance-none bg-white"
                                        required
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                    >
                                        <option value="">Choose an employee...</option>
                                        {employees
                                            .filter(u => u.role === 'Employee' && u.id !== currentTask?.employeeId)
                                            .map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} ({user.department})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 shadow-sm shadow-violet-200 flex items-center gap-2"
                                >
                                    <CheckCircle size={16} /> Confirm Reassign
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReassignTaskModal;
