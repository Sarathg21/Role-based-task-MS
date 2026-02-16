import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { TASKS } from '../data/mockData';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import { Plus, Search } from 'lucide-react';

const ActionTaskTable = ({ tasks, user, onStatusChange }) => {
    if (!tasks || tasks.length === 0) {
        return <div className="p-8 text-center text-slate-500">No tasks found</div>;
    }

    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                        <th className="p-4">Task</th>
                        <th className="p-4">Assignee</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Severity</th>
                        <th className="p-4">Due Date</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {tasks.map(task => (
                        <tr key={task.id} className="hover:bg-slate-50">
                            <td className="p-4">
                                <div className="font-medium">{task.title}</div>
                                <div className="text-xs text-slate-500">{task.description}</div>
                            </td>
                            <td className="p-4">{task.employeeId}</td>
                            <td className="p-4">
                                <Badge variant={
                                    task.status === 'Completed' ? 'success' :
                                        task.status === 'In Progress' ? 'warning' : 'default'
                                }>{task.status}</Badge>
                            </td>
                            <td className="p-4">
                                <Badge variant={
                                    task.severity === 'Critical' ? 'danger' :
                                        task.severity === 'High' ? 'danger' :
                                            task.severity === 'Medium' ? 'primary' : 'info'
                                }>{task.severity}</Badge>
                            </td>
                            <td className="p-4 text-slate-500">{task.dueDate}</td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                    {user.role === 'Employee' && (
                                        <>
                                            {task.status === 'Pending' && (
                                                <Button size="sm" onClick={() => onStatusChange(task.id, 'In Progress')}>Start</Button>
                                            )}
                                            {task.status === 'In Progress' && (
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onStatusChange(task.id, 'Completed')}>Complete</Button>
                                            )}
                                        </>
                                    )}
                                    {user.role === 'Manager' && task.status === 'Completed' && (
                                        <>
                                            <Button size="sm" variant="secondary" onClick={() => alert('Approved')}>Approve</Button>
                                            <Button size="sm" variant="danger" onClick={() => onStatusChange(task.id, 'In Progress')}>Rework</Button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const TaskPage = () => {
    const { user } = useAuth();
    // In a real app, this would be fetched from API
    const [tasks, setTasks] = useState(TASKS);
    const [filter, setFilter] = useState({ status: 'All', severity: 'All', search: '' });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Role based filtering
            if (user.role === 'Employee' && task.employeeId !== user.id) return false;
            // Manager sees team tasks (simplified to all tasks for demo if managerId matches, or just all)
            // For now let's assume Manager sees tasks they manage OR are in their department
            if (user.role === 'Manager' && task.managerId !== user.id) return false;
            // Admin sees all

            // UI Filters
            if (filter.status !== 'All' && task.status !== filter.status) return false;
            if (filter.severity !== 'All' && task.severity !== filter.severity) return false;
            if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) return false;

            return true;
        });
    }, [tasks, user, filter]);

    const handleStatusChange = (taskId, newStatus) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Task Management</h1>
                    <p className="text-slate-500">Manage and track project tasks</p>
                </div>
                {(user.role === 'Manager' || user.role === 'Admin') && (
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={18} className="mr-2" />
                        New Task
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-primary text-sm"
                        value={filter.search}
                        onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
                <div className="flex gap-4">
                    <select
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
                        value={filter.status}
                        onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    </select>
                    <select
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
                        value={filter.severity}
                        onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value }))}
                    >
                        <option value="All">All Priority</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
            </div>

            <ActionTaskTable
                tasks={filteredTasks}
                user={user}
                onStatusChange={handleStatusChange}
            />

            {/* Simple Modal Placeholder */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Add New Task</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title</label>
                                <input type="text" className="w-full border rounded-lg p-2" placeholder="Task title" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Assignee</label>
                                <select className="w-full border rounded-lg p-2">
                                    <option>Select Employee</option>
                                    <option>EMP001</option>
                                    <option>EMP002</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                            <Button onClick={() => {
                                alert('Task created!');
                                setIsAddModalOpen(false);
                            }}>Create Task</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskPage;
