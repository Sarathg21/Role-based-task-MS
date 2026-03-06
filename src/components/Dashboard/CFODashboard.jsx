import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { calculateManagerScore } from '../../utils/performanceEngine';
import ChartPanel from '../Charts/ChartPanel';
import Badge from '../UI/Badge';
import StatsCard from '../UI/StatsCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, Users, CheckSquare, AlertTriangle, ArrowRight,
    BarChart2, Building2, Star, CalendarCheck, Calendar, Loader2
} from 'lucide-react';

/* ─── Helpers ──────────────────────────────────────────────────── */
const DEPT_COLORS = [
    '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316',
];



/* ─── CFO Dashboard ─────────────────────────────────────────────── */
const CFODashboard = () => {
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];
    const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    /* Date range state */
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    /* ── Computed metrics ─── */
    const [dashboardData, setDashboardData] = useState(null);
    const [todayOrgTasks, setTodayOrgTasks] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [dataRes, todayRes, deptsRes] = await Promise.all([
                api.get('/dashboard/cfo'),
                api.get('/dashboard/cfo/today'),
                api.get('/departments')
            ]);
            setDashboardData(dataRes.data);
            setTodayOrgTasks(todayRes.data);
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error("Failed to fetch CFO dashboard data", err);
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
            fetchDashboardData();
        } catch (err) {
            console.error("Failed to update task status", err);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;

        const workloadData = (dashboardData.department_stats || []).map((d, i) => ({
            name: d.department_id,
            fullName: d.department_id,
            Total: d.total_tasks,
            Completed: d.approved_tasks,
            Pending: d.pending_tasks,
            fill: DEPT_COLORS[i % DEPT_COLORS.length],
        }));

        const deptPerformanceData = (dashboardData.department_stats || []).map(d => ({
            name: d.department_id,
            fullName: d.department_id,
            Performance: d.total_tasks > 0 ? Math.round((d.approved_tasks / d.total_tasks) * 100) : 0,
        }));

        return {
            workloadData,
            deptPerformanceData,
            globalStats: {
                totalTasks: dashboardData.total_tasks,
                completedTasks: dashboardData.approved_tasks,
                pendingTasks: dashboardData.pending_tasks,
                overallScore: dashboardData.org_performance_index || 0,
            },
        };
    }, [dashboardData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium text-lg">Loading organization dashboard...</p>
            </div>
        );
    }

    const { workloadData, deptPerformanceData, globalStats } = metrics || {
        workloadData: [],
        deptPerformanceData: [],
        globalStats: { totalTasks: 0, completedTasks: 0, pendingTasks: 0, overallScore: 0 }
    };

    return (
        <div className="space-y-5">

            {/* ══ HEADER WITH DATE RANGE ══ */}
            <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 100%)' }}
            >
                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/25 backdrop-blur-sm p-2.5 rounded-xl">
                            <CalendarCheck size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-white tracking-tight">CFO Overview</h2>
                            <p className="text-violet-200 text-xs mt-0.5">{dateLabel}</p>
                        </div>
                    </div>

                    {/* Date range filter — premium styled */}
                    <div className="flex items-center gap-3 flex-wrap">

                        {/* Glassy date range card */}
                        <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 gap-5 shadow-inner">
                            {/* From */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-violet-100 uppercase tracking-widest flex items-center gap-1.5 opacity-90">
                                    <Calendar size={12} /> From
                                </span>
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    className="text-sm font-semibold bg-transparent text-white border-none outline-none cursor-pointer [color-scheme:dark] w-40 focus:ring-0"
                                />
                            </div>

                            {/* Arrow separator */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/10 shrink-0">
                                <ArrowRight size={14} className="text-violet-100" />
                            </div>

                            {/* To */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-violet-100 uppercase tracking-widest flex items-center gap-1.5 opacity-90">
                                    <Calendar size={12} /> To
                                </span>
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    className="text-sm font-semibold bg-transparent text-white border-none outline-none cursor-pointer [color-scheme:dark] w-40 focus:ring-0"
                                />
                            </div>
                        </div>

                        {/* Active filter badge + clear */}
                        {(fromDate || toDate) && (
                            <button
                                onClick={() => { setFromDate(''); setToDate(''); }}
                                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95"
                            >
                                ✕ Clear
                            </button>
                        )}

                        <button
                            onClick={() => navigate('/tasks')}
                            className="flex items-center gap-2.5 bg-white text-violet-700 hover:bg-violet-50 hover:scale-[1.02] transition-all text-sm font-extrabold px-6 py-3 rounded-xl shadow-xl active:scale-95 shrink-0"
                        >
                            All Tasks <ArrowRight size={16} />
                        </button>

                    </div>
                </div>
            </div>

            {/* ══ GLOBAL STATS ══ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatsCard title="Total Tasks (Org)" value={globalStats.totalTasks} icon={CheckSquare} color="primary" compact />
                <StatsCard title="Completed" value={globalStats.completedTasks} icon={TrendingUp} color="success" compact />
                <StatsCard title="Pending" value={globalStats.pendingTasks} icon={AlertTriangle} color="warning" compact />
                <StatsCard title="Org. Score" value={`${globalStats.overallScore}%`} icon={BarChart2} color="purple" compact />
            </div>

            {/* ══ TOP MANAGERS ══ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-violet-500" />
                    <h3 className="text-base font-semibold text-slate-800">Department Overview</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="py-2 px-3">Department</th>
                                <th className="py-2 px-3 text-center">Total Tasks</th>
                                <th className="py-2 px-3 text-center">Approved</th>
                                <th className="py-2 px-3 text-center">Pending</th>
                                <th className="py-2 px-3 text-center">Performance Index</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(dashboardData.department_stats || []).map((dept) => (
                                <tr key={dept.department_id} className="hover:bg-slate-50">
                                    <td className="py-2 px-3 font-semibold text-slate-700">{dept.department_id}</td>
                                    <td className="py-2 px-3 text-center text-slate-600">{dept.total_tasks}</td>
                                    <td className="py-2 px-3 text-center text-green-600">{dept.approved_tasks}</td>
                                    <td className="py-2 px-3 text-center text-amber-600">{dept.pending_tasks}</td>
                                    <td className="py-2 px-3 text-center">
                                        <Badge variant={dept.total_tasks > 0 && (dept.approved_tasks / dept.total_tasks) >= 0.8 ? 'success' : 'warning'}>
                                            {dept.total_tasks > 0 ? Math.round((dept.approved_tasks / dept.total_tasks) * 100) : 0}%
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══ CHARTS ROW ══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {/* Workload Distribution */}
                <ChartPanel title="Workload Distribution by Department">
                    <BarChart data={workloadData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            formatter={(value, name, props) => [value, name]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Legend />
                        <Bar dataKey="Completed" stackId="a" fill="#10b981" name="Completed" />
                        <Bar dataKey="Pending" stackId="a" fill="#f59e0b" name="Pending" />
                    </BarChart>
                </ChartPanel>

                {/* Department Performance Index */}
                <ChartPanel title="Department Performance Index (%)">
                    <BarChart data={deptPerformanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip
                            formatter={(value) => [`${value}%`, 'Completion Rate']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Bar dataKey="Performance" fill="#8b5cf6" name="Completion %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartPanel>
            </div>

            {/* ══ RECENT PRIORITY TASKS ══ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <Star size={18} className="text-amber-500" />
                    <h3 className="text-base font-semibold text-slate-800">Pending Actions (Org-wide)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                            <tr>
                                <th className="py-3 px-5">ID</th>
                                <th className="py-3 px-5">Task</th>
                                <th className="py-3 px-5">Dept</th>
                                <th className="py-3 px-5">Status</th>
                                <th className="py-3 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(!Array.isArray(todayOrgTasks) || todayOrgTasks.length === 0) ? (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-slate-400 italic">No pending organization-wide tasks found.</td>
                                </tr>
                            ) : (
                                todayOrgTasks.slice(0, 10).map(task => {
                                    const tId = task.task_id || task.id;
                                    return (
                                        <tr key={tId} className="hover:bg-slate-50">
                                            <td className="py-3 px-5 text-xs font-mono text-slate-400">{tId}</td>
                                            <td className="py-3 px-5 font-medium text-slate-700">{task.title}</td>
                                            <td className="py-3 px-5 text-slate-500 text-xs">{task.department_id || task.department}</td>
                                            <td className="py-3 px-5">
                                                <Badge variant={task.status}>{task.status}</Badge>
                                            </td>
                                            <td className="py-3 px-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {task.status === 'SUBMITTED' && (
                                                        <button
                                                            onClick={() => handleStatusChange(tId, 'APPROVE')}
                                                            className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 transition shadow-sm active:scale-95"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => navigate('/tasks')}
                                                        className="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                                                        title="View Details"
                                                    >
                                                        <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CFODashboard;
