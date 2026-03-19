import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    Search, RefreshCw, Download, Plus, ChevronRight,
    Paperclip, CheckCircle2, RotateCcw,
    XCircle, User, Users, Calendar, Layout, ArrowRight,
    ClipboardCheck, Play, Upload, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ReassignTaskModal from '../components/Modals/ReassignTaskModal';
import ReworkCommentModal from '../components/Modals/ReworkCommentModal';
import TaskReviewModal from '../components/Modals/TaskReviewModal';
import CustomSelect from '../components/UI/CustomSelect';
import StatsCard from '../components/UI/StatsCard';

// --- Components defined outside for performance and clarity ---

const SubtaskRow = ({ task, renderStatusBadge, renderSeverityTag, isLast, taskTitles = {} }) => {
    if (!task) return null;

    const taskId = task?.task_id || task?.id || '???';
    const title = task?.task_title || task?.title || 'Untitled Subtask';
    const assignedTo = task?.assigned_to_name || 'Unassigned';
    const rawDueDate = task?.due_date || '';
    const dueDate = rawDueDate ? format(new Date(rawDueDate), 'MMM d, yyyy') : 'N/A';
    const status = task?.status || 'N/A';
    const severity = task?.severity || 'LOW';

    const parentTitle = task.parent_task_title || task.parent_task_name || task.parent_directive_title || (task.parent_task_id && taskTitles[task.parent_task_id]);

    return (
        <tr className="bg-slate-50/30 group hover:bg-violet-50/10 transition-colors duration-200">
            <td className="p-3 pl-12 relative text-left">
                <div className="absolute left-14 top-0 bottom-0 w-[2px] bg-slate-100"></div>
                <div className={`absolute left-14 ${isLast ? 'h-5' : 'h-full'} w-[10px] border-l-2 border-b-2 border-slate-100 rounded-bl-lg`}></div>
                <div className="flex items-center gap-2 ml-6 relative z-10">
                    <span className="text-[14px] font-medium text-slate-400">↳</span>
                    <span className="text-[9px] font-medium text-slate-400 capitalize tracking-tighter">#Sub-{taskId}</span>
                </div>
            </td>
            <td className="p-3 text-left">
                <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-slate-600 tracking-tight">{title}</span>
                    {parentTitle && (
                        <span className="text-[9px] text-slate-400 truncate max-w-[200px]">Parent: {parentTitle}</span>
                    )}
                </div>
            </td>
            <td className="p-3 text-left">
                <span className="text-slate-400 text-[10px] font-medium capitalize px-2 py-0.5 bg-slate-50 rounded border border-slate-100">{String(task?.department_name || 'N/A').toLowerCase()}</span>
            </td>
            <td className="p-3 text-left">
                <span className="text-slate-400 text-[10px] font-medium italic">-</span>
            </td>
            <td className="p-3 text-left">
                <span className="text-[11px] font-semibold text-slate-500">{assignedTo}</span>
            </td>
            <td className="p-3 text-left">
                <span className="text-[10px] font-semibold text-slate-400 capitalize tracking-widest">{dueDate}</span>
            </td>
            <td className="p-3 text-center">
                {renderStatusBadge?.(status)}
            </td>
            <td className="p-3 text-left">
                {renderSeverityTag?.(severity)}
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
    onRework,
    taskTitles = {}
}) => {
    if (!task) return null;

    const taskId = task?.task_id || task?.id || '???';
    const title = task?.task_title || task?.title || 'Untitled Task';
    const type = task?.task_type || 'TASK';
    const isParent = (
        type === 'PARENT' ||
        (task?.subtask_count || 0) > 0 ||
        (task?.subtasks?.length || 0) > 0 ||
        task?.has_subtasks === true ||
        task?.is_parent === true
    );
    const status = task?.status || 'NEW';
    const severity = task?.severity || 'LOW';
    const dept = task?.department_name || task?.department || 'General';
    const assignedTo = task?.assigned_to_name || 'Unassigned';
    const assignedBy = task?.assigned_by_name || 'System';
    const rawDueDateMain = task?.due_date || '';
    const dueDate = rawDueDateMain ? format(new Date(rawDueDateMain), 'MMM d, yyyy') : 'N/A';
    const isOverdue = dueDate !== 'N/A' && new Date(rawDueDateMain) < new Date() && !['APPROVED', 'CANCELLED'].includes(status);
    const parentTitle = task.parent_task_title || task.parent_task_name || task.parent_directive_title || (task.parent_task_id && taskTitles[task.parent_task_id]);

    return (
        <>
            <tr className="group hover:bg-violet-50/20 transition-all duration-300">
                <td className="p-5 pl-8 text-left">
                    <div className="flex items-center gap-3">
                        {isParent ? (
                            <button
                                onClick={onToggle}
                                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${expanded ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'bg-slate-100 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600 hover:shadow-sm'}`}
                            >
                                <ChevronRight
                                    size={10}
                                    strokeWidth={4}
                                    className={`transition-transform duration-300 ${expanded ? 'rotate-90' : 'rotate-0'}`}
                                />
                            </button>
                        ) : (
                            <div className="w-5 h-5" />
                        )}
                        <span className="text-[10px] font-semibold text-violet-600 tracking-tighter">#{taskId}</span>
                    </div>
                </td>
                <td className="p-5 text-left">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-left">
                            <h4 className="font-semibold text-slate-800 text-[13px] tracking-tight truncate max-w-[220px]">
                                {title}
                            </h4>
                            {task?.has_attachments && <Paperclip size={12} className="text-slate-300" />}
                        </div>
                        {parentTitle && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[260px] text-left">
                                {parentTitle}
                            </p>
                        )}
                    </div>
                </td>
                <td className="p-5 text-left">
                    <span className="text-[10px] font-medium text-slate-400 capitalize px-2 py-0.5 bg-slate-50 rounded border border-slate-100">{dept}</span>
                </td>
                <td className="p-5 text-left">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-[10px] font-semibold text-violet-600 shrink-0">
                            {assignedBy?.charAt(0) || 'S'}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[100px]">{assignedBy}</span>
                    </div>
                </td>
                <td className="p-5 text-left">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden shrink-0">
                            {assignedTo?.charAt(0) || <User size={12} />}
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 truncate max-w-[100px]">{assignedTo}</span>
                    </div>
                </td>
                <td className="p-5 text-left">
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isOverdue ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <Calendar size={10} />
                        <span className="text-[10px] font-bold tracking-tight">{dueDate}</span>
                    </div>
                </td>
                <td className="p-5 text-center">
                    {renderStatusBadge?.(status)}
                </td>
                <td className="p-5 text-left">
                    {renderSeverityTag?.(severity)}
                </td>
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
            {expanded && Array.isArray(subtasks) && subtasks.map((sub, idx) => (
                <SubtaskRow
                    key={sub?.task_id || sub?.id || idx}
                    task={sub}
                    renderStatusBadge={renderStatusBadge}
                    renderSeverityTag={renderSeverityTag}
                    isLast={idx === subtasks.length - 1}
                    taskTitles={taskTitles}
                />
            ))}
        </>
    );
};

const TeamTasksPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedTasks, setExpandedTasks] = useState(new Set());
    const [subtasksMap, setSubtasksMap] = useState({});
    const [departments, setDepartments] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        department_id: '',
        status: '',
        severity: '',
        from_date: '',
        to_date: ''
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [metrics, setMetrics] = useState({ activeTasks: 0, inProgress: 0, pendingSubmission: 0, overdue: 0 });
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const taskTitles = useMemo(() => {
        const map = {};
        tasks.forEach(t => {
            const id = t.task_id || t.id;
            const title = t.task_title || t.title;
            if (id) map[id] = title;
        });
        Object.values(subtasksMap).flat().forEach(s => {
            const id = s.task_id || s.id;
            const title = s.task_title || s.title;
            if (id) map[id] = title;
        });
        return map;
    }, [tasks, subtasksMap]);

    const fetchTasks = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: pagination.limit };
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
            const res = await api.get('/tasks/team', { params });
            const rawData = res.data?.data || res.data || {};
            const items = Array.isArray(rawData) ? rawData : (rawData.items || rawData.data || []);
            // Exclude CANCELLED tasks from the team view as requested
            const filteredItems = items.filter(t => (t.status || '').toUpperCase() !== 'CANCELLED');
            setTasks(filteredItems);
            setPagination({
                page: rawData.page || page,
                limit: rawData.limit || pagination.limit,
                total: rawData.total || items.length
            });
            fetchMetrics();
        } catch (err) {
            console.error("Fetch tasks error:", err);
            toast.error("Failed to load tasks");
        } finally { setLoading(false); }
    };

    const fetchMetrics = async () => {
        try {
            const role = user?.role?.toUpperCase();
            let endpoint = '/dashboard/manager';
            if (role === 'CFO' || role === 'ADMIN') endpoint = '/dashboard/cfo';
            else if (role === 'EMPLOYEE') endpoint = '/reports/employee/summary';

            const params = {};
            if (filters.from_date) params.from_date = filters.from_date;
            if (filters.to_date) params.to_date = filters.to_date;
            if (filters.department_id) params.department_id = filters.department_id;

            const res = await api.get(endpoint, { params });
            const d = res.data?.data || res.data || {};

            // Helper to get value from multiple possible keys
            const getVal = (obj, keys) => {
                for (const k of keys) {
                    if (obj[k] !== undefined && obj[k] !== null) return Number(obj[k]);
                }
                return 0;
            };

            // Enhanced mapping for CFO/Manager dashboards
            const inProgress = getVal(d, ['in_progress_tasks', 'in_progress', 'inProgress', 'in_progress_count']);
            const overdue = getVal(d, ['overdue_tasks', 'overdue', 'overdue_count', 'overdueTasks']);
            const totalTasks = getVal(d, ['team_tasks', 'total_tasks', 'total_active', 'total', 'pending_tasks', 'tasks_assigned']);
            const submitted = getVal(d, ['submitted_tasks', 'submitted', 'pending_approval', 'pending_review']);
            const pendingSubmission = getVal(d, ['new_tasks', 'new', 'pending_submission', 'rework_tasks', 'rework']) || (totalTasks - inProgress - submitted);

            // If we have pagination.total, use that for 'Active Tasks' as it's the most accurate reflection of the current filter
            const activeTasksCount = pagination.total > 0 ? pagination.total : (totalTasks || tasks.length);

            // Final fallback if everything is zero but we see items
            if (activeTasksCount === 0 && tasks.length > 0) {
                const localInProgress = tasks.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
                const localPending = tasks.filter(t => ['NEW', 'REWORK'].includes((t.status || '').toUpperCase())).length;
                const localOverdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'CANCELLED'].includes((t.status || '').toUpperCase())).length;
                setMetrics({ activeTasks: tasks.length, inProgress: localInProgress, pendingSubmission: localPending, overdue: localOverdue });
            } else {
                setMetrics({
                    activeTasks: activeTasksCount,
                    inProgress: inProgress || tasks.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length,
                    pendingSubmission: pendingSubmission || tasks.filter(t => ['NEW', 'REWORK'].includes((t.status || '').toUpperCase())).length,
                    overdue: overdue || tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'CANCELLED'].includes((t.status || '').toUpperCase())).length
                });
            }
        } catch (err) {
            console.error("Fetch metrics error:", err);
            setMetrics({
                activeTasks: pagination.total || tasks.length,
                inProgress: tasks.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length,
                pendingSubmission: tasks.filter(t => ['NEW', 'REWORK', 'CREATED'].includes((t.status || '').toUpperCase())).length,
                overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'CANCELLED'].includes((t.status || '').toUpperCase())).length
            });
        }
    };

    useEffect(() => {
        api.get('/departments').then(res => setDepartments(res.data?.data || res.data || []));
        api.get('/employees').then(res => setAllEmployees(res.data?.data || res.data || []));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { fetchTasks(1); }, 500);
        return () => clearTimeout(timer);
    }, [filters]);

    const toggleExpand = useCallback((parentId) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else {
                next.add(parentId);
                if (!subtasksMap[parentId]) {
                    api.get(`/tasks/${parentId}/subtasks`).then(res => {
                        const subs = res.data?.data || res.data || [];
                        setSubtasksMap(p => ({ ...p, [parentId]: Array.isArray(subs) ? subs : [] }));
                    });
                }
            }
            return next;
        });
    }, [subtasksMap]);

    const handleAction = async (taskId, action, extra = {}) => {
        if (!taskId) return;
        const task = tasks.find(t => (t.task_id || t.id) === taskId);
        if (task?.status === 'SUBMITTED' && !isReviewModalOpen && (action === 'APPROVE' || action === 'REWORK')) {
            setSelectedTask(task); setIsReviewModalOpen(true); return;
        }
        const confirmMsg = action === 'CANCEL' ? "Cancel this task?" : action === 'APPROVE' ? "Approve completion?" : action === 'REWORK' ? "Request rework?" : null;
        if (confirmMsg && !window.confirm(confirmMsg)) return;

        try {
            await api.post(`/tasks/${taskId}/transition`, { action, ...extra });
            toast.success(`Task ${action.toLowerCase()}ed`);
            fetchTasks(pagination.page); fetchMetrics();
            window.dispatchEvent(new Event('refresh-notifications'));
            setIsReviewModalOpen(false); setIsReworkModalOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.message || "Action failed");
        }
    };

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
        const colors = { HIGH: 'text-rose-600 bg-rose-50 border-rose-200', MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200', LOW: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
        return <span className={`px-2 py-0.5 rounded border text-[9px] font-bold capitalize tracking-tight ${colors[s] || 'text-slate-400'}`}>{s}</span>;
    }, []);

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-violet-600 tracking-tighter mb-1">
                        <span>Tascade</span><ChevronRight size={10} className="text-slate-300" strokeWidth={3} />
                        <span className="text-slate-400">CFO</span><ChevronRight size={10} className="text-slate-300" strokeWidth={3} />
                        <span className="text-slate-400 font-semibold">Team Tasks</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        Team Performance Tracker
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 rounded-full border border-violet-100">
                            <Users size={14} className="text-violet-600" /><span className="text-[11px] font-semibold text-violet-600">{pagination.total} Tasks</span>
                        </div>
                    </h1>
                    <p className="text-[10px] font-medium text-slate-400 leading-none capitalize">Monitor work execution & business performance</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/tasks/assign')} className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-2xl font-bold text-[12px] hover:bg-violet-700 shadow-lg shadow-violet-200"><Plus size={16} strokeWidth={3} />Assign Task</button>
                    <button onClick={() => { fetchTasks(pagination.page); fetchMetrics(); }} className="p-3 bg-white border border-slate-100 text-slate-400 rounded-2xl hover:text-violet-600 shadow-sm"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Active Tasks" value={metrics.activeTasks} icon={ClipboardCheck} color="violet" />
                <StatsCard title="In Progress" value={metrics.inProgress} icon={Play} color="amber" />
                <StatsCard title="Pending Submission" value={metrics.pendingSubmission} icon={Upload} color="emerald" />
                <StatsCard title="Overdue" value={metrics.overdue} icon={AlertTriangle} color="rose" />
            </div>

            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                    <div className="lg:col-span-3 relative group">
                        <label className="text-[10px] font-medium text-slate-400 ml-1 mb-1.5 block">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-violet-500" size={16} />
                            <input type="text" placeholder="Search tasks..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-violet-500/10 placeholder:text-slate-400 capitalize" value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))} />
                        </div>
                    </div>
                    <div className="lg:col-span-5 grid grid-cols-3 gap-3">
                        <div className="space-y-1.5 flex flex-col"><label className="text-[10px] font-bold text-slate-400 ml-1">Department</label>
                            <CustomSelect value={filters.department_id} onChange={(v) => setFilters(p => ({ ...p, department_id: v }))} options={[{ value: '', label: 'All Dept' }, ...departments.map(d => ({ value: d.department_id || d.id, label: d.name || d.department_id }))]} />
                        </div>
                        <div className="space-y-1.5 flex flex-col"><label className="text-[10px] font-bold text-slate-400 ml-1">Status</label>
                            <CustomSelect value={filters.status} onChange={(v) => setFilters(p => ({ ...p, status: v }))} options={[{ value: '', label: 'All Status' }, { value: 'NEW', label: 'New' }, { value: 'IN_PROGRESS', label: 'In Progress' }, { value: 'SUBMITTED', label: 'Submitted' }, { value: 'REWORK', label: 'Rework' }, { value: 'APPROVED', label: 'Approved' }, { value: 'CANCELLED', label: 'Cancelled' }]} />
                        </div>
                        <div className="space-y-1.5 flex flex-col"><label className="text-[10px] font-bold text-slate-400 ml-1">Severity</label>
                            <CustomSelect value={filters.severity} onChange={(v) => setFilters(p => ({ ...p, severity: v }))} options={[{ value: '', label: 'All Severity' }, { value: 'HIGH', label: 'High' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'LOW', label: 'Low' }]} />
                        </div>
                    </div>
                    <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 ml-1">From Date</label>
                            <input type="date" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-violet-500/10" value={filters.from_date} onChange={(e) => setFilters(p => ({ ...p, from_date: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-400 ml-1">To Date</label>
                            <input type="date" className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl text-[12px] font-bold focus:ring-2 focus:ring-violet-500/10" value={filters.to_date} onChange={(e) => setFilters(p => ({ ...p, to_date: e.target.value }))} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left capitalize">
                        <thead>
                            <tr className="text-[10px] font-bold text-slate-400 capitalize tracking-tight border-b border-slate-100 bg-slate-50/50">
                                <th className="p-5 pl-8">Task ID</th><th className="p-5">Task</th><th className="p-5">Department</th><th className="p-5">Assigned By</th><th className="p-5">Assigned To</th><th className="p-5">Due Date</th><th className="p-5 text-center">Status</th><th className="p-5">Severity</th><th className="p-5 text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr className="animate-pulse"><td colSpan={9} className="p-20 text-center text-slate-300 font-bold">Syncing Executive Intelligence...</td></tr>
                            ) : tasks.length === 0 ? (
                                <tr><td colSpan={9} className="p-20 text-center opacity-50"><Layout size={48} className="text-slate-200 mx-auto mb-4" /><p className="text-slate-400 font-bold text-[11px]">No matching team tasks found</p></td></tr>
                            ) : tasks.map((task, idx) => (
                                <TaskRow key={task?.task_id || task?.id || idx} task={task} expanded={expandedTasks.has(task?.task_id)} subtasks={subtasksMap[task?.task_id] || []} onToggle={() => toggleExpand(task?.task_id)} renderStatusBadge={renderStatusBadge} renderSeverityTag={renderSeverityTag} onAction={handleAction} onReassign={(t) => { setSelectedTask(t); setIsReassignModalOpen(true); }} onRework={(t) => { setSelectedTask(t); setIsReworkModalOpen(true); }} taskTitles={taskTitles} />
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 bg-slate-50/50 px-8 border-t border-slate-100 text-left">
                    <div className="text-[12px] font-bold text-slate-500">Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tasks</div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchTasks(pagination.page - 1)} disabled={pagination.page <= 1} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black text-slate-500 hover:text-violet-600 disabled:opacity-50 transition-all shadow-sm">Prev</button>
                        {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.limit)) }).map((_, i) => (
                            <button key={i + 1} onClick={() => fetchTasks(i + 1)} className={`w-10 h-10 rounded-xl text-[12px] font-black transition-all ${pagination.page === i + 1 ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 scale-110' : 'bg-white border border-slate-200 text-slate-500 hover:text-violet-600'}`}>{i + 1}</button>
                        ))}
                        <button onClick={() => fetchTasks(pagination.page + 1)} disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-black text-slate-500 hover:text-violet-600 disabled:opacity-50 transition-all shadow-sm">Next</button>
                    </div>
                </div>
            </div>

            <ReassignTaskModal isOpen={isReassignModalOpen} onClose={() => setIsReassignModalOpen(false)} currentTask={selectedTask} currentUser={user} employees={allEmployees} onReassign={async (data) => {
                try {
                    await api.post(`/tasks/${selectedTask?.task_id || selectedTask?.id}/reassign`, data);
                    toast.success("Task reassigned"); setIsReassignModalOpen(false); fetchTasks(pagination.page); fetchMetrics(); window.dispatchEvent(new Event('refresh-notifications'));
                } catch (err) { toast.error("Reassign failed"); }
            }} />
            <ReworkCommentModal isOpen={isReworkModalOpen} onClose={() => setIsReworkModalOpen(false)} onConfirm={(comment) => handleAction(selectedTask?.task_id || selectedTask?.id, 'REWORK', { comment })} taskTitle={selectedTask?.task_title || selectedTask?.title} />
            <TaskReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} task={selectedTask} onApprove={() => handleAction(selectedTask?.task_id || selectedTask?.id, 'APPROVE')} onRework={() => { setIsReviewModalOpen(false); setIsReworkModalOpen(true); }} />
        </div>
    );
};

export default TeamTasksPage;