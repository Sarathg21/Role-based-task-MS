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
    Search as SearchIcon
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

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


/* Small stat tile — premium version */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { gradient: 'from-violet-500 to-violet-700', shadow: 'shadow-violet-200' },
        green: { gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-200' },
        blue: { gradient: 'from-blue-500 to-blue-700', shadow: 'shadow-blue-200' },
        amber: { gradient: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-200' },
        orange: { gradient: 'from-orange-500 to-orange-700', shadow: 'shadow-orange-200' },
        teal: { gradient: 'from-teal-400 to-teal-600', shadow: 'shadow-teal-200' },
    }[color] || { gradient: 'from-violet-500 to-violet-700', shadow: 'shadow-violet-200' };

    return (
        <div className="stat-card group animate-fade-in-up py-4 px-5 border border-slate-100/60 shadow-sm hover:shadow-xl transition-all duration-500 bg-white/50 backdrop-blur-sm rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent -mr-12 -mt-12 rounded-full" />

            <div className="flex flex-col gap-3 relative z-10">
                <div className={`
                    w-12 h-12 rounded-2xl
                    bg-gradient-to-br ${c.gradient}
                    shadow-lg ${c.shadow}
                    flex items-center justify-center
                    transition-all duration-500
                    group-hover:scale-110 group-hover:rotate-3
                `}>
                    <Icon size={24} className="text-white drop-shadow-md" strokeWidth={2.5} />
                </div>

                <div className="space-y-1">
                    <div className="text-2xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">
                        {value ?? '-'}
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
                        {label}
                    </div>
                    {sub && (
                        <div className="text-[9px] text-slate-300 font-bold uppercase tracking-hero-tight mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {sub}
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Glow */}
            <div className={`absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr ${c.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-700`} />
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
        <div className="space-y-4">

            {/* ══ EMPLOYEE PREMIUM EXECUTIVE HERO ══ */}
            <div className="rounded-[2.5rem] overflow-hidden shadow-2xl relative mb-6 border border-white/10 mesh-gradient-premium">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-400/20 rounded-full blur-[80px] animate-blob" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-400/20 rounded-full blur-[80px] animate-blob [animation-delay:2s]" />

                <div className="relative z-10 px-10 pt-10 pb-8 flex flex-col items-center text-center gap-5">
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-white/10 backdrop-blur-2xl p-3 rounded-[1.5rem] shadow-2xl border border-white/20 animate-float card-gloss">
                            <CalendarCheck size={30} className="text-white drop-shadow-glow" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-2xl uppercase leading-none mb-1.5">
                                My Dashboard
                            </h2>
                            <p className="text-indigo-100 font-bold uppercase tracking-[0.4em] text-[9px] opacity-80 flex items-center gap-2">
                                {dateLabel} · Welcome Back, {user?.name?.split(' ')[0] || 'User'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 w-full max-w-4xl">
                        {/* Search Bar — Integrated Premium Style */}
                        <div className="flex-1 w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3.5 shadow-inner flex items-center gap-3 group focus-within:bg-white/20 transition-all">
                            <SearchIcon size={18} className="text-white/60 group-focus-within:text-white" />
                            <input
                                type="text"
                                placeholder="Search tasks by title or ID..."
                                className="bg-transparent border-none outline-none text-white text-sm font-bold placeholder:text-white/40 w-full"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Compact Date Range Pill — Premium Executive Style */}
                        <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-2 shadow-inner transition-all hover:bg-white/20">
                            <div className="flex flex-col text-left mr-3">
                                <span className="text-[7px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-0.5">From</span>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="bg-transparent text-white text-[10px] font-black uppercase outline-none w-[90px] placeholder:text-white/40 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 border border-white/10 mx-1">
                                <ArrowRight size={10} className="text-white/60" />
                            </div>

                            <div className="flex flex-col text-left ml-3">
                                <span className="text-[7px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-0.5">To</span>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="bg-transparent text-white text-[10px] font-black uppercase outline-none w-[90px] placeholder:text-white/40 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {/* All Tasks Nav Pill */}
                            <button
                                onClick={() => navigate('/tasks')}
                                className="bg-white text-indigo-900 hover:scale-105 transition-transform px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2 group"
                            >
                                All Tasks
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            {(fromDate || toDate || searchTerm) && (
                                <button
                                    onClick={() => { setFromDate(''); setToDate(''); setSearchTerm(''); }}
                                    className="bg-white/10 hover:bg-white/20 text-white text-[9px] font-black px-4 py-3.5 rounded-2xl border border-white/20 backdrop-blur-sm transition-all uppercase tracking-widest"
                                >
                                    ✕ Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ ACTIONABLE SUMMARY ══ */}
            <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm mb-6 border-l-8 border-l-violet-600 relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50/50 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-violet-100/50 transition-colors" />

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-200 animate-pulse-subtle">
                            <Clock size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Incoming Priority</h3>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                {pendingTasks.length} {pendingTasks.length === 1 ? 'Task Item' : 'Task Items'} To Process
                            </p>
                        </div>
                    </div>

                    {pendingTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 w-full lg:max-w-3xl">
                            {pendingTasks.slice(0, 3).map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => navigate('/tasks')}
                                    className="bg-slate-50/80 backdrop-blur-sm hover:bg-white rounded-2xl p-3 border border-slate-100 transition-all hover:scale-[1.02] shadow-sm hover:shadow-md flex items-center justify-between group/task cursor-pointer"
                                >
                                    <div className="min-w-0 flex-1 mr-3">
                                        <div className="text-[11px] font-black text-slate-800 truncate leading-tight mb-1">{task.title}</div>
                                        <Badge variant={task.status} className="scale-75 origin-left">{STATUS_LABEL[task.status]}</Badge>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-300 group-hover/task:text-violet-600 transition-colors flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-2">
                                <CheckCircle size={14} /> Global Schedule Clear
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ══ STAT CARDS ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 stagger-children mb-2">
                <Stat
                    label="Performance Index"
                    value={score}
                    sub="Composite Score"
                    icon={TrendingUp}
                    color="violet"
                />
                <Stat
                    label="Total Assigned"
                    value={stats.total}
                    sub="Lifetime Record"
                    icon={Clock}
                    color="blue"
                />
                <Stat
                    label="Under Review"
                    value={stats.completedOrSub}
                    sub="Awaiting Approval"
                    icon={CheckCircle}
                    color="teal"
                />
                <Stat
                    label="Net Completed"
                    value={stats.approved}
                    sub="Verified Success"
                    icon={ThumbsUp}
                    color="green"
                />
                <Stat
                    label="Active Issues"
                    value={stats.pending}
                    sub="Immediate Focus"
                    icon={AlertCircle}
                    color="amber"
                />
            </div>

            {/* ══ CHARTS ROW ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-children">

                {/* Chart A — Performance Score vs Target */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                    <h3 className="text-sm font-bold text-slate-800 mb-0.5">Performance Score</h3>
                    <p className="text-[10px] text-slate-400 mb-3">Score vs target vs dept average</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={performanceTrend} margin={{ top: 4, right: 10, left: 0, bottom: 0 }} barSize={36}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                formatter={v => [`${v}`, 'Score']}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '10px' }}
                            />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {performanceTrend.map((entry, i) => (
                                    <Cell key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Chart B — Task Status Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                    <div className="flex justify-between items-start mb-0.5">
                        <h3 className="text-sm font-bold text-slate-800">Task Status Breakdown</h3>
                    </div>
                    <p className="text-[10px] text-slate-400 mb-3">Your tasks by current status</p>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={statusDistribution}
                                cx="50%" cy="50%"
                                outerRadius={65}
                                innerRadius={35}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => percent > 0.1 ? `${(percent * 100).toFixed(0)}%` : ''}
                                labelLine={false}
                            >
                                {statusDistribution.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '10px' }} />
                            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ══ PENDING TASKS LIST ══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-slate-800">Pending Tasks</h3>
                    </div>
                    <button
                        onClick={() => navigate('/tasks')}
                        className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-4 py-1.5 rounded-lg transition"
                    >
                        View All <ChevronRight size={15} />
                    </button>
                </div>

                {pendingTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <CheckCircle size={36} className="text-emerald-400" />
                        <p className="text-slate-600 font-semibold">All caught up! 🎉</p>
                        <p className="text-slate-400 text-sm">No pending tasks in this date range.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="py-2 px-4">Task</th>
                                    <th className="py-2 px-4">Status</th>
                                    <th className="py-2 px-4">Severity</th>
                                    <th className="py-2 px-4">Timeline</th>
                                    <th className="py-2 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-slate-700">
                                {pendingTasks.map(task => {
                                    const isOverdue = task.due_date && task.due_date < new Date().toLocaleDateString('en-CA') && !['APPROVED', 'CANCELLED'].includes(task.status);
                                    return (
                                        <tr key={task.id} className="hover:bg-slate-50">
                                            <td className="py-2 px-4">
                                                <div className="font-medium text-slate-800 truncate max-w-[200px] text-xs">{task.title}</div>
                                                <div className="text-[10px] text-slate-400">ID: {task.id}</div>
                                            </td>
                                            <td className="py-2 px-4">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <Badge variant={task.status}>
                                                        {STATUS_LABEL[task.status] || task.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                    {isOverdue && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">
                                                            Overdue
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2 px-4">
                                                <Badge variant={task.severity}>{task.severity}</Badge>
                                            </td>
                                            <td className="py-2 px-4 text-slate-500 text-[11px] font-medium">
                                                <div>{task.due_date}</div>
                                                {isOverdue && <div className="text-rose-500 text-[9px] font-black uppercase">Overdue ⚠️</div>}
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    {task.status === "NEW" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "START"); }}
                                                            className="px-4 py-1.5 text-[10px] font-black rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-widest"
                                                        >
                                                            Start
                                                        </button>
                                                    )}
                                                    {task.status === "IN_PROGRESS" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "SUBMIT"); }}
                                                            className="px-4 py-1.5 text-[10px] font-black rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 active:scale-95 uppercase tracking-widest"
                                                        >
                                                            Submit
                                                        </button>
                                                    )}
                                                    {task.status === "REWORK" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, "RESTART"); }}
                                                            className="px-4 py-1.5 text-[10px] font-black rounded-xl text-white bg-orange-600 hover:bg-orange-700 transition shadow-lg shadow-orange-100 active:scale-95 uppercase tracking-widest"
                                                        >
                                                            Restart
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default EmployeeDashboard;






