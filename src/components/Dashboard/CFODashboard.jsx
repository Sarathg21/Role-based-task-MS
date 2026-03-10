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
    BarChart2, Loader2, CheckCircle, Activity, Shield, Layout, Target, Clock,
    Plus, Settings, MessageSquare, User, ChevronDown
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
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [taskFilter, setTaskFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return 'Just now';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            if (diffInSeconds < 60) return `${Math.max(0, diffInSeconds)}s ago`;
            const diffInMinutes = Math.floor(diffInSeconds / 60);
            if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
            const diffInHours = Math.floor(diffInMinutes / 60);
            if (diffInHours < 24) return `${diffInHours}h ago`;
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays}d ago`;
        } catch (e) { return 'Recent'; }
    };

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const DEPT_COLORS = [
        '#6366f1',
        '#10b981',
        '#f59e0b',
        '#3b82f6',
        '#8b5cf6',
        '#f43f5e',
        '#06b6d4',
        '#f97316',
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
                assigneeName: t.assigned_to_name || t.assignee || 'Unassigned',
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
                setTodayOrgTasks(normalized.slice(0, 100));
            };

            if (hasDashboardStats) {
                setDashboardData(dashboardPayload);
                if (todayRows.length > 0) setTodayOrgTasks(todayRows.map(normalizeRow));
                else {
                    const fullTasksRes = await api.get('/tasks', { params: { ...params, scope: 'org', limit: 50 } }).catch(() => null);
                    if (fullTasksRes?.data) {
                        const allTasks = Array.isArray(fullTasksRes.data) ? fullTasksRes.data : (fullTasksRes.data?.data || []);
                        setTodayOrgTasks(allTasks.map(normalizeRow).slice(0, 100));
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
        finally {
            // Fetch notifications as well
            api.get('/notifications').then(res => {
                const data = res.data?.data || res.data || [];
                setActivities(Array.isArray(data) ? data : []);
            }).catch(e => console.warn("CFO Activities fail:", e));
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, [fromDate, toDate]);

    const filteredTasks = useMemo(() => {
        let list = todayOrgTasks;
        if (taskFilter === 'Open') list = todayOrgTasks.filter(t => t.status === 'NEW' || t.status === 'OPEN');
        else if (taskFilter === 'In Progress') list = todayOrgTasks.filter(t => t.status === 'IN_PROGRESS');
        else if (taskFilter === 'Completed') list = todayOrgTasks.filter(t => t.status === 'APPROVED' || t.status === 'COMPLETED');
        return list;
    }, [todayOrgTasks, taskFilter]);

    const paginatedTasks = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTasks.slice(start, start + itemsPerPage);
    }, [filteredTasks, currentPage]);

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

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
                in_progress_tasks: dashboardData.in_progress_tasks || 0,
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
        <div className="space-y-6 animate-fade-in pb-8 mt-4">

            {/* ── Top Metrics Row ── fully aligned single row, 3 equal cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

                {/* Open Tasks */}
                <div className="bg-[#4285F4] text-white rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div>
                        <span className="text-5xl font-bold tracking-tight">{globalStats.totalTasks || 10}</span>
                        <p className="text-[14px] font-medium mt-1 text-white/90">Open Tasks</p>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-20">
                        <CheckSquare size={64} strokeWidth={1.5} />
                    </div>
                </div>

                {/* In Progress */}
                <div className="bg-[#9B51E0] text-white rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 border border-[#a259e8]">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-bold tracking-tight">{globalStats.in_progress_tasks || 5}</span>
                            <p className="text-[14px] font-medium mt-1 text-white/90">In Progress Tasks</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <Activity size={28} />
                        </div>
                    </div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                        <div className="w-32 h-32 rounded-full border-[12px] border-white" />
                    </div>
                </div>

                {/* Completed */}
                <div className="bg-[#34D399] text-white rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-bold tracking-tight">{globalStats.completedTasks || 2}</span>
                            <p className="text-[14px] font-medium mt-1 text-white/90">Completed Tasks</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <CheckCircle size={28} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Content + Right Sidebar ── */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">

                {/* ── Task Table (left, grows to fill) ── */}
                <div className="flex-1 min-w-0 bg-white rounded-[1.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">

                    {/* Table Header / Tabs */}
                    <div className="flex items-center gap-6 pt-6 px-6 border-b border-slate-100 pb-0">
                        <h2 className="text-[17px] font-bold text-slate-800 pb-4 whitespace-nowrap">Task Overview</h2>
                        <div className="flex gap-5 ml-2">
                            {['All', 'Open', 'In Progress', 'Submitted'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setTaskFilter(tab); setCurrentPage(1); }}
                                    className={`text-sm font-semibold pb-4 -mb-[1px] transition-all ${taskFilter === tab ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab === 'All' ? 'All Tasks' : tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[12px] text-slate-400 border-b border-slate-100 bg-slate-50/30">
                                <tr>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">
                                        <input type="checkbox" className="rounded text-violet-600 mr-3 border-slate-300" />
                                        Name
                                    </th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">
                                        Assignee <ChevronDown size={14} className="inline ml-1" />
                                    </th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">
                                        Priority <ChevronDown size={14} className="inline ml-1" />
                                    </th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Due Date</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-center">Status</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <CheckSquare size={32} />
                                                <p className="text-xs font-bold uppercase tracking-widest">No matching tasks</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedTasks.map(task => (
                                        <tr key={task.task_id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2 px-6 flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    className={`rounded ${task.task_id === 4 ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300'} w-4 h-4`}
                                                />
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-[13.5px] font-semibold text-slate-700 truncate">{task.title}</span>
                                            </td>
                                            <td className="py-2 px-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                                                        <User size={14} className="text-slate-400" />
                                                    </div>
                                                    <span className="text-[13px] font-medium text-slate-600">{task.assigneeName || 'Unassigned'}</span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-6">
                                                <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                                                    <span className={`w-2 h-2 rounded-full ${task.priority === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'}`} />
                                                    {task.priority === 'HIGH' ? 'High' : 'Medium'}
                                                </div>
                                            </td>
                                            <td className="py-2 px-6 text-[13px] text-slate-500">{task.due_date || '15 Sep, 2023'}</td>
                                            <td className="py-2 px-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold text-white shadow-sm inline-block min-w-[90px]
                                                ${task.status === 'OPEN' ? 'bg-[#4285F4]' :
                                                        task.status === 'IN_PROGRESS' ? 'bg-[#34D399]' :
                                                            'bg-[#9B51E0]'}`}>
                                                    {task.status === 'IN_PROGRESS' ? 'In Progress' :
                                                        task.status === 'COMPLETED' ? 'Completed' : 'Open'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 text-right">
                                                <button
                                                    onClick={() => navigate('/tasks')}
                                                    className="px-5 py-1.5 bg-[#7B51ED] text-white text-[12px] font-bold rounded-lg hover:bg-violet-700 transition-[transform,colors] active:scale-95 shadow-sm"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {filteredTasks.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium bg-slate-50/10">
                                <span>Showing {Math.min(filteredTasks.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredTasks.length, currentPage * itemsPerPage)} of {filteredTasks.length}</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                    >
                                        &lt;
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border ${currentPage === i + 1 ? 'bg-violet-600 text-white font-bold border-violet-600 shadow-md shadow-violet-200' : 'bg-white text-slate-600 border-slate-100 hover:border-violet-200'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                    >
                                        &gt;
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Sidebar — Quick Actions + Recent Activity stacked ── */}
                <div className="flex flex-col gap-6 w-full xl:w-[320px] shrink-0">

                    {/* Quick Actions */}
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100">
                        <h3 className="text-[15px] font-black text-slate-800 mb-4 tracking-tight uppercase">Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            <button className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Plus size={18} strokeWidth={2.5} /> Create New Task
                            </button>
                            <button className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <BarChart2 size={18} strokeWidth={2.5} /> View Reports
                            </button>
                            <button className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Users size={18} strokeWidth={2.5} /> Manage Team
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-[15px] font-black text-slate-800 tracking-tight uppercase">Recent Activity</h3>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Settings size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {activities.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No recent activity</p>
                                </div>
                            ) : (
                                activities.slice(0, 8).map((n, idx) => (
                                    <div key={n.id || idx} className="flex gap-3 items-start border border-slate-100 p-3.5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <div className={`w-9 h-9 border-2 border-white shadow-sm rounded-full shrink-0 overflow-hidden flex items-center justify-center font-bold text-sm ${n.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' :
                                            n.type === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                                            }`}>
                                            {(n.actor_name || n.title || 'N').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 pt-0.5 min-w-0">
                                            <p className="text-[13px] text-slate-600 leading-tight">
                                                <span className="font-bold text-slate-800">{n.title || 'Activity'}</span>
                                                <span className="block text-slate-500 mt-1 text-[12px]">{n.message}</span>
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-400 mt-1">{formatTimeAgo(n.created_at)}</p>
                                        </div>
                                        <MessageSquare size={14} className="text-slate-300 mt-1 shrink-0" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
                {/* ── End Right Sidebar ── */}

            </div>
            {/* ── End Main Content ── */}

        </div>
    );
};

const PieChart2 = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

export default CFODashboard;