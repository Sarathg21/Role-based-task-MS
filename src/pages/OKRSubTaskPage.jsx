import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
    Target, Users as UsersIcon, CheckCircle2, Clock, AlertCircle, 
    ArrowLeft, TrendingUp, Layers, User as UserIcon, Building2, Loader2,
    Calendar, Filter, ChevronDown, CheckCircle, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';

const getRiskLabel = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('high')) return 'High';
    if (r.includes('medium')) return 'Medium';
    return 'Low';
};

const StatusBadge = ({ status }) => {
    // Trimming extra spaces to make sure mapping doesn't fail
    const s = (status || '').trim().toUpperCase().replace(/\s+/g, '_');
    const mapping = {
        'APPROVED': 'bg-emerald-500 text-white',
        'IN_PROGRESS': 'bg-blue-700 text-white',
        'STARTED': 'bg-blue-700 text-white',
        'PENDING': 'bg-blue-700 text-white',
        'REVIEW': 'bg-amber-300 text-amber-900',
        'COMPLETED': 'bg-emerald-500 text-white',
        'OVERDUE': 'bg-red-600 text-white',
        'REWORK': 'bg-red-600 text-white',
        'SUBMITTED': 'bg-amber-300 text-amber-900',
        'NEW': 'bg-blue-700 text-white'
    };
    
    // Format "IN_PROGRESS" to "In Progress"
    const displayStatus = (status || '').trim().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    
    return (
        <span className={`px-4 py-1.5 rounded-full text-[11px] font-medium tracking-tight shadow-sm min-w-[100px] text-center inline-block ${mapping[s] || 'bg-slate-100 text-slate-600'}`}>
            {displayStatus}
        </span>
    );
};

const OKRSubTaskPage = () => {
    const { okrId } = useParams();
    const { user } = useAuth();
    const userRole = (user?.role || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN';
    const isCFOorManager = ['CFO', 'MANAGER'].includes(userRole);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [globalOverview, setGlobalOverview] = useState(null);
    const [objectivesList, setObjectivesList] = useState([]);
    const [selectedOKR, setSelectedOKR] = useState(null);
    const [subtasks, setSubtasks] = useState([]);
    const [deptStats, setDeptStats] = useState([]);
    const getStoredFilters = () => ({
        currentOkrId: okrId || '',
        from_date: localStorage.getItem('dashboard_from_date') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        to_date: localStorage.getItem('dashboard_to_date') || new Date().toISOString().slice(0, 10)
    });

    const [filters, setFilters] = useState(getStoredFilters());

    // Listen for global filter changes from Navbar
    useEffect(() => {
        const handleFilterChange = () => {
            const next = getStoredFilters();
            setFilters(prev => {
                if (prev.from_date === next.from_date && prev.to_date === next.to_date) return prev;
                return { 
                    ...prev, 
                    from_date: next.from_date, 
                    to_date: next.to_date 
                };
            });
        };
        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

    const fetchInitialData = async () => {
        // Admin role has no access to task/OKR APIs — skip all calls
        if (isAdmin) { setLoading(false); return; }
        try {
            setLoading(true);
            if (isCFOorManager || userRole === 'EMPLOYEE') {
                const params = {
                    from_date: filters.from_date,
                    to_date: filters.to_date
                };

                // Use strictly the authoritative OKR objectives list endpoint for the dropdown
                const [overviewRes, listRes, summaryRes] = await Promise.all([
                    api.get(userRole === 'EMPLOYEE' ? '/reports/employee/performance' : '/reports/cfo/okr/overview', { params }).catch(() => ({ data: {} })),
                    api.get('/reports/cfo/okr/objectives', { params }).catch(() => ({ data: [] })),
                    api.get('/dashboard/cfo', { params }).catch(() => ({ data: {} }))
                ]);

                const globalData = overviewRes.data?.data || overviewRes.data || {};
                const summaryData = summaryRes.data?.data || summaryRes.data || {};
                
                const rawList = listRes.data;
                const list = (() => {
                    const c = [
                        rawList?.data,
                        rawList?.objectives,
                        rawList?.items,
                        rawList?.results,
                        rawList?.records,
                        rawList?.rows,
                        rawList
                    ];
                    for (const arr of c) {
                        if (Array.isArray(arr)) return arr;
                    }
                    return [];
                })();

                // Strictly map to specified label/value requirements:
                // label = objective_title (mapped to dropdown item display)
                // value = parent_task_id (mapped to selection key)
                const dropdownList = list.map(item => ({
                    parent_task_id: item.parent_task_id,
                    objective_title: item.objective_title,
                    total_subtasks: item.total_subtasks ?? item.sub_total ?? item.total_tasks ?? item.subtask_count ?? 0,
                    completed_subtasks: item.completed_subtasks ?? item.sub_comp ?? item.completed_tasks ?? item.completed_count ?? 0,
                    submitted_subtasks: item.submitted_subtasks ?? item.sub_submitted ?? item.submitted_count ?? 0
                })).filter(item => !!item.parent_task_id && !!item.objective_title);

                setObjectivesList(dropdownList);

                const cleanNum = (val) => {
                    if (val === undefined || val === null) return 0;
                    if (typeof val === 'number') return val;
                    const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
                    return isNaN(parsed) ? 0 : parsed;
                };

                const listTotals = dropdownList.reduce((acc, item) => {
                    acc.total += cleanNum(item.total_subtasks);
                    acc.completed += cleanNum(item.completed_subtasks);
                    acc.submitted += cleanNum(item.submitted_subtasks);
                    return acc;
                }, { total: 0, completed: 0, submitted: 0 });

                const totalTasksRaw = Math.max(
                    cleanNum(globalData.total_subtasks || globalData.sub_total || globalData.total_tasks || summaryData.total_tasks || 0),
                    listTotals.total
                );
                const doneTasksRaw = Math.max(
                    cleanNum(globalData.completed_tasks || globalData.completed_count || globalData.sub_comp || summaryData.completed_count || 0),
                    listTotals.completed
                );
                const submittedTasksRaw = Math.max(
                    cleanNum(globalData.submitted_tasks || globalData.submitted_count || globalData.pending_approval || summaryData.pending_approval || 0),
                    listTotals.submitted
                );
                const finalOverall = cleanNum(globalData.overall_progress || globalData.progress_pct || summaryData.overall_progress || 0) ||
                    (totalTasksRaw > 0 ? Math.round((doneTasksRaw / totalTasksRaw) * 100) : 0);
                const teamScore = cleanNum(summaryData.team_score_current || summaryData.score || summaryData.team_performance || summaryData.overall_progress || 0) || finalOverall;
                
                console.log('[OKR] Global Metrics Parsed:', { totalTasksRaw, doneTasksRaw, finalOverall, teamScore, role: userRole });

                setGlobalOverview({
                    ...globalData,
                    total_objectives: Math.max(
                        dropdownList.length, 
                        cleanNum(globalData.total_objectives || globalData.total_okrs || globalData.objective_count || 0)
                    ),
                    team_score_current: teamScore,
                    overall_progress: finalOverall,
                    total_subtasks: totalTasksRaw,
                    completed_tasks: doneTasksRaw,
                    submitted_tasks: submittedTasksRaw,
                    at_risk: cleanNum(globalData.at_risk || globalData.risk_count || 0),
                    avg_health_score: cleanNum(globalData.avg_health_score || globalData.average_progress || 0)
                });

                const hasCurrent = dropdownList.some(o => String(o.parent_task_id) === String(filters.currentOkrId));
                if ((!okrId || !hasCurrent) && dropdownList.length > 0) {
                    const firstId = dropdownList[0].parent_task_id;
                    setFilters(prev => ({ ...prev, currentOkrId: firstId }));
                }
            }
        } catch (error) {
            console.error('Error fetching initial OKR meta:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDrilldownData = async (override = {}) => {
        const targetId = override.okrId ?? filters.currentOkrId;
        if (!targetId) return;

        setLoading(true);
        try {
            const params = {
                from_date: override.from_date ?? filters.from_date,
                to_date: override.to_date ?? filters.to_date
            };

            // Use strictly the parent-specific drilldown endpoints as requested
            const [summaryRes, subtasksRes, deptsRes] = await Promise.all([
                api.get(`/reports/cfo/okr/objectives/${targetId}/summary`, { params }).catch(() => ({ data: {} })),
                api.get(`/reports/cfo/okr/objectives/${targetId}/subtasks`, { params }).catch(() => ({ data: [] })),
                api.get(`/reports/cfo/okr/objectives/${targetId}/departments`, { params }).catch(() => ({ data: [] }))
            ]);

            // Universal array extractor to handle varying backend payloads gracefully
            const extractList = (res) => {
                const d = res?.data;
                if (!d) return [];
                if (Array.isArray(d)) return d;
                return d.data || d.items || d.tasks || d.subtasks || d.departments || d.results || [];
            };
            
            const summaryData = summaryRes.data?.data || summaryRes.data || {};
            let subList = extractList(subtasksRes);
            let depts = extractList(deptsRes);

            // Inherit title if missing
            if (!summaryData.objective_title && !summaryData.parent_task_title) {
                const matched = objectivesList.find(o => String(o.parent_task_id) === String(targetId)) || {};
                summaryData.objective_title = matched.objective_title || 'Strategic Task';
            }

            const isDone = (s) => ['COMPLETED', 'APPROVED', 'DONE', 'FINISHED', 'SUCCESS'].includes((s.status || s.task_status || '').toUpperCase().trim()) || s.is_completed || s.is_done;
            const isSubmitted = (s) => ['SUBMITTED', 'REVIEW', 'NEW', 'PENDING', 'STARTED', 'IN PROGRESS', 'IN_PROGRESS'].includes((s.status || s.task_status || '').toUpperCase().trim());
            
            const manualTotal = subList.length;
            const manualDone = subList.filter(isDone).length;
            const manualSubmitted = subList.filter(s => isDone(s) || isSubmitted(s)).length;

            const finalTotal = Math.max(Number(summaryData.total_subtasks || summaryData.sub_total || 0), manualTotal);
            const finalDone = Math.max(Number(summaryData.completed_subtasks || summaryData.sub_comp || 0), manualDone);
            const finalSubmitted = Math.max(Number(summaryData.submitted_subtasks || summaryData.sub_submitted || 0), manualSubmitted);
            
            const parseDateSafe = (value) => {
                if (!value) return null;
                const parsed = new Date(value);
                return isNaN(parsed.getTime()) ? null : parsed;
            };
            const pickDueDate = () => {
                const primary = summaryData.due_date || summaryData.end_date || summaryData.target_date || summaryData.dueDate;
                const primaryDate = parseDateSafe(primary);
                if (primaryDate) return primaryDate;
                let latest = null;
                subList.forEach(s => {
                    const candidate = s.due_date || s.dueDate || s.due || s.end_date;
                    const d = parseDateSafe(candidate);
                    if (d && (!latest || d > latest)) latest = d;
                });
                return latest;
            };

            let daysLeft = 0;
            const dueDate = pickDueDate();
            if (dueDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diff = dueDate - today;
                daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            }

            setSelectedOKR({
                ...summaryData,
                total_subtasks: finalTotal,
                completed_subtasks: finalDone,
                submitted_subtasks: finalSubmitted,
                progress_pct: finalTotal > 0 ? Math.round((finalDone / finalTotal) * 100) : (summaryData.progress_pct || 0),
                health_score: finalTotal > 0 ? Math.round((finalDone / finalTotal) * 100) : (summaryData.health_score || 0),
                days_left: summaryData.days_left ?? daysLeft
            });

            // Format subtasks for tabular display
            const formattedSubtasks = subList.map(st => {
                let daysLeftText = st.days_left_text;
                const dueValue = st.due_date || st.dueDate || st.due || st.end_date;
                if (!daysLeftText && dueValue) {
                    const due = new Date(dueValue);
                    const now = new Date();
                    now.setHours(0,0,0,0);
                    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                    if (isDone(st)) daysLeftText = 'Done';
                    else if (diffDays < 0) daysLeftText = `${Math.abs(diffDays)} days late`;
                    else if (diffDays === 0) daysLeftText = 'Today';
                    else daysLeftText = `${diffDays} days left`;
                }
                return { ...st, days_left_text: daysLeftText || 'N/A' };
            });

            setSubtasks(formattedSubtasks);
            setDeptStats(depts);

        } catch (error) {
            console.error('Error fetching Drilldown details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [filters.from_date, filters.to_date]);

    useEffect(() => {
        if (!filters.currentOkrId) return; // Don't fire with empty ID
        fetchDrilldownData();
        // Sync URL
        if (filters.currentOkrId !== okrId) {
            navigate(`/okr-subtask/${filters.currentOkrId}`, { replace: true });
        }
    }, [filters.currentOkrId, filters.from_date, filters.to_date]);

    const handleApplyFilters = async () => {
        localStorage.setItem('dashboard_from_date', filters.from_date);
        localStorage.setItem('dashboard_to_date', filters.to_date);
        window.dispatchEvent(new Event('dashboard-filter-change'));
        await fetchInitialData();
        await fetchDrilldownData();
    };

    const deptDistribution = useMemo(() => {
        const colors = ['#1e3a8a', '#10b981', '#7c3aed', '#f59e0b', '#ef4444'];
        return deptStats.map((d, i) => ({
            name: d.department_name,
            value: d.total_subtasks,
            fill: colors[i % colors.length]
        }));
    }, [deptStats]);

    // Admin role: no OKR access — show a friendly message
    if (isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 bg-[#f8fafc]">
                <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                    <ShieldCheck size={36} className="text-amber-400" />
                </div>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-slate-700 mb-1">OKR Dashboard — Admin Restricted</h2>
                    <p className="text-slate-400 text-sm max-w-xs">The Admin role manages users and departments only. OKR data is available to CFO and Managers.</p>
                </div>
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#1e40af] transition-colors">
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    if (loading && !selectedOKR) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#f8fafc] gap-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Target className="w-4 h-4 text-blue-300 animate-pulse" />
                    </div>
                </div>
                <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Syncing Executive Intelligence...</p>
            </div>
        );
    }

    const clean = (val) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
    };

    const g = globalOverview || {};
    const displayTotalObjectives = Math.max(clean(g.total_objectives || g.total_okrs || g.objective_count), objectivesList.length);
    const displayOverallProgress = clean(g.overall_progress || g.progress_pct);
    const displayTeamScore = clean(g.team_score_current || g.score || g.team_performance) || displayOverallProgress;
    const displayTotalSubtasks = clean(g.total_subtasks || g.sub_total || g.total_tasks);
    const displayCompletedTasks = clean(g.completed_tasks || g.completed_count || g.sub_comp);
    const displayAtRisk = clean(g.at_risk || g.risk_count);
    const displayAvgRate = clean(g.avg_health_score || g.average_progress);
    const displaySubmittedTasks = clean(g.submitted_tasks || g.submitted_count) || (selectedOKR?.submitted_subtasks || 0);

    const topMetrics = [
        { label: 'Total Objectives', value: displayTotalObjectives, gradient: 'from-[#4285F4] to-[#2563EB]', icon: Target },
        { label: 'Team Performance Score', value: `${displayTeamScore}%`, gradient: 'from-[#7C3AED] to-[#5B21B6]', icon: TrendingUp },
        { 
            label: 'Total Subtasks Completed', 
            value: `${displayCompletedTasks} / ${displayTotalSubtasks}`, 
            sub: `${Math.round((displayCompletedTasks / Math.max(displayTotalSubtasks, 1)) * 100)}%`,
            gradient: 'from-[#10B981] to-[#059669]', 
            icon: CheckCircle2 
        },
        { 
            label: 'Total Subtasks Submitted', 
            value: `${displaySubmittedTasks} / ${displayTotalSubtasks}`, 
            sub: `${Math.round((displaySubmittedTasks / Math.max(displayTotalSubtasks, 1)) * 100)}%`,
            gradient: 'from-[#F59E0B] to-[#D97706]', 
            icon: ShieldCheck 
        },
        { label: 'At Risk', value: displayAtRisk, gradient: 'from-[#F43F5E] to-[#E11D48]', icon: AlertTriangle },
        { label: 'Avg Completion Rate', value: `${displayAvgRate}%`, gradient: 'from-[#06B6D4] to-[#0891B2]', icon: CheckCircle },
        { label: 'Overall Progress', value: `${displayOverallProgress}%`, gradient: 'from-[#4F46E5] to-[#4338CA]', icon: TrendingUp },
    ];

    return (
        <div className="flex flex-col gap-4 bg-[#f1f5f9] min-h-screen p-4 sm:p-6 text-slate-800 font-sans">
            {/* ── HEADER ── */}
            <div className="bg-[#1e3a8a] text-white py-3 px-6 rounded-xl flex justify-between items-center shadow-lg border border-white/10 mb-2">
                 <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                        <ShieldCheck className="text-blue-200" size={24} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white select-none">FJ Group — OKR Execution Dashboard</h1>
                 </div>
                 <div className="hidden lg:flex items-center gap-3 text-xs font-bold text-white capitalize tracking-tight">
                    <Calendar size={14} />
                    <span>Real-time Strategic Insights</span>
                 </div>
            </div>

            {/* ── TOP KPI CARDS (GLOBAL OVERVIEW) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 mb-2">
                {topMetrics.map((m, i) => (
                    <div key={i} className={`relative overflow-hidden bg-gradient-to-br ${m.gradient} p-4 rounded-2xl shadow-lg shadow-indigo-200/20 flex flex-col transition-all hover:scale-[1.03] group h-full`}>
                        <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                        
                        <div className="flex items-start justify-between relative z-10 w-full mb-1">
                             <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.1em] drop-shadow-sm line-clamp-1">{m.label}</span>
                             {m.icon && <m.icon size={16} className="text-white/40 group-hover:text-white/80 transition-colors" />}
                        </div>
                        
                        <div className="relative z-10 flex flex-col">
                            <span className="text-3xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">{m.value}</span>
                            {m.sub && (
                                <span className="text-[11px] font-black text-white/90 drop-shadow-sm mt-0.5">{m.sub}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="bg-white px-8 py-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-6 mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 font-bold capitalize tracking-tight text-[11.5px]">Filter:</span>
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                             <Target size={14} />
                        </span>
                        <select 
                            className="appearance-none bg-slate-50 border-2 border-slate-100 rounded-lg pl-9 pr-10 py-2.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all cursor-pointer min-w-[240px]"
                            value={filters.currentOkrId}
                            onChange={(e) => setFilters(prev => ({ ...prev, currentOkrId: e.target.value }))}
                        >
                            <option value="">Select Parent Task</option>
                            {objectivesList.map(obj => (
                                <option key={obj.parent_task_id} value={obj.parent_task_id}>
                                    {obj.objective_title}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-bold capitalize tracking-tight">From:</span>
                        <input 
                            type="date" 
                            className="bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                            value={filters.from_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-bold capitalize tracking-tight">To Date:</span>
                        <input 
                            type="date" 
                            className="bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                            value={filters.to_date}
                            onChange={(e) => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
                        />
                    </div>
                    <button 
                        onClick={handleApplyFilters}
                        className="bg-[#1e40af] text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-800 active:scale-95 transition-all outline-none"
                    >
                        Apply
                    </button>
                </div>

                <div className="ml-auto">
                    <button 
                        onClick={() => navigate('/okr-dashboard')}
                        className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline"
                    >
                        <ArrowLeft size={16} />
                        Full Reports
                    </button>
                </div>
            </div>

            {/* ── MAIN SECTION: OBJECTIVE PROGRESS OVERVIEW ── */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-6 flex flex-col">
                <div className="bg-[#f8fafc] px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">
                        Sub Objectives Tracking: <span className="text-blue-700">{selectedOKR?.parent_task_title || selectedOKR?.objective_title || 'Loading...'} </span>
                        <span className="text-slate-400 text-sm font-medium ml-2">({filters.currentOkrId})</span>
                    </h2>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px]">
                    {/* Left: Subtask Table */}
                    <div className="border-r border-slate-100">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#f1f5f9] text-[10px] font-black text-slate-500 capitalize tracking-tight border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Task ID</th>
                                        <th className="py-3 px-4">Sub Objective</th>
                                        <th className="py-3 px-4">Department</th>
                                        <th className="py-3 px-4">Assigned To</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4">Due Date</th>
                                        <th className="py-3 px-4 text-right">Days Left</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {subtasks.map((st, i) => (
                                        <tr key={i} className="hover:bg-blue-50/30 transition-colors text-[12px]">
                                            <td className="py-3 px-4 font-bold text-slate-500">T-{st.task_id || (121 + i)}</td>
                                            <td className="py-3 px-4 font-bold text-slate-900">{st.subtask_title || st.title}</td>
                                            <td className="py-3 px-4 font-semibold text-slate-500">{st.department_name || st.department}</td>
                                            <td className="py-3 px-4 font-bold text-slate-700">{st.assigned_to_name || st.assignee}</td>
                                            <td className="py-3 px-4 text-center">
                                                <StatusBadge status={st.status} />
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-500">{st.due_date}</td>
                                            <td className={`py-3 px-4 text-right font-black ${
                                                st.days_left_text?.toLowerCase().includes('late') ? 'text-rose-600' : 
                                                st.days_left_text === 'Done' ? 'text-emerald-600' : 'text-amber-600'
                                            }`}>
                                                {st.days_left_text?.replace(/ left/i, '')}
                                            </td>
                                        </tr>
                                    ))}
                                    {subtasks.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="py-12 text-center text-slate-400 font-bold italic uppercase tracking-widest text-[11px]">
                                                No subtask execution data found for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Progress Analytics */}
                    <div className="p-5 flex flex-col gap-4 bg-slate-50/50 overflow-y-auto">
                        {/* Completed Bar */}
                        <div className="flex justify-between items-end">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 capitalize tracking-tight mb-0.5">Total Subtasks Completed</span>
                                <span className="text-lg font-black text-slate-900 leading-none">
                                    {selectedOKR?.completed_subtasks || 0} / {selectedOKR?.total_subtasks || 0}
                                </span>
                             </div>
                             <span className="text-2xl font-black text-blue-800">{selectedOKR?.progress_pct || 0}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-300">
                             <div 
                                className="h-full bg-[#1e40af] shadow-[0_0_15px_rgba(30,64,175,0.4)] transition-all duration-1000"
                                style={{ width: `${selectedOKR?.progress_pct || 0}%` }}
                             />
                        </div>

                        {/* Submitted Bar */}
                        {(() => {
                            const isDone = (s) => ['COMPLETED', 'APPROVED', 'DONE', 'FINISHED', 'SUCCESS'].includes((s.status || '').toUpperCase().trim());
                            const isSubmitted = (s) => ['SUBMITTED', 'REVIEW', 'NEW', 'PENDING'].includes((s.status || '').toUpperCase().trim());
                            
                            const manualSubCount = subtasks.filter(s => isDone(s) || isSubmitted(s)).length;
                            const submittedCount = Math.max(Number(selectedOKR?.submitted_subtasks) || 0, manualSubCount);
                            const total = Math.max(Number(selectedOKR?.total_subtasks) || 0, subtasks.length);
                            const submittedPct = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
                            return (
                                <>
                                    <div className="flex justify-between items-end">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 capitalize tracking-tight mb-0.5">Total Subtasks Submitted</span>
                                            <span className="text-lg font-black text-slate-900 leading-none">
                                                {submittedCount} / {total}
                                            </span>
                                        </div>
                                        <span className="text-2xl font-black text-amber-500">{submittedPct}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-300">
                                        <div 
                                            className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all duration-1000"
                                            style={{ width: `${submittedPct}%` }}
                                        />
                                    </div>
                                </>
                            );
                        })()}

                        {/* Pie Chart — fixed height to prevent overflow */}
                        <div className="w-full" style={{ height: 320 }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <PieChart>
                                    <Pie
                                        data={deptDistribution}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={120}
                                        dataKey="value"
                                        stroke="#fff"
                                        strokeWidth={2}
                                        label={({ cx, cy, midAngle, outerRadius, index }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = outerRadius * 0.62;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            const words = (deptDistribution[index]?.name || '').split(' ');
                                            return (
                                                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="black" className="pointer-events-none">
                                                    {words.map((word, i) => (
                                                        <tspan x={x} dy={i === 0 ? 0 : 10} key={i}>{word}</tspan>
                                                    ))}
                                                </text>
                                            );
                                        }}
                                        labelLine={false}
                                    >
                                        {deptDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Legend — outside chart so it doesn't steal chart height */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
                            {deptDistribution.map((d, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.fill }} />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{d.name}</span>
                                </div>
                            ))}
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-3">
                             <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Total Subtasks</span>
                                <span className="text-sm font-black text-slate-800">{selectedOKR?.total_subtasks || 0}</span>
                             </div>
                             <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.15em] mb-1">Days Left</span>
                                <span className="text-sm font-black text-blue-700">{selectedOKR?.days_left ?? '---'}</span>
                             </div>
                             <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Sub-Depts</span>
                                <span className="text-sm font-black text-slate-800">{selectedOKR?.department_count || 1}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

             {/* ── DEPARTMENT CONTRIBUTION SECTION ── */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
                 <div className="bg-[#f8fafc] px-6 py-3 border-b border-slate-200">
                     <h3 className="text-sm font-black text-slate-700 capitalize tracking-tight">Department Contribution</h3>
                 </div>
                 
                 <div className="flex flex-col gap-0">
                    {/* Detailed Table (EXTENDED FORMAT) */}
                    <div className="relative flex flex-col">
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-[#1e3a8a]/5 text-[#1e3a8a] text-[13.5px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="py-5 px-6 text-left">Department Focus</th>
                                        <th className="py-5 px-4 text-center">Total Tasks</th>
                                        <th className="py-5 px-4 text-center">In Progress</th>
                                        <th className="py-5 px-4 text-center">Approved</th>
                                        <th className="py-5 px-4 text-center">Pending</th>
                                        <th className="py-5 px-6 text-right">Contribution (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {deptStats.map((d, i) => {
                                        const total = selectedOKR?.total_subtasks || 1; 
                                        const pct = ((d.total_subtasks / total) * 100).toFixed(1);
                                        
                                        const dName = d.department_name || 'Unknown';
                                        const related = subtasks.filter(st => (st.department_name || st.department) === dName);
                                        const countStatus = (statuses) => related.filter(st => statuses.includes((st.status || '').toUpperCase().replace('_', ' '))).length;
                                        

                                        return (
                                            <tr key={i} className="hover:bg-slate-50 font-bold text-slate-700 group transition-colors">
                                                <td className="py-5 px-6 flex items-center gap-4">
                                                    <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: deptDistribution[i]?.fill }} />
                                                    <span className="text-[15.5px] font-black text-[#1E1B4B] uppercase tracking-tight">{d.department_name}</span>
                                                </td>
                                                <td className="py-5 px-4 text-center tabular-nums text-[16px] text-blue-900 font-black">
                                                    {d.total_subtasks}
                                                </td>
                                                <td className="py-5 px-4 text-center tabular-nums text-[14.5px] text-slate-600">
                                                    {countStatus(['IN PROGRESS', 'STARTED'])}
                                                </td>
                                                <td className="py-5 px-4 text-center tabular-nums text-[14.5px] text-emerald-600">
                                                    {countStatus(['APPROVED'])}
                                                </td>
                                                <td className="py-5 px-4 text-center tabular-nums text-[14.5px] text-amber-600">
                                                    {countStatus(['PENDING', 'NEW', 'SUBMITTED', 'REVIEW', 'CHANGES REQUESTED', 'REWORK'])}
                                                </td>
                                                <td className="py-5 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                            <div className="h-full" style={{ width: `${pct}%`, backgroundColor: deptDistribution[i]?.fill }} />
                                                        </div>
                                                        <span className="text-[14px] font-black text-slate-800 tabular-nums w-12 text-right">{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {deptStats.length === 0 && (
                                         <tr>
                                             <td colSpan="7" className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest italic">
                                                 No departmental breakdown available.
                                             </td>
                                         </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Footer Summary Bar */}
                        <div className="bg-[#f8fafc] p-5 border-t border-slate-200 flex justify-between items-center sm:px-8">
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2.5 bg-emerald-100 text-emerald-700 px-5 py-2 rounded-xl border border-emerald-200 shadow-sm">
                                    <CheckCircle size={18} />
                                    <span className="text-[12px] font-black uppercase tracking-widest">Health Verified</span>
                                </div>
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Strategic Alignment: High Priority</span>
                             </div>
                             <div className="flex items-center gap-5">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Aggregate Progress</span>
                                <div className="bg-[#1E1B4B] text-white px-8 py-2 rounded-xl border border-blue-800 font-black text-xl tabular-nums shadow-lg shadow-indigo-900/40">
                                    {(() => {
                                        let pct = selectedOKR?.progress_pct;
                                        if (pct === undefined || pct === null) {
                                            const total = selectedOKR?.total_subtasks || subtasks.length;
                                            if (total > 0) {
                                                const done = subtasks.filter(s => ['COMPLETED', 'APPROVED'].includes((s.status || '').toUpperCase())).length;
                                                pct = Math.round((done / total) * 100);
                                            } else {
                                                pct = 0;
                                            }
                                        }
                                        return pct;
                                    })()}%
                                </div>
                             </div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default OKRSubTaskPage;
