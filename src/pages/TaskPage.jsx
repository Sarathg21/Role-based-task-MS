import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { useAuth } from '../context/AuthContext';
import { TASKS, USERS } from '../data/mockData';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import { Plus, Search } from 'lucide-react';

const ActionTaskTable = ({ tasks, user, onStatusChange, onReassign, onCancel }) => {
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
                        {user.role === 'Employee' && <th className="p-4">Assigned By</th>}
                        <th className="p-4">Status</th>
                        <th className="p-4">Severity</th>
                        <th className="p-4">Due Date</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {tasks.map(task => {
                        // Resolve names
                        const assigneeName = USERS.find(u => u.id === task.employeeId)?.name || task.employeeId;
                        const assignerName = USERS.find(u => u.id === task.assignedBy)?.name || task.assignedBy || 'System';

                        return (
                            <tr key={task.id} className="hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="font-medium">{task.title}</div>
                                    <div className="text-xs text-slate-500">{task.description}</div>
                                </td>
                                <td className="p-4">{assigneeName}</td>
                                {user.role === 'Employee' && <td className="p-4">{assignerName}</td>}
                                <td className="p-4">
                                    <Badge variant={task.status}>{task.status.replace(/_/g, ' ')}</Badge>
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
                                                {task.status === 'NEW' && (
                                                    <Button size="sm" onClick={() => onStatusChange(task.id, 'WORKING_ON_IT')}>Start</Button>
                                                )}
                                                {task.status === 'WORKING_ON_IT' && (
                                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => onStatusChange(task.id, 'SUBMITTED')}>Submit</Button>
                                                )}
                                                {task.status === 'REWORK' && (
                                                    <Button size="sm" onClick={() => onStatusChange(task.id, 'WORKING_ON_IT')}>Restart</Button>
                                                )}
                                            </>
                                        )}
                                        {user.role === 'Manager' && (
                                            <>
                                                {task.status === 'SUBMITTED' && (
                                                    <>
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onStatusChange(task.id, 'APPROVED')}>Approve</Button>
                                                        <Button size="sm" variant="danger" onClick={() => onStatusChange(task.id, 'REWORK')}>Rework</Button>
                                                    </>
                                                )}
                                                {task.status === 'WORKING_ON_IT' && (
                                                    <>
                                                        <Button size="sm" variant="secondary" onClick={() => onReassign(task)}>Reassign</Button>
                                                        <Button size="sm" variant="danger" onClick={() => onCancel(task.id)}>Cancel</Button>
                                                    </>
                                                )}
                                                {/* Manager can cancel any non-terminal task if needed, but per requirements specific logic for WORKING_ON_IT. 
                                                    Adding Cancel for generic cases if needed, but sticking to prompt specific first. 
                                                    Prompt says: If status = WORKING_ON_IT -> Show Cancel, Reassign. 
                                                    Prompt also says: ANY STATUS -> CANCELLED. 
                                                    Let's add Cancel to others if not terminal? For now sticking to prompt specific UI.*/}
                                                {task.status !== 'APPROVED' && task.status !== 'CANCELLED' && task.status !== 'WORKING_ON_IT' && (
                                                    <Button size="sm" variant="danger" onClick={() => onCancel(task.id)}>Cancel</Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const TaskPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // In a real app, this would be fetched from API
    const [tasks, setTasks] = useState(TASKS);
    const [filter, setFilter] = useState({ status: 'All', severity: 'All', search: '' });

    // Reassign Modal State
    const [reassignModalOpen, setReassignModalOpen] = useState(false);
    const [taskToReassign, setTaskToReassign] = useState(null);
    const [newAssignee, setNewAssignee] = useState('');

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            // Role based filtering
            if (user.role === 'Employee' && task.employeeId !== user.id) return false;

            // Manager sees tasks they manage (direct reports) OR tasks assigned TO them (by their manager)
            if (user.role === 'Manager') {
                // 1. Tasks where they are the manager (assigned to their team)
                const isTeamTask = task.managerId === user.id;
                // 2. Tasks assigned TO them (they are the employee)
                const isMyTask = task.employeeId === user.id;

                if (!isTeamTask && !isMyTask) return false;
            }

            // Admin sees all

            // UI Filters
            if (filter.status !== 'All' && task.status !== filter.status) return false;
            if (filter.severity !== 'All' && task.severity !== filter.severity) return false;
            if (filter.search && !task.title.toLowerCase().includes(filter.search.toLowerCase())) return false;

            return true;
        });
    }, [tasks, user, filter]);

    const handleStatusChange = (taskId, newStatus) => {
        // Confirmation for critical actions
        if (newStatus === 'APPROVED' || newStatus === 'CANCELLED' || newStatus === 'REWORK') {
            if (!window.confirm(`Are you sure you want to set status to ${newStatus}?`)) return;
        }

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    };

    const handleCancel = (taskId) => {
        if (window.confirm('Are you sure you want to CANCEL this task? This cannot be undone.')) {
            handleStatusChange(taskId, 'CANCELLED');
        }
    };

    const openReassignModal = (task) => {
        setTaskToReassign(task);
        setNewAssignee(''); // Reset
        setReassignModalOpen(true);
    };

    const handleReassignSubmit = () => {
        if (!newAssignee) return alert('Please select a new assignee');
        if (window.confirm(`Confirm reassignment to ${newAssignee}?`)) {
            setTasks(prev => prev.map(t => t.id === taskToReassign.id ? { ...t, employeeId: newAssignee, assignedBy: user.id } : t));
            setReassignModalOpen(false);
            setTaskToReassign(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Task Management</h1>
                    <p className="text-slate-500">Manage and track project tasks</p>
                </div>
                {(user.role === 'Manager' || user.role === 'Admin') && (
                    <Button onClick={() => navigate('/tasks/assign')}>
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
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-violet-500 text-sm"
                        value={filter.search}
                        onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
                <div className="flex gap-4">
                    <select
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-violet-500 bg-white"
                        value={filter.status}
                        onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                    >
                        <option value="All">All Status</option>
                        <option value="NEW">New</option>
                        <option value="WORKING_ON_IT">Working On It</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REWORK">Rework</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <select
                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-violet-500 bg-white"
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
                onReassign={openReassignModal}
                onCancel={handleCancel}
            />

            {/* Reassign Modal */}
            {reassignModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Reassign Task</h2>
                        <p className="text-sm text-slate-500 mb-4">Select a new employee to assign <strong>{taskToReassign?.title}</strong> to.</p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-1">New Assignee (ID)</label>
                            <select
                                className="w-full border rounded-lg p-2"
                                value={newAssignee}
                                onChange={(e) => setNewAssignee(e.target.value)}
                            >
                                <option value="">Select Employee</option>
                                {/* In real app filtering would be better, listing all EMPs for now */}
                                {USERS.filter(u => u.role === 'Employee').map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setReassignModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleReassignSubmit}>Confirm Reassign</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskPage;
