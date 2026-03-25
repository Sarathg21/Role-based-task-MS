import { useState, useEffect } from 'react';
import {
    X, History, Paperclip, ChevronRight, ChevronDown,
    Plus, Loader2, FileText, Download, User, Building2, CalendarDays
} from 'lucide-react';
import api from '../../services/api';
import Badge from '../UI/Badge';

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
            // First, fetch the full task data to get description and other hidden fields
            const taskRes = await api.get(`/tasks/${task.id}`);
            const taskData = taskRes.data?.data || taskRes.data;
            // Only update if we got a valid plain object (not an array, null, or string)
            if (taskData && typeof taskData === 'object' && !Array.isArray(taskData)) {
                // Merge new detail data with the existing normalized prop data
                // This ensures we keep details like description, but don't lose UI fields due to mismatched backend keys
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

            if (activeTab === 'history') {
                const res = await api.get(`/tasks/${task.id}/history`);
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setHistory(data);
            } else if (activeTab === 'attachments') {
                let attachData = [];
                try {
                    const res = await api.get(`/tasks/${task.id}/attachments`);
                    attachData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                } catch (e) {
                    console.warn("Dedicated attachments endpoint failed:", e.message);
                }
                
                // Fallback: if dedicated endpoint empty/failed, check if task object has attachments
                if (attachData.length === 0 && fullTask.attachments) {
                    attachData = Array.isArray(fullTask.attachments) ? fullTask.attachments : [];
                }
                
                setAttachments(attachData);
            } else if (activeTab === 'subtasks') {
                let subData = [];
                try {
                    const res = await api.get(`/tasks/${task.id}/subtasks`);
                    subData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                } catch (e) {
                    console.warn("Dedicated subtasks endpoint failed, trying fallback...", e.message);
                    // Fallback: try the main tasks endpoint with parent_task_id filter
                    try {
                        const res = await api.get('/tasks', { params: { parent_task_id: task.id, limit: 100, scope: 'org' } });
                        subData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                    } catch (e2) {
                        console.error("Fallback subtask fetch also failed:", e2.message);
                    }
                }
                setSubtasks(subData);
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
            const attachmentId = attachment.id || attachment.file_id || attachment.attachment_id || attachment.notification_id || attachment.notificationId;
            if (!attachmentId) {
                toast.error('Cannot retrieve file ID for download');
                return;
            }

            const fileName = attachment.filename || attachment.name || attachment.file_name || attachment.original_name || 'download';
            
            // Use authenticated api service instead of raw fetch to ensure JWT headers are included
            const res = await api.get(`/tasks/${task.id}/attachments/${attachmentId}`, {
                responseType: 'blob'
            });

            const blob = new Blob([res.data], { type: res.headers['content-type'] });
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed", err);
            toast.error('Download failed. Ensure you have permissions for this file.');
        }
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
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} /> Description
                        </h3>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                            {fullTask.description || "No description provided."}
                        </p>
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
                                        attachments.map((file, idx) => {
                                            const id = file.id || file.file_id || file.attachment_id || idx;
                                            const name = file.filename || file.name || file.file_name || file.original_name || 'Attached File';
                                            const time = file.uploaded_at || file.created_at || file.timestamp || new Date().toISOString();
                                            const by = file.uploaded_by || file.uploader || 'Task Creator';

                                            return (
                                                <div key={id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="p-2 bg-violet-50 rounded-lg text-violet-500">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {new Date(time).toLocaleString()} · by {by}
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
                                            );
                                        })
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
