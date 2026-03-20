import { useState, useEffect } from 'react';
import { X, Target, MessageSquare, ShieldCheck, ChevronDown, Building2 } from 'lucide-react';

const DeptReviewModal = ({ isOpen, onClose, onSave, departments = [], initialDepartment = '' }) => {
    const [selectedDept, setSelectedDept] = useState(initialDepartment);
    
    // Sync state if initialDepartment changes while open
    useEffect(() => {
        if (initialDepartment) setSelectedDept(initialDepartment);
    }, [initialDepartment, isOpen]);

    const [status, setStatus] = useState('ON_TRACK');
    const [summary, setSummary] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            department: selectedDept,
            status,
            summary: summary.trim(),
            timestamp: new Date().toISOString()
        });
        setSummary('');
        setSelectedDept('');
        onClose();
    };

    const handleClose = () => {
        setSummary('');
        setSelectedDept('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-7 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100 rounded-full opacity-50" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                            <Target size={22} className="text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Executive Department Review</h3>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                Document Performance Milestone
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white rounded-xl transition-all relative z-10 shadow-sm border border-transparent hover:border-slate-200">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-7">
                    {/* Dept Selection */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Target Department
                        </label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                <Building2 size={16} className="text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            </div>
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full pl-12 pr-10 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white appearance-none transition-all cursor-pointer"
                            >
                                <option value="" disabled>Select a department to review...</option>
                                {departments.map((dept, idx) => (
                                    <option key={idx} value={dept.department_name || dept.name}>
                                        {dept.department_name || dept.name}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Performance Status */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Milestone Status
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'ON_TRACK', label: 'On Track', color: 'bg-emerald-500 shadow-emerald-200' },
                                { id: 'AT_RISK', label: 'At Risk', color: 'bg-amber-500 shadow-amber-200' },
                                { id: 'OFF_TRACK', label: 'Delayed', color: 'bg-rose-500 shadow-rose-200' },
                            ].map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => setStatus(s.id)}
                                    className={`px-4 py-3 rounded-2xl text-[11px] font-bold transition-all border ${status === s.id 
                                        ? `${s.color} text-white border-transparent shadow-lg` 
                                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-300'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Review Summary */}
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Review Summary <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute top-4 left-4">
                                <MessageSquare size={16} className="text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                            </div>
                            <textarea
                                rows={4}
                                placeholder="Summarize key findings, resource needs, or strategic blockers..."
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 focus:bg-white resize-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 flex gap-4">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!summary.trim() || !selectedDept}
                        className="flex-[1.5] px-6 py-4 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition shadow-xl shadow-slate-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                    >
                        <ShieldCheck size={16} /> Finalize Review
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeptReviewModal;
