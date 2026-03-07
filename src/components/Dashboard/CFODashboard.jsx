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
    BarChart2, Building2, Star, CalendarCheck, Calendar, Loader2, Plus
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
        try {
            const [dataRes, todayRes, deptsRes] = await Promise.all([
                api.get('/dashboard/cfo').catch(e => ({ data: {} })),
                api.get('/dashboard/cfo/today').catch(e => ({ data: [] })),
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
    }, []);

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

    const DEMO_WORKLOAD = [
        { name: 'Finance', Completed: 8, Pending: 4 },
        { name: 'Operations', Completed: 5, Pending: 4 },
        { name: 'HR', Completed: 6, Pending: 1 },
        { name: 'Marketing', Completed: 10, Pending: 5 },
    ];
    const DEMO_ORG_PIE = [
        { name: 'Approved', value: 29, fill: '#10b981' },
        { name: 'Pending', value: 14, fill: '#f59e0b' },
        { name: 'In Progress', value: 8, fill: '#8b5cf6' },
        { name: 'Rework', value: 3, fill: '#ef4444' },
    ];
    const DEMO_PENDING_TASKS = [
        { task_id: 'TSK-2092', title: 'Q3 Financial Audit Review', department: 'Finance', status: 'SUBMITTED' },
        { task_id: 'TSK-2105', title: 'Procurement Strategy Update', department: 'Operations', status: 'IN_PROGRESS' },
        { task_id: 'TSK-2118', title: 'Annual Tax Filing Prep', department: 'Finance', status: 'NEW' },
        { task_id: 'TSK-2124', title: 'Quarterly Budget Allocation', department: 'Management', status: 'SUBMITTED' },
        { task_id: 'TSK-2131', title: 'Compliance Policy Refresh', department: 'Legal', status: 'REWORK' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium text-lg">Loading organization dashboard...</p>
            </div>
        );
    }

    const { workloadData, orgStatusData, globalStats } = metrics || {};

    const finalWorkload = (workloadData && workloadData.some(d => (d.Completed + d.Pending) > 0)) ? workloadData : DEMO_WORKLOAD;
    const finalOrgPie = (orgStatusData && orgStatusData.length > 0) ? orgStatusData : DEMO_ORG_PIE;
    const finalPendingTasks = todayOrgTasks.length > 0 ? todayOrgTasks : DEMO_PENDING_TASKS;

    return (
        <div className="space-y-3">
            {/* CFO Premium Hero — Interactive Filters */}
            <div className="rounded-[1.5rem] overflow-hidden shadow-xl relative mb-4 border border-white/10 mesh-gradient-premium">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-violet-400/20 rounded-full blur-[60px] animate-blob" />
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-[60px] animate-blob [animation-delay:2s]" />

                <div className="relative z-10 px-6 py-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 backdrop-blur-xl p-2.5 rounded-2xl shadow-lg border border-white/20 animate-float card-gloss">
                            <CalendarCheck size={24} className="text-white drop-shadow-glow" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-lg uppercase leading-none">
                                CFO Executive View
                            </h2>
                            <p className="text-indigo-100 font-bold uppercase tracking-[0.2em] text-[10px] sm:text-[11px] mt-0.5 opacity-90">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Enlarged Date Range Pill */}
                        <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2.5 shadow-inner transition-all hover:bg-white/20">
                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-white text-[12px] font-black uppercase outline-none w-[115px] placeholder:text-white/40 cursor-pointer"
                                />
                                <Calendar size={14} className="text-white/60" />
                            </div>
                            <ArrowRight size={14} className="mx-4 text-white/40" />
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

                        {/* All Tasks Pill */}
                        <button
                            onClick={() => navigate('/tasks')}
                            className="bg-white text-indigo-900 hover:bg-indigo-50 transition-all duration-300 px-6 py-2 rounded-full font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 group"
                        >
                            <span>All Tasks</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        {/* Assign Button */}
                        <button
                            onClick={() => navigate('/tasks/assign')}
                            className="border border-white/30 text-white hover:bg-white/10 transition-all px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                            <Plus size={14} /> New Task
                        </button>
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
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-400 text-[9px] uppercase font-black tracking-widest">
                            <tr>
                                <th className="px-3 py-2">ID</th>
                                <th className="px-3 py-2">Title</th>
                                <th className="px-3 py-2">Dept</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {finalPendingTasks.map(task => (
                                <tr key={task.task_id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{task.task_id}</td>
                                    <td className="px-3 py-2 font-bold text-slate-700 text-xs">
                                        <div className="truncate max-w-[200px]">{task.title}</div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-slate-500 font-medium">{task.department}</td>
                                    <td className="px-3 py-2"><Badge variant={task.status} className="scale-90 origin-left">{task.status}</Badge></td>
                                    <td className="px-3 py-2 text-right">
                                        <button
                                            onClick={() => navigate(`/tasks?id=${task.task_id}`)}
                                            className="bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white px-3 py-1 rounded-lg font-black text-[10px] transition-all uppercase"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CFODashboard;
