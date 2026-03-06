import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { calculateEmployeeScore } from '../../utils/performanceEngine';
import Badge from '../UI/Badge';
import ChartPanel from '../Charts/ChartPanel';
import {
    TrendingUp, CheckCircle, Clock, AlertCircle,
    ThumbsUp, Calendar, ArrowRight, ChevronRight, CalendarCheck, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

/* ─── Helpers ─────────────────────────────────────────────── */
const TERMINAL = ['APPROVED', 'CANCELLED'];

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

/* Small stat tile */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'bg-violet-100' },
        green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'bg-green-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'bg-blue-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'bg-amber-100' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' },
        teal: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'bg-teal-100' },
    }[color] || { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'bg-violet-100' };

    return (
        <div className={`${c.bg} rounded-2xl p-4 flex items-center gap-4`}>
            <div className={`${c.icon} p-3 rounded-xl flex-shrink-0`}>
                <Icon size={20} className={c.text} />
            </div>
            <div className="min-w-0">
                <div className={`text-2xl font-extrabold ${c.text} truncate`}>{value}</div>
                <div className="text-xs font-semibold text-slate-500 leading-tight">{label}</div>
                {sub && <div className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</div>}
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

    const [dashboardData, setDashboardData] = useState(null);
    const [todayTasks, setTodayTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [dataRes, todayRes] = await Promise.all([
                api.get('/dashboard/employee'),
                api.get('/dashboard/employee/today')
            ]);
            setDashboardData(dataRes.data);
            const todayT = Array.isArray(todayRes.data) ? todayRes.data : [];
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
    }, [user?.id]);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;

        const currentScore = dashboardData.performance_index || 0;

        // Mock status distribution based on dashboard summary if backend doesn't provide full list
        const statusDistribution = [
            { name: 'Approved', value: dashboardData.approved_tasks || 0, color: STATUS_COLORS.APPROVED },
            { name: 'Pending', value: dashboardData.pending_tasks || 0, color: STATUS_COLORS.IN_PROGRESS },
            { name: 'Overdue', value: dashboardData.overdue_tasks || 0, color: STATUS_COLORS.REWORK },
        ];

        const performanceTrend = [
            { name: 'Target', score: 100 },
            { name: 'Current', score: currentScore },
        ];

        return {
            score: currentScore,
            stats: {
                total: dashboardData.total_tasks || 0,
                completedOrSub: (dashboardData.total_tasks || 0) - (dashboardData.pending_tasks || 0),
                approved: dashboardData.approved_tasks || 0,
                pending: dashboardData.pending_tasks || 0,
                overdue: dashboardData.overdue_tasks || 0,
                dateRangeSub: 'Monthly Analytics',
            },
            performanceTrend,
            statusDistribution,
        };
    }, [dashboardData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium text-lg">Loading your dashboard...</p>
            </div>
        );
    }

    const { score, stats, performanceTrend, statusDistribution } = metrics || {
        score: 0,
        stats: { total: 0, completedOrSub: 0, approved: 0, pending: 0, overdue: 0, dateRangeSub: '' },
        performanceTrend: [],
        statusDistribution: []
    };

    // Derive pending tasks list from todayTasks (non-terminal)
    const pendingTasks = todayTasks.filter(t => !TERMINAL.includes(t.status));

    const dateLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    return (
        <div className="space-y-6">

            {/* ══ TODAY'S TASKS HERO ══ */}
            <div
                className="rounded-2xl overflow-hidden shadow-xl"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 35%, #fbbf24 80%, #facc15 100%)' }}
            >
                {/* Banner header */}
                <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/30 backdrop-blur-sm p-2.5 rounded-xl">
                            <CalendarCheck size={22} className="text-white drop-shadow" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm">Today's Tasks</h2>
                            <p className="text-orange-100 text-xs mt-0.5">{dateLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center bg-white/25 backdrop-blur rounded-xl px-5 py-2">
                            <div className="text-3xl font-black text-white">{todayTasks.length}</div>
                            <div className="text-orange-100 text-[10px] uppercase tracking-widest font-semibold">Due Today</div>
                        </div>
                        <button
                            onClick={() => navigate('/tasks')}
                            className="flex items-center gap-2 bg-white text-orange-600 hover:bg-orange-50 hover:scale-105 transition-all text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg active:scale-95"
                        >
                            View All <ArrowRight size={15} />
                        </button>
                    </div>
                </div>

                <div className="mx-6 border-t border-white/30" />

                {/* Task cards */}
                <div className="p-5">
                    {todayTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 bg-white/20 backdrop-blur rounded-2xl">
                            <CheckCircle size={38} className="text-white drop-shadow" />
                            <p className="text-white font-bold text-lg drop-shadow-sm">All clear for today! 🎉</p>
                            <p className="text-orange-100 text-sm">No tasks due today. Keep it up!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {todayTasks.map(task => {
                                const sev = (task.severity || 'LOW').toUpperCase();
                                const sevColor =
                                    sev === 'HIGH' ? { pill: 'bg-red-500 text-white', border: 'border-l-red-400' } :
                                        sev === 'MEDIUM' ? { pill: 'bg-amber-500 text-white', border: 'border-l-amber-400' } :
                                            { pill: 'bg-emerald-500 text-white', border: 'border-l-emerald-400' };
                                const statusCls = STATUS_COLORS[task.status]
                                    ? `bg-[${STATUS_COLORS[task.status]}]` : 'bg-slate-100 text-slate-600';
                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate('/tasks')}
                                        className={`bg-white rounded-xl p-4 shadow-lg cursor-pointer hover:scale-[1.03] hover:shadow-xl transition-all border-l-4 ${sevColor.border}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant={task.severity}>
                                                {task.severity}
                                            </Badge>
                                            <span className="text-[10px] text-slate-400 font-semibold">{task.id}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm leading-snug mb-0.5 truncate">{task.title}</h4>
                                        <p className="text-slate-500 text-xs truncate mb-3">{task.description}</p>
                                        <Badge variant={task.status}>
                                            {STATUS_LABEL[task.status] || task.status.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">My Dashboard</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{dateLabel}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Glassy date range card */}
                        <div className="flex items-center bg-violet-50 border border-violet-100 rounded-2xl px-4 py-2.5 gap-3 shadow-sm">
                            {/* From */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={10} /> From
                                </span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="text-sm font-medium bg-transparent text-violet-800 border-none outline-none cursor-pointer w-36 focus:ring-0"
                                />
                            </div>
                            {/* Arrow separator */}
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100">
                                <ArrowRight size={12} className="text-violet-400" />
                            </div>
                            {/* To */}
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest flex items-center gap-1">
                                    <Calendar size={10} /> To
                                </span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="text-sm font-medium bg-transparent text-violet-800 border-none outline-none cursor-pointer w-36 focus:ring-0"
                                />
                            </div>
                        </div>
                        {/* Active filter — clear pill */}
                        {(fromDate || toDate) && (
                            <button
                                onClick={() => { setFromDate(''); setToDate(''); }}
                                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                            >
                                ✕ Clear Filter
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ STAT CARDS ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Stat
                    label="Performance Score"
                    value={score}
                    sub="+5.75 vs last month"
                    icon={TrendingUp}
                    color="violet"
                />
                <Stat
                    label="Assigned Tasks"
                    value={stats.total}
                    sub={stats.dateRangeSub}
                    icon={Clock}
                    color="blue"
                />
                <Stat
                    label="Completed / Submitted"
                    value={stats.completedOrSub}
                    sub="Done or awaiting review"
                    icon={CheckCircle}
                    color="teal"
                />
                <Stat
                    label="Approved"
                    value={stats.approved}
                    sub="Manager approved"
                    icon={ThumbsUp}
                    color="green"
                />
                <Stat
                    label="Pending"
                    value={stats.pending}
                    sub="Active tasks"
                    icon={AlertCircle}
                    color="amber"
                />
            </div>

            {/* ══ CHARTS ROW ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Chart A — Performance Trend */}
                <ChartPanel title="Performance Trend">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={performanceTrend} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={v => [`${v}`, 'Score']} />
                            <Bar dataKey="score" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartPanel>

                {/* Chart B — Status Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-800 text-lg mb-6">Task Status Distribution</h3>
                    <div style={{ width: '100%', height: 240, minWidth: 0 }}>
                        {statusDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={statusDistribution}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, value }) => `${name}: ${value}`}
                                        labelLine={false}
                                    >
                                        {statusDistribution.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, name) => [v, name]} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                No tasks in selected range
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ══ PENDING TASKS LIST ══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-800">Pending Tasks</h3>
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
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                                <tr>
                                    <th className="py-3 px-5">Task</th>
                                    <th className="py-3 px-5">Status</th>
                                    <th className="py-3 px-5">Severity</th>
                                    <th className="py-3 px-5">Assigned</th>
                                    <th className="py-3 px-5">Due Date</th>
                                    <th className="py-3 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {pendingTasks.map(task => {
                                    const isOverdue = task.dueDate < new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                                    return (
                                        <tr key={task.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-5">
                                                <div className="font-medium text-slate-800 truncate max-w-[200px]">{task.title}</div>
                                                <div className="text-xs text-slate-400">{task.id}</div>
                                            </td>
                                            <td className="py-3 px-5">
                                                <Badge variant={task.status}>
                                                    {STATUS_LABEL[task.status] || task.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-5">
                                                <Badge variant={task.severity}>
                                                    {task.severity}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-5 text-slate-500 text-xs">
                                                {task.assigned_date || task.created_at
                                                    ? new Date(task.assigned_date || task.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            <td className="py-3 px-5">
                                                <span className={`text-xs font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-600'}`}>
                                                    {task.due_date} {isOverdue && '⚠️'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {task.status === "NEW" && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusChange(task.id, "START");
                                                            }}
                                                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 transition shadow-sm active:scale-95 whitespace-nowrap"
                                                        >
                                                            Start
                                                        </button>
                                                    )}
                                                    {task.status === "IN_PROGRESS" && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusChange(task.id, "SUBMIT");
                                                            }}
                                                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-amber-500 hover:bg-amber-600 transition shadow-sm active:scale-95 whitespace-nowrap"
                                                        >
                                                            Submit
                                                        </button>
                                                    )}
                                                    {task.status === "REWORK" && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusChange(task.id, "RESTART");
                                                            }}
                                                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 transition shadow-sm active:scale-95 whitespace-nowrap"
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
