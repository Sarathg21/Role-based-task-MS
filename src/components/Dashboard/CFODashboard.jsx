import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ChartPanel from '../Charts/ChartPanel';
import Badge from '../UI/Badge';
import StatsCard from '../UI/StatsCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    TrendingUp, TrendingDown, Users, CheckSquare, AlertTriangle, ArrowRight,
    BarChart2, Building2, Star, CalendarCheck, Calendar, Loader2, Plus, CheckCircle
} from 'lucide-react';

/* ─── Helpers ──────────────────────────────────────────────────── */
const DEPT_COLORS = [
    '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316',
];

const CFODashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [todayOrgTasks, setTodayOrgTasks] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    /* ── Date range filter state ─── */
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const fetchDashboardData = async () => {
        setLoading(true);
        const params = {};
        if (fromDate) params.start_date = fromDate;
        if (toDate) params.end_date = toDate;

        try {
            const [dataRes, todayRes, deptsRes] = await Promise.all([
                api.get('/dashboard/cfo', { params }).catch(e => ({ data: {} })),
                api.get('/dashboard/cfo/today', { params }).catch(e => ({ data: [] })),
                api.get('/departments').catch(e => ({ data: [] }))
            ]);

            setDashboardData(dataRes.data || {});
            setTodayOrgTasks(Array.isArray(todayRes.data) ? todayRes.data : []);
            setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
        } catch (err) {
            console.error("Critical fail in CFO dashboard:", err);
            setDashboardData({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [fromDate, toDate]);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;

        const rawDepts = dashboardData.department_stats || dashboardData.dept_stats || [];
        const deptSource = rawDepts.length > 0 ? rawDepts : [
            { department_id: 'Finance', total_tasks: 0, approved_tasks: 0, pending_tasks: 0 },
            { department_id: 'Ops', total_tasks: 0, approved_tasks: 0, pending_tasks: 0 }
        ];

        const workloadData = deptSource.map((d, i) => ({
            name: d.department_id || d.name || 'Unknown',
            Completed: d.approved_tasks || d.completed || 0,
            Pending: d.pending_tasks || d.pending || 0,
            fill: DEPT_COLORS[i % DEPT_COLORS.length],
        }));

        const deptPerformanceData = deptSource.map(d => ({
            name: d.department_id || d.name || 'Unknown',
            Performance: (d.total_tasks || d.total) > 0
                ? Math.round(((d.approved_tasks || d.completed || 0) / (d.total_tasks || d.total)) * 100)
                : 0,
        }));

        const orgStatusData = [
            { name: 'Approved', value: dashboardData.approved_tasks || dashboardData.completed || 0, fill: '#10b981' },
            { name: 'Pending', value: dashboardData.pending_tasks || dashboardData.pending || 0, fill: '#f59e0b' },
            { name: 'Rework', value: dashboardData.rework_tasks || dashboardData.rework || 0, fill: '#ef4444' },
            { name: 'In Progress', value: dashboardData.in_progress_tasks || dashboardData.in_progress || 0, fill: '#8b5cf6' },
            { name: 'New', value: dashboardData.new_tasks || dashboardData.new || 0, fill: '#3b82f6' },
        ].filter(d => d.value > 0);

        const sortedPerformance = [...deptPerformanceData].sort((a, b) => b.Performance - a.Performance);
        const topDept = sortedPerformance[0] || { name: 'N/A', Performance: 0 };
        const underperformingDept = sortedPerformance.length > 1 ? sortedPerformance[sortedPerformance.length - 1] : { name: 'N/A', Performance: 0 };

        return {
            workloadData,
            deptPerformanceData,
            orgStatusData,
            topDept,
            underperformingDept,
            globalStats: {
                totalTasks: dashboardData.total_tasks ?? dashboardData.total ?? 0,
                completedTasks: dashboardData.approved_tasks ?? dashboardData.approved ?? 0,
                pendingTasks: dashboardData.pending_tasks ?? dashboardData.pending ?? 0,
                overallScore: dashboardData.org_performance_index ?? dashboardData.score ?? 0,
            }
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

    const { workloadData, orgStatusData, globalStats } = metrics || {};

    const finalWorkload = workloadData || [];
    const finalOrgPie = orgStatusData || [];
    const finalPendingTasks = todayOrgTasks || [];

    return (
        <div className="space-y-3">
            {/* CFO Premium Hero — Interactive Filters */}
            <div className="rounded-[1.5rem] overflow-hidden shadow-xl relative mb-4 border border-white/10 mesh-gradient-premium">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-violet-400/20 rounded-full blur-[60px] animate-blob" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-[60px] animate-blob [animation-delay:2s]" />

                <div className="relative z-10 px-10 py-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-lg border border-white/20 animate-float card-gloss">
                            <CalendarCheck size={32} className="text-white drop-shadow-glow" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter drop-shadow-lg uppercase leading-none">
                                CFO Executive <span className="text-indigo-200">View</span>
                            </h2>
                            <p className="text-indigo-100 font-bold uppercase tracking-[0.4em] text-[10px] sm:text-[11px] mt-2 opacity-80">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center lg:justify-end gap-4">
                        {/* Enlarged Date Range Pill */}
                        <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-8 py-3.5 shadow-inner transition-all hover:bg-white/20">
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-white text-[12px] font-black uppercase outline-none w-[115px] placeholder:text-white/40 cursor-pointer"
                                />
                                <Calendar size={14} className="text-white/60" />
                            </div>
                            <ArrowRight size={14} className="mx-6 text-white/40" />
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-white text-[12px] font-black uppercase outline-none w-[115px] placeholder:text-white/40 cursor-pointer"
                                />
                                <Calendar size={14} className="text-white/60" />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/tasks')}
                                className="bg-white text-indigo-900 hover:bg-indigo-50 transition-all duration-300 px-8 py-3.5 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 group"
                            >
                                <span>All Tasks</span>
                                <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
                            </button>

                            <button
                                onClick={() => navigate('/tasks/assign')}
                                className="border-2 border-white/40 text-white hover:bg-white/10 transition-all px-6 py-3 rounded-full font-black text-[11px] uppercase tracking-widest flex items-center gap-2"
                            >
                                <Plus size={16} /> New Task
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatsCard title="Total" value={globalStats?.totalTasks ?? 0} icon={CheckSquare} color="primary" />
                <StatsCard title="Approved" value={globalStats?.completedTasks ?? 0} icon={TrendingUp} color="success" />
                <StatsCard title="Pending" value={globalStats?.pendingTasks ?? 0} icon={AlertTriangle} color="warning" />
                <StatsCard title="Perf. Index" value={`${globalStats?.overallScore ?? 0}%`} icon={Star} color="info" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartPanel title="Workload by Dept" height={220} compact>
                    <BarChart data={finalWorkload} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Bar dataKey="Completed" fill="#10b981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Pending" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ChartPanel>

                <ChartPanel title="Org Breakdown" height={220} compact>
                    <PieChart>
                        <Pie
                            data={finalOrgPie}
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {finalOrgPie.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                </ChartPanel>
            </div>

            {/* Table Section */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <h3 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-2 uppercase tracking-widest">
                    <Users size={16} className="text-violet-500" />
                    Pending Org Actions
                </h3>
                <div className="overflow-x-auto">
                    {finalPendingTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                                <CheckCircle size={24} className="text-emerald-500" />
                            </div>
                            <p className="text-slate-900 font-bold text-sm">Clear Horizons</p>
                            <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest mt-1">No pending organization-wide tasks found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-4">Task Ref</th>
                                    <th className="px-5 py-4">Directive</th>
                                    <th className="px-5 py-4">Unit</th>
                                    <th className="px-5 py-4 text-center">Status</th>
                                    <th className="px-5 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {finalPendingTasks.map((task) => (
                                    <tr key={task.task_id} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-0 group">
                                        <td className="px-5 py-4">
                                            <div className="font-extrabold text-slate-900 tabular-nums text-xs">#{task.task_id}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-black text-slate-800 text-xs tracking-tight group-hover:text-indigo-600 transition-colors uppercase truncate max-w-[200px]">{task.title}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-black text-[9px] uppercase tracking-widest">
                                                {task.department || 'N/A'}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <Badge variant={task.status}>{task.status}</Badge>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/tasks/${task.task_id}`)}
                                                className="bg-slate-900 text-white hover:bg-violet-600 transition-all p-2 rounded-xl shadow-lg hover:rotate-12"
                                            >
                                                <ArrowRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CFODashboard;
