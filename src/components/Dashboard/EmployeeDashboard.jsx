import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { calculateEmployeeScore } from '../../utils/performanceEngine';
import Badge from '../UI/Badge';
import ChartPanel from '../Charts/ChartPanel';
import {
    TrendingUp, CheckCircle, Clock, AlertCircle,
    ThumbsUp, Calendar, ArrowRight, ChevronRight, CalendarCheck, Loader2,
    Search as SearchIcon, Plus, Settings, MessageSquare, ChevronDown, User, Edit2, Activity, CheckSquare, BarChart2, PlusCircle, RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
};

/* ─── Helpers ─────────────────────────────────────────────── */
const TERMINAL = ['APPROVED', 'CANCELLED'];
const TERMINAL_SET = new Set(TERMINAL);

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

const formatDisplayDate = (d) => {
    if (!d) return '-';
    // If it's already a formatted string like "11 Mar 2026", just return it
    if (typeof d === 'string' && d.match(/^\d{2} [A-Z][a-z]{2} \d{4}$/)) return d;
    
    try {
        // Try local helper first
        const key = toDateKey(d);
        const date = new Date(key || d);
        if (Number.isNaN(date.getTime())) return d;
        
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    } catch (_) {
        return d;
    }
};

const fetchEmployeeTasksFallback = async (params = {}) => {
    const candidates = ['/tasks', '/tasks?scope=mine', '/tasks?scope=personal'];
    for (const path of candidates) {
        try {
            const res = await api.get(path, { params });
            const data = res.data;
            const rows = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            if (rows.length > 0) return rows;
        } catch (_) {
            // try next candidate
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

const STATUS_COLORS = {
    NEW: '#3b82f6',        // Blue
    IN_PROGRESS: '#6366f1', // Indigo (light blue/purple)
    SUBMITTED: '#f59e0b',  // Amber/Yellow
    APPROVED: '#10b981',   // Green
    REWORK: '#ea580c',     // Orange/Red
    CANCELLED: '#94a3b8',  // Grey
};


/* Small stat tile — CFO-style large gradient card */
const Stat = ({ label, value, sub, icon: Icon, color = 'violet' }) => {
    const c = {
        violet: { bg: 'from-violet-500 to-indigo-600', shadow: 'shadow-violet-300/40', icon: 'bg-white/20', accent: 'bg-violet-400/30' },
        green: { bg: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-300/40', icon: 'bg-white/20', accent: 'bg-emerald-400/30' },
        blue: { bg: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-300/40', icon: 'bg-white/20', accent: 'bg-blue-400/30' },
        amber: { bg: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-300/40', icon: 'bg-white/20', accent: 'bg-amber-400/30' },
        orange: { bg: 'from-orange-500 to-rose-500', shadow: 'shadow-orange-300/40', icon: 'bg-white/20', accent: 'bg-orange-400/30' },
        teal: { bg: 'from-teal-400 to-cyan-500', shadow: 'shadow-teal-300/40', icon: 'bg-white/20', accent: 'bg-teal-400/30' },
    }[color] || { bg: 'from-violet-500 to-indigo-600', shadow: 'shadow-violet-300/40', icon: 'bg-white/20', accent: 'bg-violet-400/30' };

    return (
        <div className={`group animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} ${c.shadow} shadow-lg py-5 px-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-xl`}>
            {/* Decorative blobs */}
            <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${c.accent} blur-2xl`} />
            <div className={`absolute -bottom-6 -left-6 w-20 h-20 rounded-full ${c.accent} blur-2xl opacity-60`} />

            <div className="relative z-10 flex items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${c.icon} backdrop-blur-sm flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/30`}>
                    <Icon size={24} className="text-white drop-shadow-sm" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-3xl font-bold text-white tabular-nums tracking-tighter leading-none drop-shadow">
                        {value ?? '-'}
                    </div>
                    <div className="text-[11px] font-bold text-white/80 leading-tight mt-1.5">
                        {label}
                    </div>
                    {sub && (
                        <div className="text-[9px] text-white/60 font-semibold mt-0.5">
                            {sub}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


/* ─── Employee Dashboard ───────────────────────────────────── */
const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    /* Date range state */
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [dashboardData, setDashboardData] = useState(null);
    const [todayTasks, setTodayTasks] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [activeTab, setActiveTab] = useState("TODAY");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (fromDate) {
                params.fromDate = fromDate;
                params.start_date = fromDate;
            }
            if (toDate) {
                params.toDate = toDate;
                params.end_date = toDate;
            }

            const [dataRes, todayRes] = await Promise.all([
                api.get('/dashboard/employee', { params }),
                api.get('/dashboard/employee/today', { params })
            ]);
            const dashboardPayload = dataRes?.data?.data || dataRes?.data || {};
            setDashboardData(dashboardPayload);
            const todayPayload = todayRes?.data?.data || todayRes?.data || [];
            const todayT = Array.isArray(todayPayload) ? todayPayload : [];
            
            // Fetch full task list to ensure accurate counts and "All" tab view
            const rawTasks = await fetchEmployeeTasksFallback(params);
            const allRaw = Array.isArray(rawTasks) ? rawTasks : [];

            // Pass 1: Build lookup map for ID -> Title
            const taskMap = {};
            [...todayT, ...allRaw].forEach(t => {
                const id = t.task_id || t.id;
                const title = t.task_title || t.title || t.task_name || t.name || t.directive_title || t.directive_name;
                if (id && title) taskMap[id] = title;
            });

            // Pass 1.5: Fetch each child task's individual detail to retrieve parent_task_title.
            // The backend now returns parent_task_title on GET /tasks/{task_id}.
            // We fetch the *child* task (which the employee has access to) rather than the parent task
            // (which may be 403-restricted), so we can reliably read parent_task_title from the response.
            const tasksNeedingParentFetch = [];
            const seenParentIds = new Set();
            [...todayT, ...allRaw].forEach(t => {
                const childId = t.task_id || t.id;
                const pid = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                const ptitle = t.parent_task_title || t.parentTaskTitle || t.parent_task_name || t.parent_title || t.parent_name || t.parent_directive_title || t.parent_directive_name ||
                              (t.parent_task ? (t.parent_task.task_title || t.parent_task.title || t.parent_task.task_name || t.parent_task.name || t.parent_task.directive_title) : '');
                if (pid && !ptitle && !taskMap[pid] && childId && !seenParentIds.has(pid)) {
                    seenParentIds.add(pid);
                    tasksNeedingParentFetch.push({ childId, pid });
                }
            });

            if (tasksNeedingParentFetch.length > 0) {
                console.log(`EmployeeDashboard - Fetching ${tasksNeedingParentFetch.length} task details for parent titles...`);
                await Promise.allSettled(
                    tasksNeedingParentFetch.map(async ({ childId, pid }) => {
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

            // Pass 2: Normalize with local lookup fallback
            const getParentInfo = (t) => {
                const pid = t.parent_task_id || t.parent_id || (t.parent_task ? (t.parent_task.task_id || t.parent_task.id) : null);
                const ptitle = t.parent_task_title || t.parentTaskTitle || t.parent_task_name || t.parent_title || t.parent_name || t.parent_directive_title || t.parent_directive_name || 
                              (t.parent_task ? (t.parent_task.task_title || t.parent_task.title || t.parent_task.task_name || t.parent_task.name || t.parent_task.directive_title) : '') ||
                              taskMap[pid] || '';
                return { pid, ptitle };
            };

            setTodayTasks(todayT.map(t => {
                const { pid, ptitle } = getParentInfo(t);
                return {
                    ...t,
                    id: t.task_id || t.id,
                    employee_id: t.assigned_to_emp_id,
                    assigned_by: t.assigned_by_emp_id,
                    assigneeName: t.assigned_to_name,
                    assignerName: t.assigned_by_name,
                    severity: (t.priority || t.severity || 'LOW').toUpperCase(),
                    department: t.department_name || t.department_id,
                    parent_task_id: pid,
                    parent_task_title: ptitle,
                };
            }));

            const normalized = allRaw.map((t) => {
                const { pid, ptitle } = getParentInfo(t);
                return {
                    ...t,
                    id: t.task_id || t.id,
                    status: String(t.status || '').toUpperCase(),
                    severity: (t.priority || t.severity || 'LOW').toUpperCase(),
                    due_date: t.due_date,
                    title: t.title || 'Untitled',
                    assigneeName: t.assigned_to_name || user?.name || 'Me',
                    assignerName: t.assigned_by_name || 'Manager',
                    parent_task_id: pid,
                    parent_task_title: ptitle,
                };
            });

            const counts = { NEW: 0, IN_PROGRESS: 0, SUBMITTED: 0, APPROVED: 0, REWORK: 0, CANCELLED: 0 };
            normalized.forEach((t) => {
                const s = t.status || '';
                if (counts[s] !== undefined) counts[s] += 1;
            });

            const totalCount = normalized.length;
            const approvedCount = counts.APPROVED;
            
            // Standardized Metrics Logic
            const totalActive = normalized.filter(t => !TERMINAL_SET.has(t.status)).length; 
            const pendingSubmission = counts.NEW + counts.REWORK;
            const inProgress = counts.IN_PROGRESS;
            const overdue = normalized.filter((t) => {
                const due = toDateKey(t.due_date);
                const today = new Date().toLocaleDateString('en-CA');
                return due && due < today && !TERMINAL_SET.has(t.status);
            }).length;

            // Use the most generous performance index available (backend or local calculation)
            const backendScore = dashboardPayload?.performance_index || dashboardPayload?.performanceScore || 0;
            const localScore = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
            const finalScore = localScore > 0 ? localScore : backendScore;

            setDashboardData({
                ...dashboardPayload,
                total_tasks: totalActive, // Standardized: only active tasks
                approved_tasks: approvedCount,
                submitted_tasks: counts.SUBMITTED,
                pending_submission: pendingSubmission, // NEW + REWORK
                overdue_tasks: overdue,
                in_progress_tasks: inProgress,
                rework_tasks: counts.REWORK,
                new_tasks: counts.NEW,
                cancelled_tasks: counts.CANCELLED,
                performance_index: finalScore,
                dept_avg_score: dashboardPayload?.dept_avg_score || 0,
            });
            setAllTasks(normalized);
            // Do not overwrite todayTasks with normalized here, 
            // instead merge them or ensure normalized is derived correctly above.
            // Actually, fetchDashboardData already sets todayTasks at line 183.
            // Let's ensure normalized is used for counts only.
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
            const res = await api.get('/notifications');
            const raw = res.data;
            let data = [];
            if (Array.isArray(raw)) {
                data = raw;
            } else if (raw && typeof raw === 'object') {
                data = raw.notifications ?? raw.data ?? raw.items ?? raw.results ?? raw.records ?? [];
                if (!Array.isArray(data)) data = [];
            }
            setActivities(data);
        } catch (err) {
            console.error("Failed to fetch employee activities:", err);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleStatusChange = async (taskId, action) => {
        if (!taskId && taskId !== 0) return;
        const confirmed = window.confirm(`Are you sure you want to ${action.toLowerCase()} this task?`);
        if (!confirmed) return;

        try {
            await api.post(`/tasks/${taskId}/transition`, { action, comment: "" });
            fetchDashboardData(); // Refresh dashboard
        } catch (err) {
            console.error("Failed to update task status", err);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        fetchActivities();

        const dashInterval = setInterval(() => {
            fetchDashboardData();
            fetchActivities();
        }, 30000);

        const handleRefresh = () => {
            fetchDashboardData();
            fetchActivities();
        };

        window.addEventListener('refresh-notifications', handleRefresh);

        return () => {
            clearInterval(dashInterval);
            window.removeEventListener('refresh-notifications', handleRefresh);
        };
    }, [fromDate, toDate]);
    const metrics = useMemo(() => {
        if (!dashboardData) return null;

        // Use real values from dashboardData. If stats are 0, they should show as 0.
        const currentScore = dashboardData.performance_index || 0;

        // Mock status distribution based on dashboard summary
        let statusDistribution = [
            { name: 'Approved', value: dashboardData.approved_tasks || 0, color: STATUS_COLORS.APPROVED },
            { name: 'In Progress', value: dashboardData.in_progress_tasks || 0, color: STATUS_COLORS.IN_PROGRESS },
            { name: 'Submitted', value: dashboardData.submitted_tasks || 0, color: STATUS_COLORS.SUBMITTED },
            { name: 'Rework', value: dashboardData.rework_tasks || 0, color: STATUS_COLORS.REWORK },
            { name: 'New', value: dashboardData.new_tasks || 0, color: STATUS_COLORS.NEW },
            { name: 'Cancelled', value: dashboardData.cancelled_tasks || 0, color: STATUS_COLORS.CANCELLED },
        ].filter(d => d.value > 0);

        const performanceTrend = [
            { name: 'Target', score: 100, fill: '#f1f5f9' },
            { name: 'My Score', score: currentScore, fill: '#8b5cf6' },
            { name: 'Dept Avg', score: dashboardData.dept_avg_score || 0, fill: '#10b981' },
        ];


        return {
            score: currentScore,
            stats: {
                total: dashboardData.total_tasks || 0,
                pendingSubmission: dashboardData.pending_submission || 0,
                approved: dashboardData.approved_tasks || 0,
                overdue: dashboardData.overdue_tasks || 0,
                dateRangeSub: 'Global Metrics',
            },
            performanceTrend,
            statusDistribution,
        };
    }, [dashboardData]);

    const { score, stats, performanceTrend, statusDistribution } = metrics || {
        score: 0,
        stats: { total: 0, pendingSubmission: 0, approved: 0, overdue: 0, dateRangeSub: '' },
        performanceTrend: [],
        statusDistribution: []
    };

    // Derive tasks list from source (either specialized todayTasks or full allTasks)
    const filteredTasksSource = useMemo(() => {
        const source = activeTab === "TODAY" ? todayTasks : allTasks;
        return source.filter(t => {
            const isCancelled = t.status === 'CANCELLED';
            const isApproved = t.status === 'APPROVED';
            
            // Never show cancelled tasks in the dashboard table
            if (isCancelled) return false;

            // In "ALL" tab, we show Approved tasks. In other tabs, we hide them.
            const shouldShowBasedOnStatus = activeTab === "ALL" || !isApproved;

            const matchesSearch = !searchTerm ||
                t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(t.id).toLowerCase().includes(searchTerm.toLowerCase());

            // Client-side date filter for the table as well
            const taskDate = toDateKey(t.due_date || t.assigned_date || t.created_at);
            const matchesFrom = !fromDate || taskDate >= fromDate;
            const matchesTo = !toDate || taskDate <= toDate;

            return shouldShowBasedOnStatus && matchesSearch && matchesFrom && matchesTo;
        });
    }, [todayTasks, allTasks, searchTerm, fromDate, toDate, activeTab]);
    const pendingTasks = useMemo(() => {
        return filteredTasksSource.filter(t => {
            if (activeTab === "TODAY") return true;
            if (activeTab === "NEW") return t.status === "NEW";
            if (activeTab === "IN_PROGRESS") return t.status === "IN_PROGRESS" || t.status === "STARTED";
            if (activeTab === "SUBMITTED") return t.status === "SUBMITTED";
            if (activeTab === "REWORK") return t.status === "REWORK";
            if (activeTab === "ALL") return true;
            return true;
        });
    }, [filteredTasksSource, activeTab]);

    const totalPages = Math.ceil(pendingTasks.length / itemsPerPage);
    const paginatedTasks = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return pendingTasks.slice(start, start + itemsPerPage);
    }, [pendingTasks, currentPage]);

    // Reset pagination when tab or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, fromDate, toDate, searchTerm]);

    const dateLabel = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-sm -z-10" />
                <Loader2 className="w-12 h-12 text-violet-600 animate-spin mb-6 drop-shadow-glow-sm" />
                <p className="text-slate-800 font-bold text-xl animate-pulse">Syncing Dashboard...</p>
                <p className="text-slate-400 text-xs mt-2 font-bold">Preparing Executive Insights</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8 mt-4">


            {/* Top Metrics Row - 3 equal cards, aligned with My Task List width */}
            <div className="flex flex-col xl:flex-row gap-4">
                {/* Left: metric cards, same flex-1 width as task table */}
                <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#4285F4] text-white rounded-[1.5rem] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                            <div>
                                <span className="text-4xl font-bold tracking-tight">{stats.total || 0}</span>
                                <p className="text-[14px] font-medium mt-1 text-white/90">Total Tasks</p>
                            </div>
                            <div className="absolute right-4 bottom-4 opacity-20">
                                <CheckSquare size={56} strokeWidth={1.5} />
                            </div>
                        </div>

                        <div className="bg-[#34D399] text-white rounded-[1.5rem] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-4xl font-bold tracking-tight">{score || 0}%</span>
                                    <p className="text-[14px] font-medium mt-1 text-white/90">Performance Index</p>
                                </div>
                                <div className="opacity-40 mt-2">
                                    <TrendingUp size={28} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#9B51E0] text-white rounded-[1.5rem] p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-28 border border-[#a259e8]">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-4xl font-bold tracking-tight">{stats.pendingSubmission || 0}</span>
                                    <p className="text-[14px] font-medium mt-1 text-white/90">Pending Submission</p>
                                </div>
                                <div className="opacity-40 mt-2">
                                    <Activity size={28} />
                                </div>
                            </div>
                            <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                                <div className="w-24 h-24 rounded-full border-[10px] border-white"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: spacer matching quick actions column so cards don't extend under it */}
                <div className="hidden xl:flex w-[320px] shrink-0 gap-4" />
            </div>

            {/* Main Content Split */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
                {/* Left Side - Task Table (grows to fill) */}
                <div className="flex-1 min-w-0 bg-white rounded-[1.5rem] p-0 shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
                    <div className="flex items-center gap-6 pt-6 px-6 border-b border-slate-100 pb-0">
                        <h2 className="text-[17px] font-bold text-slate-800 pb-4">My Task List</h2>
                        <div className="flex gap-10 ml-2">
                            {['Today\'s Tasks', 'New', 'In Progress', 'Submitted', 'Reworks', 'All'].map((tab) => {
                                const tabKey = tab === 'Today\'s Tasks' ? 'TODAY' : tab.toUpperCase().replace(' ', '_');
                                return (
                                    <span
                                        key={tab}
                                        onClick={() => setActiveTab(tabKey)}
                                        className={`text-sm pb-4 cursor-pointer whitespace-nowrap ${activeTab === tabKey ? "text-violet-600 border-b-2 border-violet-600 font-semibold" : "text-slate-400"}`}
                                    >
                                        {tab}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[12px] text-slate-400 border-b border-slate-100 bg-slate-50/30">
                                <tr>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-slate-400">Directives</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-slate-400">Parent Task ID</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-slate-400">Parent Task</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-slate-400">Assigned Date <ChevronDown size={14} className="inline ml-1" /></th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-slate-400">Priority <ChevronDown size={14} className="inline ml-1" /></th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-center text-slate-400">Status</th>
                                    <th className="py-3 px-6 font-medium whitespace-nowrap text-right text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pendingTasks.length === 0 ? (
                                    <tr><td colSpan="7" className="py-12 text-center text-slate-400 font-bold text-xs">No tasks present</td></tr>
                                ) : (
                                    paginatedTasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2 px-6">
                                                <span className="text-[13.5px] font-semibold text-slate-700 truncate max-w-[200px] block">{task.title}</span>
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
                                                <span className="text-[13px] font-medium text-slate-600">
                                                    {formatDisplayDate(
                                                        task.assigned_date || 
                                                        task.assigned_at || 
                                                        task.created_at || 
                                                        task.updated_at || 
                                                        task.assignedAt || 
                                                        task.createdAt || 
                                                        task.due_date || 
                                                        task.dueDate
                                                    )}
                                                </span>
                                            </td>
                                            <td className="py-2 px-6">
                                                <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                                                    <span className={`w-2 h-2 rounded-full ${task.severity === 'HIGH' ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]' : 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]'}`}></span>
                                                    {task.severity === 'HIGH' ? 'High' : 'Medium'}
                                                </div>
                                            </td>
                                            <td className="py-2 px-6 text-center">
                                                <div className="flex justify-center">
                                                    {task.status === 'SUBMITTED' ? (
                                                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-violet-600 border border-violet-100 flex items-center gap-1.5 min-w-[100px] justify-center shadow-sm">
                                                            <CheckCircle size={12} /> Submitted
                                                        </span>
                                                    ) : task.status === 'IN_PROGRESS' || task.status === 'STARTED' ? (
                                                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 min-w-[100px] justify-center shadow-sm">
                                                            <Clock size={12} /> In Progress
                                                        </span>
                                                    ) : task.status === 'NEW' ? (
                                                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1.5 min-w-[100px] justify-center shadow-sm">
                                                            <PlusCircle size={12} /> New
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-50 text-slate-600 border border-slate-100 flex items-center gap-1.5 min-w-[100px] justify-center shadow-sm">
                                                            <Activity size={12} /> {task.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2 px-6 text-right">
                                                <button
                                                    onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                                                    className="px-5 py-1.5 bg-[#4285F4] text-white text-[12px] font-bold rounded-lg hover:bg-blue-600 transition active:scale-95 shadow-sm inline-flex items-center gap-1.5"
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
                        {pendingTasks.length > 0 && (
                            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium bg-slate-50/10">
                                <span>Showing {Math.min(pendingTasks.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(pendingTasks.length, currentPage * itemsPerPage)} of {pendingTasks.length}</span>
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
                            <button onClick={() => navigate('/tasks')} className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <CheckSquare size={18} strokeWidth={2.5} /> View All Tasks
                            </button>
                            <button onClick={() => navigate('/reports')} className="w-full py-3.5 px-5 bg-[#7B51ED] text-white shadow-lg shadow-violet-500/20 rounded-xl font-bold flex items-center gap-3 hover:bg-violet-700 hover:translate-y-[-1px] transition-all text-[14px]">
                                <Activity size={18} strokeWidth={2.5} /> View Reports
                            </button>
                        </div>
                    </div>

                    {/* Activity Log - Integrated for Employee Role */}
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-100 flex flex-col min-h-[300px]">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Activity Log</h3>
                            <button 
                                onClick={fetchActivities}
                                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-violet-600 transition-colors"
                                title="Refresh activities"
                            >
                                <RefreshCw size={14} className={loadingActivities ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-1">
                            {loadingActivities && activities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                    <Loader2 size={24} className="animate-spin text-slate-300 mb-2" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing Logs</span>
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-10">
                                    <MessageSquare size={32} className="mx-auto text-slate-100 mb-3" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No Recent Activity</p>
                                </div>
                            ) : (
                                activities.map((act, idx) => (
                                    <div key={act.id || idx} className="flex gap-3 group animate-fade-in">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                            act.type?.includes('UPDATE') ? 'bg-amber-400' : 
                                            act.type?.includes('APPROVE') ? 'bg-emerald-400' : 'bg-violet-400'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12.5px] leading-relaxed text-slate-600 font-medium">
                                                <span className="text-slate-900 font-bold">{act.message}</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-bold flex items-center gap-1.5">
                                                <Clock size={10} /> {formatTimeAgo(act.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>


            {/* Action Bar - Moved View Reports to Recent Activity */}
            <div className="flex justify-end h-8">
            </div>
        </div>
    );
};

export default EmployeeDashboard;






