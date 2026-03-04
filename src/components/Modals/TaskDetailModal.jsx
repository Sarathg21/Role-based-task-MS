import { useState, useEffect } from 'react';
import {
    X, History, Paperclip, ChevronRight, ChevronDown,
    Plus, Loader2, FileText, Download, User, Building2, CalendarDays
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../UI/Badge';

const TaskDetailModal = ({ isOpen, onClose, task, currentUser }) => {
    const [activeTab, setActiveTab] = useState('history'); // 'history', 'attachments', 'subtasks'
    const [history, setHistory] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [subtasks, setSubtasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newSubtask, setNewSubtask] = useState({ title: '', description: '', due_date: '' });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen && task) {
            fetchDetails();
        }
    }, [isOpen, task, activeTab]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            if (activeTab === 'history') {
                const res = await api.get(`/tasks/${task.id}/history`);
                setHistory(res.data);
            } else if (activeTab === 'attachments') {
                const res = await api.get(`/tasks/${task.id}/attachments`);
                setAttachments(res.data);
            } else if (activeTab === 'subtasks') {
                const res = await api.get(`/tasks/${task.id}/subtasks`);
                setSubtasks(res.data);
            }
        } catch (err) {
            console.error(`Failed to fetch ${activeTab}`, err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await api.post(`/tasks/${task.id}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchDetails();
        } catch (err) {
            console.error("Upload failed", err);
            // Error handled by global interceptor toast
        } finally {
            setUploading(false);
            e.target.value = null; // Reset input
        }
    };

    const handleDownload = async (attachment) => {
        try {
            // Updated to match backend Order #9: /tasks/{task_id}/attachments/{attachment_id}
            const url = `${api.defaults.baseURL}/tasks/${task.id}/attachments/${attachment.id}`;
            const response = await fetch(url, {
                headers: {
                    "X-EMP-ID": currentUser.id
                }
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = attachment.filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed", err);
        }
    };

    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-800">{task.title}</h2>
                            <Badge variant={task.status}>{task.status.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">Task ID: {task.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                    {/* Description Area */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} /> Description
                        </h3>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                            {task.description || "No description provided."}
                        </p>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Building2 size={14} className="text-indigo-400" /> {task.department}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority</p>
                            <Badge variant={task.severity}>{task.severity}</Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assignee</p>
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={14} className="text-violet-400" /> {task.employee_id}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <CalendarDays size={14} className="text-rose-400" /> {task.due_date}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned By</p>
                            <p className="text-sm font-semibold text-slate-700">{task.assigned_by || "System"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Date</p>
                            <p className="text-sm font-semibold text-slate-700">{task.assigned_date}</p>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex border-b border-slate-100">
                        {['history', 'attachments', 'subtasks'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === tab
                                    ? 'text-violet-600 border-violet-600 bg-violet-50/50'
                                    : 'text-slate-400 border-transparent hover:text-slate-600'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="py-4 min-h-[200px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin text-slate-300" size={32} />
                            </div>
                        ) : activeTab === 'attachments' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <Paperclip size={18} className="text-slate-400" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Add Attachments</p>
                                            <p className="text-[10px] text-slate-400">No size limit · All file types</p>
                                        </div>
                                    </div>
                                    <label className="cursor-pointer bg-white px-4 py-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm">
                                        {uploading ? <Loader2 size={14} className="animate-spin" /> : 'Choose File'}
                                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    {attachments.length > 0 ? (
                                        attachments.map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-violet-50 rounded-lg text-violet-500">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">{file.filename}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(file.uploaded_at).toLocaleString()} · by {file.uploaded_by}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(file)}
                                                    className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                                                    title="Download"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <Paperclip size={40} className="mx-auto text-slate-200 mb-3" />
                                            <p className="text-sm text-slate-400">No attachments yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'history' ? (
                            <div className="space-y-3">
                                {history.length === 0 ? (
                                    <div className="text-center py-12">
                                        <History size={36} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400">No history recorded yet.</p>
                                    </div>
                                ) : (
                                    history.map((entry, i) => (
                                        <div key={i} className="flex gap-3 items-start">
                                            <div className="w-2 h-2 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <span className="text-xs font-bold text-violet-600 uppercase tracking-wide">
                                                        {entry.action || entry.status || 'Update'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {entry.timestamp || entry.changed_at
                                                            ? new Date(entry.timestamp || entry.changed_at).toLocaleString()
                                                            : ''}
                                                    </span>
                                                </div>
                                                {entry.comment && (
                                                    <p className="text-xs text-slate-600 italic mt-1">"{entry.comment}"</p>
                                                )}
                                                {entry.changed_by && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">by {entry.changed_by}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            // Subtasks tab
                            <div className="space-y-3">
                                {subtasks.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Plus size={36} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400">No subtasks yet.</p>
                                    </div>
                                ) : (
                                    subtasks.map((sub) => (
                                        <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{sub.title}</p>
                                                <p className="text-[10px] text-slate-400">Due: {sub.due_date} · Assigned to: {sub.employee_id}</p>
                                            </div>
                                            <Badge variant={sub.status}>{sub.status.replace(/_/g, ' ')}</Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white rounded-full text-xs font-bold hover:bg-slate-900 transition shadow-sm"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
