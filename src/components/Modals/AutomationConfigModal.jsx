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
        status: 'ACTIVE'
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
                status: template.status || 'ACTIVE'
            });
            fetchSubtasks(rid);
            fetchMetadata();
        }
    }, [template, isOpen]);

    const fetchMetadata = async () => {
        try {
            const [deptRes, empRes] = await Promise.all([
                api.get('/departments'),
                api.get('/employees/assignable')
            ]);
            setDepartments(deptRes.data);
            setEmployees(empRes.data);
        } catch (err) {
            console.error("Meta fetch failed", err);
        }
    };

    const fetchSubtasks = async (rid) => {
        setLoadingSubtasks(true);
        try {
            const res = await api.get(`/recurring-tasks/${rid}/subtasks`);
            const data = res.data?.data || res.data;
            setSubtasks(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch subtasks", err);
        } finally {
            setLoadingSubtasks(false);
        }
    };

    const handleAddSubtask = async () => {
        const rid = template.id || template.recurring_id;
        try {
            const newSt = {
                title: 'New Subtask',
                description: '',
                department_id: departments[0]?.id || '',
                assigned_to_emp_id: '',
                start_date: '',
                end_date: '',
                priority: 'MEDIUM',
                sequence_no: subtasks.length + 1
            };
            const res = await api.post(`/recurring-tasks/${rid}/subtasks`, newSt);
            setSubtasks([...subtasks, res.data?.data || res.data]);
            toast.success('Subtask template added');
        } catch (err) {
            toast.error('Failed to add subtask');
        }
    };

    const handleUpdateSubtask = async (sid, updates) => {
        const rid = template.id || template.recurring_id;
        try {
            await api.patch(`/recurring-tasks/${rid}/subtasks/${sid}`, updates);
            setSubtasks(subtasks.map(st => st.id === sid ? { ...st, ...updates } : st));
        } catch (err) {
            toast.error('Failed to update subtask');
        }
    };

    const handleDeleteSubtask = async (sid) => {
        const rid = template.id || template.recurring_id;
        try {
            await api.delete(`/recurring-tasks/${rid}/subtasks/${sid}`);
            setSubtasks(subtasks.filter(st => st.id !== sid));
            toast.success('Subtask template removed');
        } catch (err) {
            toast.error('Failed to delete subtask');
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const rid = template.id || template.recurring_id;
        try {
            const res = await api.patch(`/recurring-tasks/${rid}`, formData);
            toast.success('Task configuration updated');
            onSave(res.data?.data || res.data);
            onClose();
        } catch (err) {
            console.error('Update failed', err);
            toast.error('Failed to update configuration');
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
                                subtasks.map((st, idx) => (
                                    <div key={st.id || idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm relative group hover:border-indigo-200 transition-all">
                                        <button 
                                            type="button"
                                            onClick={() => handleDeleteSubtask(st.id)}
                                            className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <input 
                                                    type="text"
                                                    className="w-full bg-slate-50/50 border-none rounded-lg px-3 py-2 text-sm font-black text-slate-800 focus:ring-0 focus:bg-white transition-all uppercase tracking-tight"
                                                    value={st.title}
                                                    onChange={(e) => handleUpdateSubtask(st.id, { title: e.target.value })}
                                                    onBlur={() => handleUpdateSubtask(st.id, { title: st.title })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Owner</label>
                                                <select 
                                                    className="w-full bg-slate-50/50 border-none rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 focus:ring-0"
                                                    value={st.assigned_to_emp_id}
                                                    onChange={(e) => handleUpdateSubtask(st.id, { assigned_to_emp_id: e.target.value })}
                                                >
                                                    <option value="">Select Assignee</option>
                                                    {employees.map(e => <option key={e.emp_id} value={e.emp_id}>{e.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Priority</label>
                                                <select 
                                                    className="w-full bg-slate-50/50 border-none rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 focus:ring-0"
                                                    value={st.priority}
                                                    onChange={(e) => handleUpdateSubtask(st.id, { priority: e.target.value })}
                                                >
                                                    <option value="LOW">Low</option>
                                                    <option value="MEDIUM">Medium</option>
                                                    <option value="HIGH">High</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Start Date</label>
                                                <input 
                                                    type="date"
                                                    className="w-full bg-slate-50/50 border-none rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 focus:ring-0"
                                                    value={st.start_date || ''}
                                                    onChange={(e) => handleUpdateSubtask(st.id, { start_date: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">End Date</label>
                                                <input 
                                                    type="date"
                                                    className="w-full bg-slate-50/50 border-none rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 focus:ring-0"
                                                    value={st.end_date || ''}
                                                    onChange={(e) => handleUpdateSubtask(st.id, { end_date: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
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
