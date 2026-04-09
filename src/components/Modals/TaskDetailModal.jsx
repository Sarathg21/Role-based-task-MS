import { useState, useEffect } from 'react';
import {
    X, History, Paperclip, ChevronRight, ChevronDown,
    Plus, Loader2, FileText, Download, User, Building2, CalendarDays, Upload, Trash2
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../UI/Badge';
import toast from 'react-hot-toast';

const getHistoryLabel = (entry) => {
    const oldStatus = entry.old_status;
    const newStatus = entry.new_status;
    const comment = (entry.comment || '').toLowerCase();

    // Specific Mappings from User Request
    if (oldStatus === 'NEW' && newStatus === 'NEW') {
        if (comment.includes('task created')) return 'Task Created';
        if (comment.includes('reassigned from')) return 'Task Reassigned';
    }
    if (oldStatus === 'IN_PROGRESS' && newStatus === 'SUBMITTED') return 'Task Submitted';
    if (oldStatus === 'SUBMITTED' && newStatus === 'APPROVED') return 'Task Approved';
    if (oldStatus === 'SUBMITTED' && newStatus === 'REWORK') return 'Rework Requested';

    // Fallbacks for other transitions
    if (oldStatus && newStatus && oldStatus !== newStatus) {
        if (newStatus === 'IN_PROGRESS' && oldStatus === 'NEW') return 'Task Started';
        if (newStatus === 'REWORK') return 'Rework Requested';
        if (newStatus === 'APPROVED') return 'Task Approved';
        if (newStatus === 'CANCELLED') return 'Task Cancelled';

        return `${oldStatus.replace(/_/g, ' ')} \u2192 ${newStatus.replace(/_/g, ' ')}`;
    }

    if (newStatus && !oldStatus) return 'Task Initialized';

    return entry.action || entry.status || 'Update';
};

const TaskDetailModal = ({ isOpen, onClose, task, currentUser }) => {
    const [activeTab, setActiveTab] = useState('history'); // 'history', 'attachments', 'subtasks'
    const [history, setHistory] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [subtasks, setSubtasks] = useState([]);
    const [fullTask, setFullTask] = useState(task);
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
            // Fetch initial task details (description, etc)
            const taskRes = await api.get(`/tasks/${task.id}`);
            const taskData = taskRes.data?.data || taskRes.data;
            
            if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
                setFullTask(prev => ({
                    ...prev,
                    ...taskData,
                    id: taskData.task_id || taskData.id || prev.id,
                    department: taskData.department_name || taskData.department || prev.department,
                    severity: taskData.priority || taskData.severity || prev.severity,
                    employee_id: taskData.assigned_to_name || taskData.employee_name || taskData.employee?.name || taskData.assignee_name || taskData.assigned_to_emp_id || prev.assigneeName || prev.employee_id,
                    assigned_by: taskData.assigned_by_name || taskData.assigned_by_emp_id || prev.assignerName || prev.assigned_by,
                    title: taskData.title || taskData.task_title || taskData.name || prev.title,
                    description: taskData.description || taskData.task_description || prev.description
                }));
            }

            // Always fetch attachments and history concurrently for immediate availability
            const [historyRes, attachmentsRes] = await Promise.allSettled([
                api.get(`/tasks/${task.id}/history`),
                api.get(`/tasks/${task.id}/attachments`)
            ]);

            if (historyRes.status === 'fulfilled') {
                const data = Array.isArray(historyRes.value.data) ? historyRes.value.data : (historyRes.value.data?.data || []);
                setHistory(data);
            }

            if (attachmentsRes.status === 'fulfilled') {
                const attachData = Array.isArray(attachmentsRes.value.data) ? attachmentsRes.value.data : (attachmentsRes.value.data?.data || []);
                setAttachments(attachData);
            } else if (fullTask.attachments) {
                // Fallback to task object if dedicated endpoint fails
                setAttachments(Array.isArray(fullTask.attachments) ? fullTask.attachments : []);
            }

            // Subtasks still fetched on tab demand if they are heavy
            if (activeTab === 'subtasks') {
                try {
                    const res = await api.get(`/tasks/${task.id}/subtasks`);
                    const subData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                    setSubtasks(subData);
                } catch (e) {
                    // Fallback
                    try {
                        const res = await api.get('/tasks', { params: { parent_task_id: task.id, limit: 100, scope: 'org' } });
                        const subData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                        setSubtasks(subData);
                    } catch (e2) {
                        console.error("Subtask fetch failed:", e2.message);
                    }
                }
            }
        } catch (err) {
            console.error(`Failed to fetch task details`, err);
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
        if (!attachment) return;
        
        // Dynamic detection of identifier
        const attachmentId = (typeof attachment === 'object') 
            ? (attachment.id || attachment.file_id || attachment.attachment_id || attachment.fileId || attachment._id || attachment.aid)
            : attachment; // Fallback if attachment is just the ID (number/string)

        if (!attachmentId) {
            toast.error('Could not resolve file ID. Task metadata may be incomplete.');
            return;
        }

        const toastId = toast.loading('Fetching secure download link...');
        try {
            // Updated Flow:
            // 1. call GET /tasks/{task_id}/attachments/{attachment_id} (returns JSON)
            // 2. read download_url from the JSON response
            // 3. open/download that URL
            
            const res = await api.get(`/tasks/${fullTask.id}/attachments/${attachmentId}`);
            const data = res.data?.data || res.data;
            const downloadUrl = data?.download_url;

            if (!downloadUrl) {
                throw new Error('No download URL found in the server response.');
            }

            // Extract filename for potential usage (though S3 URL usually handles it)
            const fileName = (typeof attachment === 'object') 
                ? (attachment.filename || attachment.name || 'document')
                : 'document';

            // Trigger download via new tab (most reliable for presigned S3 URLs)
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            // link.download = fileName; // Cross-origin download attribute often ignored by browsers for S3
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success('Download started', { id: toastId });
        } catch (err) {
            console.error("Download failed", err);
            const errMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Download failed';
            toast.error(errMsg, { id: toastId });
        }
    };
    
    const handleDeleteAttachment = async (attachment) => {
        if (!attachment) return;
        
        const attachmentId = (typeof attachment === 'object') 
            ? (attachment.id || attachment.file_id || attachment.attachment_id || attachment.fileId || attachment._id || attachment.aid)
            : attachment;
            
        if (!attachmentId) {
            toast.error('Could not resolve attachment for deletion');
            return;
        }

        if (!window.confirm('Are you sure you want to permanently delete this attachment?')) return;

        const toastId = toast.loading('Deleting attachment...');
        try {
            await api.delete(`/tasks/${fullTask.id}/attachments/${attachmentId}`);
            toast.success('Attachment deleted successfully', { id: toastId });
            
            // Refresh the list immediately
            const res = await api.get(`/tasks/${fullTask.id}/attachments`);
            const attachData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setAttachments(attachData);
        } catch (err) {
            console.error("Delete failed", err);
            toast.error(err.response?.data?.message || 'Delete failed. You may not have permission to delete this file.', { id: toastId });
        }
    };

    const getFileIcon = (fileName) => {
        const ext = String(fileName || '').toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>;
        if (['pdf'].includes(ext)) return <div className="p-2 bg-red-50 rounded-lg text-red-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg></div>;
        if (['xlsx', 'xls', 'csv'].includes(ext)) return <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg></div>;
        if (['docx', 'doc', 'txt'].includes(ext)) return <div className="p-2 bg-blue-50 rounded-lg text-blue-500"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg></div>;
        return <div className="p-2 bg-violet-50 rounded-lg text-violet-500"><FileText size={18} /></div>;
    };

    if (!isOpen || !task) return null;
    // Guard against fullTask not yet hydrated (race condition between prop and fetch)
    if (!fullTask) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-800">{fullTask.title}</h2>
                            <Badge variant={fullTask.status}>{(fullTask.status || '').replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">Task ID: {fullTask.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
                    {/* Description Area */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText size={14} strokeWidth={3} /> Description
                        </h3>
                        <div className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100/80 shadow-inner group transition-all hover:bg-white hover:border-violet-100 hover:shadow-md">
                            <p className="text-[14.5px] text-slate-600 leading-relaxed font-medium">
                                {fullTask.description || "No tactical description provided for this objective."}
                            </p>
                        </div>
                        
                        {/* Quick Attachments Preview */}
                        {attachments.length > 0 && activeTab === 'description' && (
                            <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                                    <Paperclip size={12} strokeWidth={3} /> Relevant Attachments ({attachments.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {attachments.slice(0, 3).map((file, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => setActiveTab('attachments')}
                                            className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-violet-200 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <div className="w-5 h-5 flex items-center justify-center text-violet-500">
                                                <Paperclip size={12} strokeWidth={3} />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-600 max-w-[100px] truncate">
                                                {file.filename || file.name || 'document'}
                                            </span>
                                        </div>
                                    ))}
                                    {attachments.length > 3 && (
                                        <button 
                                            onClick={() => setActiveTab('attachments')}
                                            className="text-[11px] font-black text-violet-600 uppercase tracking-widest px-3 py-2"
                                        >
                                            +{attachments.length - 3} More
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department</p>
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Building2 size={14} className="text-indigo-400" /> {fullTask.department}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority</p>
                            <Badge variant={fullTask.severity}>{fullTask.severity}</Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assignee</p>
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={14} className="text-violet-400" /> {fullTask.employee_id}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Date</p>
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <CalendarDays size={14} className="text-rose-400" /> {fullTask.due_date}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned By</p>
                            <p className="text-sm font-semibold text-slate-700">{fullTask.assigned_by || "System"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Date</p>
                            <p className="text-sm font-semibold text-slate-700">
                                {fullTask.assigned_at 
                                    ? new Date(fullTask.assigned_at).toISOString().split('T')[0] 
                                    : (fullTask.assigned_date || "-")}
                            </p>
                        </div>
                        {fullTask.parent_task_id && (
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Parent Task</p>
                                <p className="text-sm font-semibold text-slate-700 truncate max-w-[250px]">
                                    <span className="text-violet-500 font-bold">#{fullTask.parent_task_id}</span> {fullTask.parent_task_title || fullTask.parent_task_name || "Untitled Parent"}
                                </p>
                            </div>
                        )}
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
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
                                <div className="flex justify-between items-center bg-violet-50/30 p-5 rounded-2xl border border-dashed border-violet-200 group hover:bg-violet-50 hover:border-violet-300 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform">
                                            <Upload size={22} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-slate-800 tracking-tight leading-none mb-1.5">Evidence Submission</p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-none">PDF, JPEG, XLSX, DOCX preferred</p>
                                        </div>
                                    </div>
                                    <label className="cursor-pointer bg-[#7B51ED] px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 active:scale-95 flex items-center gap-2">
                                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} strokeWidth={3} /> Upload</>}
                                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>

                                <div className="space-y-3">
                                    {attachments.length > 0 ? (
                                        attachments.map((file, idx) => {
                                            const isObj = typeof file === 'object' && file !== null;
                                            const id = isObj ? (file.id || file.file_id || file.attachment_id || file._id || idx) : idx;
                                            const name = isObj ? (file.filename || file.name || file.file_name || file.original_name || file.title || 'document') : (typeof file === 'string' ? file : 'document');
                                            const time = isObj ? (file.uploaded_at || file.created_at || file.timestamp || new Date().toISOString()) : new Date().toISOString();
                                            const by = isObj ? (file.uploaded_by || file.uploader || 'System') : 'System';

                                            return (
                                                <div key={id} className="group p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:shadow-xl hover:shadow-slate-100/50 hover:border-violet-200 transition-all">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        {getFileIcon(name)}
                                                        <div className="min-w-0">
                                                            <p className="text-[14px] font-black text-slate-700 truncate tracking-tight">{name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                                {new Date(time).toLocaleDateString()} · {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · By {by}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleDownload(file)}
                                                            className="p-3 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-violet-100 active:scale-90"
                                                            title="Download File"
                                                        >
                                                            <Download size={20} />
                                                        </button>
                                                        
                                                        {/* Delete button: Visible if uploader or manager/cfo */}
                                                        {((currentUser?.emp_id === (file.uploaded_by || file.uploader)) || 
                                                          (['MANAGER', 'CFO', 'ADMIN'].includes(currentUser?.role?.toUpperCase()))) && (
                                                            <button
                                                                onClick={() => handleDeleteAttachment(file)}
                                                                className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-transparent hover:border-rose-100 active:scale-90"
                                                                title="Delete Attachment"
                                                            >
                                                                <Trash2 size={20} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem]">
                                            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6 transform rotate-3">
                                                <Paperclip size={32} className="text-slate-200" />
                                            </div>
                                            <p className="text-[14px] font-bold text-slate-800 tracking-tight">No archived intelligence found</p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Upload relevant documentation for this task</p>
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
                                        <div key={i} className="flex gap-4 items-start relative pb-6 last:pb-0">
                                            {/* Timeline Line */}
                                            {i !== history.length - 1 && (
                                                <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-slate-100" />
                                            )}

                                            {/* Timeline Dot */}
                                            <div className="w-4 h-4 rounded-full border-2 border-white bg-violet-500 shadow-sm mt-1 z-10 flex-shrink-0" />

                                            <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:border-violet-100 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-800">
                                                            {getHistoryLabel(entry)}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">
                                                            {entry.changed_at || entry.timestamp
                                                                ? new Date(entry.changed_at || entry.timestamp).toLocaleString(undefined, {
                                                                    dateStyle: 'medium',
                                                                    timeStyle: 'short'
                                                                })
                                                                : ''}
                                                        </p>
                                                    </div>
                                                    {(entry.changed_by_emp_id || entry.changed_by) && (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                                            <User size={10} className="text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-600">
                                                                {entry.changed_by_emp_id || entry.changed_by}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Status Transition Badges */}
                                                {(entry.old_status || entry.new_status) && entry.old_status !== entry.new_status && (
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {entry.old_status ? (
                                                            <Badge variant={entry.old_status} className="!px-2 !py-0.5 !text-[9px] opacity-70">
                                                                {entry.old_status.replace(/_/g, ' ')}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[9px] text-slate-400 italic">None</span>
                                                        )}
                                                        <ChevronRight size={12} className="text-slate-300" />
                                                        <Badge variant={entry.new_status} className="!px-2 !py-0.5 !text-[9px]">
                                                            {entry.new_status.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                )}

                                                {entry.comment && (
                                                    <div className="relative pl-3 border-l-2 border-violet-100">
                                                        <p className="text-xs text-slate-600 leading-relaxed italic">
                                                            "{entry.comment}"
                                                        </p>
                                                    </div>
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
                                    subtasks.map((sub, idx) => (
                                        <div key={sub.id || idx} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{sub.title || sub.task_title || 'Untitled Subtask'}</p>
                                                <p className="text-[10px] text-slate-400">Due: {sub.due_date || '-'} · Assigned to: {sub.assigned_to_name || sub.employee_name || sub.employee_id || 'Unassigned'}</p>
                                            </div>
                                            <Badge variant={sub.status || 'NEW'}>{(sub.status || 'NEW').replace(/_/g, ' ')}</Badge>
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
