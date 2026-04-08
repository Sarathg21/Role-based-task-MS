import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import CustomSelect from '../components/UI/CustomSelect';
import EmployeePersonalReport from '../components/Dashboard/EmployeePersonalReport';
import {
    Users, BarChart2, CheckSquare, AlertTriangle, Clock,
    Activity, TrendingUp, Calendar, ChevronDown, ChevronLeft, ChevronRight, Layout,
    CheckCircle, Shield, Target, Plus, Search, HelpCircle,
    ArrowRight, Loader2, Bell, Settings, User, Briefcase, Building2, AlertCircle, ExternalLink,
    Download, FileSpreadsheet
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '??';
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    
    if (parts.length > 1 && /^\d+$/.test(lastPart)) {
        return (firstPart[0] + lastPart).toUpperCase();
    }
    if (parts.length > 1) {
        return (firstPart[0] + parts[1][0]).toUpperCase();
    }
    return firstPart[0].toUpperCase() + (firstPart[1] || '').toUpperCase();
};

const PerformanceDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    if (user?.role?.toUpperCase() === 'EMPLOYEE') {
        return <EmployeePersonalReport />;
    }

    const isCFO = user?.role?.toUpperCase() === 'CFO' || user?.role?.toUpperCase() === 'ADMIN';

    const getSixMonthsAgo = () => {
        const now = new Date();
        now.setMonth(now.getMonth() - 5);
        now.setDate(1);
        return now.toISOString().slice(0, 10);
    };

    const getFirstDayOfMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    };

    const getToday = () => {
        return new Date().toISOString().slice(0, 10);
    };

    // Filters
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState(
        (!isCFO && user?.department) ? String(user.department) : ''
    );
    const [fromDate, setFromDate] = useState(localStorage.getItem('dashboard_from_date') || getSixMonthsAgo());
    const [toDate, setToDate] = useState(localStorage.getItem('dashboard_to_date') || getToday());

    // Data
    const [summary, setSummary] = useState({
        team_tasks: 0,
        in_progress_tasks: 0,
        pending_approval: 0,
        overdue_tasks: 0,
        team_score_current: 0,
        manager_score_current: null,
        manager_personal_score_current: null,
        manager_score_delta_percent: null,
    });
    const [trends, setTrends] = useState([]);
    const [teamPerformance, setTeamPerformance] = useState([]);
    const [employeeRisk, setEmployeeRisk] = useState([]);
    const [deptPerformance, setDeptPerformance] = useState([]); // New state for CFO
    const [deptMetrics, setDeptMetrics] = useState({
        total_tasks: 0,
        completed_tasks: 0,
        overdue_tasks: 0,
        active_tasks: 0,
        completion_pct: 0
    });
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    
    // Modal state
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [teamPage, setTeamPage] = useState(1);
    const teamItemsPerPage = 10;

    /* Synchronize with global filter */
    useEffect(() => {
        const handleFilterChange = () => {
            const storedFrom = localStorage.getItem('dashboard_from_date');
            const storedTo = localStorage.getItem('dashboard_to_date');
            if (storedFrom) setFromDate(storedFrom);
            if (storedTo) setToDate(storedTo);
        };
        window.addEventListener('dashboard-filter-change', handleFilterChange);
        return () => window.removeEventListener('dashboard-filter-change', handleFilterChange);
    }, []);

    const aggregateFallbackData = useCallback((tasks, baseRegistry = [], allDepts = []) => {
        if (!tasks.length && !baseRegistry.length) return;

        const total = tasks.length;
        const done = tasks.filter(t => ['APPROVED', 'COMPLETED'].includes((t.status || '').toUpperCase())).length;
        const inProgress = tasks.filter(t => (t.status || '').toUpperCase() === 'IN_PROGRESS').length;
        const pending = tasks.filter(t => ['SUBMITTED', 'PENDING', 'PENDING_APPROVAL'].includes((t.status || '').toUpperCase())).length;
        const overdueCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'COMPLETED', 'CANCELLED'].includes((t.status || '').toUpperCase())).length;
        const metrics = {
            team_tasks: total,
            in_progress_tasks: inProgress,
            pending_approval: pending,
            overdue_tasks: overdueCount,
            team_score_current: Math.round((done / (total || 1)) * 100)
        };
        console.log("FALLBACK SUCCESS - Calculated Summary:", metrics);
        setSummary(prev => ({
            ...prev,
            ...metrics
        }));

        setDeptMetrics({
            total_tasks: total,
            completed_tasks: done,
            overdue_tasks: overdueCount,
            active_tasks: total - done,
            completion_pct: Math.round((done / (total || 1)) * 100)
        });

        // Use actual state values for fromDate/toDate
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const diffTime = Math.abs(end - start);
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        const isMonthly = days > 120;
        const isWeekly = days > 45 && !isMonthly;

        const trendMap = {};
        for (let i = 0; i < Math.min(days, 366); i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayNum = String(d.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${dayNum}`;
            
            let label = "";
            let bucketKey = "";
            
            if (isMonthly) {
                bucketKey = `${y}-${m}`;
                label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            } else if (isWeekly) {
                const weekNum = Math.ceil((d.getDate() + d.getDay()) / 7);
                bucketKey = `${y}-${m}-W${weekNum}`;
                label = `W${weekNum} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
            } else {
                bucketKey = dateKey;
                label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            if (!trendMap[bucketKey]) {
                trendMap[bucketKey] = { name: label, new: 0, pending: 0, overdue: 0, dateKey: bucketKey, sortKey: d.getTime() };
            }
        }
        
        tasks.forEach(t => {
            const rawDate = t.created_at || t.assigned_date || t.createdAt || t.assignedAt || t.date || t.due_date;
            if (!rawDate) return;
            const dOb = new Date(rawDate);
            const y = dOb.getFullYear();
            const m = String(dOb.getMonth() + 1).padStart(2, '0');
            const dNum = String(dOb.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${dNum}`;

            let bucketKey = "";
            if (isMonthly) {
                bucketKey = `${y}-${m}`;
            } else if (isWeekly) {
                const weekNum = Math.ceil((dOb.getDate() + dOb.getDay()) / 7);
                bucketKey = `${y}-${m}-W${weekNum}`;
            } else {
                bucketKey = dateKey;
            }
            
            if (trendMap[bucketKey]) {
                const status = (t.status || '').toUpperCase();
                trendMap[bucketKey].new++;
                if (['SUBMITTED', 'PENDING', 'PENDING_APPROVAL', 'IN_PROGRESS'].includes(status)) {
                    trendMap[bucketKey].pending++;
                }
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'COMPLETED', 'CANCELLED'].includes(status);
                if (isOverdue) trendMap[bucketKey].overdue++;
            }
        });

        const sortedTrends = Object.values(trendMap).sort((a, b) => a.sortKey - b.sortKey);
        setTrends(sortedTrends);

        const empMap = {};
        baseRegistry.forEach(emp => {
            const name = emp.name;
            empMap[name] = { 
                name, tasks_assigned: 0, in_progress: 0, pending_review: 0, overdue: 0, completed: 0,
                department: emp.department_name || emp.department || 'Accounts',
                role: emp.role || 'Contributor',
                emp_id: emp.emp_id || emp.id
            };
        });

        tasks.forEach(t => {
            const name = t.assigned_to_name || t.employee_name || t.assigneeName || t.assigned_to || 'Unassigned';
            if (!empMap[name]) empMap[name] = { name, tasks_assigned: 0, in_progress: 0, pending_review: 0, overdue: 0, completed: 0, department: t.department };
            empMap[name].tasks_assigned++;
            const s = (t.status || '').toUpperCase();
            if (s === 'IN_PROGRESS') empMap[name].in_progress++;
            if (['SUBMITTED', 'PENDING'].includes(s)) empMap[name].pending_review++;
            if (s === 'APPROVED' || s === 'COMPLETED') empMap[name].completed++;
            if (t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'CANCELLED'].includes(s)) empMap[name].overdue++;
        });
        
        const perfData = Object.values(empMap).map(e => ({
            ...e,
            completion_rate: Math.round((e.completed / (e.tasks_assigned || 1)) * 100),
            performance_score: Math.round((e.completed / (e.tasks_assigned || 1)) * 100)
        })).sort((a, b) => b.tasks_assigned - a.tasks_assigned);
        
        setTeamPerformance(perfData);
        setEmployeeRisk(perfData.map(e => ({
            name: e.name, department: e.department, active_tasks: e.tasks_assigned - e.completed, overdue_tasks: e.overdue, performance_score: e.completion_rate,
            risk_status: e.overdue > 2 ? 'OFF_TRACK' : e.overdue > 1 ? 'AT_RISK' : e.overdue === 1 ? 'WATCH' : 'ON_TRACK'
        })));

        // CFO Dept Performance
        const dMap = {};
        // Initialize with all known departments
        (allDepts.length ? allDepts : departments).forEach(d => {
            const dName = typeof d === 'string' ? d : (d.name || d.department_name);
            if (dName) {
                dMap[dName] = { name: dName, total: 0, overdue: 0, in_progress: 0, completed: 0 };
            }
        });

        tasks.forEach(t => {
            const dName = t.department_name || t.department || 'Other';
            if (!dMap[dName]) dMap[dName] = { name: dName, total: 0, overdue: 0, in_progress: 0, completed: 0 };
            dMap[dName].total++;
            const s = (t.status || '').toUpperCase();
            if (s === 'IN_PROGRESS') dMap[dName].in_progress++;
            if (s === 'APPROVED' || s === 'COMPLETED') dMap[dName].completed++;
            if (t.due_date && new Date(t.due_date) < new Date() && !['APPROVED', 'CANCELLED'].includes(s)) dMap[dName].overdue++;
        });

        const dData = Object.values(dMap).map(d => ({
            ...d,
            rate: Math.round((d.completed / (d.total || 1)) * 100),
            status: d.total === 0 ? 'No Data' : (d.overdue > 0 ? 'At Risk' : (d.rate < 20 ? 'Off Track' : 'On Track'))
        })).sort((a,b) => b.total - a.total);
        setDeptPerformance(dData);

        const completed = tasks.filter(t => ['APPROVED', 'COMPLETED'].includes((t.status || '').toUpperCase())).length;
        setDeptMetrics({
            total_tasks: total, completed_tasks: completed, submitted_tasks: pending, overdue_tasks: overdueCount,
            active_tasks: total - completed - tasks.filter(t => (t.status || '').toUpperCase() === 'CANCELLED').length,
            completion_pct: Math.round((completed / (total || 1)) * 100)
        });
    }, [fromDate, toDate]);

    const fetchDashData = useCallback(async () => {
        setLoading(true);
        try {
            const startD = new Date(fromDate);
            const endD = new Date(toDate);
            const dayRange = Math.ceil(Math.abs(endD - startD) / (1000 * 60 * 60 * 24)) + 1;

            const params = { 
                from_date: fromDate, 
                to_date: toDate,
                start_date: fromDate,
                end_date: toDate,
                scope: (selectedDept && selectedDept !== 'all') ? 'department' : 'org'
            };

            if (selectedDept && selectedDept !== 'all') {
                params.department_id = selectedDept;
            }

            const base = isCFO ? '/dashboard/cfo' : '/dashboard/manager';

            // 1. Fetch Summary, Metrics & Analytics (score fields)
            const analyticsBase = isCFO ? '/dashboard/cfo' : '/dashboard/manager';
            const summaryResults = await Promise.allSettled([
                api.get(base, { params }),
                api.get(`${base}/department-metrics`, { params }),
                api.get(`${base}/trends`, { params: { ...params, days: Math.min(dayRange, 365) } }),
                api.get(`${analyticsBase}/analytics`, { params })
            ]);

            if (summaryResults[0].status === 'fulfilled') {
                const d = summaryResults[0].value.data?.data || summaryResults[0].value.data || {};
                // Also check analytics response (index 3) for score fields
                const a = summaryResults[3]?.status === 'fulfilled'
                    ? (summaryResults[3].value.data?.data || summaryResults[3].value.data || {})
                    : {};
                // Merge: analytics overrides base for score fields
                const merged = { ...d, ...a };
                setSummary({
                    team_tasks: Number(merged.team_tasks || merged.total_tasks || merged.total || 0),
                    in_progress_tasks: Number(merged.in_progress_tasks || merged.in_progress || 0),
                    pending_approval: Number(merged.pending_approval || merged.submitted_tasks || merged.submitted || 0),
                    overdue_tasks: Number(merged.overdue_tasks || merged.overdue || 0),
                    team_score_current: merged.team_score_current != null
                        ? Number(merged.team_score_current)
                        : Number(merged.completion_pct || merged.completion_rate || 0),
                    manager_score_current: merged.manager_score_current != null ? Number(merged.manager_score_current) : null,
                    manager_personal_score_current: merged.manager_personal_score_current != null ? Number(merged.manager_personal_score_current) : null,
                    manager_score_delta_percent: merged.manager_score_delta_percent != null ? Number(merged.manager_score_delta_percent) : null,
                });
            }

            if (summaryResults[1].status === 'fulfilled') {
                const m = summaryResults[1].value.data?.data || summaryResults[1].value.data || {};
                setDeptMetrics({
                    total_tasks: Number(m.total_tasks || 0),
                    completed_tasks: Number(m.completed_tasks || 0),
                    submitted_tasks: Number(m.submitted_tasks || m.pending_tasks || m.pending || m.pending_approval || 0),
                    overdue_tasks: Number(m.overdue_tasks || 0),
                    active_tasks: Number(m.active_tasks || 0),
                    completion_pct: Number(m.completion_pct || 0)
                });
            }

            if (summaryResults[2].status === 'fulfilled') {
                const tData = summaryResults[2].value.data?.data || summaryResults[2].value.data || [];
                if (Array.isArray(tData) && tData.length > 0) setTrends(tData);
            }

            // 2. Robust Task Fetching (The Source of Truth for fallback)
            let tasks = [];
            // Only use valid scope values: 'mine', 'department', 'org'
            // Run in parallel with a 15-second timeout per request to avoid blocking
            const taskCandidates = [
                { url: isCFO ? '/tasks' : '/tasks/team', p: { ...params, limit: 100 } },
                { url: '/tasks', p: { ...params, scope: 'department', limit: 100 } },
                { url: '/tasks', p: { ...params, scope: 'org', limit: 100 } },
            ];

            const withTimeout = (promise, ms = 15000) =>
                Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

            const taskResults = await Promise.allSettled(
                taskCandidates.map(cand => 
                    withTimeout(api.get(cand.url, { params: cand.p }))
                )
            );

            for (const result of taskResults) {
                if (result.status === 'fulfilled') {
                    const rows = result.value.data?.data || result.value.data || [];
                    if (Array.isArray(rows) && rows.length > 0) { tasks = rows; break; }
                } else {
                    console.warn(`Task fetch candidate failed:`, result.reason?.message);
                }
            }

            // 3. Employee & Team Performance
            const perfResults = await Promise.allSettled([
                api.get(`${base}/team-performance`, { params: { ...params, limit: 100 } }),
                api.get(`${base}/employee-risk`, { params: { ...params, limit: 10 } }),
                api.get('/employees', { params: { active: true, department_id: params.department_id } })
            ]);

            let perfSum = [];
            let riskSum = [];
            let allEmpBase = [];
            if (perfResults[0].status === 'fulfilled') perfSum = perfResults[0].value.data?.data || perfResults[0].value.data || [];
            if (perfResults[1].status === 'fulfilled') riskSum = perfResults[1].value.data?.data || perfResults[1].value.data || [];
            if (perfResults[2].status === 'fulfilled') allEmpBase = perfResults[2].value.data?.data || perfResults[2].value.data || [];

            const idMap = new Map();
            allEmpBase.forEach(e => idMap.set(String(e.emp_id || e.id), { ...e }));
            perfSum.forEach(e => {
                const id = String(e.emp_id || e.id);
                idMap.set(id, { ...(idMap.get(id) || {}), ...e });
            });
            // Ensure anyone with a task is also in the map
            tasks.forEach(t => {
                const id = String(t.assigned_to || t.emp_id || t.id);
                if (id && id !== 'undefined' && !idMap.has(id)) {
                    idMap.set(id, { 
                        name: t.assigned_to_name || t.employee_name || t.assigneeName || 'Unknown',
                        emp_id: id, id,
                        department: t.department_name || t.department,
                        role: 'Employee'
                    });
                }
            });
            const unionTeam = Array.from(idMap.values()).filter(e => (e.emp_id || e.id));

            const mergedPerf = unionTeam.map(emp => ({
                emp_id: emp.emp_id || emp.id, name: emp.name, role: emp.role || 'Contributor',
                department: emp.department_name || emp.department || 'Accounts',
                tasks_assigned: emp.tasks_assigned || 0, in_progress: emp.in_progress || 0,
                pending_review: emp.pending_review || 0, overdue: emp.overdue || 0,
                completion_rate: emp.completion_rate || 0
            })).sort((a,b) => b.tasks_assigned - a.tasks_assigned);

            setTeamPerformance(mergedPerf);

            setEmployeeRisk(unionTeam.map(emp => {
                const risk = riskSum.find(r => (r.emp_id || r.id) === (emp.emp_id || emp.id)) || {};
                const p = mergedPerf.find(p => (p.emp_id || p.id) === (emp.emp_id || emp.id)) || {};
                return {
                    emp_id: emp.emp_id || emp.id, name: emp.name, 
                    department: emp.department_name || emp.department || 'Accounts',
                    active_tasks: risk.active_tasks || (p.tasks_assigned - (p.completed || 0)) || 0,
                    overdue_tasks: risk.overdue_tasks || p.overdue || 0,
                    performance_score: risk.performance_score || p.completion_rate || 0,
                    risk_status: risk.risk_status || (p.overdue > 2 ? 'OFF_TRACK' : p.overdue > 1 ? 'AT_RISK' : p.overdue === 1 ? 'WATCH' : 'ON_TRACK')
                };
            }).sort((a,b) => b.overdue_tasks - a.overdue_tasks));

            // 4. Final Fallback - trigger if we have tasks but API metrics are missing/zero
            // USE LOCAL VARIABLES for fresh checking (state is async)
            const sumData = summaryResults[0].status === 'fulfilled' ? (summaryResults[0].value.data?.data || summaryResults[0].value.data || {}) : {};
            const localHasSummary = Number(sumData.team_tasks || sumData.total_tasks || sumData.total || 0) > 0;
            // Always calculate Department Performance from the latest task list to show all depts
            const deptsToUse = summaryResults[1].status === 'fulfilled' ? (summaryResults[1].value.data?.data || summaryResults[1].value.data || []) : [];
            aggregateFallbackData(tasks, allEmpBase, deptsToUse);

            if (tasks.length > 0 && (!localHasSummary || !localHasTrends || !localHasTeam)) {
                console.log("ManagerDashboard - Insufficient API metrics (local check), fully rebuilding from task list...", tasks.length);
                const deptsToUse = summaryResults[1].status === 'fulfilled' ? (summaryResults[1].value.data?.data || summaryResults[1].value.data || []) : [];
                aggregateFallbackData(tasks, allEmpBase, deptsToUse);
            }

            setLoading(false);
            setIsInitialLoad(false);
        } catch (err) {
            console.error("Critical fail in performance dashboard:", err);
            setLoading(false);
            setIsInitialLoad(false);
        }
    }, [fromDate, toDate, selectedDept, isCFO, user, aggregateFallbackData]);

    const downloadFile = async (format) => {
        const tid = toast.loading(`Preparing ${format}...`);
        try {
            const rolePath = isCFO ? 'cfo' : (user?.role?.toLowerCase() || 'employee');
            const ep = format === 'pdf' ? `/reports/${rolePath}/export-pdf` : `/reports/${rolePath}/export-excel`;
            const res = await api.get(ep, { params: { from_date: fromDate, to_date: toDate, department_id: selectedDept === 'all' ? undefined : selectedDept }, responseType: 'blob' });
            const blob = new Blob([res.data], { type: res.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Downloaded', { id: tid });
        } catch (err) {
            toast.error('Export failed', { id: tid });
        }
    };

    useEffect(() => {
        if (isCFO) {
            api.get('/departments').then(res => setDepartments(res.data?.data || res.data || [])).catch(() => {});
        }
    }, [isCFO]);

    useEffect(() => { fetchDashData(); }, [fetchDashData]);

    const handleDateChange = (type, value) => {
        if (type === 'from') { setFromDate(value); localStorage.setItem('dashboard_from_date', value); }
        else { setToDate(value); localStorage.setItem('dashboard_to_date', value); }
    };

    const currentDeptName = useMemo(() => {
        if (!selectedDept || selectedDept === 'all') return 'All Departments';
        return departments.find(d => String(d.department_id || d.id) === String(selectedDept))?.name || 'Selected Department';
    }, [selectedDept, departments]);

    const activityTrends = useMemo(() => {
        if (!trends.length) return [];
        
        // 1. Daily View (Short periods: <= 45 days)
        if (trends.length <= 45) return trends;

        // 2. Monthly View (Very long periods: > 120 days)
        if (trends.length > 120) {
            const months = [];
            const monthMap = {};
            
            trends.forEach(t => {
                let mName = t.month;
                if (!mName) {
                    const d = new Date(t.date || t.name || t.dateKey);
                    if (!isNaN(d.getTime())) {
                        mName = d.toLocaleDateString('en-US', { month: 'short' });
                    }
                }
                mName = mName || 'Unknown';
                
                if (!monthMap[mName]) {
                    monthMap[mName] = { name: mName, new: 0, pending: 0, overdue: 0 };
                    months.push(monthMap[mName]);
                }
                monthMap[mName].new += (t.new || 0);
                monthMap[mName].pending += (t.pending || 0);
                monthMap[mName].overdue += (t.overdue || 0);
            });
            return months;
        }

        // 3. Weekly View (Medium periods: 46-120 days)
        const weeks = [];
        for (let i = 0; i < trends.length; i += 7) {
            const chunk = trends.slice(i, i + 7);
            weeks.push({
                name: chunk[0].month ? `${chunk[0].month} W${Math.floor(i/7)%4 + 1}` : chunk[0].name,
                new: chunk.reduce((s, it) => s + (it.new || 0), 0),
                pending: chunk.reduce((s, it) => s + (it.pending || 0), 0),
                overdue: chunk.reduce((s, it) => s + (it.overdue || 0), 0)
            });
        }
        return weeks;
    }, [trends]);

    if (loading && isInitialLoad) {
        return (
            <div className="flex flex-col items-center justify-center p-20 min-h-screen bg-[#F8FAFF]">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-sm font-semibold text-slate-400 capitalize tracking-widest animate-pulse">Syncing Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFF] p-4 md:p-8 animate-in fade-in duration-700">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 px-4 relative z-10">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="h-[2px] w-10 bg-indigo-600/40 rounded-full" />
                        <p className="text-indigo-600 text-[11px] font-medium tracking-[0.3em] uppercase">Executive Analytics</p>
                    </div>
                    <h1 className="text-[34px] font-medium text-[#1E1B4B] tracking-tight leading-none mb-4">Manager Dashboard</h1>
                    <p className="text-[13px] text-slate-500 font-medium mb-6 -mt-2">Cross‑Department Team Performance Monitoring</p>
                    {isCFO && (
                        <div className="flex items-center gap-2.5 text-slate-500 font-medium text-[13px] bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl w-fit border border-white/60 shadow-sm">
                            <Building2 size={15} className="text-indigo-500/70" />
                            <span className="capitalize">Viewing: <span className="text-indigo-600">{currentDeptName}</span></span>
                        </div>
                    )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 bg-white/60 backdrop-blur-2xl p-3 rounded-[2rem] border border-white shadow-xl shadow-indigo-100/20">
                    <div className="flex items-center gap-4 px-2 py-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Period starts</span>
                            <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                                <Calendar size={14} className="text-slate-400" />
                                <input type="date" className="bg-transparent border-none text-[11px] font-medium focus:ring-0 p-0" value={fromDate} onChange={(e) => handleDateChange('from', e.target.value)} />
                            </div>
                        </div>
                        <ArrowRight size={14} className="mt-5 text-slate-300" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Period ends</span>
                            <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                                <Calendar size={14} className="text-slate-400" />
                                <input type="date" className="bg-transparent border-none text-[11px] font-medium focus:ring-0 p-0" value={toDate} onChange={(e) => handleDateChange('to', e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-200 hidden md:block" />
                    <div className="flex items-center gap-2 pr-2">
                        <button onClick={() => downloadFile('excel')} className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 transition-all"><FileSpreadsheet size={18} /></button>
                        <button onClick={() => downloadFile('pdf')} className="p-3 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition-all"><Download size={18} /></button>
                    </div>
                </div>
            </div>

            {/* KPI CARDS — 4 task cards + Manager Score cluster */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-5 mb-12 px-4 items-stretch">

                {/* Task Metric Cards — same size as before */}
                {[
                    { label: 'Team tasks', val: summary.team_tasks, icon: Briefcase, color: 'from-indigo-500 to-indigo-600' },
                    { label: 'In progress', val: summary.in_progress_tasks, icon: Activity, color: 'from-sky-500 to-sky-600' },
                    { label: 'Pending approval', val: summary.pending_approval, icon: Clock, color: 'from-amber-500 to-amber-600' },
                    { label: 'Overdue tasks', val: summary.overdue_tasks, icon: AlertCircle, color: 'from-rose-500 to-rose-600' },
                ].map((kpi, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] bg-gradient-to-br ${kpi.color} text-white shadow-xl shadow-indigo-100/40 hover:scale-[1.02] transition-all flex flex-col`}>
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4"><kpi.icon size={20} /></div>
                        <p className="text-[10px] font-medium uppercase tracking-widest opacity-80 mb-1">{kpi.label}</p>
                        <h4 className="text-2xl font-semibold mt-auto">{kpi.val}</h4>
                    </div>
                ))}

                {/* 5th slot: Manager Score (large) + Team Score & Manager Personal Score (compact, stacked) */}
                <div className="flex gap-3 min-w-[380px]">
                    {/* Manager Score — large green card, same height as siblings */}
                    <div className="flex-1 p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-xl shadow-emerald-100/40 hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col">
                        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 relative z-10"><Target size={20} /></div>
                        <p className="text-[10px] font-medium uppercase tracking-widest opacity-80 mb-1 relative z-10">Manager Score</p>
                        <h4 className="text-2xl font-semibold mt-auto relative z-10">
                            {summary.manager_score_current != null ? `${summary.manager_score_current}%` : '—'}
                        </h4>
                        <p className="text-[10px] mt-1.5 opacity-70 relative z-10">
                            {(() => {
                                const delta = summary.manager_score_delta_percent;
                                if (delta === null || delta === undefined) return '70% Team + 30% Personal';
                                const arrow = delta >= 0 ? '▲' : '▼';
                                return `${arrow} ${Math.abs(delta)}% vs last period`;
                            })()}
                        </p>
                    </div>

                    {/* Team Score + Manager Personal Score — two slim stacked companion cards */}
                    <div className="flex flex-col gap-3 w-[175px]">
                        {/* Team Score */}
                        <div className="flex-1 px-4 py-4 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-100/40 hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10 blur-xl" />
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><Users size={14} /></div>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 leading-tight">Team<br/>Score</p>
                            </div>
                            <h4 className="text-xl font-bold relative z-10">
                                {summary.team_score_current != null ? `${summary.team_score_current}%` : '—'}
                            </h4>
                        </div>

                        {/* Manager Personal Score */}
                        <div className="flex-1 px-4 py-4 rounded-[1.5rem] bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-100/40 hover:scale-[1.02] transition-all relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-white/10 blur-xl" />
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><TrendingUp size={14} /></div>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 leading-tight">Manager Personal<br/>Score</p>
                            </div>
                            <h4 className="text-xl font-bold relative z-10">
                                {summary.manager_personal_score_current != null ? `${summary.manager_personal_score_current}%` : '—'}
                            </h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CHART & DEPT STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 mb-12">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-indigo-100/20 flex flex-col h-[480px]">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transition-transform hover:scale-105">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className="text-[22px] font-bold text-slate-800 tracking-tight leading-none mb-1.5">Task Activity Trends</h3>
                                <p className="text-[10px] uppercase font-black tracking-[0.25em] text-slate-400">Dynamic Workload Trajectory</p>
                            </div>
                        </div>
                        
                        {/* Custom Legend — Match the reference image pill design */}
                        <div className="hidden xl:flex items-center gap-6 bg-slate-50/50 px-6 py-2.5 rounded-full border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overdue</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px] min-w-0 -ml-6 relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={activityTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: '700', fill: '#94a3b8'}} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fontWeight: '700', fill: '#94a3b8'}} 
                                />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc', radius: 8}}
                                    contentStyle={{ 
                                        borderRadius: '16px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                        padding: '12px'
                                    }}
                                />
                                {/* Order from bottom to top: Overdue -> Pending -> New */}
                                <Bar dataKey="overdue" stackId="a" fill="#ef4444" barSize={32} />
                                <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
                                <Bar dataKey="new" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/80 p-8 rounded-[2.5rem] border border-white shadow-xl flex flex-col items-center justify-center h-[480px]">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-medium text-[#1E1B4B]">Task Completion Overview</h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">Department task health · Approved vs Pending vs Overdue</p>
                    </div>
                    <div className="relative w-48 h-48 min-h-[192px] min-w-[192px]">
                        <ResponsiveContainer width="100%" aspect={1}>
                            <PieChart>
                                <Pie 
                                    data={[
                                        { name: 'Done', value: deptMetrics.completed_tasks },
                                        { name: 'Pending', value: deptMetrics.submitted_tasks },
                                        { name: 'Overdue', value: deptMetrics.overdue_tasks }
                                    ].filter(d => d.value > 0)}
                                    innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value"
                                >
                                    <Cell fill="#10B981" /><Cell fill="#F59E0B" /><Cell fill="#F43F5E" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <p className="text-[32px] font-semibold text-indigo-950 leading-none">{deptMetrics.completion_pct}%</p>
                            <div className="mt-1 flex flex-col items-center">
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Completion Rate</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 w-full mt-8">
                        <div className="bg-slate-50 border border-slate-100 p-2 sm:p-3 rounded-2xl flex flex-col items-center">
                            <span className="text-slate-900 font-black text-lg">{deptMetrics.total_tasks || 0}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">Total</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-2 sm:p-3 rounded-2xl flex flex-col items-center">
                            <span className="text-emerald-600 font-black text-lg">{deptMetrics.completed_tasks || 0}</span>
                            <span className="text-[9px] uppercase font-bold text-emerald-400">Approved</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 p-2 sm:p-3 rounded-2xl flex flex-col items-center">
                            <span className="text-amber-600 font-black text-lg">{deptMetrics.submitted_tasks || 0}</span>
                            <span className="text-[9px] uppercase font-bold text-amber-500">Pending</span>
                        </div>
                        <div className="bg-rose-50 border border-rose-100 p-2 sm:p-3 rounded-2xl flex flex-col items-center">
                            <span className="text-rose-600 font-black text-lg">{deptMetrics.overdue_tasks || 0}</span>
                            <span className="text-[9px] uppercase font-bold text-rose-400">Overdue</span>
                        </div>
                    </div>
                </div>
            </div>


            {/* TEAM PERFORMANCE MONITOR */}
            <div className="bg-white/90 rounded-[2.5rem] border border-white shadow-2xl mx-4 overflow-hidden mb-20 flex flex-col min-h-[500px]">
                <div className="p-8 border-b border-indigo-50 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-medium text-[#1E1B4B]">Team Execution Monitor</h3>
                        <p className="text-[12px] text-slate-400 font-medium">Workload & Completion Metrics</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <button onClick={() => navigate('/tasks?mode=team')} className="flex items-center gap-1.5 text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                            View Detailed <ExternalLink size={12} />
                        </button>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-4">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                Showing {(teamPage-1)*teamItemsPerPage + 1}-{Math.min(teamPage*teamItemsPerPage, teamPerformance.length)} of {teamPerformance.length}
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setTeamPage(p => Math.max(1, p-1))} disabled={teamPage === 1} className="p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 disabled:opacity-30 transition-all">
                                    <ChevronLeft size={16} className="text-slate-600" />
                                </button>
                                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-black ring-1 ring-inset ring-indigo-200/50">
                                    {teamPage}
                                </div>
                                <button 
                                    onClick={() => setTeamPage(p => Math.min(Math.ceil(teamPerformance.length/teamItemsPerPage), p+1))} 
                                    disabled={teamPage >= Math.ceil(teamPerformance.length/teamItemsPerPage)} 
                                    className="p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 disabled:opacity-30 transition-all"
                                >
                                    <ChevronRight size={16} className="text-slate-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[600px] flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 sticky top-0 z-10">
                            <tr>
                                <th className="px-2 py-3 text-left">Employee</th>
                                <th className="px-2 py-3 text-center">Dept</th>
                                <th className="px-2 py-3 text-center">Tasks</th>
                                <th className="px-2 py-3 text-center">Active</th>
                                <th className="px-2 py-3 text-center">Pending</th>
                                <th className="px-2 py-3 text-center">Overdue</th>
                                <th className="px-2 py-3 text-right">Completion Rate</th>
                                <th className="px-2 py-3 text-center">Performance Score</th>
                                <th className="px-2 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-medium">
                            {teamPerformance.slice((teamPage-1)*teamItemsPerPage, teamPage*teamItemsPerPage).map((emp, i) => (
                                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                    <td className="px-2 py-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-semibold shrink-0">{getInitials(emp.name)}</div>
                                            <div className="min-w-0">
                                                <div className="capitalize font-semibold text-slate-800 text-[13px] truncate">{emp.name}</div>
                                                <div className="text-[9px] text-slate-400 font-medium uppercase tracking-widest truncate">{emp.role || 'Employee'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <div className="text-[11px] font-medium text-slate-500 truncate max-w-[80px]">{emp.department}</div>
                                    </td>
                                    <td className="px-2 py-2 text-center tabular-nums font-medium text-slate-700">{emp.tasks_assigned}</td>
                                    <td className="px-2 py-2 text-center tabular-nums">
                                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${emp.in_progress > 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                                            {emp.in_progress ?? 0}
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-center tabular-nums">
                                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${emp.pending_review > 0 ? 'bg-amber-50 text-amber-600' : 'text-slate-400'}`}>
                                            {emp.pending_review ?? 0}
                                        </span>
                                    </td>
                                    <td className={`px-2 py-2 text-center tabular-nums text-[11px] ${emp.overdue > 0 ? 'text-rose-500 font-semibold' : ''}`}>{emp.overdue}</td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center justify-end gap-1.5 text-[11px]">
                                            <span>{emp.completion_rate}%</span>
                                            <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${emp.completion_rate > 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${emp.completion_rate}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums ${
                                            (emp.performance_score || emp.completion_rate) >= 70 ? 'bg-emerald-50 text-emerald-700' :
                                            (emp.performance_score || emp.completion_rate) >= 40 ? 'bg-amber-50 text-amber-700' :
                                            'bg-rose-50 text-rose-700'
                                        }`}>
                                            {emp.performance_score || emp.completion_rate || 0}%
                                        </span>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <button
                                            onClick={() => navigate(`/tasks?mode=team&employeeId=${emp.emp_id}`)}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-semibold transition-all hover:shadow-sm active:scale-95"
                                        >
                                            <ExternalLink size={10} />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EMPLOYEE RISK MONITOR */}
            <div className="bg-white/90 rounded-[2.5rem] border border-white shadow-2xl mx-4 overflow-hidden mb-20 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between p-8 border-b border-indigo-50">
                        <div>
                            <h3 className="text-xl font-medium text-[#1E1B4B]">Employee Risk Monitor</h3>
                        </div>
                    <button 
                        onClick={() => setShowRiskModal(!showRiskModal)} 
                        className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                        {showRiskModal ? 'Show Less' : 'View All'}
                    </button>
                </div>
                <div className="px-8 flex items-center justify-end gap-2 flex-wrap pb-4 mt-4">
                    {[
                        { label: 'On Track',  desc: 'No overdue tasks',     dot: 'bg-emerald-500', bg: 'bg-emerald-50',  text: 'text-emerald-700'  },
                        { label: 'Watch',     desc: '1 overdue task',        dot: 'bg-blue-500',    bg: 'bg-blue-50',     text: 'text-blue-700'     },
                        { label: 'At Risk',   desc: '2 overdue tasks',       dot: 'bg-amber-500',   bg: 'bg-amber-50',    text: 'text-amber-700'    },
                        { label: 'Off Track', desc: '3+ overdue tasks',      dot: 'bg-rose-500',    bg: 'bg-rose-50',     text: 'text-rose-700'     },
                    ].map(({ label, desc, dot, bg, text }) => (
                        <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/60 ${bg}`}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                            <div>
                                <p className={`text-[11px] font-black leading-none ${text}`}>{label}</p>
                                <p className="text-[9px] text-slate-400 font-medium mt-0.5 leading-none">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className={`overflow-x-auto overflow-y-auto ${showRiskModal ? '' : 'max-h-[500px]'} flex-1`}>
                    {employeeRisk.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            <p className="text-sm font-bold">No risk data available</p>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-4 text-left">Employee Name</th>
                                    <th className="px-2 py-4 text-center">Active Tasks</th>
                                    <th className="px-2 py-4 text-center">Overdue Tasks</th>
                                    <th className="px-2 py-4 text-center">Execution Score (Delivery Health)</th>
                                    <th className="px-4 py-4 text-center">Delivery Risk Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 font-medium">
                                {employeeRisk.map((emp, i) => {
                                    const riskConfig = {
                                        ON_TRACK:  { label: 'On Track',  bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500' },
                                        WATCH:     { label: 'Watch',     bg: 'bg-blue-50',     text: 'text-blue-700',     dot: 'bg-blue-500'    },
                                        AT_RISK:   { label: 'At Risk',   bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-500'   },
                                        OFF_TRACK: { label: 'Off Track', bg: 'bg-rose-50',     text: 'text-rose-700',     dot: 'bg-rose-500'    },
                                    }[emp.risk_status] || { label: emp.risk_status, bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };

                                    const score = emp.performance_score ?? 0;
                                    const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-rose-600';

                                    return (
                                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${riskConfig.bg} ${riskConfig.text}`}>
                                                        {getInitials(emp.name)}
                                                    </div>
                                                    <div className="capitalize font-semibold text-slate-800 text-sm truncate">{emp.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-2 py-3 text-center tabular-nums text-slate-600 font-bold text-sm">
                                                {emp.active_tasks ?? 0}
                                            </td>
                                            <td className="px-2 py-3 text-center tabular-nums">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${emp.overdue_tasks > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    {emp.overdue_tasks ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className={`font-black text-[13px] tabular-nums ${scoreColor}`}>{score}%</span>
                                                    <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                                            style={{ width: `${Math.min(score, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${riskConfig.bg} ${riskConfig.text}`}>
                                                    <span className={`w-1 h-1 rounded-full ${riskConfig.dot}`} />
                                                    {riskConfig.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PerformanceDashboard;
