import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USERS, TASKS } from '../data/mockData';
import { ArrowLeft } from 'lucide-react';

const AssignTaskPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'Medium',
        dueDate: ''
    });

    // CFO/Admin → any Manager or Employee; Manager → only own dept employees
    const eligibleAssignees = USERS.filter(u => {
        if (user.role === 'CFO' || user.role === 'Admin') {
            return u.role === 'Manager' || u.role === 'Employee';
        }
        if (user.role === 'Manager') {
            return u.role === 'Employee' && u.department === user.department;
        }
        return false;
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const assignee = USERS.find(u => u.id === formData.assignee);
        const dept = assignee?.department || user.department;
        const managerId = assignee?.role === 'Manager' ? user.id : (assignee?.managerId || user.id);
        const newTask = {
            id: `TSK-${Math.floor(Math.random() * 10000)}`,
            title: formData.title,
            description: formData.description,
            employeeId: formData.assignee,
            managerId,
            assignedBy: user.id,
            department: dept,
            severity: formData.priority,
            status: 'NEW',
            reworkCount: 0,
            assignedDate: new Date().toISOString().split('T')[0],
            dueDate: formData.dueDate,
            completedDate: null
        };
        TASKS.push(newTask);
        alert('Task Assigned Successfully!');
        navigate('/tasks');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500 p-2"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-medium text-slate-800">Assign New Task</h1>
                    <p className="text-slate-500">Create and assign a task to your team members</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Task Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500"
                            placeholder="e.g. Q3 Performance Review"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            name="description"
                            rows="4"
                            className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500"
                            placeholder="Detailed description of the task..."
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Attachment</label>
                        <input
                            type="file"
                            name="attachment"
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-lg file:border-0
                                file:text-sm file:font-medium
                                file:bg-violet-50 file:text-violet-700
                                hover:file:bg-violet-100"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Assignee <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="assignee"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500 bg-white"
                                value={formData.assignee}
                                onChange={handleChange}
                            >
                                <option value="">Select Assignee</option>
                                {eligibleAssignees.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.role}) - {p.department}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                            <select
                                name="priority"
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500 bg-white"
                                value={formData.priority}
                                onChange={handleChange}
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Due Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="dueDate"
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500"
                            value={formData.dueDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/tasks')}
                                className="inline-flex items-center justify-center font-semibold rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500 whitespace-nowrap shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-xs font-semibold rounded-full text-white transition-colors duration-200 whitespace-nowrap shadow-sm"
                                style={{
                                    backgroundColor: 'var(--primary-color)'
                                }}
                                onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor = 'var(--primary-dark)')
                                }
                                onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor = 'var(--primary-color)')
                                }
                            >
                                Assign Task
                            </button>

                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignTaskPage;
