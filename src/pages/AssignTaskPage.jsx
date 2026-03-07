import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

const AssignTaskPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'MEDIUM',
        dueDate: ''
    });
    const [attachment, setAttachment] = useState(null);

    const [eligibleAssignees, setEligibleAssignees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchAssignees = async () => {
            try {
                // Correct endpoint: /employees/assignable
                const response = await api.get('/employees/assignable');
                setEligibleAssignees(response.data);
            } catch (err) {
                console.error("Failed to fetch assignees", err);
                toast.error('Failed to load assignable employees');
            } finally {
                setLoading(false);
            }
        };
        fetchAssignees();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const confirmed = window.confirm("Are you sure you want to assign this task?");
        if (!confirmed) return;
        setSubmitting(true);

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                assigned_to_emp_id: formData.assignee,
                due_date: formData.dueDate,
                parent_task_id: null
            };

            // Step 1: Create the task
            const taskRes = await api.post('/tasks', payload);
            const newTaskId = taskRes.data.id || taskRes.data.task_id;

            // Step 2: Upload attachment if provided
            if (attachment && newTaskId) {
                const formDataUpload = new FormData();
                formDataUpload.append('file', attachment);
                try {
                    await api.post(`/tasks/${newTaskId}/attachments`, formDataUpload, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } catch (uploadErr) {
                    console.warn('Task created but attachment upload failed:', uploadErr);
                    toast.success('Task assigned! (Attachment upload had an issue)');
                    navigate('/tasks');
                    return;
                }
            }

            toast.success('Task assigned successfully!');
            navigate('/tasks');
        } catch (err) {
            console.error('Failed to assign task', err);
            if (!err.response || err.response.status !== 422) {
                toast.error('Failed to assign task: ' + (err.response?.data?.detail || 'Unknown error'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shrink-0 transition"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-semibold text-slate-800">Assign New Task</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Create and assign a task to your team members</p>
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
                            onChange={(e) => setAttachment(e.target.files[0])}
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
                                <option key="placeholder" value="">Select Assignee</option>
                                {loading ? (
                                    <option key="loading" disabled>Loading...</option>
                                ) : (
                                    eligibleAssignees.map(p => (
                                        // API returns emp_id, not id
                                        <option key={p.emp_id} value={p.emp_id}>
                                            {p.name} ({p.role}) - {p.department_id || p.department}
                                        </option>
                                    ))
                                )}
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
                                <option key="low" value="LOW">Low</option>
                                <option key="medium" value="MEDIUM">Medium</option>
                                <option key="high" value="HIGH">High</option>
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
                        <button
                            type="button"
                            onClick={() => navigate('/tasks')}
                            className="btn-secondary px-6 py-2.5"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-primary px-8 py-2.5 gap-2"
                        >
                            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Assign Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignTaskPage;
