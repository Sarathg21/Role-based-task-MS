import React, { useState, useEffect } from 'react';
import { 
    X, RefreshCw, Calendar, Clock, User, 
    Building2, AlertCircle, Loader2, Save,
    Plus, Trash2
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AutomationConfigModal = ({ isOpen, onClose, template, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        frequency: 'WEEKLY',
        weekly_day: 'MON',
        monthly_day: 1,
        yearly_month: 1,
        yearly_day: 1,
        status: 'ACTIVE',
        department_id: '',
        assigned_to_emp_id: ''
    });
    const [subtasks, setSubtasks] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loadingSubtasks, setLoadingSubtasks] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (template && isOpen) {
            const rid = template.id || template.recurring_id;
            setFormData({
                title: template.title || '',
                description: template.description || '',
                frequency: template.frequency || 'WEEKLY',
                weekly_day: template.weekly_day || 'MON',
                monthly_day: template.monthly_day || 1,
                yearly_month: template.yearly_month || 1,
                yearly_day: template.yearly_day || 1,
                status: template.status || 'ACTIVE',
                department_id: template.department_id || '',
                assigned_to_emp_id: template.assigned_to_emp_id || template.assigned_to || ''
            });
            fetchSubtasks(rid);
            fetchMetadata();
        } else if (isOpen) {
            fetchMetadata();
        }
    }, [template, isOpen]);

    const fetchMetadata = async () => {
        try {
            const savedUser = JSON.parse(localStorage.getItem('pms_user') || '{}');
            const role = String(savedUser?.role || '').toUpperCase();
            const isAltRole = role === 'ADMIN' || role === 'CFO';

            const [deptRes, empRes] = await Promise.all([
                api.get('/departments').catch(() => ({ data: [] })),
                api.get(isAltRole ? '/employees' : '/employees/assignable').catch(() => ({ data: [] }))
            ]);
            
            const depts = Array.isArray(deptRes.data?.data) ? deptRes.data.data : (Array.isArray(deptRes.data) ? deptRes.data : []);
            const emps = Array.isArray(empRes.data?.data) ? empRes.data.data : (Array.isArray(empRes.data) ? empRes.data : []);
            
            setDepartments(depts);
            setEmployees(emps);
        } catch (err) {
            console.error("Meta fetch failed", err);
        }
    };

    const fetchSubtasks = async (rid) => {
        setLoadingSubtasks(true);
        try {
            const res = await api.get(`/recurring-tasks/${rid}/subtasks`);
            const data = (res.data?.data || res.data || []);
            
            // Log for debugging ID keys
            if (Array.isArray(data) && data.length > 0) {
                console.log("Subtask ID debug - keys:", Object.keys(data[0]));
            }

            setSubtasks(
                Array.isArray(data)
                    ? data.map(st => ({
                        ...st,
                        id: st.id ?? st.subtask_id ?? st.recurring_subtask_id ?? null
                    }))
                    : []
            );
        } catch (err) {
            console.error("Failed to fetch subtasks", err);
        } finally {
            setLoadingSubtasks(false);
        }
    };

    const handleAddSubtask = async () => {
        const rid = template?.id || template?.recurring_id;
        
        const defaultDept = formData.department_id || (departments[0]?.department_id || departments[0]?.id || '');
        const defaultEmp = formData.assigned_to_emp_id || (employees[0]?.emp_id || '');
        
        const newSt = {
            title: 'New Subtask',
            description: 'Description...',
            department_id: defaultDept || null,
            assigned_to_emp_id: defaultEmp || null,
            priority: 'MEDIUM',
            sequence_no: subtasks.length + 1
        };

        if (!rid) {
            // Local mode for new recurring tasks
            setSubtasks(prev => [
    ...prev,
    { ...newSt, id: `local-${Date.now()}-${Math.random()}`}
]);
            toast.success('Local subtask template added');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post(`/recurring-tasks/${rid}/subtasks`, newSt);
            const addedSt = res.data?.data || res.data;
            const normalizedSt = {
                ...addedSt,
                id: getSubtaskId(addedSt) || addedSt.id // Ensure we have a consistent ID set
            };
            setSubtasks(prev => [...prev, normalizedSt]);
            toast.success('Subtask template added to server');
        } catch (err) {
            console.error(err.response?.data);
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                toast.error('Validation Error: ' + detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', '));
            } else {
                toast.error('Failed to add subtask: ' + (detail || err.message));
            }
        } finally {
            setSubmitting(false);
        }
    };
    const getSubtaskId = (st) => {
        return (
            st?.id ??
            st?.subtask_id ??
            st?.subtask_template_id ??
            st?.recurring_subtask_id ??
            st?.recurring_task_subtask_id ??
            st?.task_id ??
            null
        );
    };

    const handleUpdateSubtask = async (targetId, updates) => {
        const rid = template?.id || template?.recurring_id;
        const isLocal = String(targetId).startsWith('local-');

        // ✅ LOCAL → no API call
        if (isLocal) {
            setSubtasks(prev =>
                prev.map(st => {
                    const sid = getSubtaskId(st);
                    return String(sid) === String(targetId) ? { ...st, ...updates } : st;
                })
            );
            return;
        }

        if (!rid || targetId == null) {
            console.error("Missing ID for update:", { targetId, rid });
            return;
        }

        try {
            const sanitizedUpdates = { ...updates };
            if (sanitizedUpdates.start_date === '') sanitizedUpdates.start_date = null;
            if (sanitizedUpdates.end_date === '') sanitizedUpdates.end_date = null;

            const numericRid = isNaN(rid) ? rid : parseInt(rid, 10);
            const numericSid = isNaN(targetId) ? targetId : parseInt(targetId, 10);

            await api.patch(
                `/recurring-tasks/${numericRid}/subtasks/${numericSid}`,
                sanitizedUpdates
            );

            setSubtasks(prev =>
                prev.map(st => {
                    const sid = getSubtaskId(st);
                    return String(sid) === String(targetId)
                        ? { ...st, ...updates }
                        : st;
                })
            );

        } catch (err) {
            console.error("Subtask update failed", err);
            toast.error('Failed to update subtask');
        }
    };

    const handleDeleteSubtask = async (targetId) => {
        if (!targetId) return;

        const isLocal = String(targetId).startsWith('local-');

        // ✅ ALWAYS remove instantly from UI
        setSubtasks(prev => prev.filter(st => {
            const sid = getSubtaskId(st);
            return String(sid) !== String(targetId);
        }));

        // ✅ STOP here for local subtasks
        if (isLocal) {
            toast.success('Local subtask removed');
            return;
        }

        const rid = template?.id || template?.recurring_id;
        if (!rid) return;

        try {
            // ✅ ONLY numeric IDs go to API
            const numericRid = isNaN(rid) ? rid : parseInt(rid, 10);
            const numericSid = isNaN(targetId) ? targetId : parseInt(targetId, 10);

            await api.delete(`/recurring-tasks/${numericRid}/subtasks/${numericSid}`);
            toast.success('Subtask removed');
        } catch (err) {
            console.error(err);
            // ❗ rollback UI if API fails
            fetchSubtasks(rid);
            toast.error('Delete failed, reverted');
        }
    };
    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        const rid = template?.id || template?.recurring_id;
        setSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                frequency: formData.frequency,
                status: formData.status,
                department_id: formData.department_id || null,
                assigned_to_emp_id: formData.assigned_to_emp_id || null,
                weekly_day: formData.frequency === 'WEEKLY' ? formData.weekly_day : null,
                monthly_day: formData.frequency === 'MONTHLY' ? (parseInt(formData.monthly_day, 10) || null) : null,
                yearly_month: formData.frequency === 'YEARLY' ? (parseInt(formData.yearly_month, 10) || null) : null,
                yearly_day: formData.frequency === 'YEARLY' ? (parseInt(formData.yearly_day, 10) || null) : null
            };

            let res;
            if (rid) {
                res = await api.patch(`/recurring-tasks/${rid}`, payload);
                toast.success('Task configuration updated');
            } else {
                res = await api.post('/recurring-tasks', payload);
                const newRid = res.data?.id || res.data?.recurring_id;
                
                // If we have local subtasks, save them for the new template
                if (newRid && subtasks.length > 0) {
                    for (const st of subtasks) {
                        try {
                            const { id, ...stPayload } = st; 
                            await api.post(`/recurring-tasks/${newRid}/subtasks`, stPayload);
                        } catch (stErr) {
                            console.error("Failed to save local subtask", stErr);
                        }
                    }
                }
                toast.success('Recurring task created with subtasks!');
            }
            
            onSave(res.data?.data || res.data);
            onClose();
        } catch (err) {
            console.error('Submission failed', err);
            toast.error(`Failed to ${rid ? 'update' : 'create'} configuration`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-violet-600 p-2.5 rounded-2xl text-white shadow-lg shadow-violet-200">
                            <RefreshCw size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none pt-1">Configure Task</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Automation Governance</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <div className="space-y-6">
                        <h3 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Core Definition</h3>
                        
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Template Title</label>
                            <input 
                                type="text"
                                required
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-bold transition-all text-sm"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Responsible Dept</label>
                                <select 
                                    className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-bold transition-all text-sm"
                                    value={formData.department_id}
                                    onChange={(e) => setFormData({...formData, department_id: e.target.value})}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((d, dik) => (
                                        <option key={d.department_id || d.id || `dept-${dik}`} value={d.department_id || d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Process Owner</label>
                                <select 
                                    className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-bold transition-all text-sm"
                                    value={formData.assigned_to_emp_id}
                                    onChange={(e) => setFormData({...formData, assigned_to_emp_id: e.target.value})}
                                >
                                    <option value="">Select Manager</option>
                                    {employees.map((e, eik) => (
                                        <option key={e.emp_id || `emp-${eik}`} value={e.emp_id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Frequency</label>
                                <select 
                                    className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-black text-[11px] uppercase tracking-widest transition-all"
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                                >
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="YEARLY">Yearly</option>
                                </select>
                            </div>
                            <div>
                                {formData.frequency === 'WEEKLY' && (
                                    <>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Day of Week</label>
                                        <select 
                                            className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-bold transition-all text-sm"
                                            value={formData.weekly_day}
                                            onChange={(e) => setFormData({...formData, weekly_day: e.target.value})}
                                        >
                                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </>
                                )}
                                {formData.frequency === 'MONTHLY' && (
                                    <>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Day of Month</label>
                                        <input 
                                            type="number" min="1" max="31"
                                            className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-bold transition-all text-sm"
                                            value={formData.monthly_day}
                                            onChange={(e) => setFormData({...formData, monthly_day: parseInt(e.target.value)})}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {formData.frequency === 'YEARLY' && (
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Month</label>
                                    <select 
                                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-bold transition-all text-sm"
                                        value={formData.yearly_month}
                                        onChange={(e) => setFormData({...formData, yearly_month: parseInt(e.target.value)})}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('en', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Day</label>
                                    <input 
                                        type="number" min="1" max="31"
                                        className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-bold transition-all text-sm"
                                        value={formData.yearly_day}
                                        onChange={(e) => setFormData({...formData, yearly_day: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Task Goal (Description)</label>
                            <textarea 
                                rows="3"
                                className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-medium transition-all text-sm"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em]">Subtask Templates</h3>
                            <button 
                                type="button" 
                                onClick={handleAddSubtask}
                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4"
                            >
                                <Plus size={14} strokeWidth={3} /> Add Template
                            </button>
                        </div>

                        <div className="space-y-4">
                            {loadingSubtasks ? (
                                <div className="py-10 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div>
                            ) : subtasks.length === 0 ? (
                                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium italic text-[11px]">No subtask templates defined.</div>
                            ) : (
                                <div className="space-y-3">
                                        {subtasks.sort((a,b) => (a.sequence_no || 0) - (b.sequence_no || 0)).map((st, idx) => {
                                            const subtaskId = getSubtaskId(st);
                                            return (
                                                <div key={subtaskId || `local-${idx}`} className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group overflow-hidden relative">
                                                    {/* Sequence indicator */}
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                                                    
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-[10px] shrink-0">
                                                                    {idx + 1}
                                                                </div>
                                                                <input 
                                                                    type="text"
                                                                    className="flex-1 bg-transparent border-none p-0 text-[14px] font-black text-slate-800 focus:ring-0 placeholder:text-slate-300 uppercase tracking-tight"
                                                                    value={st.title}
                                                                    placeholder="Subtask Title"
                                                                    onChange={(e) => setSubtasks(subtasks.map(s => {
                                                                        const sid = getSubtaskId(s);
                                                                        const tid = getSubtaskId(st);
                                                                        return String(sid) === String(tid) ? {...s, title: e.target.value} : s;
                                                                    }))}
                                                                    onBlur={() => handleUpdateSubtask(subtaskId, { title: st.title })}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        if (window.confirm(`Delete subtask "${st.title}"?`)) {
                                                                            handleDeleteSubtask(subtaskId);
                                                                        }
                                                                    }}
                                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                    title="Remove Subtask"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl">
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsible Dept</label>
                                                                <select 
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                    value={st.department_id}
                                                                    onChange={(e) => handleUpdateSubtask(subtaskId, { department_id: e.target.value })}
                                                                >
                                                                    <option value="">Select Dept</option>
                                                                    {departments.map((d, dk) => <option key={d.department_id || d.id || `st-dept-${dk}`} value={d.department_id || d.id}>{d.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assignee</label>
                                                                <select 
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                    value={st.assigned_to_emp_id}
                                                                    onChange={(e) => handleUpdateSubtask(subtaskId, { assigned_to_emp_id: e.target.value })}
                                                                >
                                                                    <option value="">Select Owner</option>
                                                                    {employees.map((e, ek) => <option key={e.emp_id || `st-emp-${ek}`} value={e.emp_id}>{e.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                                                                <select 
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                    value={st.priority}
                                                                    onChange={(e) => handleUpdateSubtask(subtaskId, { priority: e.target.value })}
                                                                >
                                                                    <option value="LOW">Low</option>
                                                                    <option value="MEDIUM">Medium</option>
                                                                    <option value="HIGH">High</option>
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Timeline</label>
                                                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                                                                    <Clock size={12} className="text-slate-400" />
                                                                    <span className="text-[11px] font-bold text-slate-500 italic">Rules Based</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${formData.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status: {formData.status}</span>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Commit Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AutomationConfigModal;
