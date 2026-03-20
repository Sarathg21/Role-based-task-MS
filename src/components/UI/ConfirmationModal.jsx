import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Are you sure?", 
    message = "This action cannot be undone.", 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    type = "danger" // danger, warning, success
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            iconBg: "bg-rose-100",
            iconColor: "text-rose-600",
            btnBg: "bg-rose-600 hover:bg-rose-700 shadow-rose-200",
            border: "border-rose-100"
        },
        warning: {
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            btnBg: "bg-amber-500 hover:bg-amber-600 shadow-amber-200",
            border: "border-amber-100"
        },
        success: {
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            btnBg: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
            border: "border-emerald-100"
        }
    }[type] || colors.danger;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${colors.border}`}>
                <div className="flex justify-between items-center px-8 py-5 border-b border-slate-50 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${colors.iconBg} ${colors.iconColor}`}>
                            <AlertTriangle size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-8 py-10">
                    <p className="text-slate-600 font-medium leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-white hover:border-slate-300 transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 px-6 py-3 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${colors.btnBg}`}
                    >
                        <Check size={18} />
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
