import React, { useState, useEffect } from 'react';
import { 
    X, RefreshCw, Calendar, Clock, User, 
    Building2, AlertCircle, Loader2, Save 
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AutomationConfigModal = ({ isOpen, onClose, template, onSave }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        recurring_frequency: 'MONTHLY',
        recurring_day: 1,
        due_offset_days: 5,
        is_active: true
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (template) {
            setFormData({
                title: template.title || '',
                description: template.description || '',
                recurring_frequency: template.recurring_frequency || 'MONTHLY',
                recurring_day: template.recurring_day || 1,
                due_offset_days: template.due_offset_days || 5,
                is_active: template.is_active !== false
            });
        }
    }, [template]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await api.patch(`/tasks/${template.id}`, formData);
            toast.success('Directive configuration updated', {
                icon: '⚙️',
                style: {
                    borderRadius: '1rem',
                    background: '#1e293b',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
            });
            onSave(res.data);
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
                            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none pt-1">Configure Directive</h2>
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
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Template Title</label>
                        <input 
                            type="text"
                            required
                            className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 font-bold transition-all text-sm"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Frequency</label>
                            <select 
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 font-black text-[11px] uppercase tracking-widest transition-all"
                                value={formData.recurring_frequency}
                                onChange={(e) => setFormData({...formData, recurring_frequency: e.target.value})}
                            >
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Scheduled Day</label>
                            <input 
                                type="number"
                                min="1" max="31"
                                className="w-full px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 font-bold transition-all text-sm"
                                value={formData.recurring_day}
                                onChange={(e) => setFormData({...formData, recurring_day: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="bg-violet-50/50 rounded-3xl p-6 border border-violet-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white p-3 rounded-2xl text-violet-600 shadow-sm border border-violet-100">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-black text-slate-800">Due Date Offset</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Days until deadline</p>
                            </div>
                        </div>
                        <input 
                            type="number"
                            min="1"
                            className="w-20 px-4 py-3 rounded-xl border border-violet-200 bg-white font-black text-center text-sm focus:ring-4 focus:ring-violet-500/10 outline-none transition-all shadow-inner"
                            value={formData.due_offset_days}
                            onChange={(e) => setFormData({...formData, due_offset_days: parseInt(e.target.value)})}
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Governance Rule (Description)</label>
                        <textarea 
                            rows="3"
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 font-medium transition-all text-sm italic"
                            placeholder="Describe the purpose and expected outcome..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Template Status: {formData.is_active ? 'Active' : 'Paused'}</span>
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
                            className="px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
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
