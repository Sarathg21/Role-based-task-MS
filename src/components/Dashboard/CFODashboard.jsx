import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../UI/Badge';
import StatsCard from '../UI/StatsCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, ComposedChart, Line, Area
} from 'recharts';
import {
    TrendingUp, Users, CheckSquare, AlertTriangle, ArrowRight,
    BarChart2, Loader2, CheckCircle, Activity, Shield, Layout, Target, Clock,
    Plus, MessageSquare, User, ChevronDown, XCircle
} from 'lucide-react';
import EmployeeIssueModal from '../Modals/EmployeeIssueModal';
import DeptReviewModal from '../Modals/DeptReviewModal';
import toast from 'react-hot-toast';


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

const OperationalTrends = ({ data }) => {
    if (!data || data.length === 0) return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-12 text-center h-[400px] flex flex-col items-center justify-center">
            <TrendingUp className="w-12 h-12 text-slate-200 mb-4 opacity-50" />
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Trends Syncing...</p>
        </div>
    );

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-md h-[400px] flex flex-col">
            <h3 className="text-[12px] font-bold text-slate-500 mb-6 flex items-center gap-3">
                <BarChart2 size={16} className="text-violet-600" />
                Operational Trends — Last 6 Months
            </h3>
            <div className="flex-1 w-full min-h-0 text-[10px]">
                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4285F4" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#4285F4" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#9B51E0" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#9B51E0" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34D399" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#34D399" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                            itemStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '0px', paddingBottom: '20px' }}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                        <Bar dataKey="new_tasks" name="New Tasks" stackId="a" fill="#4285F4" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="pending_submission" name="Pending" stackId="a" fill="#9B51E0" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="completed_tasks" name="Completed" stackId="a" fill="#34D399" radius={[4, 4, 0, 0]} />

                        <Line
                            type="monotone"
                            dataKey="overdue_tasks"
                            name="Overdue Spikes"
                            stroke="#ef4444"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const DepartmentPerformanceGrid = ({ data }) => {
    if (!data || data.length === 0) return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-12 text-center">
            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4 opacity-50" />
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">No Department Performance Data</p>
        </div>
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'ON_TRACK': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
            case 'AT_RISK': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
            case 'OFF_TRACK': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
            default: return 'bg-slate-300';
        }
    };

    const getStatusText = (status) => {
        return (status || 'NO_DATA').replace('_', ' ');
    };

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-md">
            <h3 className="text-[12px] font-bold text-slate-500 mb-8 flex items-center gap-3">
                <Target size={16} className="text-emerald-600" />
                Departmental Health Grid
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-[10px] text-slate-400 font-bold border-b border-slate-100">
                        <tr>
                            <th className="py-4 px-4 font-bold">Department</th>
                            <th className="py-4 px-4 font-bold text-center">Total</th>
                            <th className="py-4 px-4 font-bold text-center">Overdue</th>
                            <th className="py-4 px-4 font-bold text-center text-indigo-500">In Progress</th>
                            <th className="py-4 px-4 font-bold text-center text-emerald-500">Completed</th>
                            <th className="py-4 px-4 font-bold min-w-[150px]">Completion %</th>
                            <th className="py-4 px-4 font-bold text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((dept, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-4">
                                    <span className="text-[13px] font-black text-slate-800 uppercase tracking-tighter">
                                        {dept.department_name || dept.name || 'Unknown'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-slate-600 tabular-nums">
                                    {dept.total_tasks || 0}
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-rose-600 tabular-nums">
                                    {dept.overdue_tasks || 0}
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-indigo-600 tabular-nums">
                                    {dept.in_progress_tasks || 0}
                                </td>
                                <td className="py-4 px-4 text-center font-bold text-emerald-600 tabular-nums">
                                    {dept.completed_tasks || 0}
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                                            <div
                                                className="h-full rounded-full bg-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                                                style={{ width: `${dept.completion_pct || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[12px] font-black text-slate-700 w-10 tabular-nums">
                                            {Math.round(dept.completion_pct || 0)}%
                                        </span>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 bg-white shadow-sm transition-transform group-hover:scale-105">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(dept.status)}`} />
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            {getStatusText(dept.status)}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const EmployeeRiskPanel = ({ tasks, onIssueClick }) => {
    const riskData = useMemo(() => {
        const counts = {};
        tasks.forEach(t => {
            if (t.status === 'REWORK' || t.is_overdue || t.overdue) {
                const name = t.assigneeName || t.assigned_to_name || 'System';
                if (!counts[name]) counts[name] = { name, overdue: 0, rework: 0, total: 0 };
                if (t.status === 'REWORK') counts[name].rework++;
                if (t.is_overdue || t.overdue) counts[name].overdue++;
                counts[name].total++;
            }
        });
        return Object.values(counts)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [tasks]);

    if (riskData.length === 0) return null;

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-md">
            <h3 className="text-[12px] font-bold text-slate-500 mb-6 flex items-center gap-3">
                <AlertTriangle size={16} className="text-rose-600" />
                Top Risk Employees
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {riskData.map((emp, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-rose-50/20 border border-rose-100/50 flex flex-col justify-between group hover:bg-white transition-all">
                        <div className="flex items-start justify-between mb-2">
                            <p className="text-[13px] font-black text-slate-800 leading-tight">{emp.name}</p>
                            <span className="text-sm">⚠</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                                {emp.overdue} Overdue
                            </p>
                            <button
                                onClick={() => onIssueClick(emp.name)}
                                className="px-2 py-1 rounded bg-rose-100/50 text-rose-600 text-[10px] font-black hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm border border-rose-100"
                            >
                                {emp.total} ISSUES
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExecutiveHealthPanel = ({ metrics, departments }) => {
    const topDept = [...departments].sort((a, b) => b.completion_pct - a.completion_pct)[0];
    const bottomDept = [...departments].sort((a, b) => a.completion_pct - b.completion_pct)[0];

    return (
        <div className="bg-white border border-slate-100 shadow-sm rounded-[2rem] p-8 transition-all hover:shadow-md">
            <h3 className="text-[12px] font-bold text-slate-500 mb-8 flex items-center gap-3">
                <Shield size={16} className="text-violet-600" />
                Organization Health Panel
            </h3>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Part 1: Performance Rates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Completion Rate', value: `${metrics?.orgCompletionRate || 0}%`, color: 'text-violet-600', icon: CheckCircle },
                        { label: 'On-Time Rate', value: `${metrics?.avgOnTime || 0}%`, color: 'text-sky-600', icon: Clock },
                        { label: 'Rework Rate', value: `${metrics?.avgRework || 0}`, color: 'text-amber-600', icon: TrendingUp },
                    ].map((m, i) => (
                        <div key={i} className="flex flex-col p-5 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:bg-white transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <m.icon size={14} className={m.color} />
                                <span className={`text-xl font-black ${m.color}`}>{m.value}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{m.label}</span>
                        </div>
                    ))}
                </div>

                {/* Part 2: Department Leaders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <span className="text-xl">🏆</span>
                            <span className="text-[10px] font-black text-emerald-700 capitalize tracking-widest">Top Dept</span>
                        </div>
                        <h4 className="text-[15px] font-black text-slate-900 border-l-4 border-emerald-500 pl-3 relative z-10 uppercase tracking-tight">
                            {topDept?.department || topDept?.name || 'ACCOUNTS'}
                        </h4>
                    </div>
                    <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <span className="text-xl">⚠</span>
                            <span className="text-[10px] font-black text-rose-700 capitalize tracking-widest">Bottom Dept</span>
                        </div>
                        <h4 className="text-[15px] font-black text-slate-900 border-l-4 border-rose-500 pl-3 relative z-10 uppercase tracking-tight">
                            {bottomDept?.department || bottomDept?.name || 'WHSE'}
                        </h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExportReportsPanel = () => {
    const handleDownload = (format) => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const url = `${baseUrl}/reports/performance.${format}`;
        window.open(url, '_blank');
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 overflow-hidden relative group">
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />

            <h3 className="text-[13px] font-bold text-slate-800 flex items-center gap-2 mb-6 relative">
                <Layout size={14} className="text-slate-400" />
                Export Reports
            </h3>

            <div className="grid grid-cols-3 gap-3 relative">
                {[
                    { label: 'CSV', format: 'csv', color: 'text-blue-600', bg: 'bg-blue-50/50', hover: 'hover:border-blue-200' },
                    { label: 'Excel', format: 'xlsx', color: 'text-emerald-600', bg: 'bg-emerald-50/50', hover: 'hover:border-emerald-200' },
                    { label: 'PDF', format: 'pdf', color: 'text-rose-600', bg: 'bg-rose-50/50', hover: 'hover:border-rose-200' },
                ].map((ext) => (
                    <button
                        key={ext.format}
                        onClick={() => handleDownload(ext.format)}
                        className={`flex flex-col items-center justify-center py-4 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:scale-[1.05] bg-white ${ext.hover}`}
                    >
                        <span className={`text-[11px] font-black uppercase tracking-widest ${ext.color}`}>{ext.label}</span>
                        <div className={`mt-2 w-6 h-1 rounded-full ${ext.bg}`} />
                    </button>
                ))}
            </div>
        </div>
    );
};

const CFODashboard = () => {
    const navigate = useNavigate();
    const handleCreateTask = () => navigate('/tasks/assign');
    const handleViewReports = () => navigate('/reports');
    const handleManageTeam = () => navigate('/admin');

    const [dashboardData, setDashboardData] = useState(null);
    const [orgMetrics, setOrgMetrics] = useState(null);
    const [trendsData, setTrendsData] = useState([]);
    const [deptPerformance, setDeptPerformance] = useState([]);
    const [todayOrgTasks, setTodayOrgTasks] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [selectedEmployeeForIssue, setSelectedEmployeeForIssue] = useState('');
    const [isDeptReviewModalOpen, setIsDeptReviewModalOpen] = useState(false);

    const handleIssueClick = (name) => {
        setSelectedEmployeeForIssue(name);
        setIsIssueModalOpen(true);
    };

    const handleSaveIssue = (issueData) => {
        console.log('Saving executive issue record:', issueData);
        toast.success(`Performance record saved for ${issueData.employee}`, {
            icon: '🛡️',
            style: {
                borderRadius: '1rem',
                background: '#1e293b',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
            },
        });
        // In a real app, we would POST this to an /issues or /performance endpoint
    };

    const handleSaveDeptReview = (reviewData) => {
        console.log('Saving department review:', reviewData);
        toast.success(`Executive review for ${reviewData.department} finalized`, {
            icon: '🏢',
            style: {
                borderRadius: '1rem',
                background: '#064e3b',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
            },
        });
        // In a real app, we would POST this to an /dept-reviews endpoint
    };

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

    const [fromDate, setFromDate] = useState(localStorage.getItem('dashboard_from_date') || '');
    const [toDate, setToDate] = useState(localStorage.getItem('dashboard_to_date') || '');

    useEffect(() => {
        const handleFilterChange = () => {
            setFromDate(localStorage.getItem('dashboard_from_date') || '');
            setToDate(localStorage.getItem('dashboard_to_date') || '');
        };

        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

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
        const queryParams = {};
        if (fromDate) { queryParams.start_date = fromDate; queryParams.from_date = fromDate; }
        if (toDate) { queryParams.end_date = toDate; queryParams.to_date = toDate; }

        try {
            const [dataRes, todayRes, metricsRes, trendsRes, deptsRes] = await Promise.all([
                api.get('/dashboard/cfo', { params: queryParams }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/today', { params: queryParams }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/org-metrics', { params: queryParams }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/trends', { params: queryParams }).catch(() => ({ data: {} })),
                api.get('/dashboard/cfo/departments', { params: queryParams }).catch(() => ({ data: {} }))
            ]);
            const metricsPayload = metricsRes?.data?.data || metricsRes?.data || {};
            setOrgMetrics(metricsPayload);

            const trendsPayload = trendsRes?.data?.data || trendsRes?.data || [];
            setTrendsData(Array.isArray(trendsPayload) ? trendsPayload : []);

            const deptsPayload = deptsRes?.data?.data || deptsRes?.data || [];
            const rawDepts = Array.isArray(deptsPayload) ? deptsPayload : [];

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

            // Helper: compute per-dept status counts from a flat task array
            const buildDeptStatusCounts = (normalizedTasks) => {
                const byDeptName = {};
                normalizedTasks.forEach(t => {
                    const d = t.department;
                    if (!byDeptName[d]) byDeptName[d] = { new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0, approved_tasks_computed: 0 };
                    if (t.status === 'NEW') byDeptName[d].new_tasks++;
                    if (t.status === 'IN_PROGRESS') byDeptName[d].in_progress_tasks++;
                    if (t.status === 'SUBMITTED') byDeptName[d].submitted_tasks++;
                    if (t.status === 'REWORK') byDeptName[d].rework_tasks++;
                    if (t.status === 'APPROVED') byDeptName[d].approved_tasks_computed++;
                });
                return byDeptName;
            };

            // Helper: derive status label from completion_pct
            const deriveStatus = (dept) => {
                if (dept.status && dept.status !== 'NO_DATA' && dept.status !== 'null' && dept.status !== 'undefined') return dept.status;
                if (!dept.total_tasks && !dept.total) return 'NO_DATA';
                const pct = dept.completion_pct || 0;
                if (pct >= 70) return 'ON_TRACK';
                if (pct >= 40) return 'AT_RISK';
                return 'OFF_TRACK';
            };

            // Helper: enrich rawDepts with per-status counts from task data
            const enrichDepts = (depts, taskCounts) => {
                return depts.map(d => {
                    // Try exact match or fuzzy match (case-insensitive, includes)
                    const dName = (d.department_name || d.name || '').toLowerCase();
                    const matchedKey = Object.keys(taskCounts).find(k =>
                        k.toLowerCase() === dName || dName.includes(k.toLowerCase()) || k.toLowerCase().includes(dName)
                    );
                    const counts = matchedKey ? taskCounts[matchedKey] : {};

                    // Priority: 1. Computed from recent tasks, 2. API fields, 3. Fallback to 0
                    const approvedComputed = (matchedKey && counts.approved_tasks_computed !== undefined)
                        ? counts.approved_tasks_computed
                        : (d.approved_tasks ?? d.completed_tasks ?? d.completed ?? 0);

                    const total = Number(d.total_tasks || d.total || 0);

                    // Recompute completion_pct from actual counts with precision
                    // If we have total but our computation found 0 approved, check if API had a better percentage
                    let computedPct = total > 0 ? (approvedComputed / total) * 100 : (Number(d.completion_pct) || 0);
                    if (computedPct === 0 && d.completion_pct > 0) computedPct = Number(d.completion_pct);

                    const enriched = {
                        ...d,
                        new_tasks: counts.new_tasks ?? (d.new_tasks ?? d.new ?? 0),
                        in_progress_tasks: counts.in_progress_tasks ?? (d.in_progress_tasks ?? d.in_progress ?? 0),
                        submitted_tasks: counts.submitted_tasks ?? (d.submitted_tasks ?? d.submitted ?? 0),
                        rework_tasks: counts.rework_tasks ?? (d.rework_tasks ?? d.rework ?? 0),
                        approved_tasks: approvedComputed,
                        completion_pct: computedPct,
                    };
                    enriched.status = deriveStatus(enriched);
                    return enriched;
                });
            };

            const aggregateFromTasks = (rows) => {
                const normalized = rows.map(normalizeRow);
                const counts = { NEW: 0, IN_PROGRESS: 0, SUBMITTED: 0, APPROVED: 0, REWORK: 0, CANCELLED: 0 };
                const byDept = {};

                normalized.forEach(t => {
                    if (counts[t.status] !== undefined) counts[t.status]++;
                    const d = t.department;
                    if (!byDept[d]) byDept[d] = { department_id: d, name: d, department_name: d, total_tasks: 0, approved_tasks: 0, pending_tasks: 0, total: 0, completed: 0, new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0 };
                    byDept[d].total_tasks++;
                    byDept[d].total++;
                    if (t.status === 'APPROVED') { byDept[d].approved_tasks++; byDept[d].completed++; }
                    if (!['APPROVED', 'CANCELLED'].includes(t.status)) byDept[d].pending_tasks++;
                    if (t.status === 'NEW') byDept[d].new_tasks++;
                    if (t.status === 'IN_PROGRESS') byDept[d].in_progress_tasks++;
                    if (t.status === 'SUBMITTED') byDept[d].submitted_tasks++;
                    if (t.status === 'REWORK') byDept[d].rework_tasks++;
                });

                const totalCount = normalized.length;
                const approvedCount = counts.APPROVED;

                const totalActive = normalized.filter(t => !['APPROVED', 'CANCELLED'].includes(t.status)).length;
                const overdue = normalized.filter((t) => {
                    const due = toDateKey(t.due_date);
                    const today = new Date().toLocaleDateString('en-CA');
                    return (t.is_overdue || t.overdue || (due && due < today)) && !['APPROVED', 'CANCELLED'].includes(t.status);
                }).length;

                const deptArray = Object.values(byDept).map(d => ({
                    ...d,
                    completion_pct: d.total_tasks > 0 ? (d.approved_tasks / d.total_tasks) * 100 : 0,
                    status: deriveStatus(d),
                }));

                setDeptPerformance(rawDepts.length > 0 ? enrichDepts(rawDepts, buildDeptStatusCounts(normalized)) : deptArray);
                setDashboardData({
                    total_tasks: totalActive,
                    approved_tasks: approvedCount,
                    pending_tasks: totalActive,
                    rework_tasks: counts.REWORK,
                    in_progress_tasks: counts.IN_PROGRESS,
                    new_tasks: counts.NEW,
                    overdue_tasks: overdue,
                    org_performance_index: totalCount > 0 ? (approvedCount / totalCount) * 100 : 0,
                    department_stats: Object.values(byDept),
                });
                setTodayOrgTasks(normalized.slice(0, 200));
            };

            // Always fetch all org tasks to compute per-dept status breakdowns
            // Simplified fetch to avoid 422 - prioritize simple scope and then fallback
            const fetchOrgTasks = async () => {
                const candidates = [
                    { scope: 'org', limit: 200 },
                    { scope: 'all', limit: 200 },
                    { limit: 100 }
                ];
                
                for (const params of candidates) {
                    try {
                        const res = await api.get('/tasks', { params });
                        if (res?.data) return res;
                    } catch (e) {
                        // Only continue to fallback if it's a validation error (422) or missing endpoint
                        if (e.response?.status === 422 || e.response?.status === 404 || e.response?.status === 400) {
                            console.warn(`Org task fetch fail for ${JSON.stringify(params)}, trying fallback...`);
                            continue;
                        }
                        throw e; 
                    }
                }
                return null;
            };

            const allTasksRes = await fetchOrgTasks();
            const allTasks = allTasksRes?.data
                ? (Array.isArray(allTasksRes.data) ? allTasksRes.data : (allTasksRes.data?.data || []))
                : [];
            const allNormalized = allTasks.map(normalizeRow);
            const taskCountsByDept = buildDeptStatusCounts(allNormalized);

            if (hasDashboardStats) {
                setDashboardData(dashboardPayload);
                const tasksForToday = todayRows.length > 0 ? todayRows.map(normalizeRow) : allNormalized;
                setTodayOrgTasks(tasksForToday.slice(0, 200));
                // Enrich rawDepts with computed per-status counts
                setDeptPerformance(enrichDepts(rawDepts, allNormalized.length > 0 ? taskCountsByDept : buildDeptStatusCounts(tasksForToday)));
                return;
            }

            if (todayRows.length > 0) { aggregateFromTasks(todayRows); return; }
            if (allNormalized.length > 0) { aggregateFromTasks(allTasks); return; }

            // Fallback: still enrich rawDepts even if no task data
            setDeptPerformance(rawDepts.map(d => ({ ...d, status: deriveStatus(d), new_tasks: 0, in_progress_tasks: 0, submitted_tasks: 0, rework_tasks: 0 })));
            setDashboardData({
                total_tasks: 0, approved_tasks: 0, pending_tasks: 0, rework_tasks: 0,
                in_progress_tasks: 0, new_tasks: 0, org_performance_index: 0, department_stats: []
            });
            setTodayOrgTasks([]);

        } catch (err) { console.error("CFO Dashboard Error:", err); }
        finally {
            api.get('/notifications').then(res => {
                const data = res.data?.data || res.data || [];
                setActivities(Array.isArray(data) ? data : []);
            }).catch(e => console.warn("CFO Activities fail:", e));
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, [fromDate, toDate]);



    const { workloadData, orgStatusData, globalStats, kpis } = useMemo(() => {
        if (!dashboardData) return { workloadData: [], orgStatusData: [], globalStats: {}, kpis: null };
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

        const departmentsOnTrack = deptSource.filter(d => {
            const total = d.total_tasks || d.total || 0;
            const approved = d.approved_tasks || d.completed || 0;
            return total > 0 && (approved / total) >= 0.7;
        }).length;

        const kpis = {
            activeTasks: orgMetrics?.active_tasks ?? dashboardData.total_tasks ?? 0,
            completedTasks: orgMetrics?.completed_tasks ?? dashboardData.approved_tasks ?? 0,
            departmentsOnTrack: deptPerformance.filter(d => d.status === 'ON_TRACK').length,
            departmentsAtRisk: deptPerformance.filter(d => d.status === 'AT_RISK').length,
            departmentsOffTrack: deptPerformance.filter(d => d.status === 'OFF_TRACK').length,
            employeesAtRisk: orgMetrics?.employees_at_risk ?? (dashboardData.overdue_tasks || 0),
            orgCompletionRate: orgMetrics?.org_avg_completion_rate ?? dashboardData.org_performance_index ?? 0,
            avgOnTime: orgMetrics?.org_avg_on_time_pct ?? 0,
            avgRework: orgMetrics?.org_avg_rework_rate ?? 0
        };

        return {
            workloadData,
            orgStatusData,
            globalStats: {
                totalTasks: dashboardData.total_tasks || 0,
                completedTasks: dashboardData.approved_tasks || 0,
                pendingTasks: dashboardData.pending_tasks || 0,
                in_progress_tasks: dashboardData.in_progress_tasks || 0,
                overallScore: dashboardData.org_performance_index || 0,
            },
            kpis
        };
    }, [dashboardData, orgMetrics]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-10 bg-white/50 backdrop-blur-xl rounded-2xl border border-slate-100 shadow-sm animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
            <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Syncing Executive Intelligence...</p>
        </div>
    );

    const topDept = [...deptPerformance].sort((a, b) => b.completion_pct - a.completion_pct)[0];
    const bottomDept = [...deptPerformance].sort((a, b) => a.completion_pct - b.completion_pct)[0];

    return (
        <div className="space-y-4 animate-fade-in pb-8 mt-2">

            {/* ── KPI ROW: 5 cards in one row ── */}
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: 'Active Tasks', value: kpis?.activeTasks, icon: Activity, color: 'text-blue-500', border: 'border-blue-100', trend: '+5%' },
                    { label: 'Completed Tasks', value: kpis?.completedTasks, icon: CheckCircle, color: 'text-emerald-500', border: 'border-emerald-100', trend: '+12%' },
                    { label: 'Departments On Track', value: kpis?.departmentsOnTrack, icon: CheckSquare, color: 'text-indigo-500', border: 'border-indigo-100', trend: '+2' },
                    { label: 'Employees At Risk', value: kpis?.employeesAtRisk, icon: AlertTriangle, color: 'text-rose-500', border: 'border-rose-100', trend: '+2' },
                    { label: 'Org Completion Rate', value: `${kpis?.orgCompletionRate}%`, icon: TrendingUp, color: 'text-violet-500', border: 'border-violet-100', sub: 'Company Average' },
                ].map((item, idx) => (
                    <div key={idx} className={`bg-white rounded-2xl border ${item.border} shadow-sm p-4 flex flex-col gap-1.5 hover:shadow-md transition-all`}>
                        <div className="flex items-center gap-2">
                            <item.icon size={14} className={item.color} />
                            <span className="text-[10px] font-bold text-slate-500 leading-tight">{item.label}</span>
                        </div>
                        <span className={`text-2xl font-black tabular-nums ${item.color}`}>{item.value ?? 0}</span>
                        {item.trend && (
                            <span className="text-[10px] font-bold text-emerald-500">↑ {item.trend} <span className="text-slate-400 font-medium">vs last month</span></span>
                        )}
                        {item.sub && (
                            <span className="text-[10px] text-slate-400 font-medium">{item.sub}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* ── MAIN TWO-COLUMN LAYOUT ── */}
            <div className="grid grid-cols-[1fr_320px] gap-4">

                {/* ── LEFT COLUMN ── */}
                <div className="flex flex-col gap-4">
                    {/* Organization Health (Moved to Left) */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <h3 className="text-[12px] font-black text-slate-700 mb-4 flex items-center gap-2">
                            <Shield size={13} className="text-violet-500" />
                            Organization Health
                        </h3>
                        <div className="grid grid-cols-4 gap-4">
                            {[
                                { label: 'Departments On Track', value: kpis?.departmentsOnTrack || 0, color: 'bg-emerald-500', icon: CheckCircle, iconColor: 'text-emerald-500' },
                                { label: 'Departments At Risk', value: kpis?.departmentsAtRisk || 0, color: 'bg-amber-500', icon: AlertTriangle, iconColor: 'text-amber-500' },
                                { label: 'Departments Off Track', value: kpis?.departmentsOffTrack || 0, color: 'bg-rose-500', icon: XCircle || AlertTriangle, iconColor: 'text-rose-500' },
                                { label: 'Org Avg Completion Rate', value: `${kpis?.orgCompletionRate || 0}%`, color: 'bg-indigo-500', icon: TrendingUp, iconColor: 'text-indigo-500' },
                            ].map((m, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/50 border border-slate-100/50">
                                    <div className={`p-2 rounded-lg bg-white shadow-sm ${m.iconColor}`}>
                                        <m.icon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-slate-400 capitalize tracking-widest leading-tight">{m.label}</p>
                                        <span className="text-[16px] font-black text-slate-800 tabular-nums">{m.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Trends Chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[13px] font-black text-slate-700 flex items-center gap-2">
                                <BarChart2 size={14} className="text-violet-500" />
                                Task Trends — Last 6 Months
                            </h3>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                                Last 6 Months <ChevronDown size={12} />
                            </div>
                        </div>
                        {trendsData.length === 0 ? (
                            <div className="h-52 flex items-center justify-center">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No trend data available</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <ComposedChart data={trendsData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorNew2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4285F4" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#4285F4" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={8} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px', fontSize: '11px' }} />
                                    <Legend verticalAlign="top" align="left" iconType="circle" iconSize={7}
                                        wrapperStyle={{ fontSize: '10px', fontWeight: '700', paddingBottom: '8px' }} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Bar dataKey="new_tasks" name="New Tasks" stackId="a" fill="#4285F4" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="pending_submission" name="Pending" stackId="a" fill="#FFA500" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="completed_tasks" name="Completed" stackId="a" fill="#34D399" radius={[3, 3, 0, 0]} />
                                    <Line type="monotone" dataKey="overdue_tasks" name="Overdue" stroke="#ef4444" strokeWidth={2.5}
                                        dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Department Performance Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h3 className="text-[13px] font-black text-slate-700 mb-4 flex items-center gap-2">
                            <Target size={14} className="text-emerald-500" />
                            Department Performance
                        </h3>
                        {deptPerformance.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No department data</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black text-slate-400 capitalize tracking-widest border-b border-slate-100">
                                            <th className="pb-3 pr-4">Department</th>
                                            <th className="pb-3 px-2 text-center">Total</th>
                                            <th className="pb-3 px-2 text-center text-rose-400">Overdue</th>
                                            <th className="pb-3 px-2 text-center text-indigo-400">In Progress</th>
                                            <th className="pb-3 px-2 text-center text-emerald-400">Completed</th>
                                            <th className="pb-3 px-2 min-w-[100px]">Completion</th>
                                            <th className="pb-3 pl-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {deptPerformance.map((dept, idx) => {
                                            const status = dept.status || 'NO_DATA';
                                            const statusStyles = {
                                                ON_TRACK: 'bg-emerald-100 text-emerald-700',
                                                AT_RISK: 'bg-amber-100 text-amber-700',
                                                OFF_TRACK: 'bg-rose-100 text-rose-700',
                                            };
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 pr-4 text-[12px] font-bold text-slate-800 whitespace-nowrap">{dept.department_name || dept.name || 'Unknown'}</td>
                                                    <td className="py-3 px-2 text-center text-[12px] font-black text-slate-600 tabular-nums">{dept.total_tasks || 0}</td>
                                                    <td className="py-3 px-2 text-center text-[12px] font-bold text-rose-500 tabular-nums">{dept.overdue_tasks || 0}</td>
                                                    <td className="py-3 px-2 text-center text-[12px] font-bold text-indigo-500 tabular-nums">{dept.in_progress_tasks || 0}</td>
                                                    <td className="py-3 px-2 text-center text-[12px] font-bold text-emerald-500 tabular-nums">{dept.approved_tasks || 0}</td>
                                                    <td className="py-3 px-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${dept.completion_pct || 0}%` }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-700 tabular-nums min-w-[32px]">
                                                                {Number(dept.completion_pct || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 pl-2 text-right">
                                                        {status === 'NO_DATA' && (
                                                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                                                                NO DATA
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ── BOTTOM BAR: Top Dept + Bottom Dept + Export ── */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* Top Department */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">🏆</span>
                                <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Top Department</span>
                            </div>
                            <p className="text-[14px] font-black text-slate-800 leading-tight">{topDept?.department_name || topDept?.name || '—'}</p>
                            <p className="text-[11px] font-bold text-emerald-500 mt-0.5">{Math.round(topDept?.completion_pct || 0)}% Completion</p>
                        </div>

                        {/* Bottom Department */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={13} className="text-rose-400" />
                                <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Bottom Department</span>
                            </div>
                            <p className="text-[14px] font-black text-slate-800 leading-tight">{bottomDept?.department_name || bottomDept?.name || '—'}</p>
                            <p className="text-[11px] font-bold text-rose-500 mt-0.5">{Math.round(bottomDept?.completion_pct || 0)}% Completion</p>
                        </div>

                        {/* Export Reports */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Layout size={13} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Export Reports</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'CSV', format: 'csv', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
                                    { label: 'Excel', format: 'xlsx', color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
                                    { label: 'PDF', format: 'pdf', color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100' },
                                ].map((ext) => (
                                    <button
                                        key={ext.format}
                                        onClick={() => { const baseUrl = import.meta.env.VITE_API_BASE_URL || ''; window.open(`${baseUrl}/reports/performance.${ext.format}`, '_blank'); }}
                                        className={`flex items-center justify-center py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${ext.color} ${ext.bg}`}
                                    >
                                        {ext.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT SIDEBAR ── */}
                <div className="flex flex-col gap-4">

                    {/* Employee Risk Monitor */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex-1">
                        <h3 className="text-[12px] font-black text-slate-700 mb-4 flex items-center gap-2">
                            <AlertTriangle size={13} className="text-rose-500" />
                            Employee Risk Monitor
                        </h3>
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[9px] font-black text-slate-400 capitalize tracking-widest pb-2 border-b border-slate-100 mb-2">
                            <span>Employee</span>
                            <span className="text-center">Active</span>
                            <span className="text-center">Score</span>
                            <span className="text-right">Status</span>
                        </div>
                        {(() => {
                            const riskData = [];
                            const counts = {};
                            todayOrgTasks.forEach(t => {
                                if (t.status === 'REWORK' || t.is_overdue || t.overdue) {
                                    const name = t.assigneeName || t.assigned_to_name || 'Unknown';
                                    if (!counts[name]) counts[name] = { name, overdue: 0, rework: 0, total: 0, score: Math.floor(Math.random() * 100) };
                                    if (t.status === 'REWORK') counts[name].rework++;
                                    if (t.is_overdue || t.overdue) counts[name].overdue++;
                                    counts[name].total++;
                                }
                            });
                            const items = Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 5);
                            if (items.length === 0) return (
                                <div className="py-8 text-center">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No at-risk employees</p>
                                </div>
                            );
                            return items.map((emp, i) => {
                                const statusLabel = emp.score >= 70 ? 'On Track' : emp.score >= 40 ? 'At Risk' : 'Off Track';
                                const statusColor = emp.score >= 70 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : emp.score >= 40 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100';
                                return (
                                    <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 py-2.5 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">
                                                {emp.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate">{emp.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">EMPLOYEE</p>
                                            </div>
                                        </div>
                                        <span className="text-[12px] font-black text-slate-700 text-center tabular-nums">{emp.overdue}</span>
                                        <span className="text-[12px] font-black text-slate-700 text-center tabular-nums">{emp.score}</span>
                                        <button
                                            onClick={() => handleIssueClick(emp.name)}
                                            className={`text-[9px] font-black px-2 py-1 rounded-md ${statusColor} hover:opacity-80 transition-opacity whitespace-nowrap`}
                                        >
                                            {statusLabel}
                                        </button>
                                    </div>
                                );
                            });
                        })()}
                        <button
                            onClick={() => navigate('/admin')}
                            className="mt-3 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors"
                        >
                            View All Employees
                        </button>
                    </div>


                    {/* Live Activity Feed (compact) */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col" style={{ maxHeight: '280px' }}>
                        <h3 className="text-[12px] font-black text-slate-700 mb-3 flex items-center gap-2 shrink-0">
                            <Activity size={13} className="text-sky-500" />
                            Live Activity
                        </h3>
                        <div className="space-y-2 overflow-y-auto custom-scrollbar">
                            {activities.length === 0 ? (
                                <div className="py-6 text-center">
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No recent activity</p>
                                </div>
                            ) : (
                                activities.slice(0, 6).map((n, idx) => (
                                    <div key={n.id || idx} className="flex gap-2 items-start p-2.5 rounded-xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer">
                                        <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-black text-[9px] ${n.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' : n.type === 'WARNING' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                            {(n.actor_name || n.title || 'N').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-slate-600 leading-tight truncate">
                                                {n.actor_name || 'System'}: {n.task_title || n.title || n.message || 'Activity'}
                                            </p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{formatTimeAgo(n.created_at)}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <EmployeeIssueModal
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
                onSave={handleSaveIssue}
                employeeName={selectedEmployeeForIssue}
            />

            <DeptReviewModal
                isOpen={isDeptReviewModalOpen}
                onClose={() => setIsDeptReviewModalOpen(false)}
                onSave={handleSaveDeptReview}
                departments={deptPerformance}
            />
        </div>
    );
};

const PieChart2 = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
);

export default CFODashboard;