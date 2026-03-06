import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { calculateManagerScore } from '../../utils/performanceEngine';
import Badge from '../UI/Badge';
import {
    BarChart2, CheckSquare, AlertTriangle, Clock, ArrowRight,
    Calendar, Users, TrendingUp, Medal, CalendarCheck, CheckCircle, Loader2
} from 'lucide-react';

const STATUS_LABEL = {
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REWORK: 'Rework',
    CANCELLED: 'Cancelled',
};


/* ─── Small stat card ──────────────────────────────────────── */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const colors = {
        violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'bg-violet-100' },
        green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'bg-green-100' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'bg-amber-100' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' },
        blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'bg-blue-100' },
        rose: { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'bg-rose-100' },
    };
    const c = colors[color] || colors.violet;
    return (
        <div className={`${c.bg} rounded-2xl p-4 flex items-center gap-4`}>
            <div className={`${c.icon} p-3 rounded-xl`}>
                <Icon size={20} className={c.text} />
            </div>
            <div>
                <div className={`text-2xl font-extrabold ${c.text}`}>{value}</div>
                <div className="text-xs font-semibold text-slate-500 leading-tight">{label}</div>
                {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
            </div>
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

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [dataRes, todayRes] = await Promise.all([
                api.get('/dashboard/manager'),
                api.get('/dashboard/manager/today'),
            ]);
            setDashboardData(dataRes.data);
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
            console.log("ManagerDashboard - Mapped Today Team Tasks:", mappedTasks);
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
            console.error("Failed to fetch manager dashboard data", err);
        } finally {
            setLoading(false);
        }
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
        return {
            score: dashboardData.team_performance_index || 0,
            completionRate: dashboardData.total_tasks > 0
                ? Math.round((dashboardData.approved_tasks / dashboardData.total_tasks) * 100)
                : 0,
            totalReworks: dashboardData.rework_tasks || 0,
            pending: dashboardData.pending_tasks || 0,
            total: dashboardData.total_tasks || 0
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

    const rankedTeam = reportTeam.map((m, idx) => ({
        ...m,
        id: m.emp_id,
        name: m.name,
        assigned: m.tasks_assigned,
        completed: m.tasks_completed,
        rank: idx + 1
    }));

    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="space-y-6">

            {/* ══ TODAY'S TASKS HERO ══ */}
            <div
                className="rounded-2xl overflow-hidden shadow-xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 80%, #c4b5fd 100%)' }}
            >
                <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/30 backdrop-blur-sm p-2.5 rounded-xl">
                            <CalendarCheck size={22} className="text-white drop-shadow" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-sm">Team's Tasks Today</h2>
                            <p className="text-violet-200 text-xs mt-0.5">{dateLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center bg-white/25 backdrop-blur rounded-xl px-5 py-2">
                            <div className="text-3xl font-black text-white">{todayTeamTasks.length}</div>
                            <div className="text-violet-200 text-[10px] uppercase tracking-widest font-semibold">Due Today</div>
                        </div>
                        <button
                            onClick={() => navigate('/tasks')}
                            className="flex items-center gap-2 bg-white text-violet-700 hover:bg-violet-50 hover:scale-105 transition-all text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg active:scale-95"
                        >
                            View All <ArrowRight size={15} />
                        </button>
                    </div>
                </div>

                <div className="mx-6 border-t border-white/30" />

                <div className="p-5">
                    {todayTeamTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 bg-white/20 backdrop-blur rounded-2xl">
                            <CheckCircle size={38} className="text-white drop-shadow" />
                            <p className="text-white font-bold text-lg drop-shadow-sm">Team is on track! 🎉</p>
                            <p className="text-violet-200 text-sm">No team tasks due today.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {todayTeamTasks.map(task => {
                                const sevColor =
                                    task.priority === 'HIGH' ? { pill: 'bg-red-500 text-white', border: 'border-l-red-400' } :
                                        task.priority === 'MEDIUM' ? { pill: 'bg-amber-500 text-white', border: 'border-l-amber-400' } :
                                            { pill: 'bg-emerald-500 text-white', border: 'border-l-emerald-400' };
                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate('/tasks')}
                                        className={`bg-white rounded-xl p-4 shadow-lg cursor-pointer hover:scale-[1.03] hover:shadow-xl transition-all border-l-4 ${sevColor.border} flex flex-col justify-between`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant={task.severity}>
                                                    {task.severity}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400 font-semibold">{task.id}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-sm leading-snug mb-0.5 truncate">{task.title}</h4>
                                            <p className="text-slate-400 text-xs mb-2 truncate">{task.description}</p>
                                            <div className="text-[10px] text-slate-500 font-medium truncate mb-3">
                                                Assigned to: <span className="font-semibold text-slate-700">{task.assigneeName || task.employee_id}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-slate-50">
                                            <div className="flex gap-1.5">
                                                {task.status === 'SUBMITTED' && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'APPROVE'); }}
                                                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-sm active:scale-95"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'REWORK'); }}
                                                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-orange-500 hover:bg-orange-600 transition shadow-sm active:scale-95"
                                                        >
                                                            Rework
                                                        </button>
                                                    </>
                                                )}
                                                {task.status === 'NEW' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'CANCEL'); }}
                                                        className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-500 hover:bg-rose-600 transition shadow-sm active:scale-95"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                            <Badge variant={task.status}>
                                                {STATUS_LABEL[task.status] || task.status.replace(/_/g, ' ')}
                                            </Badge>
                                        </div>
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
                        <h2 className="text-xl font-bold text-slate-800">Manager Dashboard</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{user.department} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>

                    {/* Date range — premium styled */}
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

            {/* ══ STATS GRID ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat
                    label="Team Score"
                    value={stats.score}
                    sub="Overall performance"
                    icon={BarChart2}
                    color="violet"
                />
                <Stat
                    label="Completion Rate"
                    value={`${stats.completionRate}%`}
                    sub={`${stats.total} total tasks`}
                    icon={TrendingUp}
                    color="green"
                />
                <Stat
                    label="Total Reworks"
                    value={stats.totalReworks}
                    sub="Corrections requested"
                    icon={AlertTriangle}
                    color="amber"
                />
                <Stat
                    label="Pending"
                    value={stats.pending}
                    sub="Active tasks"
                    icon={Clock}
                    color="orange"
                />
            </div>

            {/* ══ VIEW ALL TEAM TASKS BUTTON ══ */}
            <div className="flex justify-end">
                <button
                    onClick={() => navigate('/tasks')}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-sm hover:shadow active:scale-95"
                >
                    View All Team Tasks <ArrowRight size={16} />
                </button>
            </div>

            {/* ══ TEAM PERFORMANCE RANKING TABLE ══ */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                    <Medal size={18} className="text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-800">Team Performance Ranking</h3>
                    <span className="ml-auto text-xs text-slate-400 font-medium">{user.department}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium">
                            <tr>
                                <th className="py-3 px-5">Rank</th>
                                <th className="py-3 px-5">Employee</th>
                                <th className="py-3 px-5">Role</th>
                                <th className="py-3 px-5 text-center">Tasks Assigned</th>
                                <th className="py-3 px-5 text-center">Tasks Completed</th>
                                <th className="py-3 px-5 text-center">Rate</th>
                                <th className="py-3 px-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {rankedTeam.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="py-8 text-center text-slate-400">
                                        No team members found.
                                    </td>
                                </tr>
                            )}
                            {rankedTeam.map(member => {
                                const rate = member.assigned > 0
                                    ? Math.round((member.completed / member.assigned) * 100)
                                    : 0;
                                return (
                                    <tr key={member.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-5">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${member.rank === 1 ? 'bg-amber-100 text-amber-700' :
                                                member.rank === 2 ? 'bg-slate-200 text-slate-600' :
                                                    member.rank === 3 ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                #{member.rank}
                                            </span>
                                        </td>
                                        <td className="py-3 px-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                    {(member.name || 'U').charAt(0)}
                                                </div>
                                                <span className="font-medium truncate">{member.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-5 text-slate-500">{member.role}</td>
                                        <td className="py-3 px-5 text-center font-semibold text-slate-700">{member.assigned}</td>
                                        <td className="py-3 px-5 text-center font-semibold text-green-700">{member.completed}</td>
                                        <td className="py-3 px-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-violet-500"
                                                        style={{ width: `${rate}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600">{rate}%</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-5">
                                            <Badge variant={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'}>
                                                {rate >= 80 ? 'Excellent' : rate >= 50 ? 'Average' : 'Needs Help'}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default ManagerDashboard;
