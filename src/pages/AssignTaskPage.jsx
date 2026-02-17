import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USERS, TASKS } from '../data/mockData';
import Button from '../components/UI/Button';
import { ArrowLeft, Calendar, FileText, User } from 'lucide-react';

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

    // Employees that can be assigned tasks
    // For now, Managers can assign to anyone in their department + direct reports
    // Admin can assign to anyone
    const eligibleEmployees = USERS.filter(u => {
        if (user.role === 'Admin') return u.role === 'Employee';
        if (user.role === 'Manager') {
            return u.role === 'Employee' && (u.managerId === user.id || u.department === user.department);
        }
        return false;
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newTask = {
            id: `TSK-${Math.floor(Math.random() * 10000)}`, // Simple ID generation
            title: formData.title,
            description: formData.description,
            employeeId: formData.assignee,
            managerId: user.id, // Current user is the manager
            assignedBy: user.id,
            department: user.department,
            severity: formData.priority,
            status: 'NEW',
            reworkCount: 0,
            assignedDate: new Date().toISOString().split('T')[0],
            dueDate: formData.dueDate,
            completedDate: null
        };

        // In a real app, this would be an API call
        TASKS.push(newTask);

        alert('Task Assigned Successfully!');
        navigate('/tasks');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="secondary" onClick={() => navigate(-1)} className="p-2">
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Assign New Task</h1>
                    <p className="text-slate-500">Create and assign a task to your team members</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                type="text"
                                name="title"
                                required
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500"
                                placeholder="e.g. Q3 Performance Review"
                                value={formData.title}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            name="description"
                            required
                            rows="4"
                            className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500"
                            placeholder="Detailed description of the task..."
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <select
                                    name="assignee"
                                    required
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500 bg-white"
                                    value={formData.assignee}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Employee</option>
                                    {eligibleEmployees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                                    ))}
                                </select>
                            </div>
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                type="date"
                                name="dueDate"
                                required
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500"
                                value={formData.dueDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => navigate('/tasks')}>Cancel</Button>
                        <Button type="submit" className="min-w-[120px]">Assign Task</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignTaskPage;
