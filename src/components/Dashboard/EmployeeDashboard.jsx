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

            {/* ══ EMPLOYEE HEADER — CFO-STYLE CLEAN WHITE ══ */}
            <div className="rounded-[2rem] bg-white shadow-sm border border-slate-100 relative overflow-hidden p-6 mb-2">
                <div className="absolute top-0 right-0 w-72 h-72 bg-violet-50 rounded-full blur-3xl -mr-36 -mt-36 opacity-60" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-50 rounded-full blur-3xl -ml-28 -mb-28 opacity-60" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-violet-200/50">
                            <CalendarCheck size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                My <span className="text-violet-600">Dashboard</span>
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
                                {dateLabel} · Welcome Back, {user?.name?.split(' ')[0] || 'User'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Bar */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 gap-2 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
                            <SearchIcon size={15} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                className="bg-transparent border-none outline-none text-[12px] font-medium placeholder:text-slate-400 text-slate-700 w-44"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Date Range */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 gap-3">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">From</span>
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-slate-700 text-[11px] font-bold outline-none w-[100px] cursor-pointer" />
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">To</span>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-slate-700 text-[11px] font-bold outline-none w-[100px] cursor-pointer" />
                            </div>
                        </div>

                        <button onClick={() => navigate('/tasks')}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5">
                            All Tasks <ArrowRight size={13} className="text-violet-400" />
                        </button>

                        {(fromDate || toDate || searchTerm) && (
                            <button onClick={() => { setFromDate(''); setToDate(''); setSearchTerm(''); }}
                                className="text-[9px] font-black text-slate-400 hover:text-rose-500 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 transition-all uppercase tracking-widest">
                                ✕ Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ PENDING COUNT SUMMARY ══ */}
            <div className="flex items-center justify-between px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600">
                        <Clock size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800 leading-none">Pending Tasks</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {pendingTasks.length} item{pendingTasks.length !== 1 ? 's' : ''} require action
                        </p>
                    </div>
                </div>
                {pendingTasks.length > 0 ? (
                    <div className="flex items-center gap-2">
                        {pendingTasks.slice(0, 3).map(task => (
                            <div key={task.id} onClick={() => navigate('/tasks')}
                                className="hidden md:flex items-center gap-2 bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 rounded-xl px-3 py-1.5 cursor-pointer transition-all group/t">
                                <Badge variant={task.status} className="scale-75 origin-left">{STATUS_LABEL[task.status]}</Badge>
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px] group-hover/t:text-violet-700">{task.title}</span>
                            </div>
                        ))}
                        <button onClick={() => navigate('/tasks')} className="flex items-center gap-1 text-[10px] font-black text-violet-600 hover:text-violet-800 uppercase tracking-widest">
                            View All <ChevronRight size={12} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle size={16} />
                        <span className="text-xs font-bold">All clear!</span>
                    </div>
                )}
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






