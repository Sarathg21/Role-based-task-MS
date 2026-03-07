import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { calculateManagerScore } from '../../utils/performanceEngine';
import Badge from '../UI/Badge';
import ReworkCommentModal from '../Modals/ReworkCommentModal';
import {
    BarChart2, CheckSquare, AlertTriangle, Clock, ArrowRight,
    Calendar, Users, TrendingUp, Medal, CalendarCheck, CheckCircle, Loader2,
    ChevronRight, Plus
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';

const STATUS_LABEL = {
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REWORK: 'Rework',
    CANCELLED: 'Cancelled',
};


/* ─── Small stat card — premium ────────────────────────────── */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { gradient: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-200/50', glow: 'bg-indigo-400' },
        green: { gradient: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-200/50', glow: 'bg-emerald-400' },
        emerald: { gradient: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-200/50', glow: 'bg-emerald-400' },
        amber: { gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-200/50', glow: 'bg-amber-400' },
        orange: { gradient: 'from-orange-500 to-rose-600', shadow: 'shadow-orange-200/50', glow: 'bg-orange-400' },
        blue: { gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200/50', glow: 'bg-blue-400' },
        rose: { gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-200/50', glow: 'bg-rose-400' },
    }[color] || { gradient: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-200/50', glow: 'bg-indigo-400' };

    return (
        <div className="stat-card group animate-fade-in-up py-4 px-5 border border-slate-100/60 shadow-sm hover:shadow-xl transition-all duration-500 bg-white/50 backdrop-blur-sm rounded-[1.5rem] relative overflow-hidden">
            <div className="flex items-center gap-4 relative z-10">
                <div className={`
                    flex-shrink-0 w-11 h-11 rounded-2xl
                    bg-gradient-to-br ${c.gradient}
                    shadow-lg ${c.shadow}
                    flex items-center justify-center
                    transition-all duration-500
                    group-hover:scale-110 group-hover:rotate-6
                `}>
                    <Icon size={22} className="text-white drop-shadow-md" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-2xl font-black text-slate-800 tabular-nums tracking-tighter leading-none group-hover:text-indigo-600 transition-colors duration-300">{value ?? '—'}</div>
                    <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest truncate mt-1.5">{label}</div>
                    {sub && <div className="text-[9px] text-slate-400 font-bold truncate opacity-60 uppercase tracking-tight mt-0.5">{sub}</div>}
                </div>
            </div>
            {/* Subtle glow effect */}
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 ${c.glow} opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.08] transition-opacity duration-700`} />
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${color === 'emerald' || color === 'green' ? 'emerald' : color === 'rose' ? 'rose' : color === 'amber' || color === 'orange' ? 'amber' : 'indigo'}-400 to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
        </div>
    );
};

const ManagerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* ── Date range filter state ─── */
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const [dashboardData, setDashboardData] = useState(null);
    const [todayTeamTasks, setTodayTeamTasks] = useState([]);
    const [reportTeam, setReportTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reworkModalOpen, setReworkModalOpen] = useState(false);
    const [taskForRework, setTaskForRework] = useState(null);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch individually so one failure doesn't kill the whole dashboard
            const dataRes = await api.get('/dashboard/manager').catch(e => { console.warn("Manager stats fail:", e); return { data: {} }; });
            const todayRes = await api.get('/dashboard/manager/today').catch(e => { console.warn("Team today fail:", e); return { data: [] }; });

            setDashboardData(dataRes.data || {});
            const todayTasks = Array.isArray(todayRes.data) ? todayRes.data : [];
            const mappedTasks = todayTasks.map(t => ({
                ...t,
                id: t.task_id || t.id,                          // integer — used in all API URLs
                employee_id: t.assigned_to_emp_id,       // for assignee lookup
                assigned_by: t.assigned_by_emp_id,       // for assigner lookup
                assigneeName: t.assigned_to_name,
                assignerName: t.assigned_by_name,
                severity: (t.priority || t.severity || 'MEDIUM').toUpperCase(),
                department: t.department_name || t.department_id,
            }));
            setTodayTeamTasks(mappedTasks);

            // Fetch manager reports separately — /manager/reports (correct endpoint)
            try {
                const reportRes = await api.get('/manager/reports');
                // API returns { manager_stats: [...] } or array
                const stats = reportRes.data?.manager_stats || reportRes.data || [];
                setReportTeam(Array.isArray(stats) ? stats : []);
            } catch (reportErr) {
                console.warn("Manager reports not available:", reportErr);
                setReportTeam([]);
            }
        } catch (err) {
            console.error("Critical fail in manager dashboard:", err);
            setDashboardData({}); // Allow useMemo to provide fallback numbers
        } finally {
            setLoading(false);
        }
    };

    const handleReworkRequest = (task) => {
        setTaskForRework(task);
        setReworkModalOpen(true);
    };

    const handleReworkConfirm = async (comment) => {
        if (!taskForRework) return;
        setReworkModalOpen(false);
        try {
            await api.post(`/tasks/${taskForRework.id}/transition`, { action: 'REWORK', comment });
            fetchDashboardData();
        } catch (err) {
            console.error('Failed to request rework:', err);
        }
        setTaskForRework(null);
    };

    const handleStatusChange = async (taskId, action) => {
        console.log("ManagerDashboard - handleStatusChange triggered with:", { taskId, action });
        if (!taskId && taskId !== 0) {
            console.error("ManagerDashboard - handleStatusChange: taskId is undefined or invalid!");
            return;
        }
        const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()} this task?`);
        if (!confirmed) return;

        try {
            console.log("ManagerDashboard - Submitting transition API request...");
            await api.post(`/tasks/${taskId}/transition`, { action, comment: "" });
            console.log("ManagerDashboard - Transition successful, refreshing dashboard...");
            fetchDashboardData(); // Refresh dashboard
        } catch (err) {
            console.error("ManagerDashboard - Failed to update task status:", err);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        }
    }, [user?.id]);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;
        const total = dashboardData.total_tasks ?? dashboardData.total ?? 0;
        const approved = dashboardData.approved_tasks ?? dashboardData.approved ?? 0;

        return {
            score: dashboardData.team_performance_index ?? dashboardData.performanceScore ?? 0,
            completionRate: total > 0
                ? Math.round((approved / total) * 100)
                : 0,
            totalReworks: dashboardData.rework_tasks ?? dashboardData.reworks ?? 0,
            pending: dashboardData.pending_tasks ?? dashboardData.pending ?? 0,
            total: total
        };
    }, [dashboardData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium text-lg">Loading team dashboard...</p>
            </div>
        );
    }

    const resolvedMetrics = metrics || { score: 0, completionRate: 0, totalReworks: 0, pending: 0, total: 0 };
    const stats = resolvedMetrics;

    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Build chart data — with guaranteed non-zero fallback
    const DEMO_STATUS = [
        { name: 'New', value: 4, fill: '#3b82f6' },
        { name: 'In Progress', value: 6, fill: '#8b5cf6' },
        { name: 'Submitted', value: 3, fill: '#f59e0b' },
        { name: 'Approved', value: 8, fill: '#10b981' },
        { name: 'Rework', value: 2, fill: '#ef4444' },
    ];
    const DEMO_MEMBERS = [
        { name: 'Alice', Assigned: 8, Completed: 6 },
        { name: 'Bob', Assigned: 5, Completed: 3 },
        { name: 'Carol', Assigned: 7, Completed: 7 },
        { name: 'Dave', Assigned: 4, Completed: 2 },
    ];
    const DEMO_RANKINGS = [
        { emp_id: 101, name: 'Alice Smith', role: 'Sr. Associate', tasks_assigned: 12, tasks_completed: 10 },
        { emp_id: 102, name: 'Bob Johnson', role: 'Associate', tasks_assigned: 9, tasks_completed: 7 },
        { emp_id: 103, name: 'Charlie Brown', role: 'Junior dev', tasks_assigned: 15, tasks_completed: 12 },
    ];

    const rawStatusData = (dashboardData && Object.keys(dashboardData).length > 2) ? [
        { name: 'New', value: dashboardData.new_tasks || 0, fill: '#3b82f6' },
        { name: 'In Progress', value: dashboardData.in_progress_tasks || 0, fill: '#8b5cf6' },
        { name: 'Submitted', value: dashboardData.submitted_tasks || 0, fill: '#f59e0b' },
        { name: 'Approved', value: dashboardData.approved_tasks || 0, fill: '#10b981' },
        { name: 'Rework', value: dashboardData.rework_tasks || 0, fill: '#ef4444' },
    ].filter(d => d.value > 0) : [];

    const finalPieData = rawStatusData.length > 0 ? rawStatusData : DEMO_STATUS;
    const isPieDemo = finalPieData === DEMO_STATUS;

    // Use fetched report team if available, otherwise use demo rankings
    const rankingSource = reportTeam.length > 0 ? reportTeam : DEMO_RANKINGS;
    const isRankingDemo = reportTeam.length === 0;

    const rankedTeam = rankingSource.map((m, idx) => ({
        ...m,
        id: m.emp_id || m.id,
        name: m.name,
        role: m.role || 'Team Member',
        assigned: m.tasks_assigned || m.assigned || 0,
        completed: m.tasks_completed || m.completed || 0,
        rank: idx + 1
    }));

    const rawMemberData = reportTeam.length > 0
        ? reportTeam.map(m => ({
            name: m.name?.split(' ')[0] || String(m.emp_id),
            Assigned: m.tasks_assigned || 0,
            Completed: m.tasks_completed || 0,
        }))
        : [];

    const finalMemberData = rawMemberData.some(d => d.Assigned > 0) ? rawMemberData : DEMO_MEMBERS;
    const isMemberDemo = finalMemberData === DEMO_MEMBERS;

    return (
        <div className="space-y-4">


            {/* ══ MANAGER PREMIUM HERO — ENHANSIVE TYPE ══ */}
            <div
                className="rounded-[2.5rem] overflow-hidden shadow-2xl relative mb-10 border border-white/10 mesh-gradient-premium"
            >
                {/* Decorative Premium Blobs — High Fidelity */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-400/20 rounded-full blur-[100px] animate-blob" />
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-400/20 rounded-full blur-[100px] animate-blob [animation-delay:2s]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-64 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />

                <div className="relative z-10 px-12 pt-10 pb-6 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col items-center lg:items-start gap-5">
                        <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-[1.75rem] shadow-2xl border border-white/20 animate-float flex items-center justify-center w-16 h-16">
                            <Users size={32} className="text-white drop-shadow-glow" />
                        </div>
                        <div className="text-center lg:text-left">
                            <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-2xl leading-tight text-glow">
                                Unit <span className="text-indigo-300">Operations</span> & <br className="hidden lg:block" /> Team <span className="text-emerald-300">Performance</span>
                            </h2>
                            <div className="flex items-center justify-center lg:justify-start gap-3 mt-3">
                                <div className="h-0.5 w-10 bg-indigo-400 rounded-full shadow-glow"></div>
                                <p className="text-indigo-100 font-bold uppercase tracking-[0.4em] text-[9px] opacity-70">
                                    {user.department || 'Management'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center lg:items-end gap-5 w-full lg:w-auto">
                        {/* Date Picker Group - Premium Glass Dark */}
                        <div className="flex items-center glass-premium-dark rounded-xl p-1 border border-white/10 shadow-2xl min-w-[320px]">
                            <div className="flex-1 flex flex-col px-4 py-1.5">
                                <span className="text-[8px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-0.5 opacity-60">Capture Start</span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-white text-xs font-bold border-none outline-none w-full uppercase cursor-pointer focus:ring-0 placeholder:text-white/20"
                                />
                            </div>
                            <div className="w-px h-8 bg-white/10 mx-0.5" />
                            <div className="flex-1 flex flex-col px-4 py-1.5">
                                <span className="text-[8px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-0.5 opacity-60">Capture End</span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-white text-xs font-bold border-none outline-none w-full uppercase cursor-pointer focus:ring-0 placeholder:text-white/20"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 w-full lg:w-auto">
                            {/* Assign Task Button - High Gloss Premium */}
                            <button
                                onClick={() => navigate('/tasks/assign')}
                                className="flex-1 lg:flex-none lg:min-w-[200px] bg-white text-indigo-900 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-2 group relative overflow-hidden"
                            >
                                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                <span>Assign New Task</span>
                            </button>

                            {(fromDate || toDate) && (
                                <button
                                    onClick={() => { setFromDate(''); setToDate(''); }}
                                    className="bg-white/5 hover:bg-rose-500/20 text-white text-[9px] font-black px-5 py-4 rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 uppercase tracking-widest"
                                >
                                    ✕ Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Status Command Island — Optimized Fit */}
                <div className="relative z-10 mx-6 mb-8 px-12 py-8 flex flex-wrap items-center justify-around gap-6 bg-white/[0.08] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-1.5 items-center md:items-start">
                        <span className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.3em] opacity-80">Managed Units</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white tabular-nums leading-none leading-[0.8]">{reportTeam.length}</span>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Members</span>
                        </div>
                    </div>
                    <div className="hidden lg:block w-px h-12 bg-white/10 self-center" />
                    <div className="flex flex-col gap-1.5 items-center md:items-start">
                        <span className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.3em] opacity-80">Active Pipeline</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-indigo-300 tabular-nums leading-none leading-[0.8]">{stats.pending}</span>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tasks</span>
                        </div>
                    </div>
                    <div className="hidden lg:block w-px h-12 bg-white/10 self-center" />
                    <div className="flex flex-col gap-1.5 items-center md:items-start">
                        <span className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.3em] opacity-80">Avg Efficiency</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-emerald-400 tabular-nums leading-none leading-[0.8]">{stats.completionRate}%</span>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Index</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ TEAM TASKS DUE TODAY ══ */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
                <div className="px-10 py-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/20">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl shadow-sm border border-indigo-200">
                            <CalendarCheck size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Active Team Directives</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">{todayTeamTasks.length} Priority Units Requiring Oversight</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/tasks')}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all uppercase tracking-widest flex items-center gap-2 shadow-sm"
                    >
                        Management Console <ChevronRight size={14} />
                    </button>
                </div>

                <div className="p-10">
                    {todayTeamTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed border-slate-50 rounded-[2rem] bg-slate-50/30">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                                <CheckCircle size={40} />
                            </div>
                            <div className="text-center">
                                <p className="text-slate-800 font-black uppercase tracking-widest">Registry Clear</p>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">All unit objectives for today are resolved</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {todayTeamTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group/card relative flex flex-col min-h-[200px]"
                                >
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <Badge variant={task.severity} className="text-[9px] font-black px-3 py-1 uppercase tracking-widest">{task.severity}</Badge>
                                        <span className="text-[10px] font-black text-slate-300 tabular-nums uppercase tracking-widest">ID {task.id}</span>
                                    </div>

                                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-4 group-hover/card:text-indigo-600 transition-colors duration-300 line-clamp-2">
                                        {task.title}
                                    </h4>

                                    <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center text-xs font-black shadow-sm group-hover/card:scale-110 transition-transform">
                                                {(task.assigneeName || 'U').charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-black text-slate-800 truncate">{task.assigneeName || 'Unassigned'}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{task.status === 'SUBMITTED' ? 'Awaiting Review' : 'Processing'}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {task.status === 'SUBMITTED' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'APPROVE'); }}
                                                    className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-600 hover:text-white hover:scale-110 transition-all duration-300 shadow-sm"
                                                    title="Approve"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                            )}
                                            {task.status === 'SUBMITTED' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleReworkRequest(task); }}
                                                    className="w-10 h-10 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-600 hover:text-white hover:scale-110 transition-all duration-300 shadow-sm"
                                                    title="Rework"
                                                >
                                                    <AlertTriangle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ STATS GRID ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 stagger-children px-1 lg:px-0">
                <Stat
                    label="Unit Index"
                    value={stats.score}
                    sub="Overall efficiency"
                    icon={BarChart2}
                    color="violet"
                />
                <Stat
                    label="Resolution Rate"
                    value={`${stats.completionRate}%`}
                    sub={`${stats.total} Active Units`}
                    icon={TrendingUp}
                    color="green"
                />
                <Stat
                    label="Rework Requests"
                    value={stats.totalReworks}
                    sub="Correction Cycle"
                    icon={AlertTriangle}
                    color="amber"
                />
                <Stat
                    label="Managed Load"
                    value={stats.pending}
                    sub="Pending Decision"
                    icon={Clock}
                    color="orange"
                />
            </div>

            {/* ══ CHARTS ROW ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stagger-children">

                {/* Task Status Distribution — Pie chart */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 glass-premium relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Status Distribution</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">Real-time Unit Lifecycle Tracking</p>
                        </div>
                        {isPieDemo && <span className="text-[10px] bg-amber-50 text-amber-500 border border-amber-100 px-3 py-1 rounded-full font-black uppercase tracking-widest">Sample</span>}
                    </div>
                    <div className="relative z-10">
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={finalPieData}
                                    cx="50%" cy="50%"
                                    outerRadius={90}
                                    innerRadius={55}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {finalPieData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v, n) => [v + ' Units', n]}
                                    contentStyle={{ borderRadius: '1rem', border: 'none', background: 'rgba(15,23,42,0.95)', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Team Member Performance — Bar chart */}
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 glass-premium relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Asset Efficiency</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">Comparative Productivity Analysis</p>
                        </div>
                        {isMemberDemo && <span className="text-[10px] bg-amber-50 text-amber-500 border border-amber-100 px-3 py-1 rounded-full font-black uppercase tracking-widest">Sample</span>}
                    </div>
                    <div className="relative z-10">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={finalMemberData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }} barSize={14}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                                    contentStyle={{ borderRadius: '1rem', border: 'none', background: 'rgba(15,23,42,0.95)', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                                <Bar dataKey="Assigned" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Assigned" />
                                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ══ BOTTOM ACTION BAR ══ */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={() => navigate('/tasks')}
                    className="flex items-center gap-4 bg-slate-900 shadow-2xl shadow-indigo-200 hover:bg-slate-800 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.03] active:scale-[0.97]"
                >
                    Management Console Full View <ArrowRight size={20} className="text-indigo-400" />
                </button>
            </div>

            {/* ══ TEAM PERFORMANCE RANKING TABLE ══ */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
                <div className="flex items-center gap-4 px-10 py-8 border-b border-slate-100 bg-slate-50/20">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm border border-amber-200">
                        <Medal size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Asset Merit Registry</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">{user.department} Unit Performance Ranking</p>
                    </div>
                    {isRankingDemo && <span className="ml-4 text-[10px] bg-amber-50 text-amber-500 border border-amber-100 px-3 py-1 rounded-full font-black uppercase tracking-widest">Sample</span>}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm table-fixed">
                        <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                            <tr>
                                <th className="py-5 px-10 w-28">Merit Rank</th>
                                <th className="py-5 px-10">Unit Identity</th>
                                <th className="py-5 px-10">Role Path</th>
                                <th className="py-5 px-10 text-center w-36">Directives</th>
                                <th className="py-5 px-10 text-center w-36">Resolved</th>
                                <th className="py-5 px-10 text-center">Efficiency</th>
                                <th className="py-5 px-10 w-36">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                            {rankedTeam.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                <Users size={32} />
                                            </div>
                                            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No active units registered</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rankedTeam.map(member => {
                                    const rate = member.assigned > 0
                                        ? Math.round((member.completed / member.assigned) * 100)
                                        : 0;
                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="py-4 px-10">
                                                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-black shadow-sm ${member.rank === 1 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                    member.rank === 2 ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                                                        member.rank === 3 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                                            'bg-slate-50 text-slate-400 border border-slate-200'
                                                    }`}>
                                                    #{member.rank}
                                                </span>
                                            </td>
                                            <td className="py-4 px-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                                                        {(member.name || 'U').charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-slate-800 truncate">{member.name || 'Unknown'}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID {member.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-10 text-slate-500 font-bold uppercase text-[10px] tracking-widest">{member.role}</td>
                                            <td className="py-4 px-10 text-center font-black text-slate-700 tabular-nums">{member.assigned}</td>
                                            <td className="py-4 px-10 text-center font-black text-emerald-600 tabular-nums">{member.completed}</td>
                                            <td className="py-4 px-10 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${rate >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                            style={{ width: `${rate}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-700 tabular-nums">{rate}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-10">
                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${rate >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : rate >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                    {rate >= 80 ? 'Elite' : rate >= 50 ? 'Standard' : 'Review'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Rework Comment Modal */}
            <ReworkCommentModal
                isOpen={reworkModalOpen}
                onClose={() => setReworkModalOpen(false)}
                onConfirm={handleReworkConfirm}
                taskTitle={taskForRework?.title || ''}
            />
        </div>
    );
};

export default ManagerDashboard;
