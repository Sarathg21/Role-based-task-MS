import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    Search, RefreshCw, Download, Plus, ChevronDown, ChevronRight,
    Filter, Paperclip, MoreHorizontal, CheckCircle2, RotateCcw,
    XCircle, User, Users, Calendar, AlertCircle, Layout, ArrowRight, Minus, Clock,
    ClipboardCheck, Play, Upload, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReassignTaskModal from '../components/Modals/ReassignTaskModal';
import ReworkCommentModal from '../components/Modals/ReworkCommentModal';
import CustomSelect from '../components/UI/CustomSelect';
import StatsCard from '../components/UI/StatsCard';

// --- Components defined outside for performance and clarity ---

const SubtaskRow = ({ task, renderStatusBadge, renderSeverityTag, isLast }) => {
    if (!task) return null;
    
    // Defensive access
    const taskId = task?.task_id || task?.id || '???';
    const title = task?.task_title || task?.title || 'Untitled Subtask';
    const assignedTo = task?.assigned_to_name || 'Unassigned';
    const dueDate = task?.due_date || 'N/A';
    const status = task?.status || 'N/A';
    const severity = task?.severity || 'LOW';

    return (
        <tr className="bg-slate-50/30 group hover:bg-violet-50/10 transition-colors duration-200">
            <td className="p-3 pl-12 relative">
                <div className="absolute left-14 top-0 bottom-0 w-[2px] bg-slate-100"></div>
                <div className={`absolute left-14 ${isLast ? 'h-5' : 'h-full'} w-[10px] border-l-2 border-b-2 border-slate-100 rounded-bl-lg`}></div>
                <div className="flex items-center gap-2 ml-6 relative z-10">
                    <span className="text-[14px] font-bold text-slate-400">↳</span>
                    <span className="text-[9px] font-bold text-slate-400 capitalize tracking-tighter">#Sub-{taskId}</span>
                </div>
            </td>
            <td className="p-3">
                <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-slate-600 tracking-tight">{title}</span>
                    { (task.parent_task_title || task.parent_task_name || task.parent_directive_title) && (
                        <span className="text-[9px] font-medium text-slate-400">Parent: {task.parent_task_title || task.parent_task_name || task.parent_directive_title}</span>
                    )}
                </div>
            </td>
            <td className="p-3">
                <span className="text-slate-200 text-[10px] font-bold italic">-</span>
            </td>
            <td className="p-3">
                <span className="text-slate-200 text-[10px] font-bold italic">-</span>
            </td>
            <td className="p-3">
                <span className="text-slate-200 text-[10px] font-bold italic">-</span>
            </td>
            <td className="p-3">
                <span className="text-[11px] font-bold text-slate-500">{assignedTo}</span>
            </td>
            <td className="p-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dueDate}</span>
            </td>
            <td className="p-3 text-center">
                {renderStatusBadge?.(status)}
            </td>
            <td className="p-3">
                {renderSeverityTag?.(severity)}
            </td>
            <td className="p-3 text-center">
                 <span className="text-[10px] font-bold text-slate-300 italic">Subtask</span>
            </td>
            <td className="p-3 text-center">
                <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto" />
            </td>
            <td className="p-3 text-right pr-8">
                <button className="text-slate-300 hover:text-violet-500 transition-colors">
                    <ArrowRight size={14} />
                </button>
            </td>
        </tr>
    );
};

const TaskRow = ({ 
    task, 
    expanded, 
    subtasks = [], 
    onToggle, 
    renderStatusBadge, 
    renderSeverityTag, 
    onAction, 
    onReassign, 
    onRework 
}) => {
    if (!task) return null;

    // Defensive variables
    const taskId = task?.task_id || task?.id || '???';
    const title = task?.task_title || task?.title || 'Untitled Task';
    const type = task?.task_type || 'TASK';
    const isParent = (type === 'PARENT' || (task?.subtask_count || 0) > 0);
    const progress = Number(task?.progress_pct || 0);
    const status = task?.status || 'NEW';
    const severity = task?.severity || 'LOW';
    const dept = task?.department_name || task?.department || 'General';
    const assignedTo = task?.assigned_to_name || 'Unassigned';
    const assignedBy = task?.assigned_by_name || 'System';
    const dueDate = task?.due_date || 'N/A';
    const daysLeft = task?.days_left || '0';
    const appSubtasks = task?.approved_subtask_count || 0;
    const totalSubtasks = task?.subtask_count || 0;
    const isOverdue = dueDate !== 'N/A' && new Date(dueDate) < new Date() && !['APPROVED', 'CANCELLED'].includes(status);

    return (
        <>
            <tr className="group hover:bg-violet-50/20 transition-all duration-300">
                {/* 1. Task ID */}
                <td className="p-5 pl-8">
                    <div className="flex items-center gap-3">
                        {isParent ? (
                            <button 
                                onClick={onToggle}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${expanded ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 rotate-90' : 'bg-slate-100 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600'}`}
                            >
                                {expanded ? <ChevronRight size={12} strokeWidth={3} /> : <span className="text-sm font-black">▶</span>}
                            </button>
                        ) : (
                            <div className="w-6 h-6" />
                        )}
                        <span className="text-[10px] font-black text-violet-600 tracking-tighter">#{taskId}</span>
                    </div>
                </td>

                {/* 2. Task */}
                <td className="p-5">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-[13px] tracking-tight truncate max-w-[200px]">{title}</h4>
                        {task?.has_attachments && <Paperclip size={12} className="text-slate-300" />}
                    </div>
                </td>

                {/* 3. Parent Task */}
                <td className="p-5">
                    <span className="text-[11px] font-medium text-slate-500 truncate max-w-[150px] block">
                        {task.parent_task_title || task.parent_task_name || task.parent_directive_title || '-'}
                    </span>
                </td>

                {/* 4. Dept */}
                <td className="p-5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase px-2 py-0.5 bg-slate-50 rounded border border-slate-100">{dept}</span>
                </td>

                {/* 5. Assigned By */}
                <td className="p-5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-[10px] font-black text-violet-600 shrink-0">
                            {assignedBy?.charAt(0) || 'S'}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 truncate max-w-[100px]">{assignedBy}</span>
                    </div>
                </td>

                {/* 6. Assigned To */}
                <td className="p-5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden shrink-0">
                            {assignedTo?.charAt(0) || <User size={12} />}
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 truncate max-w-[100px]">{assignedTo}</span>
                    </div>
                </td>

                {/* 7. Due Date */}
                <td className="p-5">
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isOverdue ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <Calendar size={10} />
                        <span className="text-[10px] font-bold tracking-tight">{dueDate}</span>
                    </div>
                </td>

                {/* 8. Status */}
                <td className="p-5 text-center">
                    {renderStatusBadge?.(status)}
                </td>

                {/* 9. Severity */}
                <td className="p-5">
                    {renderSeverityTag?.(severity)}
                </td>

                {/* 10. Subtasks */}
                <td className="p-5 text-center">
                    <span className="text-[11px] font-black text-slate-400">{totalSubtasks > 0 ? `${appSubtasks}/${totalSubtasks}` : '-'}</span>
                </td>

                {/* 11. Progress */}
                <td className="p-5 text-center">
                    {type === 'PARENT' ? (
                        <div className="flex flex-col items-center gap-1 min-w-[100px]">
                            <div className="flex justify-between w-full text-[9px] font-bold mb-1">
                                <span className="text-slate-500">{appSubtasks} / {totalSubtasks}</span>
                                <span className="text-emerald-600">{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div 
                                        key={i}
                                        className={`h-full flex-1 border-r border-white/20 ${i < progress / 10 ? 'bg-emerald-400' : 'bg-slate-200'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <span className="text-slate-200">-</span>
                    )}
                </td>

                {/* 12. Actions */}
                <td className="p-5 text-right pr-8">
                    <div className="flex justify-end gap-2">
                        {status === 'SUBMITTED' ? (
                            <>
                                <button 
                                    onClick={() => onAction?.(taskId, 'APPROVE')}
                                    className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                    title="Approve"
                                >
                                    <CheckCircle2 size={14} strokeWidth={3} />
                                </button>
                                <button 
                                    onClick={() => onRework?.(task)}
                                    className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                    title="Rework"
                                >
                                    <RotateCcw size={14} strokeWidth={3} />
                                </button>
                            </>
                        ) : (status === 'NEW' || status === 'IN_PROGRESS' || status === 'REWORK') ? (
                             <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => onReassign?.(task)}
                                    className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm"
                                    title="Reassign"
                                >
                                    <Users size={14} />
                                </button>
                                <button 
                                    onClick={() => onAction?.(taskId, 'CANCEL')}
                                    className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                                    title="Cancel"
                                >
                                    <XCircle size={14} />
                                </button>
                             </div>
                        ) : (
                            <button className="p-2 text-slate-300 hover:text-violet-500 transition-colors">
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            
            {/* Subtask Rows */}
            {expanded && Array.isArray(subtasks) && subtasks.map((sub, idx) => (
                <SubtaskRow 
                    key={sub?.task_id || sub?.id || idx} 
                    task={sub} 
                    renderStatusBadge={renderStatusBadge}
                    renderSeverityTag={renderSeverityTag}
                    isLast={idx === subtasks.length - 1}
                />
            ))}
        </>
    );
};

// --- Main Component ---

const TeamTasksPage = () => {
    const navigate = useNavigate();
    
    // --- State ---
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTasks, setExpandedTasks] = useState(new Set());
    const [subtasksMap, setSubtasksMap] = useState({});
    const [departments, setDepartments] = useState([]);
    
    const [filters, setFilters] = useState({
        search: '',
        department_id: '',
        status: '',
        severity: '',
        from_date: '',
        to_date: ''
    });
    
    const [pagination, setPagination] = useState({
        page: 1, limit: 20, total: 0
    });

    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [metrics, setMetrics] = useState({
        activeTasks: 0,
        inProgress: 0,
        pendingSubmission: 0,
        overdue: 0
    });

    // --- Data Fetching ---
    const fetchTasks = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: pagination.limit };
            Object.keys(filters).forEach(key => {
                const val = filters[key];
                if (val && String(val).trim() !== '') {
                    params[key] = val;
                }
            });
            
            const res = await api.get('/tasks/team', { params });
            const rawData = res.data?.data || res.data || {};
            
            let items = [];
            if (Array.isArray(rawData)) items = rawData;
            else if (rawData.items && Array.isArray(rawData.items)) items = rawData.items;
            else if (rawData.data && Array.isArray(rawData.data)) items = rawData.data;
            
            setTasks(items);
            setPagination({
                page: rawData.page || page,
                limit: rawData.limit || pagination.limit,
                total: rawData.total || (items.length > 0 ? items.length : 0)
            });
        } catch (err) {
            console.error("Fetch team tasks error:", err);
            toast.error("Failed to load team tasks");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubtasks = async (parentId) => {
        if (!parentId) return;
        try {
            const res = await api.get(`/tasks/${parentId}/subtasks`);
            const subtasks = res.data?.data || res.data || [];
            setSubtasksMap(prev => ({ ...prev, [parentId]: Array.isArray(subtasks) ? subtasks : [] }));
        } catch (err) {
            console.error("Fetch subtasks error:", err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data?.data || res.data || []);
        } catch (err) {
            console.error("Fetch departments error:", err);
        }
    };

    const fetchMetrics = async () => {
        try {
            const role = user?.role?.toUpperCase();
            const endpoint = (role === 'CFO' || role === 'ADMIN') ? '/dashboard/cfo' : '/dashboard/manager';
            const res = await api.get(endpoint);
            const d = res.data?.data || res.data || {};
            setMetrics({
                activeTasks: d.total_tasks || d.total_active || 0,
                inProgress: d.in_progress_tasks || d.in_progress || 0,
                pendingSubmission: d.pending_submission || d.pending_tasks || ((d.new_tasks || 0) + (d.rework_tasks || 0)),
                overdue: d.overdue_tasks || d.overdue || 0
            });
        } catch (err) {
            console.error("Fetch metrics error:", err);
        }
    };

    useEffect(() => {
        fetchDepartments();
        fetchMetrics();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => fetchTasks(1), 500);
        return () => clearTimeout(timer);
    }, [filters]);

    // --- Handlers ---
    const toggleExpand = useCallback((parentId) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else {
                next.add(parentId);
                if (!subtasksMap[parentId]) fetchSubtasks(parentId);
            }
            return next;
        });
    }, [subtasksMap]);

    const handleAction = async (taskId, action, extra = {}) => {
        if (!taskId) return;
        try {
            await api.post(`/tasks/${taskId}/transition`, { action, ...extra });
            toast.success(`Task ${action.toLowerCase()}ed successfully`);
            fetchTasks(pagination.page);
        } catch (err) {
            console.error(`Action ${action} error:`, err);
            toast.error(`Failed to ${action.toLowerCase()} task`);
        }
    };

    const handleExport = () => {
        const headers = ["Task ID", "Title", "Dept", "Assigned To", "Due Date", "Status", "Severity"];
        const rows = tasks.map(t => [t.task_id, t.task_title || t.title, t.department_name, t.assigned_to_name, t.due_date, t.status, t.severity]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `team_tasks_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Render Helpers ---
    const renderStatusBadge = useCallback((status) => {
        const s = (status || '').toUpperCase();
        const config = {
            NEW: { color: 'bg-slate-100 text-slate-500', label: 'New' },
            IN_PROGRESS: { color: 'bg-blue-100 text-blue-600', label: 'In Progress' },
            SUBMITTED: { color: 'bg-purple-100 text-purple-600', label: 'Submitted' },
            REWORK: { color: 'bg-orange-100 text-orange-600', label: 'Rework' },
            APPROVED: { color: 'bg-emerald-100 text-emerald-600', label: 'Approved' },
            CANCELLED: { color: 'bg-slate-400 text-white', label: 'Cancelled' },
        };
        const style = config[s] || { color: 'bg-slate-50 text-slate-400', label: s || 'N/A' };
        return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize tracking-tight ${style.color}`}>{style.label}</span>;
    }, []);

    const renderSeverityTag = useCallback((sev) => {
        const s = (sev || 'LOW').toUpperCase();
        const colors = {
            HIGH: 'text-rose-600 bg-rose-50 border-rose-200',
            MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
            LOW: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        };
        return <span className={`px-2 py-0.5 rounded border text-[9px] font-bold capitalize tracking-tight ${colors[s] || 'text-slate-400'}`}>{s}</span>;
    }, []);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-violet-600 tracking-tighter mb-1">
                        <span>Tascade</span>
                        <ChevronRight size={10} className="text-slate-300" strokeWidth={3} />
                        <span className="text-slate-400">CFO</span>
                        <ChevronRight size={10} className="text-slate-300" strokeWidth={3} />
                        <span className="text-slate-400 font-bold">Team Tasks</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            Team Performance Tracker
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 rounded-full border border-violet-100">
                                <Users size={14} className="text-violet-600" />
                                <span className="text-[11px] font-bold text-violet-600 truncate">{pagination.total} Tasks</span>
                            </div>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 leading-none mb-2">
                            Monitor work execution & business performance
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/tasks/assign')} className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold text-[12px] hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"><Plus size={16} strokeWidth={3} />Assign Task</button>
                    <button onClick={() => { fetchTasks(pagination.page); fetchMetrics(); }} className="p-3 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-violet-600 transition-colors shadow-sm"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                    <button onClick={handleExport} className="p-3 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-emerald-600 transition-colors shadow-sm"><Download size={20} /></button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard 
                    title="Active Tasks" 
                    value={metrics.activeTasks} 
                    icon={ClipboardCheck} 
                    color="violet"
                />
                <StatsCard 
                    title="In Progress" 
                    value={metrics.inProgress} 
                    icon={Play} 
                    color="amber"
                />
                <StatsCard 
                    title="Pending Submission" 
                    value={metrics.pendingSubmission} 
                    icon={Upload} 
                    color="warning"
                />
                <StatsCard 
                    title="Overdue" 
                    value={metrics.overdue} 
                    icon={AlertTriangle} 
                    color="rose"
                />
            </div>
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 text-left">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                    <div className="lg:col-span-3 relative group">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1.5 block">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-500 transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search for tasks or employees..." 
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-violet-500/10 transition-all placeholder:text-slate-400" 
                                value={filters.search} 
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} 
                            />
                        </div>
                    </div>
                    
                    <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                        <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 ml-1">Department</label>
                            <CustomSelect 
                                className="w-full"
                                value={filters.department_id}
                                onChange={(val) => setFilters(prev => ({ ...prev, department_id: val }))}
                                options={[
                                    { value: '', label: 'All Dept' },
                                    ...departments.map(d => ({ value: d.department_id || d.id, label: d.name || d.department_id }))
                                ]}
                            />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 ml-1">Status</label>
                            <CustomSelect 
                                className="w-full"
                                value={filters.status}
                                onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                                options={[
                                    { value: '', label: 'All Status' },
                                    { value: 'NEW', label: 'New' },
                                    { value: 'IN_PROGRESS', label: 'In Progress' },
                                    { value: 'SUBMITTED', label: 'Submitted' },
                                    { value: 'REWORK', label: 'Rework' },
                                    { value: 'APPROVED', label: 'Approved' },
                                    { value: 'CANCELLED', label: 'Cancelled' },
                                ]}
                            />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 ml-1">Severity</label>
                            <CustomSelect 
                                className="w-full"
                                value={filters.severity}
                                onChange={(val) => setFilters(prev => ({ ...prev, severity: val }))}
                                options={[
                                    { value: '', label: 'All Severity' },
                                    { value: 'HIGH', label: 'High' },
                                    { value: 'MEDIUM', label: 'Medium' },
                                    { value: 'LOW', label: 'Low' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1">From Date</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-violet-500/10"
                                value={filters.from_date}
                                onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 ml-1">To Date</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-violet-500/10"
                                value={filters.to_date}
                                onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-400 capitalize tracking-tight border-b border-slate-100 bg-slate-50/50">
                                    <th className="p-5 pl-8">Task ID</th>
                                    <th className="p-5">Task</th>
                                    <th className="p-5">Parent Task</th>
                                    <th className="p-5">Department</th>
                                    <th className="p-5">Assigned By</th>
                                    <th className="p-5">Assigned To</th>
                                    <th className="p-5">Due Date</th>
                                    <th className="p-5 text-center">Status</th>
                                    <th className="p-5">Severity</th>
                                    <th className="p-5 text-center">Subtasks</th>
                                    <th className="p-5 text-center">Progress</th>
                                    <th className="p-5 text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr className="animate-pulse"><td colSpan={12} className="p-20 text-center text-slate-300 font-bold">Syncing Executive Intelligence...</td></tr>
                            ) : tasks.length === 0 ? (
                                <tr><td colSpan={12} className="p-20 text-center opacity-50"><Layout size={48} className="text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-bold text-[11px]">No matching team tasks found</p></td></tr>
                            ) : tasks.map((task, idx) => (
                                <TaskRow 
                                    key={task?.task_id || task?.id || idx} 
                                    task={task} 
                                    expanded={expandedTasks.has(task?.task_id)}
                                    subtasks={subtasksMap[task?.task_id] || []}
                                    onToggle={() => toggleExpand(task?.task_id)}
                                    renderStatusBadge={renderStatusBadge}
                                    renderSeverityTag={renderSeverityTag}
                                    onAction={handleAction}
                                    onReassign={(t) => { setSelectedTask(t); setIsReassignModalOpen(true); }}
                                    onRework={(t) => { setSelectedTask(t); setIsReworkModalOpen(true); }}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 bg-slate-50/50 px-8 border-t border-slate-100">
                    <div className="text-[12px] font-bold text-slate-500 text-left">
                        Showing <span className="text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</span>–<span className="text-slate-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-slate-800">{pagination.total}</span> tasks
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => fetchTasks(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black text-slate-500 hover:text-violet-600 disabled:opacity-50 transition-all hover:shadow-sm"
                        >
                            Prev
                        </button>
                        {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.limit)) }).map((_, i) => {
                            const p = i + 1;
                            return (
                                <button
                                    key={p}
                                    onClick={() => fetchTasks(p)}
                                    className={`w-10 h-10 rounded-xl text-[12px] font-black transition-all ${pagination.page === p ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 scale-110' : 'bg-white border border-slate-200 text-slate-500 hover:border-violet-200 hover:text-violet-600'}`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button 
                            onClick={() => fetchTasks(pagination.page + 1)}
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black text-slate-500 hover:text-violet-600 disabled:opacity-50 transition-all hover:shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ReassignTaskModal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} task={selectedTask} onSuccess={() => fetchTasks(pagination.page)} />
            <ReworkCommentModal isOpen={isReworkModalOpen} onClose={() => setIsReworkModalOpen(false)} onConfirm={(comment) => handleAction(selectedTask?.task_id, 'REWORK', { comment })} taskTitle={selectedTask?.task_title || selectedTask?.title} />
        </div>
    );
};

export default TeamTasksPage;
