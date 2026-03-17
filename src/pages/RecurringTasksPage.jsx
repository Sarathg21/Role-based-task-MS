import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { 
    RefreshCw, Plus, Clock, Play, Pause, Trash2, 
    Calendar, User, Building2, AlertCircle, Loader2, ArrowLeft, Settings 
} from 'lucide-react';
import AutomationConfigModal from '../components/Modals/AutomationConfigModal';

const RecurringTasksPage = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [configModal, setConfigModal] = useState({ isOpen: false, template: null });

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/recurring-tasks');
            const data = res.data?.data || res.data;
            setTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch recurring task templates", err);
            toast.error("Failed to load recurring tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleToggleStatus = async (template) => {
        const isActive = template.status === 'ACTIVE';
        const newStatus = isActive ? 'INACTIVE' : 'ACTIVE';
        const endpoint = isActive ? 'deactivate' : 'activate';
        
        setActionLoading(template.id || template.recurring_id);
        try {
            await api.post(`/recurring-tasks/${template.id || template.recurring_id}/${endpoint}`);
            setTemplates(prev => prev.map(t => 
                (t.id || t.recurring_id) === (template.id || template.recurring_id) 
                ? { ...t, status: newStatus } 
                : t
            ));
            toast.success(`Task ${isActive ? 'paused' : 'activated'} successfully`);
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (template) => {
        const id = template.id || template.recurring_id;
        if (!window.confirm("Are you sure you want to delete this recurring template?")) return;
        setActionLoading(id);
        try {
            await api.delete(`/recurring-tasks/${id}`);
            setTemplates(prev => prev.filter(t => (t.id || t.recurring_id) !== id));
            toast.success("Template deleted");
        } catch (err) {
            toast.error("Failed to delete template");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRunManual = async () => {
        if (!window.confirm("Run task generation scheduler manually? This will create tasks for today.")) return;
        setLoading(true);
        try {
            await api.post('/recurring-tasks/run', { run_date: new Date().toISOString().split('T')[0] });
            toast.success("Scheduler triggered successfully!");
            setTimeout(fetchTemplates, 2000);
        } catch (err) {
            toast.error("Manual run failed");
        } finally {
            setLoading(false);
        }
    };

    const getNextRunDate = (template) => {
        // Logic to calculate next run based on frequency and day
        // For demo: 5th of next month
        const now = new Date();
        const next = new Date(now.getFullYear(), now.getMonth() + 1, template.recurring_day || 1);
        return next.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <button 
                        onClick={() => {
    if (window.history.length > 1) {
        navigate(-1); // go back safely
    } else {
        navigate('/cfo/dashboard'); // fallback (change if needed)
    }
}}
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-900 shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="bg-indigo-600 p-2 rounded-xl text-white">
                                <RefreshCw size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none pt-1">
                                Recurring Tasks
                            </h1>
                        </div>
                        <p className="text-slate-400 font-bold capitalize tracking-[0.3em] text-[10px] ml-11">Governance & Automated Tasks</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRunManual}
                        className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-4 rounded-2xl font-black text-[11px] capitalize tracking-widest border border-slate-200 shadow-sm transition-all active:scale-[0.98] flex items-center gap-2"
                        title="Run Scheduler for Today"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Manual Run
                    </button>
                    <button 
                        onClick={() => navigate('/tasks/assign')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-[11px] capitalize tracking-widest shadow-xl shadow-indigo-200 transition-all flex items-center gap-3 active:scale-[0.98]"
                    >
                        <Plus size={20} strokeWidth={3} /> Define New Recurring Task
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden min-h-[600px] flex flex-col">
                <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-violet-500 rounded-full" />
                        <h2 className="text-sm font-black text-slate-800 capitalize tracking-tight italic">Recurring Governance Templates</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1">Total Templates</p>
                            <span className="text-xl font-black text-slate-900 tabular-nums">{templates.length}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest mb-1">Enabled</p>
                            <span className="text-xl font-black text-emerald-600 tabular-nums">{templates.filter(t => t.is_active !== false).length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    {loading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                            <Loader2 size={40} className="text-indigo-500 animate-spin" />
                            <p className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Hydrating Task Registry</p>
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="h-[400px] flex flex-col items-center justify-center gap-6">
                            <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-dashed border-slate-200">
                                <Clock size={64} className="text-slate-200 mx-auto" strokeWidth={1} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-black text-slate-800">No Recurring Tasks</h3>
                                <p className="text-slate-400 text-sm font-medium mt-1">Initialize your first automated workflow to see it here.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/30">
                                    <tr className="border-b border-slate-100">
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 capitalize tracking-[0.2em]">Task / Purpose</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Recurrence</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Owner</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] text-center">Next Run</th>
                                        <th className="px-10 py-5 text-[10px] font-black text-slate-400 capitalize tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {templates.map((template) => {
                                        const tid = template.id || template.recurring_id;
                                        const isActive = template.status === 'ACTIVE';
                                        return (
                                            <tr key={tid} className="group hover:bg-slate-50/50 transition-all duration-300">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-white transition-transform group-hover:scale-110 ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            <RefreshCw size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors capitalize tracking-tight">{template.title}</p>
                                                            <p className="text-[11px] text-slate-400 font-bold truncate max-w-[240px] italic">{template.description || 'No detailed task provided'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 border-x border-slate-50/50">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black capitalize tracking-widest border border-blue-200">
                                                            {template.frequency}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400 capitalize tracking-widest italic">
                                                            {template.frequency === 'WEEKLY' && `Every ${template.weekly_day}`}
                                                            {template.frequency === 'MONTHLY' && `Day ${template.monthly_day}`}
                                                            {template.frequency === 'YEARLY' && `${template.yearly_day} ${new Date(0, (template.yearly_month || 1) - 1).toLocaleString('en', { month: 'short' })}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-700">
                                                            <User size={12} className="text-slate-400" />
                                                            {template.assigned_to_name || template.assigned_to_emp_id}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 capitalize tracking-widest mt-1">
                                                            <Building2 size={10} />
                                                            {template.department_name || template.department_id}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl inline-flex shadow-inner">
                                                        <Calendar size={14} className="text-indigo-500" />
                                                        <span className="text-[11px] font-black text-slate-700 tabular-nums">{template.next_run_date || getNextRunDate(template)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                                        <button 
                                                            onClick={() => setConfigModal({ isOpen: true, template })}
                                                            disabled={actionLoading === tid}
                                                            className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
                                                            title="Edit Configuration"
                                                        >
                                                            <Settings size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleToggleStatus(template)}
                                                            disabled={actionLoading === tid}
                                                            className={`p-2.5 rounded-xl border transition-all ${isActive 
                                                                ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' 
                                                                : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}
                                                            title={isActive ? 'Pause' : 'Activate'}
                                                        >
                                                            {actionLoading === tid ? <Loader2 size={18} className="animate-spin" /> : (isActive ? <Pause size={18} /> : <Play size={18} />)}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(template)}
                                                            disabled={actionLoading === tid}
                                                            className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                                                            title="Delete"
                                                        >
                                                            {actionLoading === tid ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Legend / Info */}
                <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center gap-10">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-6 bg-violet-600 rounded-lg flex items-center justify-center">
                            <RefreshCw size={12} className="text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 capitalize tracking-widest">Automation Template</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 italic">
                        <AlertCircle size={14} />
                        <span className="text-xs font-medium">Automatic assignment occurs at 00:00 UTC on the scheduled day.</span>
                    </div>
                </div>
            </div>

            <AutomationConfigModal 
                isOpen={configModal.isOpen}
                onClose={() => setConfigModal({ isOpen: false, template: null })}
                template={configModal.template}
                onSave={(updated) => {
                    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
                }}
            />
        </div>
    );
};

export default RecurringTasksPage;
