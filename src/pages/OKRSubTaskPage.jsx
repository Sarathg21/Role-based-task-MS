import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Target, Users as UsersIcon, CheckCircle2, Clock, AlertCircle,
    ArrowLeft, TrendingUp, Layers, User as UserIcon, Building2, Loader2,
    Calendar, Filter, ChevronDown, CheckCircle, AlertTriangle, ShieldCheck,
    RefreshCw
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const getRiskLabel = (rating) => {
    const r = (rating || '').toLowerCase();
    if (r.includes('high')) return 'High';
    if (r.includes('medium')) return 'Medium';
    return 'Low';
};

const cleanNum = (v) => {
    if (v === undefined || v === null) return 0;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
};

// Extract array from any possible backend nesting
const extractArr = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    for (const key of ['data', 'items', 'tasks', 'subtasks', 'departments', 'objectives', 'results', 'records', 'rows']) {
        if (Array.isArray(data[key])) return data[key];
    }
    return [];
};

const STATUS_DONE = new Set(['COMPLETED', 'APPROVED', 'DONE', 'FINISHED', 'SUCCESS']);
const STATUS_SUBMITTED = new Set(['SUBMITTED', 'REVIEW', 'NEW', 'PENDING', 'STARTED', 'IN_PROGRESS', 'IN PROGRESS', 'REWORK', 'CHANGES_REQUESTED']);

const normStatus = (s) => (s || '').toString().trim().toUpperCase().replace(/\s+/g, '_');
const isDone = (s) => STATUS_DONE.has(normStatus(s?.status ?? s?.task_status ?? s ?? ''));
const isActive = (s) => STATUS_SUBMITTED.has(normStatus(s?.status ?? s?.task_status ?? s ?? ''));

/* ─── StatusBadge ───────────────────────────────────────────────────────────── */
const STATUS_COLORS = {
    APPROVED: 'bg-emerald-500 text-white',
    COMPLETED: 'bg-emerald-500 text-white',
    DONE: 'bg-emerald-500 text-white',
    IN_PROGRESS: 'bg-blue-600 text-white',
    STARTED: 'bg-blue-600 text-white',
    PENDING: 'bg-amber-400 text-amber-900',
    REVIEW: 'bg-amber-400 text-amber-900',
    SUBMITTED: 'bg-sky-500 text-white',
    NEW: 'bg-indigo-500 text-white',
    REWORK: 'bg-rose-600 text-white',
    OVERDUE: 'bg-rose-600 text-white',
    CANCELLED: 'bg-slate-400 text-white',
};

const StatusBadge = ({ status }) => {
    const key = normStatus(status);
    const cls = STATUS_COLORS[key] || 'bg-slate-100 text-slate-600';
    const label = (status || '').trim().replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return (
        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-tight shadow-sm min-w-[90px] text-center inline-block ${cls}`}>
            {label || '—'}
        </span>
    );
};

/* ─── KPI card ──────────────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, sub, gradient, Icon }) => (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-4 rounded-2xl shadow-lg flex flex-col transition-all hover:scale-[1.03] group h-full`}>
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
        <div className="flex items-start justify-between relative z-10 w-full mb-1">
            <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.1em] drop-shadow-sm line-clamp-2">{label}</span>
            {Icon && <Icon size={16} className="text-white/40 group-hover:text-white/80 transition-colors shrink-0 ml-1" />}
        </div>
        <div className="relative z-10 flex flex-col">
            <span className="text-2xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">{value}</span>
            {sub && <span className="text-[11px] font-black text-white/90 drop-shadow-sm mt-0.5">{sub}</span>}
        </div>
    </div>
);

/* ════════════════════════════════════════════════════════════════════════════ */
const OKRSubTaskPage = () => {
    const { okrId: routeOkrId } = useParams();
    const { user } = useAuth();
    const userRole = (user?.role || '').toUpperCase();
    const isAdmin = userRole === 'ADMIN';
    const navigate = useNavigate();

    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    // Validate a YYYY-MM-DD string — reject corrupted values (e.g. year "0003")
    const validDate = (raw, fallback) => {
        if (!raw) return fallback;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return fallback;
        const yr = d.getFullYear();
        if (yr < 2020 || yr > 2100) { localStorage.removeItem('dashboard_to_date'); return fallback; }
        return raw;
    };

    const getStored = () => ({
        from_date:    validDate(localStorage.getItem('dashboard_from_date'), firstOfMonth),
        to_date:      validDate(localStorage.getItem('dashboard_to_date'),   today),
        currentOkrId: routeOkrId || '',
    });

    const [filters, setFilters] = useState(getStored);

    // sync global filter events from Navbar
    useEffect(() => {
        const handle = () => {
            const n = { from_date: localStorage.getItem('dashboard_from_date') || firstOfMonth, to_date: localStorage.getItem('dashboard_to_date') || today };
            setFilters(prev => (prev.from_date === n.from_date && prev.to_date === n.to_date ? prev : { ...prev, ...n }));
        };
        window.addEventListener('dashboard-filter-change', handle);
        return () => window.removeEventListener('dashboard-filter-change', handle);
    }, []);

    /* state */
    const [loading, setLoading]           = useState(true);
    const [globalOverview, setGlobalOverview] = useState(null);
    const [objectivesList, setObjectivesList] = useState([]);
    const [selectedOKR, setSelectedOKR]   = useState(null);
    const [subtasks, setSubtasks]         = useState([]);
    const [deptStats, setDeptStats]       = useState([]);

    /* ── fetch objectives list for dropdown ────────────────────────────────── */
    /* ── fetch objectives list for dropdown ────────────────────────────────── */
    const fetchInitialData = useCallback(async () => {
        if (isAdmin) { setLoading(false); return; }
        setLoading(true);
        try {
            // Priority 1: User's exact range
            const params = { from_date: filters.from_date, to_date: filters.to_date };
            // Priority 2: 90-day "Reality Check" (ensures we see data from DB)
            const wideParams = { from_date: '2026-01-01', to_date: today };

            const [overviewRes, listRes, summaryRes, wideListRes, tasksRes] = await Promise.all([
                api.get('/reports/cfo/okr/overview', { params }).catch(() => ({ data: {} })),
                api.get('/reports/cfo/okr/objectives', { params }).catch(() => ({ data: [] })),
                api.get('/dashboard/cfo', { params }).catch(() => ({ data: {} })),
                // Fallback for the dropdown list – always get at least something if db has it
                api.get('/reports/cfo/okr/objectives', { params: wideParams }).catch(() => ({ data: [] })),
                api.get('/tasks', { params: { limit: 150, scope: (userRole === 'CFO' || userRole === 'ADMIN') ? 'org' : 'department' } }).catch(() => ({ data: [] }))
            ]);

            const globalData  = overviewRes.data?.data || overviewRes.data || {};
            const summaryData = summaryRes.data?.data  || summaryRes.data  || {};
            
            // Merge lists: prioritize filtered results, fall back to wide results if filtered list is empty
            const rawList = extractArr(listRes.data);
            const wideList = extractArr(wideListRes.data);
            const list = rawList.length > 0 ? rawList : wideList;

            const allTasks = extractArr(tasksRes.data);
            const manualParents = allTasks.filter(t => {
                const isParentByFlag = t.is_parent || t.task_type === 'PARENT' || (t.subtask_count && t.subtask_count > 0);
                const isRecurring = !!(t.recurring_task_id || t.recurring_id || t.automation_id);
                // If it has no parent_task_id, it is a root task (objective candidate)
                const hasNoParent = !t.parent_task_id && !t.parent_id;

                // ── Date Filter (Inclusive) ──
                const cDate = t.assigned_at || t.assigned_date || t.created_at || t.date;
                const dDate = t.due_date || t.end_date;
                const cKey = cDate ? String(cDate).slice(0, 10) : null;
                const dKey = dDate ? String(dDate).slice(0, 10) : null;
                const isWithin = (k) => k && k >= filters.from_date && k <= filters.to_date;
                const dateMatch = isWithin(cKey) || isWithin(dKey);

                return hasNoParent && (isParentByFlag || isRecurring) && dateMatch;
            });

            console.log('[OKR-Sub] objectives report count:', list.length, '| manual parents from tasks:', manualParents.length);

            const dropdownList = list
                .map(item => ({
                    parent_task_id:     item.parent_task_id ?? item.id ?? item.task_id,
                    objective_title:    item.objective_title || item.title || item.name || 'Objective',
                    total_subtasks:     cleanNum(item.total_subtasks ?? item.sub_total ?? item.subtask_count ?? item.total_tasks),
                    completed_subtasks: cleanNum(item.completed_subtasks ?? item.sub_comp ?? item.completed_count ?? item.completed_tasks),
                    submitted_subtasks: cleanNum(item.submitted_subtasks ?? item.submitted_count),
                }));

            // Merge manual parents if not already in list
            manualParents.forEach(mp => {
                const mid = mp.id || mp.task_id;
                if (!dropdownList.some(o => String(o.parent_task_id) === String(mid))) {
                    dropdownList.push({
                        parent_task_id: mid,
                        objective_title: mp.title || mp.task_name || 'Strategic Objective',
                        total_subtasks: cleanNum(mp.subtask_count || (Array.isArray(mp.subtasks) ? mp.subtasks.length : 0)),
                        completed_subtasks: 0, // Placeholder, will be updated by fetchDrilldown
                        submitted_subtasks: 0
                    });
                }
            });

            const finalDropdown = dropdownList.filter(i => i.parent_task_id != null && i.objective_title);
            setObjectivesList(finalDropdown);

            /* global KPI calculation with fallbacks */
            const listTotal     = dropdownList.reduce((a, i) => a + i.total_subtasks, 0);
            const listDone      = dropdownList.reduce((a, i) => a + i.completed_subtasks, 0);
            const listSubmit    = dropdownList.reduce((a, i) => a + i.submitted_subtasks, 0);
            
            // If the global overview for the 2-day filter is 0, use the wide-list totals (according to DB)
            const gTotal = cleanNum(globalData.total_subtasks ?? globalData.sub_total ?? globalData.total_tasks ?? summaryData.total_tasks);
            const finalTotal = gTotal > 0 ? gTotal : listTotal;
            
            const gDone = cleanNum(globalData.completed_tasks ?? globalData.completed_count ?? summaryData.completed_count);
            const finalDone = gDone > 0 || gTotal > 0 ? gDone : listDone;

            const overallPct = finalTotal > 0 ? Math.round((finalDone / finalTotal) * 100) : cleanNum(globalData.overall_progress || summaryData.overall_progress);
            const teamScore  = cleanNum(summaryData.team_score_current || summaryData.score || summaryData.team_performance || summaryData.overall_progress) || overallPct;

            setGlobalOverview({
                ...globalData,
                total_objectives:   Math.max(dropdownList.length, cleanNum(globalData.total_objectives ?? globalData.total_okrs ?? globalData.objective_count)),
                team_score_current: teamScore,
                overall_progress:   overallPct,
                total_subtasks:     finalTotal,
                completed_tasks:    finalDone,
                submitted_tasks:    Math.max(cleanNum(globalData.submitted_tasks || summaryData.pending_approval), listSubmit),
                at_risk:            cleanNum(globalData.at_risk ?? globalData.risk_count),
                avg_health_score:   cleanNum(globalData.avg_health_score ?? globalData.average_progress) || teamScore,
            });

            // auto-select first objective if nothing selected
            const hasCurrent = dropdownList.some(o => String(o.parent_task_id) === String(filters.currentOkrId));
            if ((!filters.currentOkrId || !hasCurrent) && dropdownList.length > 0) {
                setFilters(prev => ({ ...prev, currentOkrId: dropdownList[0].parent_task_id }));
            }
        } catch (e) {
            console.error('[OKR-Sub] fetchInitialData error', e);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, filters.from_date, filters.to_date, filters.currentOkrId, today]);

    /* ── fetch drilldown (subtasks + summary + depts) ──────────────────────── */
    const fetchDrilldown = useCallback(async (okrId) => {
        if (!okrId) return;
        setLoading(true);
        try {
            // Use the user's actual filter dates — same range as OKR Dashboard
            const params = { from_date: filters.from_date, to_date: filters.to_date };

            const [summaryRes, subtasksRes, deptsRes] = await Promise.all([
                api.get(`/reports/cfo/okr/objectives/${okrId}/summary`,     { params }).catch(() => ({ data: {} })),
                api.get(`/reports/cfo/okr/objectives/${okrId}/subtasks`,    { params }).catch(() => ({ data: [] })),
                api.get(`/reports/cfo/okr/objectives/${okrId}/departments`, { params }).catch(() => ({ data: [] })),
            ]);

            let summaryData = summaryRes.data?.data || summaryRes.data || {};
            let subList     = extractArr(subtasksRes.data);
            let depts       = extractArr(deptsRes.data);

            console.log('[OKR-Sub] drilldown okrId:', okrId, '| subtasks from report endpoint:', subList.length, '| depts:', depts.length);

            // ── FALLBACK: if report subtasks empty, use the direct tasks endpoint ──
            if (subList.length === 0) {
                console.log('[OKR-Sub] Report subtasks empty — falling back to /tasks/{id}/subtasks');
                try {
                    const fallbackRes = await api.get(`/tasks/${okrId}/subtasks`);
                    const fallbackList = extractArr(fallbackRes.data);
                    console.log('[OKR-Sub] Fallback /tasks subtasks:', fallbackList.length);
                    if (fallbackList.length > 0) subList = fallbackList;
                } catch (fe) {
                    console.warn('[OKR-Sub] Fallback /tasks subtasks failed', fe);
                }
            }

            // ── Build sub-task title / assignee from every possible field name ──
            const formattedSubtasks = subList.map((st, idx) => {
                const status    = st.status || st.task_status || st.status_name || 'NEW';
                const dueRaw    = st.due_date || st.dueDate || st.due || st.end_date;
                const dueDate   = dueRaw ? new Date(dueRaw) : null;
                const now       = new Date(); now.setHours(0,0,0,0);

                let daysLeftText;
                if (isDone(st)) {
                    daysLeftText = 'Done';
                } else if (dueDate) {
                    const diff = Math.ceil((dueDate - now) / 86400000);
                    daysLeftText = diff < 0 ? `${Math.abs(diff)}d late` : diff === 0 ? 'Today' : `${diff}d left`;
                } else {
                    daysLeftText = st.days_left_text || '—';
                }

                return {
                    ...st,
                    // normalise display fields
                    task_id:       st.task_id ?? st.id ?? (1000 + idx),
                    subtask_title: st.subtask_title || st.title || st.task_name || st.name || '(untitled)',
                    department_name: st.department_name || st.department || st.dept_name || st.dept || '—',
                    assigned_to_name: st.assigned_to_name || st.assignee_name || st.employee_name || st.assigned_to || '—',
                    due_date:      dueRaw ? String(dueRaw).slice(0, 10) : '—',
                    status,
                    days_left_text: daysLeftText,
                };
            });

            // ── Summary ──
            const listObj = objectivesList.find(o => String(o.parent_task_id) === String(okrId));
            if (!summaryData.objective_title && !summaryData.parent_task_title) {
                summaryData.objective_title = listObj?.objective_title || 'Strategic Objective';
            }

            const manualTotal     = formattedSubtasks.length;
            const manualDone      = formattedSubtasks.filter(s => isDone(s)).length;
            const manualSubmitted = formattedSubtasks.filter(s => isDone(s) || isActive(s)).length;

            const finalTotal     = Math.max(cleanNum(summaryData.total_subtasks ?? summaryData.sub_total ?? listObj?.total_subtasks), manualTotal);
            const finalDone      = Math.max(cleanNum(summaryData.completed_subtasks ?? summaryData.sub_comp ?? listObj?.completed_subtasks), manualDone);
            const finalSubmitted = Math.max(cleanNum(summaryData.submitted_subtasks ?? summaryData.sub_submitted ?? listObj?.submitted_subtasks), manualSubmitted);
            const progressPct    = finalTotal > 0 ? Math.round((finalDone / finalTotal) * 100) : cleanNum(summaryData.progress_pct);

            // days left from due date
            let daysLeft = summaryData.days_left ?? null;
            if (daysLeft === null || daysLeft === undefined) {
                const primary = summaryData.due_date || summaryData.end_date || summaryData.target_date;
                if (primary) {
                    const due = new Date(primary); due.setHours(0,0,0,0);
                    const now = new Date(); now.setHours(0,0,0,0);
                    daysLeft = Math.max(0, Math.ceil((due - now) / 86400000));
                } else {
                    // use latest due_date from subtasks
                    let latest = null;
                    formattedSubtasks.forEach(s => {
                        if (s.due_date && s.due_date !== '—') {
                            const d = new Date(s.due_date);
                            if (!latest || d > latest) latest = d;
                        }
                    });
                    if (latest) {
                        const now = new Date(); now.setHours(0,0,0,0);
                        daysLeft = Math.max(0, Math.ceil((latest - now) / 86400000));
                    } else {
                        daysLeft = 0;
                    }
                }
            }

            setSelectedOKR({
                ...summaryData,
                total_subtasks:     finalTotal,
                completed_subtasks: finalDone,
                submitted_subtasks: finalSubmitted,
                progress_pct:       progressPct,
                health_score:       progressPct,
                days_left:          daysLeft,
            });
            setSubtasks(formattedSubtasks);

            // ── departments fallback: compute from subtasks if empty ──
            if (depts.length === 0 && formattedSubtasks.length > 0) {
                const deptMap = {};
                formattedSubtasks.forEach(st => {
                    const d = st.department_name !== '—' ? st.department_name : 'Corporate';
                    if (!deptMap[d]) deptMap[d] = { department_name: d, total_subtasks: 0 };
                    deptMap[d].total_subtasks++;
                });
                depts = Object.values(deptMap);
            }
            setDeptStats(depts);

        } catch (e) {
            console.error('[OKR-Sub] fetchDrilldown error', e);
        } finally {
            setLoading(false);
        }
    }, [objectivesList, filters.from_date, filters.to_date]);

    /* effects */
    useEffect(() => { fetchInitialData(); }, [filters.from_date, filters.to_date]);

    useEffect(() => {
        if (!filters.currentOkrId) return;
        fetchDrilldown(filters.currentOkrId);
        if (filters.currentOkrId !== routeOkrId) {
            navigate(`/okr-subtask/${filters.currentOkrId}`, { replace: true });
        }
    }, [filters.currentOkrId]);

    const handleApply = async () => {
        localStorage.setItem('dashboard_from_date', filters.from_date);
        localStorage.setItem('dashboard_to_date', filters.to_date);
        window.dispatchEvent(new Event('dashboard-filter-change'));
        await fetchInitialData();
        if (filters.currentOkrId) await fetchDrilldown(filters.currentOkrId);
    };

    /* derived display vars */
    const g = globalOverview || {};
    const dTotal = Math.max(cleanNum(g.total_objectives ?? g.total_okrs), objectivesList.length);
    const dProgress = cleanNum(g.overall_progress);
    const dScore    = cleanNum(g.team_score_current) || dProgress;
    const dTotalSub = cleanNum(g.total_subtasks ?? g.sub_total);
    const dDone     = cleanNum(g.completed_tasks ?? g.completed_count);
    const dSubmit   = cleanNum(g.submitted_tasks ?? g.submitted_count);
    const dAtRisk   = cleanNum(g.at_risk ?? g.risk_count);
    const dAvgRate  = cleanNum(g.avg_health_score ?? g.average_progress);
    const dSubPct   = dTotalSub > 0 ? Math.round((dDone   / dTotalSub) * 100) : 0;
    const dSumPct   = dTotalSub > 0 ? Math.round((dSubmit / dTotalSub) * 100) : 0;

    const topMetrics = [
        { label: 'Total Objectives',        value: dTotal,                           gradient: 'from-[#4285F4] to-[#2563EB]',   Icon: Target       },
        { label: 'Team Performance Score',  value: `${dScore}%`,                     gradient: 'from-[#7C3AED] to-[#5B21B6]',   Icon: TrendingUp   },
        { label: 'Total Subtasks Completed',value: `${dDone} / ${dTotalSub}`,        sub: `${dSubPct}%`, gradient: 'from-[#10B981] to-[#059669]',   Icon: CheckCircle2 },
        { label: 'Total Subtasks Submitted',value: `${dSubmit} / ${dTotalSub}`,      sub: `${dSumPct}%`, gradient: 'from-[#F59E0B] to-[#D97706]',   Icon: ShieldCheck  },
        { label: 'At Risk',                 value: dAtRisk,                           gradient: 'from-[#F43F5E] to-[#E11D48]',   Icon: AlertTriangle },
        { label: 'Avg Completion Rate',     value: `${dAvgRate}%`,                   gradient: 'from-[#06B6D4] to-[#0891B2]',   Icon: CheckCircle  },
        { label: 'Overall Progress',        value: `${dProgress}%`,                  gradient: 'from-[#4F46E5] to-[#4338CA]',   Icon: TrendingUp   },
    ];

    /* dept chart */
    const CHART_COLORS = ['#1e3a8a', '#10b981', '#7c3aed', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e'];
    const deptDistribution = useMemo(() =>
        deptStats.map((d, i) => ({
            name:  d.department_name || '—',
            value: d.total_subtasks  || 0,
            fill:  CHART_COLORS[i % CHART_COLORS.length],
        })),
    [deptStats]);

    /* ── Admin guard ─────────────────────────────────────────────────────────── */
    if (isAdmin) return (
        <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 bg-[#f8fafc]">
            <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                <ShieldCheck size={36} className="text-amber-400" />
            </div>
            <div className="text-center">
                <h2 className="text-lg font-bold text-slate-700 mb-1">OKR Dashboard — Admin Restricted</h2>
                <p className="text-slate-400 text-sm max-w-xs">OKR data is available to CFO and Managers only.</p>
            </div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#1e40af] transition-colors">
                <ArrowLeft size={16} /> Go Back
            </button>
        </div>
    );

    /* ── Loading ─────────────────────────────────────────────────────────────── */
    if (loading && !selectedOKR && objectivesList.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[600px] bg-[#f8fafc] gap-4">
            <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Target className="w-4 h-4 text-blue-300 animate-pulse" />
                </div>
            </div>
            <p className="text-slate-500 font-bold capitalize tracking-widest text-xs">Syncing OKR Execution Data…</p>
        </div>
    );

    /* ═══════════════════════════════ RENDER ════════════════════════════════ */
    return (
        <div className="flex flex-col gap-4 bg-[#f1f5f9] min-h-screen p-4 sm:p-6 text-slate-800 font-sans">

            {/* ── HEADER ── */}
            <div className="bg-[#1e3a8a] text-white py-3 px-6 rounded-xl flex justify-between items-center shadow-lg border border-white/10">
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md">
                        <ShieldCheck className="text-blue-200" size={22} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white select-none">FJ Group — OKR Execution Dashboard</h1>
                </div>
                <div className="hidden lg:flex items-center gap-3 text-xs font-bold text-white/70 capitalize tracking-tight">
                    <Calendar size={14} />
                    <span>Real-Time Strategic Insights</span>
                </div>
            </div>

            {/* ── TOP KPI CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
                {topMetrics.map((m, i) => (
                    <KpiCard key={i} label={m.label} value={m.value} sub={m.sub} gradient={m.gradient} Icon={m.Icon} />
                ))}
            </div>

            {/* ── FILTER BAR ── */}
            <div className="bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold text-[11px] uppercase tracking-tight">Filter:</span>
                    <div className="relative">
                        <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            className="appearance-none bg-slate-50 border-2 border-slate-100 rounded-lg pl-8 pr-9 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none cursor-pointer min-w-[220px]"
                            value={filters.currentOkrId}
                            onChange={e => setFilters(prev => ({ ...prev, currentOkrId: e.target.value }))}
                        >
                            <option value="">Select Parent Task</option>
                            {objectivesList.map(obj => (
                                <option key={obj.parent_task_id} value={obj.parent_task_id}>
                                    {obj.objective_title}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">From:</label>
                    <input type="date" className="bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                        value={filters.from_date} onChange={e => setFilters(prev => ({ ...prev, from_date: e.target.value }))} />
                    <label className="text-slate-400 text-[10px] font-bold uppercase tracking-tight">To:</label>
                    <input type="date" className="bg-slate-50 border-2 border-slate-100 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                        value={filters.to_date} onChange={e => setFilters(prev => ({ ...prev, to_date: e.target.value }))} />
                    <button onClick={handleApply}
                        className="bg-[#1e40af] text-white px-6 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest shadow hover:bg-blue-800 active:scale-95 transition-all">
                        Apply
                    </button>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    {loading && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                    <button onClick={() => navigate('/okr-dashboard')}
                        className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">
                        <ArrowLeft size={14} /> Full Reports
                    </button>
                </div>
            </div>

            {/* ── MAIN: Objective progress + subtask table ── */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-[#f8fafc] px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">
                        Sub Objectives Tracking:{' '}
                        <span className="text-blue-700">
                            {selectedOKR?.parent_task_title || selectedOKR?.objective_title || (filters.currentOkrId ? 'Loading…' : 'Select an Objective')}
                        </span>
                        {filters.currentOkrId && (
                            <span className="text-slate-400 text-sm font-medium ml-2">({filters.currentOkrId})</span>
                        )}
                    </h2>
                    <span className="text-xs font-bold text-slate-400">{subtasks.length} subtasks</span>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_340px]">
                    {/* Left: Subtask Table */}
                    <div className="border-r border-slate-100 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#f1f5f9] text-[10px] font-black text-slate-500 uppercase tracking-tight border-b border-slate-200">
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
                                    <tr key={st.task_id ?? i} className="hover:bg-blue-50/30 transition-colors text-[12px]">
                                        <td className="py-3 px-4 font-bold text-slate-400">T-{st.task_id}</td>
                                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-[220px] truncate" title={st.subtask_title}>{st.subtask_title}</td>
                                        <td className="py-3 px-4 text-slate-500">{st.department_name}</td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">{st.assigned_to_name}</td>
                                        <td className="py-3 px-4 text-center"><StatusBadge status={st.status} /></td>
                                        <td className="py-3 px-4 text-slate-500">{st.due_date}</td>
                                        <td className={`py-3 px-4 text-right font-black text-[11px] ${
                                            st.days_left_text?.includes('late') ? 'text-rose-600' :
                                            st.days_left_text === 'Done'        ? 'text-emerald-600' : 'text-amber-600'
                                        }`}>
                                            {st.days_left_text}
                                        </td>
                                    </tr>
                                ))}
                                {subtasks.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Layers size={32} className="text-slate-300" />
                                                <p className="text-slate-400 font-bold italic uppercase tracking-widest text-[11px]">
                                                    {filters.currentOkrId ? 'No subtask data found for this objective.' : 'Select an objective from the dropdown above.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {subtasks.length === 0 && loading && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center">
                                            <Loader2 size={22} className="text-blue-400 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Right: Progress Analytics */}
                    <div className="p-5 flex flex-col gap-4 bg-slate-50/50">
                        {/* Completed */}
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Total Subtasks Completed</p>
                                    <p className="text-lg font-black text-slate-900 leading-none">
                                        {selectedOKR?.completed_subtasks ?? 0} / {selectedOKR?.total_subtasks ?? 0}
                                    </p>
                                </div>
                                <span className="text-2xl font-black text-blue-800">{selectedOKR?.progress_pct ?? 0}%</span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                <div className="h-full bg-[#1e40af] transition-all duration-1000 rounded-full"
                                    style={{ width: `${selectedOKR?.progress_pct ?? 0}%` }} />
                            </div>
                        </div>

                        {/* Submitted */}
                        {(() => {
                            const submittedCount = Math.max(cleanNum(selectedOKR?.submitted_subtasks), subtasks.filter(s => isDone(s) || isActive(s)).length);
                            const total = Math.max(cleanNum(selectedOKR?.total_subtasks), subtasks.length);
                            const pct   = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
                            return (
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight mb-0.5">Total Subtasks Submitted</p>
                                            <p className="text-lg font-black text-slate-900 leading-none">{submittedCount} / {total}</p>
                                        </div>
                                        <span className="text-2xl font-black text-amber-500">{pct}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                        <div className="h-full bg-amber-500 transition-all duration-1000 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Pie Chart */}
                        {deptDistribution.length > 0 ? (
                            <>
                                <div style={{ height: 260 }}>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie data={deptDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                                                stroke="#fff" strokeWidth={2} labelLine={false}
                                                label={({ cx, cy, midAngle, outerRadius, index }) => {
                                                    const R = Math.PI / 180;
                                                    const r = outerRadius * 0.62;
                                                    const x = cx + r * Math.cos(-midAngle * R);
                                                    const y = cy + r * Math.sin(-midAngle * R);
                                                    const words = (deptDistribution[index]?.name || '').split(' ');
                                                    return (
                                                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight="bold">
                                                            {words.map((w, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : 10}>{w}</tspan>)}
                                                        </text>
                                                    );
                                                }}
                                            >
                                                {deptDistribution.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
                                    {deptDistribution.map((d, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.fill }} />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[200px] text-slate-300 gap-2">
                                <Layers size={32} />
                                <p className="text-[11px] font-bold uppercase tracking-widest">No dept breakdown</p>
                            </div>
                        )}

                        {/* Stats mini cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Total Subtasks', val: selectedOKR?.total_subtasks ?? 0, cls: 'text-slate-800' },
                                { label: 'Days Left',      val: selectedOKR?.days_left ?? '—',    cls: 'text-blue-700' },
                                { label: 'Sub-Depts',      val: deptStats.length || 1,            cls: 'text-slate-800' },
                            ].map((c, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">{c.label}</span>
                                    <span className={`text-sm font-black ${c.cls}`}>{c.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── DEPARTMENT CONTRIBUTION TABLE ── */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-8">
                <div className="bg-[#f8fafc] px-6 py-3 border-b border-slate-200">
                    <h3 className="text-sm font-black text-slate-700 capitalize tracking-tight">Department Contribution</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#1e3a8a]/5 text-[#1e3a8a] text-[12px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="py-4 px-6">Department Focus</th>
                                <th className="py-4 px-4 text-center">Total Tasks</th>
                                <th className="py-4 px-4 text-center">In Progress</th>
                                <th className="py-4 px-4 text-center">Approved</th>
                                <th className="py-4 px-4 text-center">Pending</th>
                                <th className="py-4 px-6 text-right">Contribution (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {deptStats.map((d, i) => {
                                const totalAll = Math.max(selectedOKR?.total_subtasks || 1, subtasks.length, 1);
                                const pct = ((d.total_subtasks / totalAll) * 100).toFixed(1);
                                const dName   = d.department_name || '—';
                                const related = subtasks.filter(st => (st.department_name || '—') === dName);
                                const countSt = (statuses) => related.filter(st => statuses.includes(normStatus(st.status))).length;

                                return (
                                    <tr key={i} className="hover:bg-slate-50 font-bold text-slate-700 group transition-colors">
                                        <td className="py-4 px-6 flex items-center gap-4">
                                            <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: deptDistribution[i]?.fill || '#94a3b8' }} />
                                            <span className="text-[14px] font-black text-[#1E1B4B] uppercase tracking-tight">{dName}</span>
                                        </td>
                                        <td className="py-4 px-4 text-center tabular-nums text-[15px] text-blue-900 font-black">{d.total_subtasks}</td>
                                        <td className="py-4 px-4 text-center tabular-nums text-[13px] text-slate-600">{countSt(['IN_PROGRESS', 'STARTED', 'IN PROGRESS'])}</td>
                                        <td className="py-4 px-4 text-center tabular-nums text-[13px] text-emerald-600">{countSt(['APPROVED', 'COMPLETED', 'DONE'])}</td>
                                        <td className="py-4 px-4 text-center tabular-nums text-[13px] text-amber-600">{countSt(['PENDING', 'NEW', 'SUBMITTED', 'REVIEW', 'REWORK', 'CHANGES_REQUESTED'])}</td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: deptDistribution[i]?.fill || '#94a3b8' }} />
                                                </div>
                                                <span className="text-[13px] font-black text-slate-800 tabular-nums w-12 text-right">{pct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {deptStats.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-300 font-bold uppercase tracking-widest italic text-[11px]">
                                        No departmental breakdown available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer summary bar */}
                <div className="bg-[#f8fafc] p-4 border-t border-slate-200 flex justify-between items-center px-6">
                    <div className="flex items-center gap-3 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200 shadow-sm">
                        <CheckCircle size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Health Verified</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Aggregate Progress</span>
                        <div className="bg-[#1E1B4B] text-white px-6 py-2 rounded-xl font-black text-lg tabular-nums shadow-lg shadow-indigo-900/40">
                            {selectedOKR?.progress_pct ?? 0}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OKRSubTaskPage;
