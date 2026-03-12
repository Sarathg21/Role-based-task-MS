import { useState } from 'react';
import { X, AlertTriangle, User, MessageSquare, ShieldCheck } from 'lucide-react';

const EmployeeIssueModal = ({ isOpen, onClose, onSave, employeeName }) => {
    const [issueType, setIssueType] = useState('Overdue Task');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            type: issueType,
            description: description.trim(),
            employee: employeeName,
            timestamp: new Date().toISOString()
        });
        setDescription('');
        onClose();
    };

    const handleClose = () => {
        setDescription('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 bg-violet-50/50 border-b border-violet-100 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-violet-100 rounded-full opacity-50" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                            <AlertTriangle size={22} className="text-violet-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Document Employee Issue</h3>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                                <User size={10} /> {employeeName || 'Unknown Employee'}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-white rounded-xl transition-all relative z-10 shadow-sm border border-transparent hover:border-slate-200">
                        <X size={18} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Issue Category
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {['Overdue Task', 'Rework Required', 'Quality Concern', 'Other'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setIssueType(type)}
                                    className={`px-4 py-3 rounded-2xl text-[11px] font-bold transition-all border ${issueType === type 
                                        ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' 
                                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-300'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">
                            Issue Description <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative group">
                            <div className="absolute top-4 left-4">
                                <MessageSquare size={16} className="text-slate-300 group-focus-within:text-violet-500 transition-colors" />
                            </div>
                            <textarea
                                autoFocus
                                rows={4}
                                placeholder="Provide specific details about the bottleneck or performance issue..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-400 focus:bg-white resize-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 text-right uppercase tracking-widest">{description.length} Characters documented</p>
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
                        disabled={!description.trim()}
                        className="flex-[1.5] px-6 py-4 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition shadow-xl shadow-slate-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                    >
                        <ShieldCheck size={16} /> Save Record
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeIssueModal;
