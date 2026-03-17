import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Clock, Plus, Trash2 } from 'lucide-react';

const AssignTaskPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // State for assignees - define this early to avoid reference errors
    const [eligibleAssignees, setEligibleAssignees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'MEDIUM',
        dueDate: '',
        isRecurring: false,
        recurringFrequency: 'WEEKLY',
        recurringDay: 1, // Monthly Day
        weeklyDay: 'MON',
        yearlyMonth: 1,
        yearlyDay: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'ACTIVE'
    });
    const [subtasks, setSubtasks] = useState([]);
    const [attachment, setAttachment] = useState(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [empRes, deptRes] = await Promise.all([
                    api.get('/employees/assignable'),
                    api.get('/departments')
                ]);
                setEligibleAssignees(empRes.data);
                setDepartments(deptRes.data);
            } catch (err) {
                console.error("Failed to fetch metadata", err);
                toast.error('Failed to load metadata');
            } finally {
                setLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    const addSubtask = () => {
        setSubtasks([...subtasks, {
            title: '',
            description: '',
            department_id: '',
            assigned_to_emp_id: '',
            start_date: '',
            end_date: '',
            priority: 'MEDIUM',
            sequence_no: subtasks.length + 1
        }]);
    };

    const removeSubtask = (index) => {
        const newList = subtasks.filter((_, i) => i !== index);
        // Re-sequence
        const resequenced = newList.map((st, i) => ({ ...st, sequence_no: i + 1 }));
        setSubtasks(resequenced);
    };

    const handleSubtaskChange = (index, field, value) => {
        const newList = [...subtasks];
        newList[index][field] = value;
        setSubtasks(newList);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const typeLabel = formData.isRecurring ? "recurring task" : "task";
        const confirmed = window.confirm(`Are you sure you want to assign this ${typeLabel}?`);
        if (!confirmed) return;
        setSubmitting(true);

        try {
            const selectedAssignee = eligibleAssignees.find(e => String(e.emp_id) === String(formData.assignee));
            const targetedDeptListMatch = departments.find(d => 
                String(d.name) === String(selectedAssignee?.department_id || selectedAssignee?.department) || 
                String(d.id || d.department_id) === String(selectedAssignee?.department_id || selectedAssignee?.department)
            );
            const resolvedDepartmentId = targetedDeptListMatch?.id || targetedDeptListMatch?.department_id 
                || selectedAssignee?.department_id || selectedAssignee?.department 
                || user?.department_id || user?.dept_id;

            if (formData.isRecurring) {
                // Handle Recurring Task Creation
                const recurringPayload = {
                    title: formData.title,
                    description: formData.description,
                    department_id: resolvedDepartmentId,
                    assigned_to_emp_id: formData.assignee,
                    assigned_by_emp_id: user?.id,
                    priority: formData.priority,
                    frequency: formData.recurringFrequency,
                    weekly_day: formData.recurringFrequency === 'WEEKLY' ? formData.weeklyDay : null,
                    monthly_day: formData.recurringFrequency === 'MONTHLY' ? parseInt(formData.recurringDay) : null,
                    yearly_month: formData.recurringFrequency === 'YEARLY' ? parseInt(formData.yearlyMonth) : null,
                    yearly_day: formData.recurringFrequency === 'YEARLY' ? parseInt(formData.yearlyDay) : null,
                    start_date: formData.startDate,
                    end_date: formData.endDate || null,
                    status: formData.status
                };

                const res = await api.post('/recurring-tasks', recurringPayload);
                const recurringId = res.data.id || res.data.recurring_id;

                // Add subtasks one by one
                if (subtasks.length > 0) {
                    for (const st of subtasks) {
                        await api.post(`/recurring-tasks/${recurringId}/subtasks`, {
                            title: st.title,
                            description: st.description,
                            department_id: st.department_id,
                            assigned_to_emp_id: st.assigned_to_emp_id,
                            start_date: st.start_date || null,
                            end_date: st.end_date || null,
                            priority: st.priority,
                            sequence_no: st.sequence_no
                        });
                    }
                }
                toast.success('Recurring task defined successfully!');
                navigate('/recurring-tasks');
            } else {
                // Handle Normal Task Creation
                const payload = {
                    title: formData.title,
                    description: formData.description,
                    priority: formData.priority,
                    assigned_to_emp_id: formData.assignee,
                    department_id: resolvedDepartmentId,
                    due_date: formData.dueDate,
                    parent_task_id: null
                };

                const taskRes = await api.post('/tasks', payload);
                const newTaskId = taskRes.data.id || taskRes.data.task_id;

                if (attachment && newTaskId) {
                    const formDataUpload = new FormData();
                    formDataUpload.append('file', attachment);
                    try {
                        await api.post(`/tasks/${newTaskId}/attachments`, formDataUpload, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } catch (uploadErr) {
                        console.warn('Attachment upload failed:', uploadErr);
                    }
                }
                toast.success('Task assigned successfully!');
                navigate('/tasks');
            }
        } catch (err) {
            console.error('Failed to create task', err);
            toast.error('Failed: ' + (err.response?.data?.detail || err.message));
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
                    <p className="text-xs font-bold text-slate-400 mt-0.5 tracking-widest uppercase">Create and assign tasks</p>
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

                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white shadow-sm text-indigo-600">
                                    <Clock size={18} strokeWidth={2.5} />
                                </div>
                                <div className="pt-0.5">
                                    <h4 className="text-[14px] font-black text-slate-800 leading-none">Task Type</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Normal or Recurring</p>
                                </div>
                            </div>
                            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isRecurring: false })}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!formData.isRecurring ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                                >
                                    Normal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isRecurring: true })}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.isRecurring ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                                >
                                    Recurring
                                </button>
                            </div>
                        </div>

                        {formData.isRecurring && (
                            <div className="animate-fade-in space-y-6 pt-4 border-t border-indigo-100">
                                {/* Frequency Selector */}
                                <div className="flex items-center gap-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Frequency:</label>
                                    <div className="flex bg-white p-1 rounded-xl border border-indigo-100 w-full shadow-sm">
                                        {['WEEKLY', 'MONTHLY', 'YEARLY'].map((f) => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, recurringFrequency: f })}
                                                className={`flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${formData.recurringFrequency === f ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Recurrence Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {formData.recurringFrequency === 'WEEKLY' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Day of Week</label>
                                            <select 
                                                className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white font-bold text-[12px] focus:ring-4 focus:ring-indigo-400/10 outline-none transition-all"
                                                value={formData.weeklyDay}
                                                onChange={(e) => setFormData({ ...formData, weeklyDay: e.target.value })}
                                            >
                                                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                                                    <option key={day} value={day}>{day}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {formData.recurringFrequency === 'MONTHLY' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Day of Month</label>
                                            <input 
                                                type="number" min="1" max="31"
                                                className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white font-bold text-[12px] focus:ring-4 focus:ring-indigo-400/10 outline-none transition-all"
                                                value={formData.recurringDay}
                                                onChange={(e) => setFormData({ ...formData, recurringDay: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    {formData.recurringFrequency === 'YEARLY' && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Month</label>
                                                <select 
                                                    className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white font-bold text-[12px] focus:ring-4 focus:ring-indigo-400/10 outline-none transition-all"
                                                    value={formData.yearlyMonth}
                                                    onChange={(e) => setFormData({ ...formData, yearlyMonth: e.target.value })}
                                                >
                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('en', { month: 'long' })}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Day</label>
                                                <input 
                                                    type="number" min="1" max="31"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white font-bold text-[12px] focus:ring-4 focus:ring-indigo-400/10 outline-none transition-all"
                                                    value={formData.yearlyDay}
                                                    onChange={(e) => setFormData({ ...formData, yearlyDay: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">Start Date</label>
                                        <input 
                                            type="date"
                                            className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white font-bold text-[12px] focus:ring-4 focus:ring-indigo-400/10 outline-none transition-all"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block ml-1">End Date (Optional)</label>
                                        <input 
                                            type="date"
                                            className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-white font-bold text-[12px] focus:ring-4 focus:ring-indigo-400/10 outline-none transition-all"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Subtask Templates */}
                                <div className="pt-6 border-t border-indigo-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-[14px] font-black text-slate-800 leading-none">Subtask Templates</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Predefined subtasks for each recurrence</p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={addSubtask}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                                        >
                                            <Plus size={14} strokeWidth={3} /> Add Subtask
                                        </button>
                                    </div>

                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {subtasks.length === 0 ? (
                                            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-indigo-100">
                                                <p className="text-[11px] font-bold text-slate-400 italic">No subtask templates added yet.</p>
                                            </div>
                                        ) : (
                                            subtasks.map((st, idx) => (
                                                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative group animate-fade-in">
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeSubtask(idx)}
                                                        className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="md:col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Subtask Title</label>
                                                            <input 
                                                                type="text"
                                                                className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none text-[13px] font-semibold"
                                                                placeholder="Subtask Title..."
                                                                value={st.title}
                                                                onChange={(e) => handleSubtaskChange(idx, 'title', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Department</label>
                                                            <select 
                                                                className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none text-[12px] font-semibold"
                                                                value={st.department_id}
                                                                onChange={(e) => handleSubtaskChange(idx, 'department_id', e.target.value)}
                                                            >
                                                                <option value="">Select Dept</option>
                                                                {departments.map(d => (
                                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Assignee</label>
                                                            <select 
                                                                className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none text-[12px] font-semibold"
                                                                value={st.assigned_to_emp_id}
                                                                onChange={(e) => handleSubtaskChange(idx, 'assigned_to_emp_id', e.target.value)}
                                                            >
                                                                <option value="">Select Assignee</option>
                                                                {eligibleAssignees.map(p => (
                                                                    <option key={p.emp_id} value={p.emp_id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label>
                                                            <input 
                                                                type="date"
                                                                className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none text-[12px] font-semibold"
                                                                value={st.start_date || ''}
                                                                onChange={(e) => handleSubtaskChange(idx, 'start_date', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">End Date</label>
                                                            <input 
                                                                type="date"
                                                                className="w-full px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none text-[12px] font-semibold"
                                                                value={st.end_date || ''}
                                                                onChange={(e) => handleSubtaskChange(idx, 'end_date', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
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
