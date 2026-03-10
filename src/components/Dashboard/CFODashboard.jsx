import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../UI/Badge';
import StatsCard from '../UI/StatsCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    TrendingUp, Users, CheckSquare, AlertTriangle, ArrowRight,
    BarChart2, Loader2, CheckCircle, Activity, Shield, Layout, Target, Clock
} from 'lucide-react';

const WorkloadSummary = ({ data }) => {
    if (!data || data.length === 0) return (
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-lg rounded-[2rem] p-8 text-center">
            <Layout className="w-10 h-10 text-slate-300 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[8px]">No Intelligence Available</p>
        </div>
    );

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] p-6 overflow-hidden relative group transition-all duration-500 hover:shadow-md">
            <div className="absolute top-6 right-8 flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            </div>

            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
                <Activity size={14} className="text-indigo-600" />
                Workload Intelligence
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-6 gap-x-8">
                {data.map((dept, i) => (
                    <div key={i} className="group/dept flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.fill }} />
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest truncate">
                                {dept.name}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black tracking-tighter tabular-nums leading-none text-slate-900">
                                {dept.Total || dept.total_tasks || 0}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 text-amber-600 font-black uppercase tracking-wider text-[8px]">
                                <div className="w-1 h-1 rounded-full bg-amber-500" />
                                <span>{dept.Pending || dept.pending_tasks || 0} Open</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CFODashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [todayOrgTasks, setTodayOrgTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const DEPT_COLORS = [
        '#6366f1', // Indigo
        '#10b981', // Emerald
        '#f59e0b', // Amber
        '#3b82f6', // Blue
        '#8b5cf6', // Violet
        '#f43f5e', // Rose
        '#06b6d4', // Cyan
        '#f97316', // Orange
    ];

    const fetchDashboardData = async () => {
        setLoading(true);
        const params = {};
        if (fromDate) params.start_date = fromDate;
        if (toDate) params.end_date = toDate;

        try {
            const [dataRes, todayRes] = await Promise.all([
                api.get('/dashboard/cfo', { params }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/today', { params }).catch(() => ({ data: {} }))
            ]);

            const dashboardPayload = dataRes?.data?.data || dataRes?.data || {};
            const todayPayload = todayRes?.data?.data || todayRes?.data || todayRes?.data?.tasks || [];
            const todayRows = Array.isArray(todayPayload) ? todayPayload : (Array.isArray(todayPayload?.items) ? todayPayload.items : []);

            const totalTasksFromPayload = dashboardPayload?.total_tasks ?? dashboardPayload?.total ?? 0;
            const hasDashboardStats = totalTasksFromPayload > 0 || (dashboardPayload?.department_stats?.length > 0) || (dashboardPayload?.dept_stats?.length > 0);

            const normalizeRow = (t) => ({
                ...t,
                task_id: t.task_id || t.id,
                title: t.title || 'Untitled Directive',
                status: String(t.status || '').toUpperCase(),
                department: t.department_name || t.department || t.dept_name || 'Accounts',
                priority: (t.priority || t.severity || 'MEDIUM').toUpperCase(),
            });

            const aggregateFromTasks = (rows) => {
                const normalized = rows.map(normalizeRow);
                const counts = { NEW: 0, IN_PROGRESS: 0, SUBMITTED: 0, APPROVED: 0, REWORK: 0, CANCELLED: 0 };
                const byDept = {};

                normalized.forEach(t => {
                    if (counts[t.status] !== undefined) counts[t.status]++;
                    const d = t.department;
                    if (!byDept[d]) byDept[d] = { department_id: d, name: d, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, total: 0, completed: 0 };
                    byDept[d].total_tasks++;
                    byDept[d].total++;
                    if (t.status === 'APPROVED') { byDept[d].approved_tasks++; byDept[d].completed++; }
                    if (!['APPROVED', 'CANCELLED'].includes(t.status)) byDept[d].pending_tasks++;
                });

                const total = normalized.length;
                const approved = counts.APPROVED;
                const pending = total - (approved + counts.CANCELLED);

                setDashboardData({
                    total_tasks: total,
                    approved_tasks: approved,
                    pending_tasks: pending,
                    rework_tasks: counts.REWORK,
                    in_progress_tasks: counts.IN_PROGRESS,
                    new_tasks: counts.NEW,
                    org_performance_index: total > 0 ? Math.round((approved / total) * 100) : 0,
                    department_stats: Object.values(byDept),
                });
                setTodayOrgTasks(normalized.filter(t => !['APPROVED', 'CANCELLED'].includes(t.status)).slice(0, 50));
            };

            if (hasDashboardStats) {
                setDashboardData(dashboardPayload);
                if (todayRows.length > 0) setTodayOrgTasks(todayRows.map(normalizeRow));
                else {
                    const fullTasksRes = await api.get('/tasks', { params: { ...params, scope: 'org', limit: 50 } }).catch(() => null);
                    if (fullTasksRes?.data) {
                        const allTasks = Array.isArray(fullTasksRes.data) ? fullTasksRes.data : (fullTasksRes.data?.data || []);
                        setTodayOrgTasks(allTasks.map(normalizeRow).filter(t => !['APPROVED', 'CANCELLED'].includes(t.status)));
                    }
                }
                return;
            }

            if (todayRows.length > 0) { aggregateFromTasks(todayRows); return; }

            const fallbackRes = await api.get('/tasks', { params: { ...params, scope: 'org', limit: 200 } }).catch(() => null);
            if (fallbackRes?.data) {
                const tasks = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data?.data || []);
                if (tasks.length > 0) { aggregateFromTasks(tasks); return; }
            }

            setDashboardData({
                total_tasks: 0, approved_tasks: 0, pending_tasks: 0, rework_tasks: 0,
                in_progress_tasks: 0, new_tasks: 0, org_performance_index: 0, department_stats: []
            });
            setTodayOrgTasks([]);

        } catch (err) { console.error("CFO Dashboard Error:", err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDashboardData(); }, [fromDate, toDate]);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;
        const deptSource = dashboardData.department_stats || [];

        const workloadData = deptSource.map((d, i) => ({
            name: d.name || d.department_id || 'Unknown',
            Completed: d.completed || d.approved_tasks || 0,
            Pending: d.pending || d.pending_tasks || 0,
            Total: d.total || d.total_tasks || 0,
            fill: DEPT_COLORS[i % DEPT_COLORS.length],
        }));

        const orgStatusData = [
            { name: 'Approved', value: dashboardData.approved_tasks || 0, fill: '#10b981' },
            { name: 'Pending', value: dashboardData.pending_tasks || 0, fill: '#f59e0b' },
            { name: 'Rework', value: dashboardData.rework_tasks || 0, fill: '#ef4444' },
            { name: 'In Progress', value: dashboardData.in_progress_tasks || 0, fill: '#6366f1' },
            { name: 'New', value: dashboardData.new_tasks || 0, fill: '#3b82f6' },
        ].filter(d => d.value > 0);

        return {
            workloadData, orgStatusData, globalStats: {
                totalTasks: dashboardData.total_tasks || 0,
                completedTasks: dashboardData.approved_tasks || 0,
                pendingTasks: dashboardData.pending_tasks || 0,
                overallScore: dashboardData.org_performance_index || 0,
            }
        };
    }, [dashboardData]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-16 bg-white/50 backdrop-blur-xl rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Syncing Executive Intelligence...</p>
        </div>
    );

    const { workloadData, orgStatusData, globalStats } = metrics || { workloadData: [], orgStatusData: [], globalStats: {} };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header Hero - High Visibility Professional */}
            <div className="rounded-[2.5rem] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative border border-slate-100 group p-8 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-50" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="bg-slate-900 p-5 rounded-[1.5rem] shadow-xl group-hover:scale-110 transition-transform duration-500">
                            <Shield size={32} className="text-emerald-400" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                CFO <span className="text-emerald-500">Dashboard</span>
                            </h2>
                            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mt-3 flex items-center gap-2">
                                <Activity size={12} className="text-indigo-600" />
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-transparent text-slate-900 text-[11px] font-black outline-none w-[110px]" />
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End Date</span>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-transparent text-slate-900 text-[11px] font-black outline-none w-[110px]" />
                            </div>
                        </div>
                        <button onClick={() => navigate('/tasks')} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all flex items-center gap-3 hover:translate-y-[-2px] active:translate-y-0">
                            All Directives <ArrowRight size={14} className="text-emerald-400" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Stats - Ultra Clean */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard title="Total Volume" value={globalStats.totalTasks} icon={CheckSquare} color="primary" compact />
                <StatsCard title="Approved" value={globalStats.completedTasks} icon={TrendingUp} color="success" compact />
                <StatsCard title="Pending Review" value={globalStats.pendingTasks} icon={AlertTriangle} color="warning" compact />
                <StatsCard title="Efficiency" value={`${globalStats.overallScore}%`} icon={Target} color="info" compact />
            </div>

            {/* The Specific Requested Styled View */}
            <WorkloadSummary data={workloadData} />

            {/* Secondary Charts - Compacted */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] p-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                        <BarChart2 size={16} className="text-indigo-600" />
                        Department performance
                    </h3>
                    <div className="h-[180px] w-full relative">
                        {workloadData.length === 0 ? <p className="flex items-center justify-center h-full text-slate-400 font-black uppercase tracking-widest text-[10px]">No Data Sync</p> :
                            <ResponsiveContainer width="100%" height={180} debounce={100}>
                                <BarChart data={workloadData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis dataKey="name" fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                    <YAxis fontSize={9} fontWeight="900" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '1.5rem', border: 'none', fontSize: '11px', fontWeight: '900', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="Completed" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                                    <Bar dataKey="Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 shadow-sm rounded-[2rem] p-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
                        <PieChart2 size={16} className="text-emerald-600" />
                        Status Distribution
                    </h3>
                    <div className="h-[180px] w-full relative">
                        {orgStatusData.length === 0 ? <p className="flex items-center justify-center h-full text-slate-400 font-black uppercase tracking-widest text-[10px]">No Data Sync</p> :
                            <ResponsiveContainer width="100%" height={180} debounce={100}>
                                <PieChart>
                                    <Pie data={orgStatusData} innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value">
                                        {orgStatusData.map((e, i) => <Cell key={i} fill={e.fill} stroke="#fff" strokeWidth={3} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', fontSize: '11px', fontWeight: '900', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
                                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>}
                    </div>
                </div>
            </div>

            {/* Pending Table - Ultra Clean Professional */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-5">
                        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-[1.25rem]">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Active Team Pipeline</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Pending items for your immediate review</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Real-time update</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                </div>

                {todayOrgTasks.length === 0 ? (
                    <div className="py-24 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                        <CheckCircle size={48} className="text-emerald-500/30 mx-auto mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px]">Workflow is synchronized</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 text-[10px] uppercase font-black tracking-[0.15em] text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-5">REF</th>
                                    <th className="px-6 py-5">Task Details</th>
                                    <th className="px-6 py-5">Department</th>
                                    <th className="px-6 py-5 text-center">Status</th>
                                    <th className="px-6 py-5 text-right">Review</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 bg-white">
                                {todayOrgTasks.map(task => (
                                    <tr key={task.task_id} className="hover:bg-slate-50/50 transition-colors text-[11px] group">
                                        <td className="px-6 py-6 font-black text-slate-400 tabular-nums">#{task.task_id}</td>
                                        <td className="px-6 py-6 max-w-[320px]">
                                            <div className="font-black text-slate-900 uppercase truncate group-hover:text-indigo-600 transition-colors">{task.title}</div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <Badge variant="outline" className="text-[9px] font-black px-3 py-1 rounded-lg bg-white border-slate-200 text-slate-600 uppercase tracking-wider">{task.department}</Badge>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <Badge variant={task.status} className="text-[9px] font-black px-4 py-1.5 rounded-full shadow-sm">{task.status}</Badge>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <button onClick={() => navigate('/tasks')} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white transition-all group-hover:scale-105">
                                                <ArrowRight size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const PieChart2 = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

export default CFODashboard;