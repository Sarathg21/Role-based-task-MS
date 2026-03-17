import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { calculateManagerScore } from '../../utils/performanceEngine';
import Badge from '../UI/Badge';
import CustomSelect from '../UI/CustomSelect';
import ReworkCommentModal from '../Modals/ReworkCommentModal';
import {
    BarChart2, CheckSquare, AlertTriangle, Clock, ArrowRight,
    Calendar, Users, TrendingUp, Medal, CalendarCheck, CheckCircle, Loader2,
    ChevronRight, Plus, Settings, MessageSquare, ChevronDown, User, Edit2, Activity
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

const fetchManagerTasksFallback = async (params = {}) => {
    const baseURL = api.defaults.baseURL || '';
    const token = localStorage.getItem('pms_token');
    
    // Convert params to query string
    const query = new URLSearchParams(params).toString();
    const queryString = query ? `?${query}` : '';

    // If scope is already in params, we might need to handle it differently, 
    // but typically we can just append our params to these candidates.
    const candidates = [
        `tasks?scope=org${query ? `&${query}` : ''}`,
        `tasks?scope=all${query ? `&${query}` : ''}`,
        `tasks${queryString}`,
        `tasks?scope=department${query ? `&${query}` : ''}`,
        `tasks?scope=mine${query ? `&${query}` : ''}`
    ];
    for (const path of candidates) {
        try {
            const url = baseURL.endsWith('/') ? `${baseURL}${path}` : `${baseURL}/${path}`;
            const res = await fetch(url, {
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
        green: { bg: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-300/40', accent: 'bg-emerald-400/30' },
        emerald: { bg: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-300/40', accent: 'bg-emerald-400/30' },
        amber: { bg: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-300/40', accent: 'bg-amber-400/30' },
        orange: { bg: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-300/40', accent: 'bg-orange-400/30' },
        blue: { bg: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-300/40', accent: 'bg-blue-400/30' },
        rose: { bg: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-300/40', accent: 'bg-rose-400/30' },
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
                    <div className="text-3xl font-bold text-white tabular-nums tracking-tighter leading-none drop-shadow">{value ?? '—'}</div>
                    <div className="text-[11px] font-bold text-white/80 truncate mt-1.5">{label}</div>
                    {sub && <div className="text-[9px] text-white/60 font-semibold truncate mt-0.5">{sub}</div>}
                </div>
            </div>
        </div>
    );
};

const ManagerDashboard = ({ overriddenDept = null }) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Determine current user state
    const isActuallyCFO = user?.role?.toUpperCase() === 'CFO';
    const [cfoSelectedDeptId, setCfoSelectedDeptId] = useState(overriddenDept?.id || null);
    const [departments, setDepartments] = useState([]);

    // Determine current department for context
    const currentDeptId = overriddenDept?.id || cfoSelectedDeptId || user?.department_id || user?.dept_id;
    const currentDeptName = overriddenDept?.name || departments.find(d => (d.department_id || d.id) === currentDeptId)?.name || user?.department_name || user?.department || 'Department';

    const getFirstDayOfMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const getToday = () => {
        return new Date().toISOString().slice(0, 10);
    };

    /* ── Date range filter state ─── */
    const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
    const [toDate, setToDate] = useState(getToday());

    useEffect(() => {
        const handleFilterChange = () => {
            setFromDate(localStorage.getItem('dashboard_from_date') || getFirstDayOfMonth());
            setToDate(localStorage.getItem('dashboard_to_date') || getToday());
        };
        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

    const [dashboardData, setDashboardData] = useState(null);
    const [todayTeamTasks, setTodayTeamTasks] = useState([]);
    const [activities, setActivities] = useState([]);
    const [reportTeam, setReportTeam] = useState([]);
    const [trends, setTrends] = useState([]);
    const [employeeRisk, setEmployeeRisk] = useState([]);
    const [loading, setLoading] = useState(true);
    const [taskFilter, setTaskFilter] = useState("Today's Tasks");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;
    const [reworkModalOpen, setReworkModalOpen] = useState(false);
    const [taskForRework, setTaskForRework] = useState(null);

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

    const fetchDashboardData = async () => {
        setLoading(true);
        const params = {};
        if (fromDate) params.start_date = fromDate;
        if (toDate) params.end_date = toDate;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
        
        // Apply department override if provided
        if (currentDeptId && currentDeptId !== 'all') {
            params.department_id = currentDeptId;
        }

        try {
            let fetchedTasks = [];
            let dashPayload = {};

            console.log("ManagerDashboard - Fetching stats for dept:", currentDeptId);
            
            // Fetch all metrics using standard endpoints
            const results = await Promise.allSettled([
                api.get('/dashboard/manager', { params }),
                api.get('/dashboard/manager/today', { params }),
                api.get('/manager/reports', { params }),
                api.get('/dashboard/manager/trends', { params }),
                api.get('/dashboard/manager/employee-risk', { params }),
                api.get('/dashboard/manager/team-performance', { params }),
                api.get('/dashboard/manager/department-metrics', { params }),
                api.get('/notifications')
            ]);

            const [
                managerDash, 
                todayTasksRes, 
                reportsRes, 
                trendsRes, 
                riskRes, 
                teamPerfRes,
                metricsRes,
                notifyRes
            ] = results;

            if (managerDash.status === 'fulfilled') {
                dashPayload = managerDash.value.data?.data || managerDash.value.data || {};
                setDashboardData(dashPayload);
            }

            if (todayTasksRes.status === 'fulfilled') {
                const todayPayload = todayTasksRes.value.data?.data || todayTasksRes.value.data || [];
                const tasks = Array.isArray(todayPayload) ? todayPayload : [];
                
                // Normalization logic
                fetchedTasks = tasks.map(t => ({
                    ...t,
                    id: t.task_id || t.id,
                    employee_id: t.assigned_to_emp_id,
                    assigneeName: t.assigned_to_name,
                    severity: (t.priority || t.severity || 'MEDIUM').toUpperCase(),
                    department: t.department_name || t.department_id,
                }));
                setTodayTeamTasks(fetchedTasks);
            }

            if (reportsRes.status === 'fulfilled') {
                const reportPayload = reportsRes.value.data?.data || reportsRes.value.data || {};
                const stats = reportPayload?.manager_stats || (Array.isArray(reportPayload) ? reportPayload : []);
                setReportTeam(Array.isArray(stats) ? stats : []);
            }

            if (trendsRes.status === 'fulfilled') {
                setTrends(trendsRes.value.data?.data || trendsRes.value.data || []);
            }

            if (riskRes.status === 'fulfilled') {
                setEmployeeRisk(riskRes.value.data?.data || riskRes.value.data || []);
            }

            if (teamPerfRes.status === 'fulfilled') {
                const perfData = teamPerfRes.value.data?.data || teamPerfRes.value.data || [];
                if (perfData.length > 0) setReportTeam(perfData);
            }

            if (metricsRes.status === 'fulfilled') {
                const mData = metricsRes.value.data?.data || metricsRes.value.data || {};
                setDashboardData(prev => ({ ...prev, ...mData }));
            }

            if (notifyRes.status === 'fulfilled') {
                const notifyRaw = notifyRes.value.data;
                const items = Array.isArray(notifyRaw) ? notifyRaw : (notifyRaw.notifications || notifyRaw.data || []);
                setActivities(Array.isArray(items) ? items : []);
            }

            const totalFromDashboard = dashPayload?.total_tasks ?? dashPayload?.total ?? 0;
            const hasDashboardStats = totalFromDashboard > 0;
            const hasToday = fetchedTasks.length > 0;

            if (!hasDashboardStats && !hasToday) {
                console.log("ManagerDashboard - Falling back to task aggregation...");
                const rawTasks = await fetchManagerTasksFallback(params);
                if (rawTasks.length > 0) {
                    const filtered = rawTasks.filter((t) => {
                        const k = toDateKey(t.assigned_date || t.created_at || t.due_date);
                        if (!k) return true; // Don't filter out if no date exists
                        if (fromDate && k < fromDate) return false;
                        if (toDate && k > toDate) return false;
                        return true;
                    });

                    // Pass 1: Build map
                    const taskMap = {};
                    filtered.forEach(t => {
                        const id = t.task_id || t.id;
                        const title = t.task_title || t.title || t.task_name || t.name || t.directive_title || t.directive_name;
                        if (id && title) taskMap[id] = title;
                    });

                    // Pass 1.5: Fetch each child task's detail to get parent_task_title.
                    // The backend now returns parent_task_title on GET /tasks/{task_id}.
                    const tasksNeedingParentFetch2 = [];
                    const seenParentIds2 = new Set();
                    filtered.forEach(t => {
                        const childId = t.task_id || t.id;
                        const pid = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                        const ptitle = t.parent_task_title || t.parentTaskTitle || t.parent_task_name || t.parent_title || t.parent_name || t.parent_directive_title || t.parent_directive_name ||
                                      (t.parent_task ? (t.parent_task.task_title || t.parent_task.title || t.parent_task.task_name || t.parent_task.name || t.parent_task.directive_title) : '');
                        if (pid && !ptitle && !taskMap[pid] && childId && !seenParentIds2.has(pid)) {
                            seenParentIds2.add(pid);
                            tasksNeedingParentFetch2.push({ childId, pid });
                        }
                    });

                    if (tasksNeedingParentFetch2.length > 0) {
                        console.log(`ManagerDashboard (Fallback) - Fetching ${tasksNeedingParentFetch2.length} task details for parent titles...`);
                        await Promise.allSettled(
                            tasksNeedingParentFetch2.map(async ({ childId, pid }) => {
                                try {
                                    const res = await api.get(`/tasks/${childId}`);
                                    const detail = res.data?.data || res.data;
                                    if (detail && !Array.isArray(detail)) {
                                        const parentTitle = detail.parent_task_title || detail.parentTaskTitle;
                                        if (parentTitle) taskMap[pid] = parentTitle;
                                    }
                                } catch (err) {
                                    console.warn(`Failed to fetch task detail ${childId}:`, err);
                                }
                            })
                        );
                    }

                    // Pass 2: Normalize
                    const normalized = filtered.map((t) => {
                        const pid = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                        const ptitle = t.parent_task_title || t.parentTaskTitle || t.parent_task_name || t.parent_title || t.parent_name || t.parent_directive_title || t.parent_directive_name || 
                                      (t.parent_task ? (t.parent_task.task_title || t.parent_task.title || t.parent_task.task_name || t.parent_task.name || t.parent_task.directive_title) : '') ||
                                      taskMap[pid] || '';
                        
                        return {
                            id: t.task_id || t.id,
                            title: t.title,
                            status: String(t.status || '').toUpperCase(),
                            severity: (t.priority || t.severity || 'MEDIUM').toUpperCase(),
                            employee_id: t.assigned_to_emp_id || t.employee_id,
                            assigneeName: t.assigned_to_name || t.assignee_name || t.employee_name || 'Unassigned',
                            parent_task_id: pid,
                            parent_task_title: ptitle,
                        };
                    });

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

                    const totalCount = normalized.length;
                    const approvedCount = statusCounts.APPROVED;
                    
                    // Standardized Metrics Logic
                    const totalActive = normalized.filter(t => !TERMINAL_STATUSES.has(t.status)).length; 
                    const pendingSubmission = statusCounts.NEW + statusCounts.REWORK;
                    const inProgress = statusCounts.IN_PROGRESS;
                    const overdue = normalized.filter((t) => {
                        const due = toDateKey(t.due_date);
                        const today = new Date().toLocaleDateString('en-CA');
                        return due && due < today && !TERMINAL_STATUSES.has(t.status);
                    }).length;

                    setDashboardData({
                        total_tasks: totalActive, // Standardized: only active tasks
                        approved_tasks: approvedCount,
                        pending_submission: pendingSubmission, // NEW + REWORK
                        pending_tasks: totalActive, // For backward compatibility if needed
                        rework_tasks: statusCounts.REWORK,
                        new_tasks: statusCounts.NEW,
                        in_progress_tasks: inProgress,
                        submitted_tasks: statusCounts.SUBMITTED,
                        overdue_tasks: overdue,
                        team_performance_index: totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0,
                    });
                    setTodayTeamTasks(normalized.slice(0, 100));
                    setReportTeam(Array.from(byEmp.values()));

                    // If CFO, also populate activities from these tasks
                    if (isCFO) {
                        setActivities(normalized.slice(0, 10).map(t => ({
                            id: t.id,
                            actor_name: t.assigneeName || 'Member',
                            task_title: t.title || 'Directive',
                            type: t.status === 'SUBMITTED' ? 'TASK_SUBMITTED' : t.status === 'APPROVED' ? 'TASK_APPROVED' : 'ACTIVITY',
                            created_at: new Date().toISOString()
                        })));
                    }
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
    }, [user?.id, fromDate, toDate, currentDeptId]);

    useEffect(() => {
        if (isActuallyCFO && !overriddenDept) {
            api.get('/departments').then(res => {
                const depts = res.data?.data || res.data || [];
                setDepartments(depts);
                if (depts.length > 0 && !cfoSelectedDeptId) {
                    setCfoSelectedDeptId(depts[0].department_id || depts[0].id);
                }
            }).catch(e => console.warn("Failed to fetch departments:", e));
        }
    }, [isActuallyCFO, overriddenDept]);


    const filteredTasks = useMemo(() => {
        let list = todayTeamTasks;
        if (taskFilter === 'Submitted') list = todayTeamTasks.filter(t => t.status === 'SUBMITTED');
        else if (taskFilter === 'In Progress') list = todayTeamTasks.filter(t => t.status === 'IN_PROGRESS');
        // If "Today's Tasks" we can either filter by today's date or leave it. The original code left it unfiltered for 'Today's Tasks'. 
        // We will leave both 'All' and 'Today's Tasks' returning the full list for now unless there's a strict date property to check against.
        return list;
    }, [todayTeamTasks, taskFilter]);

    const paginatedTasks = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredTasks.slice(start, start + itemsPerPage);
    }, [filteredTasks, currentPage]);

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

    const metrics = useMemo(() => {
        if (!dashboardData) return null;
        const total = dashboardData.total_tasks ?? dashboardData.total ?? 0;
        const approved = dashboardData.approved_tasks ?? dashboardData.approved ?? 0;

        return {
            score: dashboardData.team_performance_index ?? dashboardData.performanceScore ?? 0,
            completionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
            totalReworks: dashboardData.rework_tasks ?? dashboardData.reworks ?? 0,
            pendingSubmission: dashboardData.pending_submission ?? ( (dashboardData.new_tasks||0) + (dashboardData.rework_tasks||0) ),
            totalActive: dashboardData.total_tasks || 0
        };
    }, [dashboardData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Loader2 className="w-10 h-10 text-violet-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium text-lg">Loading {currentDeptName} dashboard...</p>
            </div>
        );
    }

    const stats = metrics || { score: 0, completionRate: 0, totalReworks: 0, pendingSubmission: 0, totalActive: 0 };

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
        <div className="space-y-4 pb-8">
            {/* CFO Department Switcher */}
            {isActuallyCFO && !overriddenDept && departments.length > 0 && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-fade-in mb-2">
                    <span className="text-[10px] font-semibold text-slate-400 capitalize tracking-widest pl-2">Select Department:</span>
                    <CustomSelect
                        options={departments.map(d => ({ label: d.name, value: d.department_id || d.id }))}
                        value={currentDeptId}
                        onChange={(val) => setCfoSelectedDeptId(val)}
                        className="w-64"
                    />
                </div>
            )}

            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#4285F4] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div>
                        <span className="text-5xl font-semibold tracking-tight">{stats.totalActive || 0}</span>
                        <p className="text-[15px] font-medium mt-1 text-white/90">{currentDeptName} Directives</p>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-20">
                        <CheckSquare size={72} strokeWidth={1.5} />
                    </div>
                </div>

                <div className="bg-[#9B51E0] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 border border-[#a259e8]">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-semibold tracking-tight">{stats.pendingSubmission || 0}</span>
                            <p className="text-[15px] font-medium mt-1 text-white/90">Pending Actions</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <Activity size={32} />
                        </div>
                    </div>
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                        <div className="w-32 h-32 rounded-full border-[12px] border-white"></div>
                    </div>
                </div>

                <div className="bg-[#34D399] text-white rounded-[1.5rem] p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className="text-5xl font-semibold tracking-tight">{stats.completionRate || 0}%</span>
                            <p className="text-[15px] font-medium mt-1 text-white/90">Resolution Rate</p>
                        </div>
                        <div className="opacity-40 mt-2">
                            <TrendingUp size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Trends Chart */}
            {trends.length > 0 && (
                <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm p-6 h-[380px] flex flex-col">
                    <h3 className="text-[16px] font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <BarChart2 size={18} className="text-indigo-500" />
                        Execution Trends
                    </h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 11, fill: '#94a3b8' }} 
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                                    cursor={{ fill: '#f8fafc' }}
                                />
                                <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} name="Completed" />
                                <Bar dataKey="assigned" fill="#4285F4" radius={[4, 4, 0, 0]} barSize={20} name="Assigned" />
                                <Bar dataKey="overdue" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} name="Overdue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Main Content Split */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Left Side - Task Table (grows to fill) */}
                <div className="flex-1 min-w-0 bg-white rounded-[1.5rem] p-0 shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                    <div className="flex items-center gap-0 pt-4 px-4 sm:px-6 border-b border-slate-100 pb-0 overflow-x-auto">
                        <h2 className="text-[15px] sm:text-[17px] font-bold text-slate-800 pb-4 shrink-0 mr-4">Team Task Overview</h2>
                        <div className="flex gap-3 sm:gap-5 ml-0 overflow-x-auto pb-0 shrink-0">
                            {["All", "Today's Tasks", "In Progress", "Submitted"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setTaskFilter(tab); setCurrentPage(1); }}
                                    className={`text-sm font-semibold pb-4 -mb-[1px] transition-all ${taskFilter === tab ? 'text-violet-600 border-b-2 border-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[12px] text-slate-400 border-b border-slate-100 bg-slate-50/30">
                                <tr>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Directives</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Parent Task ID</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Parent Task</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Assignee</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap">Priority</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-center">Status</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <CheckSquare size={32} />
                                                <p className="text-xs font-bold">No matching team objectives</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedTasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2 px-6 flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm border border-white">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-[13.5px] font-semibold text-slate-700 truncate max-w-[250px]">{task.title}</span>
                                            </td>
                                            <td className="py-2 px-6">
                                                <span className="text-[13px] font-medium text-slate-500">{task.parent_task_id ? `#${task.parent_task_id}` : '-'}</span>
                                            </td>
                                            <td className="py-2 px-6">
                                                <span className="text-[13px] font-medium text-slate-500 truncate max-w-[150px] block">
                                                    {task.parent_task_title || '-'}
                                                </span>
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
                                                    <span className={`w-2 h-2 rounded-full ${task.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'}`}></span>
                                                    {task.severity === 'HIGH' ? 'High' : 'Medium'}
                                                </div>
                                            </td>
                                            <td className="py-2 px-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold shadow-sm inline-block min-w-[90px] ${task.status === 'SUBMITTED' ? 'bg-[#9B51E0] text-white' : task.status === 'IN_PROGRESS' ? 'bg-[#34D399] text-white' : task.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-[#4285F4] text-white'}`}>
                                                    {task.status === 'SUBMITTED' ? 'Review' : task.status === 'IN_PROGRESS' ? 'In Progress' : task.status === 'APPROVED' ? 'Approved' : 'New'}
                                                </span>
                                            </td>
                                            <td className="py-2 px-6 text-right">
                                                {task.status === 'SUBMITTED' ? (
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => handleStatusChange(task.id, 'APPROVE')} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle size={14} /></button>
                                                        <button onClick={() => handleReworkRequest(task)} className="w-7 h-7 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all"><AlertTriangle size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => navigate(`/tasks?taskId=${task.id}`)} className="px-5 py-1.5 bg-[#7B51ED] text-white text-[12px] font-bold rounded-lg hover:bg-violet-700 transition-[transform,colors] active:scale-95 shadow-sm">
                                                        View
                                                    </button>
                                                )}

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

                {/* Right Sidebar - Quick Actions + Recent Activity stacked */}
                <div className="flex flex-col gap-6 w-full xl:w-[320px] shrink-0">

                    {/* Quick Actions */}
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100">
                        <h3 className="text-[15px] font-bold text-slate-800 mb-4 tracking-tight">Quick Actions</h3>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => navigate('/tasks/assign')} className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Plus size={18} strokeWidth={2.5} /> Assign Task
                            </button>
                            <button onClick={() => navigate('/tasks?mode=team')} className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Users size={18} strokeWidth={2.5} /> Manage Team
                            </button>
                            <button onClick={() => navigate('/reports')} className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Activity size={18} strokeWidth={2.5} /> View Reports
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 flex-1">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Recent Activity</h3>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Settings size={16} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                            {activities.length === 0 ? (
                                <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                                    <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2 opacity-50" />
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No recent team activity</p>
                                </div>
                            ) : (
                                activities.slice(0, 10).map((n, idx) => {
                                    const actorName = n.actor_name || n.user_name || n.actor?.name || 'Member';
                                    const taskTitle = n.task_title || n.title || n.directive_title || n.task?.title || 'Directive';
                                    const type = n.type || n.action || 'ACTIVITY';

                                    const getStyle = () => {
                                        if (type === 'TASK_APPROVED' || type === 'SUCCESS') return 'bg-emerald-100 text-emerald-600 border-emerald-200';
                                        if (type === 'TASK_REWORK' || type === 'WARNING') return 'bg-amber-100 text-amber-600 border-amber-200';
                                        if (type === 'TASK_SUBMITTED') return 'bg-violet-100 text-violet-600 border-violet-200';
                                        return 'bg-indigo-100 text-indigo-600 border-indigo-200';
                                    };

                                    return (
                                        <div key={n.id || idx} className="flex gap-3 items-start border border-slate-100 p-3.5 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                            <div className={`w-9 h-9 border shadow-sm rounded-full shrink-0 overflow-hidden flex items-center justify-center font-semibold text-xs ${getStyle()}`}>
                                                {actorName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 pt-0.5 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-[11px] font-semibold text-slate-800 uppercase tracking-tight">{actorName}</span>
                                                    <span className="text-[9px] font-medium text-slate-400">{formatTimeAgo(n.created_at)}</span>
                                                </div>
                                                <p className="text-[13px] text-slate-500 leading-tight">
                                                    {(() => {
                                                        const title = <span className="font-semibold text-violet-600">"{taskTitle}"</span>;
                                                        switch (type) {
                                                            case 'TASK_SUBMITTED': return <>submitted {title} for review</>;
                                                            case 'TASK_APPROVED': return <>finalized and approved {title}</>;
                                                            case 'TASK_REWORK': return <>requested changes on {title}</>;
                                                            case 'TASK_CREATED': return <>delegated {title}</>;
                                                            case 'TASK_REASSIGNED': return <>re-assigned {title}</>;
                                                            default: return n.message || <>interacted with {title}</>;
                                                        }
                                                    })()}
                                                </p>
                                                {n.comment && <span className="block text-slate-400 mt-1 italic text-[12px] border-l-2 border-slate-100 pl-2">"{n.comment}"</span>}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Employee Risk Monitor */}
                    {employeeRisk.length > 0 && (
                        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100">
                            <h3 className="text-[15px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-rose-500" />
                                Performance Risk Tracker
                            </h3>
                            <div className="space-y-2">
                                {employeeRisk.slice(0, 4).map((risk, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-rose-50/30 border border-rose-100/50 hover:bg-rose-50 transition-all">
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-800 truncate">{risk.name || risk.employee_name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                <span className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">{risk.risk_level || 'At Risk'}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[14px] font-semibold text-rose-600 leading-none">{risk.overdue_count || risk.overdue || 0}</p>
                                            <p className="text-[9px] text-slate-400 font-medium uppercase mt-1">Overdue</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Asset Merit Registry - Full Width Below */}
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/10">
                    <h3 className="text-[17px] font-bold text-slate-800">Asset Merit Registry</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#F8F9FF] text-slate-500 text-[12px] font-medium border-b border-slate-100">
                            <tr>
                                <th className="py-3 px-6">Rank</th>
                                <th className="py-3 px-6">Name</th>
                                <th className="py-3 px-6 text-center">Assigned</th>
                                <th className="py-3 px-6 text-center">Completed</th>
                                <th className="py-3 px-6 text-center">Efficiency</th>
                                <th className="py-3 px-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {finalRankingData.length === 0 ? (
                                <tr><td colSpan="6" className="py-12 text-center text-slate-400 font-bold text-xs">No ranking data available</td></tr>
                            ) : (
                                finalRankingData.slice(0, 5).map((member) => {
                                    const rate = member.assigned > 0 ? Math.round((member.completed / member.assigned) * 100) : 0;
                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-6">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${member.rank === 1 ? 'bg-[#FFF3E0] text-[#F59E0B]' : 'bg-slate-100 text-slate-500'}`}>#{member.rank}</span>
                                            </td>
                                            <td className="py-3 px-6 font-semibold text-slate-800 text-[13.5px]">{member.name}</td>
                                            <td className="py-3 px-6 text-center font-medium text-slate-600 text-[13px]">{member.assigned}</td>
                                            <td className="py-3 px-6 text-center font-medium text-slate-600 text-[13px]">{member.completed}</td>
                                            <td className="py-3 px-6">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${rate >= 80 ? 'bg-[#34D399]' : rate >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} style={{ width: `${rate}%` }} />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-slate-700">{rate}%</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-6 text-right">
                                                <button onClick={() => navigate(`/tasks?employeeId=${member.id}`)} className="px-5 py-1.5 bg-[#7B51ED] text-white text-[12px] font-bold rounded-lg hover:bg-violet-700 transition-[transform,colors] active:scale-95 shadow-sm inline-flex items-center gap-1.5">
                                                    View
                                                </button>
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
        </div >
    );
};

export default ManagerDashboard;
