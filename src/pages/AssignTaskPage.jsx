import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Clock } from 'lucide-react';

const AssignTaskPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'MEDIUM',
        dueDate: '',
        isRecurring: false,
        recurringFrequency: 'MONTHLY',
        recurringDay: 1,
        dueOffset: 5
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
                parent_task_id: null,
                is_recurring: formData.isRecurring,
                recurring_frequency: formData.isRecurring ? formData.recurringFrequency : null,
                recurring_day: formData.isRecurring ? parseInt(formData.recurringDay) : null,
                due_offset_days: formData.isRecurring ? parseInt(formData.dueOffset) : null
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
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in mt-4">
            <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-white/40 shadow-sm w-fit">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shrink-0 transition shadow-sm hover:shadow-md active:scale-95"
                >
                    <ArrowLeft size={18} />
                </button>
                <div className="pr-4">
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Assign New Task</h1>
                    <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-widest uppercase">Create and assign directives</p>
                </div>
            </div>

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                            Task Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            required
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 font-medium transition-all placeholder:text-slate-400 text-[14px]"
                            placeholder="e.g. Q3 Performance Review"
                            value={formData.title}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Description</label>
                        <textarea
                            name="description"
                            rows="4"
                            className="w-full p-5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 font-medium transition-all placeholder:text-slate-400 resize-y text-[14px]"
                            placeholder="Detailed description of the task..."
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Attachment</label>
                        <input
                            type="file"
                            name="attachment"
                            onChange={(e) => setAttachment(e.target.files[0])}
                            className="block w-full text-sm text-slate-600 font-medium
                                file:mr-4 file:py-2.5 file:px-5
                                file:rounded-xl file:border-0
                                file:text-sm file:font-bold file:cursor-pointer
                                file:bg-violet-50 file:text-violet-700
                                hover:file:bg-violet-100 transition-colors cursor-pointer"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                                Assignee <span className="text-rose-500">*</span>
                            </label>
                            <select
                                name="assignee"
                                required
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 font-medium transition-all text-[14px]"
                                value={formData.assignee}
                                onChange={handleChange}
                            >
                                <option key="placeholder" value="" className="text-slate-400">Select Assignee</option>
                                {loading ? (
                                    <option key="loading" disabled>Loading...</option>
                                ) : (
                                    eligibleAssignees.map(p => (
                                        <option key={p.emp_id} value={p.emp_id}>
                                            {p.name} ({p.role}) - {p.department_id || p.department}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Priority</label>
                            <select
                                name="priority"
                                className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 font-medium transition-all text-[14px]"
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
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">
                            Due Date <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="dueDate"
                            required={!formData.isRecurring}
                            disabled={formData.isRecurring}
                            className={`w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-300 font-medium transition-all text-[14px] ${formData.isRecurring ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={formData.dueDate}
                            onChange={handleChange}
                        />
                        {formData.isRecurring && <p className="text-[10px] text-violet-500 font-bold mt-1 uppercase">Dynamic date will be used for recurring tasks</p>}
                    </div>

                    <div className="bg-violet-50/50 p-6 rounded-2xl border border-violet-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white shadow-sm text-violet-600">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800">Recurring Task</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Automatically repeat this directive</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={formData.isRecurring}
                                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                            </label>
                        </div>

                        {formData.isRecurring && (
                            <>
                                <div className="animate-fade-in pt-4 border-t border-violet-100 flex items-center gap-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Frequency:</label>
                                    <div className="flex bg-white p-1 rounded-xl border border-violet-100 w-full shadow-sm">
                                        {['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].map((f) => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, recurringFrequency: f })}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${formData.recurringFrequency === f ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.recurringFrequency === 'MONTHLY' && (
                                    <div className="animate-fade-in pt-4 border-t border-violet-100 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Day of Month</label>
                                            <input 
                                                type="number" 
                                                name="recurringDay"
                                                min="1" max="31"
                                                className="w-full px-4 py-2 rounded-xl border border-violet-100 bg-white font-bold text-xs focus:ring-2 focus:ring-violet-400/20 outline-none"
                                                value={formData.recurringDay}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Due After (Days)</label>
                                            <input 
                                                type="number" 
                                                name="dueOffset"
                                                min="1"
                                                className="w-full px-4 py-2 rounded-xl border border-violet-100 bg-white font-bold text-xs focus:ring-2 focus:ring-violet-400/20 outline-none"
                                                value={formData.dueOffset}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-8">
                        <button
                            type="button"
                            onClick={() => navigate('/tasks')}
                            className="px-6 py-3 rounded-xl font-bold text-[#4285F4] bg-white border border-[#4285F4]/30 hover:bg-blue-50 transition-colors shadow-sm text-[14px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 rounded-xl font-bold text-white bg-[#7B51ED] hover:bg-violet-700 transition flex items-center justify-center gap-2 shadow-sm text-[14px]"
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
