import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { calculateEmployeeScore } from '../../utils/performanceEngine';
import Badge from '../UI/Badge';
import ChartPanel from '../Charts/ChartPanel';
import {
    TrendingUp, CheckCircle, Clock, AlertCircle,
    ThumbsUp, Calendar, ArrowRight, ChevronRight, CalendarCheck, Loader2,
    Search as SearchIcon, Plus, Settings, MessageSquare, ChevronDown, User, Edit2, Activity, CheckSquare, BarChart2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
};

/* ─── Helpers ─────────────────────────────────────────────── */
const TERMINAL = ['APPROVED', 'CANCELLED'];
const TERMINAL_SET = new Set(TERMINAL);

const toDateKey = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const fetchEmployeeTasksFallback = async () => {
    const baseURL = api.defaults.baseURL || '';
    const token = localStorage.getItem('pms_token');
    const candidates = ['/tasks', '/tasks?scope=mine', '/tasks?scope=personal'];
    for (const path of candidates) {
        try {
            const res = await fetch(`${baseURL}${path}`, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    'ngrok-skip-browser-warning': 'true',
                },
            });
            if (res.status === 422 || res.status === 404 || res.status === 405) continue;
            if (!res.ok) continue;
            const data = await res.json();
            const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            if (rows.length > 0) return rows;
        } catch (_) {
            // try next
        }
    }
    return [];
};

const STATUS_LABEL = {
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REWORK: 'Rework',
    CANCELLED: 'Cancelled',
};

const STATUS_COLORS = {
    NEW: '#3b82f6',        // Blue
    IN_PROGRESS: '#6366f1', // Indigo (light blue/purple)
    SUBMITTED: '#f59e0b',  // Amber/Yellow
    APPROVED: '#10b981',   // Green
    REWORK: '#ea580c',     // Orange/Red
    CANCELLED: '#94a3b8',  // Grey
};


/* Small stat tile — CFO-style large gradient card */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { bg: 'from-violet-500 to-indigo-600', shadow: 'shadow-violet-300/40', icon: 'bg-white/20', accent: 'bg-violet-400/30' },
        green: { bg: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-300/40', icon: 'bg-white/20', accent: 'bg-emerald-400/30' },
        blue: { bg: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-300/40', icon: 'bg-white/20', accent: 'bg-blue-400/30' },
        amber: { bg: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-300/40', icon: 'bg-white/20', accent: 'bg-amber-400/30' },
        orange: { bg: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-300/40', icon: 'bg-white/20', accent: 'bg-orange-400/30' },
        teal: { bg: 'from-teal-400 to-cyan-500', shadow: 'shadow-teal-300/40', icon: 'bg-white/20', accent: 'bg-teal-400/30' },
    }[color] || { bg: 'from-violet-500 to-indigo-600', shadow: 'shadow-violet-300/40', icon: 'bg-white/20', accent: 'bg-violet-400/30' };

    return (
        <div className={`group animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} ${c.shadow} shadow-lg py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl`}>
            {/* Decorative blobs */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${c.accent} blur-2xl`} />
            <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full ${c.accent} blur-2xl opacity-60`} />

            <div className="relative z-10 flex items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${c.icon} backdrop-blur-sm flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/30`}>
                    <Icon size={24} className="text-white drop-shadow-sm" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow">
                        {value ?? '-'}
                    </div>
                    <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest leading-tight mt-1.5">
                        {label}
                    </div>
                    {sub && (
                        <div className="text-[9px] text-white/60 font-semibold uppercase tracking-widest mt-0.5">
                            {sub}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Employee Dashboard ───────────────────────────────────── */
const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* Date range state */
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [dashboardData, setDashboardData] = useState(null);
    const [todayTasks, setTodayTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
            const res = await api.get('/notifications');
            setActivities(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch activities", err);
        } finally {
            setLoadingActivities(false);
        }
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (fromDate) {
                params.fromDate = fromDate;
                params.start_date = fromDate;
            }
            if (toDate) {
                params.toDate = toDate;
                params.end_date = toDate;
            }

            const [dataRes, todayRes] = await Promise.all([
                api.get('/dashboard/employee', { params }),
                api.get('/dashboard/employee/today')
            ]);
            const dashboardPayload = dataRes?.data?.data || dataRes?.data || {};
            setDashboardData(dashboardPayload);
            const todayPayload = todayRes?.data?.data || todayRes?.data || [];
            const todayT = Array.isArray(todayPayload) ? todayPayload : [];
            setTodayTasks(todayT.map(t => ({
                ...t,
                id: t.task_id || t.id,                          // integer — used in all API URLs
                employee_id: t.assigned_to_emp_id,       // for assignee lookup
                assigned_by: t.assigned_by_emp_id,       // for assigner lookup
                assigneeName: t.assigned_to_name,
                assignerName: t.assigned_by_name,
                severity: (t.priority || t.severity || 'LOW').toUpperCase(),
                department: t.department_name || t.department_id,
            })));
            const totalFromDashboard = dashboardPayload?.total_tasks ?? 0;
            if (totalFromDashboard === 0 && todayT.length === 0) {
                const rawTasks = await fetchEmployeeTasksFallback();
                if (rawTasks.length > 0) {
                    const filtered = rawTasks.filter((t) => {
                        const k = toDateKey(t.assigned_date || t.created_at || t.due_date);
                        if (fromDate && (!k || k < fromDate)) return false;
                        if (toDate && (!k || k > toDate)) return false;
                        return true;
                    });

                    const normalized = filtered.map((t) => ({
                        ...t,
                        id: t.task_id || t.id,
                        status: String(t.status || '').toUpperCase(),
                        severity: (t.priority || t.severity || 'LOW').toUpperCase(),
                        due_date: t.due_date,
                        title: t.title || 'Untitled',
                    }));

                    const counts = { NEW: 0, IN_PROGRESS: 0, SUBMITTED: 0, APPROVED: 0, REWORK: 0, CANCELLED: 0 };
                    normalized.forEach((t) => {
                        if (counts[t.status] !== undefined) counts[t.status] += 1;
                    });
                    const total = normalized.length;
                    const approved = counts.APPROVED;
                    const submitted = counts.SUBMITTED;
                    const pending = normalized.filter(t => !TERMINAL_SET.has(t.status)).length;
                    const overdue = normalized.filter((t) => {
                        const due = toDateKey(t.due_date);
                        return due && due < new Date().toLocaleDateString('en-CA') && !TERMINAL_SET.has(t.status);
                    }).length;
                    setDashboardData({
                        total_tasks: total,
                        approved_tasks: approved,
                        submitted_tasks: submitted,
                        pending_tasks: pending,
                        overdue_tasks: overdue,
                        in_progress_tasks: counts.IN_PROGRESS,
                        rework_tasks: counts.REWORK,
                        new_tasks: counts.NEW,
                        cancelled_tasks: counts.CANCELLED,
                        performance_index: total > 0 ? Math.round((approved / total) * 100) : 0,
                        dept_avg_score: 0,
                    });
                    setTodayTasks(normalized);
                }
            }
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (taskId, action) => {
        if (!taskId && taskId !== 0) return;
        const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()} this task?`);
        if (!confirmed) return;

        try {
            await api.post(`/tasks/${taskId}/transition`, { action, comment: "" });
            fetchDashboardData(); // Refresh dashboard
        } catch (err) {
            console.error("Failed to update task status", err);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
            fetchActivities();
        }
    }, [user?.id, fromDate, toDate]);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;

        // Use real values from dashboardData. If stats are 0, they should show as 0.
        const currentScore = dashboardData.performance_index || 0;

        // Mock status distribution based on dashboard summary
        let statusDistribution = [
            { name: 'Approved', value: dashboardData.approved_tasks || 0, color: STATUS_COLORS.APPROVED },
            { name: 'In Progress', value: dashboardData.in_progress_tasks || 0, color: STATUS_COLORS.IN_PROGRESS },
            { name: 'Submitted', value: dashboardData.submitted_tasks || 0, color: STATUS_COLORS.SUBMITTED },
            { name: 'Rework', value: dashboardData.rework_tasks || 0, color: STATUS_COLORS.REWORK },
            { name: 'New', value: dashboardData.new_tasks || 0, color: STATUS_COLORS.NEW },
            { name: 'Cancelled', value: dashboardData.cancelled_tasks || 0, color: STATUS_COLORS.CANCELLED },
        ].filter(d => d.value > 0);

        const performanceTrend = [
            { name: 'Target', score: 100, fill: '#f1f5f9' },
            { name: 'My Score', score: currentScore, fill: '#8b5cf6' },
            { name: 'Dept Avg', score: dashboardData.dept_avg_score || 0, fill: '#10b981' },
        ];


        return {
            score: currentScore,
            stats: {
                total: dashboardData.total_tasks || 0,
                completedOrSub: (dashboardData.approved_tasks || 0) + (dashboardData.submitted_tasks || 0),
                approved: dashboardData.approved_tasks || 0,
                pending: dashboardData.pending_tasks || 0,
                overdue: dashboardData.overdue_tasks || 0,
                dateRangeSub: 'Global Metrics',
            },
            performanceTrend,
            statusDistribution,
        };
    }, [dashboardData]);

    const { score, stats, performanceTrend, statusDistribution } = metrics || {
        score: 0,
        stats: { total: 0, completedOrSub: 0, approved: 0, pending: 0, overdue: 0, dateRangeSub: '' },
        performanceTrend: [],
        statusDistribution: []
    };

    // Derive pending tasks list from todayTasks (non-terminal)
    const filteredTodayTasks = useMemo(() => {
        return todayTasks.filter(t => {
            const isTerminal = TERMINAL.includes(t.status);
            const matchesSearch = !searchTerm ||
                t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(t.id).toLowerCase().includes(searchTerm.toLowerCase());

            // Client-side date filter for the table as well
            const taskDate = toDateKey(t.due_date || t.assigned_date || t.created_at);
            const matchesFrom = !fromDate || taskDate >= fromDate;
            const matchesTo = !toDate || taskDate <= toDate;

            return !isTerminal && matchesSearch && matchesFrom && matchesTo;
        });
    }, [todayTasks, searchTerm, fromDate, toDate]);

    const pendingTasks = filteredTodayTasks;

    const dateLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-sm -z-10" />
                <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-6 drop-shadow-glow-sm" />
                <p className="text-slate-800 font-black text-xl uppercase tracking-widest animate-pulse">Syncing Dashboard...</p>
                <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-[0.3em]">Preparing Executive Insights</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8 mt-4">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#4285F4] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div>
                        <span className="text-5xl font-bold tracking-tight">{stats.total || 0}</span>
                        <p className="text-[15px] font-medium mt-1 text-white/90">Total Assignments</p>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-20">
                        <CheckSquare size={72} strokeWidth={1.5} />
                    </div>
                </div>

                <div className="bg-[#9B51E0] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 border border-[#a259e8]">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-bold tracking-tight">{stats.pending || 0}</span>
                            <p className="text-[15px] font-medium mt-1 text-white/90">Pending Tasks</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <Activity size={32} />
                        </div>
                    </div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                        <div className="w-32 h-32 rounded-full border-[12px] border-white"></div>
                    </div>
                </div>

                <div className="bg-[#34D399] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-bold tracking-tight">{score || 0}%</span>
                            <p className="text-[15px] font-medium mt-1 text-white/90">Performance Index</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <TrendingUp size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Split */}
            <div className="flex flex-col xl:flex-row gap-6">
                {/* Left Side - Task Table */}
                <div className="flex-[7] bg-white rounded-[1.5rem] p-0 shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                    <div className="flex items-center gap-6 pt-6 px-6 border-b border-slate-100 pb-0">
                        <h2 className="text-[17px] font-bold text-slate-800 pb-4">My Task List</h2>
                        <div className="flex gap-5 ml-2">
                            <span className="text-sm font-semibold text-violet-600 border-b-2 border-violet-600 pb-4 -mb-[1px]">All Tasks</span>
                            <span className="text-sm font-medium text-slate-400 pb-4">In Progress</span>
                            <span className="text-sm font-medium text-slate-400 pb-4">Completed</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[12px] text-slate-400 border-b border-slate-100 bg-slate-50/30">
                                <tr>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap"><input type="checkbox" className="rounded text-violet-600 mr-3 border-slate-300" />Directives</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Assigned By <ChevronDown size={14} className="inline ml-1" /></th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Priority <ChevronDown size={14} className="inline ml-1" /></th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-center">Status</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pendingTasks.length === 0 ? (
                                    <tr><td colSpan="5" className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No pending tasks present</td></tr>
                                ) : (
                                    pendingTasks.slice(0, 6).map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2 px-6 flex items-center gap-3">
                                                <input type="checkbox" className="rounded border-slate-300 w-4 h-4" />
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
                                                    <CheckSquare size={13} />
                                                </div>
                                                <span className="text-[13.5px] font-semibold text-slate-700 truncate max-w-[180px]">{task.title}</span>
                                            </td>
                                            <td className="py-2 px-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                                        <User size={14} className="text-slate-400" />
                                                    </div>
                                                    <span className="text-[13px] font-medium text-slate-600">{task.assignerName || 'Manager'}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-6">
                                                <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                                                    <span className={`w-2 h-2 rounded-full ${task.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'}`}></span>
                                                    {task.severity === 'HIGH' ? 'High' : 'Medium'}
                                                </div>
                                            </td>
                                            <td className="py-2 px-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold shadow-sm inline-block min-w-[90px] ${task.status === 'SUBMITTED' ? 'bg-[#9B51E0] text-white' : task.status === 'IN_PROGRESS' ? 'bg-[#34D399] text-white' : 'bg-[#4285F4] text-white'}`}>
                                                    {task.status === 'SUBMITTED' ? 'Review' : task.status === 'IN_PROGRESS' ? 'In Progress' : 'Open'}
                                                </span>
                                            </td>
                                            <td className="py-2 px-6 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {task.status === "NEW" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "START"); }}
                                                            className="px-5 py-1.5 bg-[#7B51ED] text-white text-[12px] font-bold rounded-lg hover:bg-violet-700 transition-[transform,colors] active:scale-95 shadow-sm inline-flex items-center gap-1.5"
                                                        >
                                                            Start
                                                        </button>
                                                    )}
                                                    {task.status === "IN_PROGRESS" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "SUBMIT"); }}
                                                            className="px-5 py-1.5 bg-[#10B981] text-white text-[12px] font-bold rounded-lg hover:bg-emerald-600 transition-[transform,colors] active:scale-95 shadow-sm inline-flex items-center gap-1.5"
                                                        >
                                                            Submit
                                                        </button>
                                                    )}
                                                    {task.status === "REWORK" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "RESTART"); }}
                                                            className="px-5 py-1.5 bg-[#F59E0B] text-white text-[12px] font-bold rounded-lg hover:bg-amber-600 transition-[transform,colors] active:scale-95 shadow-sm inline-flex items-center gap-1.5"
                                                        >
                                                            Restart
                                                        </button>
                                                    )}
                                                    {task.status === "SUBMITTED" && (
                                                        <button onClick={() => navigate('/tasks')} className="px-5 py-1.5 bg-[#4285F4] text-white text-[12px] font-bold rounded-lg hover:bg-blue-600 transition-[transform,colors] active:scale-95 shadow-sm inline-flex items-center gap-1.5">
                                                            View
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side - Actions & Activity */}
                <div className="flex-[2.5] flex flex-col gap-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 ml-1">Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => navigate('/tasks')} className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <CheckSquare size={18} strokeWidth={2.5} /> View All Tasks
                            </button>
                            <button className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <BarChart2 size={18} strokeWidth={2.5} /> View Reports
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px]">
                        <div className="flex justify-between items-center mb-4 ml-1">
                            <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                            <button className="text-slate-400 hover:text-slate-600"><Settings size={16} /></button>
                        </div>

                        <div className="space-y-3">
                            {loadingActivities ? (
                                <div className="flex flex-col items-center justify-center p-8">
                                    <Loader2 className="w-6 h-6 text-violet-500 animate-spin mb-2" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading Activity...</p>
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center p-6 text-slate-400 text-xs font-bold uppercase tracking-widest">No Recent Activity</div>
                            ) : activities.map((i, idx) => (
                                <div key={idx} className="flex gap-3 items-start border border-slate-100 p-3.5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                    <div className={`w-9 h-9 border-2 border-white shadow-sm rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold text-white text-sm ${i.type === 'SUCCESS' ? 'bg-emerald-500' : i.type === 'WARNING' ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                                        {(i.title || 'S').charAt(0)}
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <p className="text-[13px] text-slate-600 leading-tight">
                                            <span className="font-bold text-slate-800">{i.title}</span> {i.message && <span className="block text-slate-400 mt-0.5">{i.message}</span>}
                                        </p>
                                        <p className="text-[11px] font-medium text-slate-400 mt-1">{formatTimeAgo(i.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-6">
                    <h3 className="text-[16px] font-bold text-slate-800 mb-1">Performance Score</h3>
                    <p className="text-[12px] text-slate-400 mb-6 font-medium">Score vs target vs dept average</p>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={performanceTrend} margin={{ top: 20, right: 10, left: 0, bottom: 0 }} barSize={36}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                formatter={v => [`${v}`, 'Score']}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 500 }}
                            />
                            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                                {performanceTrend.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-6">
                    <h3 className="text-[16px] font-bold text-slate-800 mb-1">Task Status Breakdown</h3>
                    <p className="text-[12px] text-slate-400 mb-6 font-medium">Your tasks by current status</p>
                    <div className="flex items-center justify-center h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%" cy="50%"
                                    outerRadius={90}
                                    innerRadius={55}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={false}
                                >
                                    {statusDistribution.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 500 }} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;






