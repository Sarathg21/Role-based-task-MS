import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, RotateCcw, User, Calendar, AlertCircle, ClipboardCheck, Paperclip, Download, Loader2, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const TaskReviewModal = ({ isOpen, onClose, onApprove, onRework, task }) => {
    if (!isOpen || !task) return null;

    const [attachments, setAttachments] = useState([]);
    const [loadingAttachments, setLoadingAttachments] = useState(false);

    const taskId = task.task_id || task.id;
    const title = task.task_title || task.title;
    const status = task.status || 'SUBMITTED';
    const assignee = task.assigned_to_name || 'Unassigned';
    const dueDate = task.due_date;

    useEffect(() => {
        if (isOpen && taskId) {
            const fetchAttachments = async () => {
                setLoadingAttachments(true);
                try {
                    const res = await api.get(`/tasks/${taskId}/attachments`);
                    const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                    setAttachments(data);
                } catch (err) {
                    console.error("Failed to fetch attachments for review", err);
                } finally {
                    setLoadingAttachments(false);
                }
            };
            fetchAttachments();
        }
    }, [isOpen, taskId]);

    const handleDownload = async (attachment) => {
        if (!attachment) return;
        
        const attachmentId = (typeof attachment === 'object') 
            ? (attachment.id || attachment.file_id || attachment.attachment_id || attachment.fileId || attachment._id)
            : attachment;

        if (!attachmentId) {
            toast.error('Could not resolve file ID');
            return;
        }

        const toastId = toast.loading('Downloading...');
        try {
            // 1. Try primary download endpoint
            let res;
            try {
                res = await api.get(`/tasks/${taskId}/attachments/${attachmentId}`, {
                    responseType: 'blob'
                });
            } catch (firstErr) {
                // 2. Fallback to /download sub-segment if first one fails
                console.warn("Primary download failed, trying /download sub-path", firstErr);
                res = await api.get(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
                    responseType: 'blob'
                });
            }

            // check if we got a tiny response which might be an error JSON disguised as a blob
            if (res.data instanceof Blob && res.data.size < 500) {
                const text = await res.data.text();
                try {
                    const json = JSON.parse(text);
                    if (json.detail || json.message) {
                        throw new Error(json.detail || json.message);
                    }
                } catch (e) { /* Not JSON or not an error object */ }
            }

            const contentDisposition = res.headers['content-disposition'];
            let fileName = 'evidence';
            if (typeof attachment === 'object') {
                fileName = attachment.filename || attachment.name || attachment.file_name || attachment.original_name || 'evidence';
            }

            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                if (filenameMatch && filenameMatch[1]) fileName = filenameMatch[1];
            }

            const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Downloaded', { id: toastId });
        } catch (err) {
            console.error("Download failed", err);
            toast.error(err.message || 'Download failed. Ensure you have permissions.', { id: toastId });
        }
    };
    
    const handleDelete = async (attachment) => {
        if (!attachment) return;
        const attachmentId = (typeof attachment === 'object') 
            ? (attachment.id || attachment.file_id || attachment.attachment_id || attachment.fileId || attachment._id)
            : attachment;
            
        if (!attachmentId) return;
        if (!window.confirm('Are you sure you want to delete this evidence?')) return;
        
        const toastId = toast.loading('Removing file...');
        try {
            await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
            toast.success('Removed', { id: toastId });
            
            // Refresh
            const res = await api.get(`/tasks/${taskId}/attachments`);
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setAttachments(data);
        } catch (err) {
            console.error("Delete failed", err);
            toast.error('Deletion failed', { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
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
                <div className="p-8 space-y-6 overflow-y-auto">
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

                        {/* Attachments Section */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Submitted Evidence</label>
                            {loadingAttachments ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="animate-spin text-slate-300" size={20} />
                                </div>
                            ) : attachments.length > 0 ? (
                                <div className="space-y-2">
                                    {attachments.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-violet-200 transition-all">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip size={14} className="text-slate-400" />
                                                <span className="text-[12px] font-bold text-slate-600 truncate max-w-[180px]">
                                                    {file.filename || file.name || 'document'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button 
                                                    onClick={() => handleDownload(file)}
                                                    className="p-2 text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
                                                    title="Download Attachment"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(file)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete Attachment"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No attachments submitted</p>
                                </div>
                            )}
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
                <div className="px-8 pb-8 flex gap-3 shrink-0">
                    <button
                        onClick={onRework}
                        className="flex-1 px-6 py-3.5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 font-black text-[11px] uppercase tracking-widest hover:bg-amber-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                        title="Send this task back to the employee for corrections"
                    >
                        <RotateCcw size={14} />
                        Request Rework
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
