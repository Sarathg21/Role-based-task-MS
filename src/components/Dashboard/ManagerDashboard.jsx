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

const TERMINAL_STATUSES = new Set(['APPROVED', 'CANCELLED']);

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

const fetchManagerTasksFallback = async () => {
    const baseURL = api.defaults.baseURL || '';
    const token = localStorage.getItem('pms_token');
    const candidates = ['/tasks', '/tasks?scope=department', '/tasks?scope=mine'];
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


/* ─── Small stat card — CFO-style large gradient ─────────────── */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { bg: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-300/40', accent: 'bg-indigo-400/30' },
        green:  { bg: 'from-emerald-400 to-teal-500',  shadow: 'shadow-emerald-300/40', accent: 'bg-emerald-400/30' },
        emerald:{ bg: 'from-emerald-400 to-teal-500',  shadow: 'shadow-emerald-300/40', accent: 'bg-emerald-400/30' },
        amber:  { bg: 'from-amber-400 to-orange-500',  shadow: 'shadow-amber-300/40',   accent: 'bg-amber-400/30' },
        orange: { bg: 'from-orange-500 to-rose-500',   shadow: 'shadow-orange-300/40',  accent: 'bg-orange-400/30' },
        blue:   { bg: 'from-blue-500 to-indigo-500',   shadow: 'shadow-blue-300/40',    accent: 'bg-blue-400/30' },
        rose:   { bg: 'from-rose-500 to-pink-600',     shadow: 'shadow-rose-300/40',    accent: 'bg-rose-400/30' },
    }[color] || { bg: 'from-indigo-500 to-violet-600', shadow: 'shadow-indigo-300/40', accent: 'bg-indigo-400/30' };

    return (
        <div className={`group animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} ${c.shadow} shadow-lg py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl`}>
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${c.accent} blur-2xl`} />
            <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full ${c.accent} blur-2xl opacity-60`} />
            <div className="relative z-10 flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/30">
                    <Icon size={22} className="text-white drop-shadow-sm" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-3xl font-black text-white tabular-nums tracking-tighter leading-none drop-shadow">{value ?? '—'}</div>
                    <div className="text-[11px] font-bold text-white/80 uppercase tracking-widest truncate mt-1.5">{label}</div>
                    {sub && <div className="text-[9px] text-white/60 font-semibold truncate uppercase tracking-widest mt-0.5">{sub}</div>}
                </div>
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
    const [reworkModalOpen, setReworkModalOpen] = useState(false);
    const [taskForRework, setTaskForRework] = useState(null);

    const fetchDashboardData = async () => {
        setLoading(true);
        const params = {};
        if (fromDate) params.start_date = fromDate;
        if (toDate) params.end_date = toDate;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;

        try {
            const dataRes = await api.get('/dashboard/manager', { params }).catch(e => { console.warn("Manager stats fail:", e); return { data: {} }; });
            const todayRes = await api.get('/dashboard/manager/today', { params }).catch(e => { console.warn("Team today fail:", e); return { data: [] }; });

            const dashboardPayload = dataRes?.data?.data || dataRes?.data || {};
            setDashboardData(dashboardPayload || {});
            const todayPayload = todayRes?.data?.data || todayRes?.data || [];
            const todayTasks = Array.isArray(todayPayload) ? todayPayload : [];
            const mappedTasks = todayTasks.map(t => ({
                ...t,
                id: t.task_id || t.id,
                employee_id: t.assigned_to_emp_id,
                assigned_by: t.assigned_by_emp_id,
                assigneeName: t.assigned_to_name,
                assignerName: t.assigned_by_name,
                severity: (t.priority || t.severity || 'MEDIUM').toUpperCase(),
                department: t.department_name || t.department_id,
            }));
            setTodayTeamTasks(mappedTasks);

            try {
                const reportRes = await api.get('/manager/reports', { params });
                const reportPayload = reportRes?.data?.data || reportRes?.data || {};
                const stats = reportPayload?.manager_stats || (Array.isArray(reportPayload) ? reportPayload : []);
                setReportTeam(Array.isArray(stats) ? stats : []);
            } catch (reportErr) {
                console.warn("Manager reports not available:", reportErr);
                setReportTeam([]);
            }

            const totalFromDashboard = dashboardPayload?.total_tasks ?? dashboardPayload?.total ?? 0;
            const hasDashboardStats = totalFromDashboard > 0;
            const hasToday = mappedTasks.length > 0;

            if (!hasDashboardStats && !hasToday) {
                const rawTasks = await fetchManagerTasksFallback();
                if (rawTasks.length > 0) {
                    const filtered = rawTasks.filter((t) => {
                        const k = toDateKey(t.assigned_date || t.created_at || t.due_date);
                        if (fromDate && (!k || k < fromDate)) return false;
                        if (toDate && (!k || k > toDate)) return false;
                        return true;
                    });

                    const normalized = filtered.map((t) => ({
                        id: t.task_id || t.id,
                        title: t.title,
                        status: String(t.status || '').toUpperCase(),
                        severity: (t.priority || t.severity || 'MEDIUM').toUpperCase(),
                        employee_id: t.assigned_to_emp_id || t.employee_id,
                        assigneeName: t.assigned_to_name || t.assignee_name || t.employee_name || 'Unassigned',
                    }));

                    const statusCounts = { NEW: 0, IN_PROGRESS: 0, SUBMITTED: 0, APPROVED: 0, REWORK: 0 };
                    const byEmp = new Map();
                    normalized.forEach((t) => {
                        if (statusCounts[t.status] !== undefined) statusCounts[t.status] += 1;
                        const key = String(t.employee_id || t.assigneeName);
                        const row = byEmp.get(key) || {
                            emp_id: t.employee_id || key,
                            name: t.assigneeName,
                            role: 'Team Member',
                            tasks_assigned: 0,
                            tasks_completed: 0,
                        };
                        row.tasks_assigned += 1;
                        if (t.status === 'APPROVED') row.tasks_completed += 1;
                        byEmp.set(key, row);
                    });

                    const total = normalized.length;
                    const approved = statusCounts.APPROVED;
                    const pending = normalized.filter(t => !TERMINAL_STATUSES.has(t.status)).length;
                    const rework = statusCounts.REWORK;
                    setDashboardData({
                        total_tasks: total,
                        approved_tasks: approved,
                        pending_tasks: pending,
                        rework_tasks: rework,
                        new_tasks: statusCounts.NEW,
                        in_progress_tasks: statusCounts.IN_PROGRESS,
                        submitted_tasks: statusCounts.SUBMITTED,
                        team_performance_index: total > 0 ? Math.round((approved / total) * 100) : 0,
                    });
                    setTodayTeamTasks(normalized.filter(t => !TERMINAL_STATUSES.has(t.status)).slice(0, 50));
                    setReportTeam(Array.from(byEmp.values()));
                }
            }
        } catch (err) {
            console.error("Critical fail in manager dashboard:", err);
            setDashboardData({});
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
        if (!taskId && taskId !== 0) return;
        const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()} this task?`);
        if (!confirmed) return;
        try {
            await api.post(`/tasks/${taskId}/transition`, { action, comment: "" });
            fetchDashboardData();
        } catch (err) {
            console.error("ManagerDashboard - Failed to update task status:", err);
        }
    };

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        }
    }, [user?.id, fromDate, toDate]);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;
        const total = dashboardData.total_tasks ?? dashboardData.total ?? 0;
        const approved = dashboardData.approved_tasks ?? dashboardData.approved ?? 0;

        return {
            score: dashboardData.team_performance_index ?? dashboardData.performanceScore ?? 0,
            completionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
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

    const stats = metrics || { score: 0, completionRate: 0, totalReworks: 0, pending: 0, total: 0 };

    const rawStatusData = dashboardData ? [
        { name: 'New', value: dashboardData.new_tasks || 0, fill: '#3b82f6' },
        { name: 'In Progress', value: dashboardData.in_progress_tasks || 0, fill: '#8b5cf6' },
        { name: 'Submitted', value: dashboardData.submitted_tasks || 0, fill: '#f59e0b' },
        { name: 'Approved', value: dashboardData.approved_tasks || 0, fill: '#10b981' },
        { name: 'Rework', value: dashboardData.rework_tasks || 0, fill: '#ef4444' },
    ] : [];

    const finalRankingData = reportTeam.map((m, idx) => ({
        ...m,
        id: m.emp_id || m.id,
        name: m.name,
        role: m.role || 'Team Member',
        assigned: m.tasks_assigned || m.assigned || 0,
        completed: m.tasks_completed || m.completed || 0,
        rank: idx + 1
    }));

    const finalMemberData = reportTeam.map(m => ({
        name: m.name?.split(' ')[0] || String(m.emp_id),
        Assigned: m.tasks_assigned || 0,
        Completed: m.tasks_completed || 0,
    }));

    return (
        <div className="space-y-4">
            {/* ══ MANAGER HEADER — CFO-STYLE CLEAN WHITE ══ */}
            <div className="rounded-[2rem] bg-white shadow-sm border border-slate-100 relative overflow-hidden p-6 mb-2">
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50 rounded-full blur-3xl -mr-36 -mt-36 opacity-60" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-emerald-50 rounded-full blur-3xl -ml-28 -mb-28 opacity-60" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-4 rounded-2xl shadow-lg shadow-indigo-200/50">
                            <Users size={28} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                                Team <span className="text-indigo-600">Performance</span>
                            </h2>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">
                                {user.department || 'Management'} · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 gap-3">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent text-slate-700 text-[11px] font-bold outline-none w-[110px] cursor-pointer" />
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">End Date</span>
                                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent text-slate-700 text-[11px] font-bold outline-none w-[110px] cursor-pointer" />
                            </div>
                        </div>

                        <button onClick={() => navigate('/tasks/assign')}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5">
                            <Plus size={14} /> Assign Task
                        </button>

                        {(fromDate || toDate) && (
                            <button onClick={() => { setFromDate(''); setToDate(''); }}
                                className="text-[9px] font-black text-slate-400 hover:text-rose-500 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 transition-all uppercase tracking-widest">
                                ✕ Reset
                            </button>
                        )}
                    </div>
                </div>

                <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Members</span>
                        <span className="text-xl font-black text-slate-900 tabular-nums">{reportTeam.length}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Pipeline</span>
                        <span className="text-xl font-black text-indigo-600 tabular-nums">{stats.pending}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
                        <span className="text-xl font-black text-emerald-600 tabular-nums">{stats.completionRate}%</span>
                    </div>
                </div>
            </div>

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
                                <div key={task.id} className="bg-white rounded-[1.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group/card relative flex flex-col min-h-[200px]">
                                    <div className="flex justify-between items-start gap-4 mb-4">
                                        <Badge variant={task.severity} className="text-[9px] font-black px-3 py-1 uppercase tracking-widest">{task.severity}</Badge>
                                        <span className="text-[10px] font-black text-slate-300 tabular-nums uppercase tracking-widest">ID {task.id}</span>
                                    </div>
                                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-4 group-hover/card:text-indigo-600 transition-colors duration-300 line-clamp-2">{task.title}</h4>
                                    <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 flex items-center justify-center text-xs font-black">
                                                {(task.assigneeName || 'U').charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-black text-slate-800 truncate">{task.assigneeName || 'Unassigned'}</div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{task.status === 'SUBMITTED' ? 'Awaiting Review' : 'Processing'}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {task.status === 'SUBMITTED' && (
                                                <>
                                                    <button onClick={() => handleStatusChange(task.id, 'APPROVE')} className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle size={14} /></button>
                                                    <button onClick={() => handleReworkRequest(task)} className="w-8 h-8 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all"><AlertTriangle size={14} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 px-1 lg:px-0">
                <Stat label="Unit Index" value={stats.score} sub="Overall efficiency" icon={BarChart2} color="violet" />
                <Stat label="Resolution Rate" value={`${stats.completionRate}%`} sub={`${stats.total} Active Units`} icon={TrendingUp} color="green" />
                <Stat label="Rework Requests" value={stats.totalReworks} sub="Correction Cycle" icon={AlertTriangle} color="amber" />
                <Stat label="Managed Load" value={stats.pending} sub="Pending Decision" icon={Clock} color="orange" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 glass-premium">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Directives Breakdown</h3>
                    <div className="h-[300px]">
                        {rawStatusData.every(d => d.value === 0) ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No task data available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={rawStatusData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={5} dataKey="value">
                                        {rawStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: '#0f172a', color: '#fff' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 glass-premium text-center">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Asset Efficiency</h3>
                    <div className="h-[300px]">
                        {finalMemberData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No performance data found</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={finalMemberData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', background: '#0f172a', color: '#fff' }} />
                                    <Legend />
                                    <Bar dataKey="Assigned" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-4 px-10 py-8 border-b border-slate-100 bg-slate-50/20">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <Medal size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Asset Merit Registry</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-1">Unit Performance Ranking</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100">
                            <tr>
                                <th className="py-5 px-10">Rank</th>
                                <th className="py-5 px-10">Name</th>
                                <th className="py-5 px-10 text-center">Assigned</th>
                                <th className="py-5 px-10 text-center">Completed</th>
                                <th className="py-5 px-10 text-center">Efficiency</th>
                                <th className="py-5 px-10 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {finalRankingData.length === 0 ? (
                                <tr><td colSpan="6" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No ranking data available</td></tr>
                            ) : (
                                finalRankingData.map((member) => {
                                    const rate = member.assigned > 0 ? Math.round((member.completed / member.assigned) * 100) : 0;
                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-10">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${member.rank === 1 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>#{member.rank}</span>
                                            </td>
                                            <td className="py-4 px-10 font-black text-slate-800 text-xs uppercase">{member.name}</td>
                                            <td className="py-4 px-10 text-center font-bold tabular-nums text-xs">{member.assigned}</td>
                                            <td className="py-4 px-10 text-center font-bold tabular-nums text-xs">{member.completed}</td>
                                            <td className="py-4 px-10">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${rate}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black">{rate}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-10 text-right">
                                                <button onClick={() => navigate('/tasks')} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-indigo-600 transition-all"><ArrowRight size={14} /></button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
