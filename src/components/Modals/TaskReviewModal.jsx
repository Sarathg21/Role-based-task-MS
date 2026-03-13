import React from 'react';
import { X, CheckCircle2, RotateCcw, User, Calendar, AlertCircle, ClipboardCheck } from 'lucide-react';

const TaskReviewModal = ({ isOpen, onClose, onApprove, onRework, task }) => {
    if (!isOpen || !task) return null;

    const taskId = task.task_id || task.id;
    const title = task.task_title || task.title;
    const status = task.status || 'SUBMITTED';
    const assignee = task.assigned_to_name || 'Unassigned';
    const dueDate = task.due_date;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-100 rounded-2xl">
                            <ClipboardCheck size={20} className="text-violet-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Review Task Submission</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: #{taskId}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Task Title</label>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[15px] font-bold text-slate-700 leading-tight">{title}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Assignee</label>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                                        <User size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{assignee}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Due Date</label>
                                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Calendar size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{dueDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                        <AlertCircle size={18} className="text-amber-500 shrink-0" />
                        <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                            Please verify the completed work before making a final decision. Approved tasks will be moved to history.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 pb-8 flex gap-3">
                    <button
                        onClick={onRework}
                        className="flex-1 px-6 py-3.5 rounded-2xl border border-slate-200 text-amber-600 font-black text-[11px] uppercase tracking-widest hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={14} />
                        Request Review
                    </button>
                    <button
                        onClick={onApprove}
                        className="flex-1 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={14} />
                        Approve Task
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskReviewModal;
