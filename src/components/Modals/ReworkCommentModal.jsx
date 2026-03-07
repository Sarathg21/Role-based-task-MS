import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';

const ReworkCommentModal = ({ isOpen, onClose, onConfirm, taskTitle }) => {
    const [comment, setComment] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(comment.trim());
        setComment('');
    };

    const handleClose = () => {
        setComment('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-xl">
                            <RotateCcw size={18} className="text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800">Request Rework</h3>
                            {taskTitle && (
                                <p className="text-xs text-slate-500 truncate max-w-[240px]">{taskTitle}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-orange-100 rounded-full transition-colors">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Rework Comment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        autoFocus
                        rows={4}
                        placeholder="Describe what needs to be revised or corrected..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 resize-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">{comment.length} characters</p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 flex gap-3 justify-end">
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!comment.trim()}
                        className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                    >
                        Send for Rework
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReworkCommentModal;
